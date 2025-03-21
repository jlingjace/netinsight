import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  UploadOutlined,
  DashboardOutlined,
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { authService } from '../../services/api';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  
  // 获取用户信息和权限
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = await authService.getUserInfo();
        setUserData(user);
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 如果获取用户信息失败，可能是未登录或token过期
        navigate('/login', { state: { from: location } });
      } finally {
        setLoading(false);
      }
    };

    if (authService.isAuthenticated()) {
      fetchUserData();
    } else {
      navigate('/login', { state: { from: location } });
    }
  }, [navigate, location]);
  
  // 检查用户是否有特定权限
  const hasPermission = (permissionCode: string): boolean => {
    if (!userData) return false;
    
    // 管理员拥有所有权限
    if (userData.role === 'admin') return true;
    
    // 检查用户权限列表
    return userData.permissions?.includes(permissionCode) || false;
  };
  
  // 检查用户角色
  const hasRole = (role: string): boolean => {
    if (!userData) return false;
    
    if (role === 'admin') {
      return userData.role === 'admin';
    } else if (role === 'analyst') {
      return userData.role === 'admin' || userData.role === 'analyst';
    }
    
    return true; // 所有用户
  };
  
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };
  
  const handleMenuClick = (path: string) => {
    navigate(path);
  };
  
  // 判断当前路由选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return ['dashboard'];
    if (path.startsWith('/upload')) return ['upload'];
    if (path.startsWith('/reports')) return ['reports'];
    if (path.startsWith('/profile')) return ['profile'];
    if (path.startsWith('/settings')) return ['settings'];
    return ['dashboard'];
  };
  
  // 根据用户权限获取菜单项
  const getMenuItems = () => {
    const menuItems = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: '仪表盘',
        onClick: () => handleMenuClick('/dashboard'),
      }
    ];
    
    // 需要分析师权限的菜单项
    if (hasRole('analyst')) {
      menuItems.push({
        key: 'upload',
        icon: <UploadOutlined />,
        label: '文件上传',
        onClick: () => handleMenuClick('/upload'),
      });
    }
    
    if (hasRole('analyst')) {
      menuItems.push({
        key: 'reports',
        icon: <FileTextOutlined />,
        label: '分析报告',
        onClick: () => handleMenuClick('/reports'),
      });
    }
    
    // 通知中心对所有用户开放
    menuItems.push({
      key: 'notifications',
      icon: <BellOutlined />,
      label: '通知中心',
      onClick: () => handleMenuClick('/notifications'),
    });
    
    // 需要管理员权限的菜单项
    if (hasRole('admin')) {
      menuItems.push({
        key: 'settings',
        icon: <SettingOutlined />,
        label: '系统设置',
        onClick: () => handleMenuClick('/settings'),
      });
    }
    
    return menuItems;
  };
  
  // 用户下拉菜单项
  const getUserMenuItems = () => {
    const items: MenuProps['items'] = [
      {
        key: 'profile',
        label: '个人资料',
        icon: <UserOutlined />,
        onClick: () => navigate('/profile'),
      },
      {
        key: 'help',
        label: '帮助中心',
        icon: <QuestionCircleOutlined />,
        onClick: () => navigate('/help'),
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ];
    
    // 只有管理员或有权限的用户才能看到系统设置
    if (hasRole('admin')) {
      items.splice(1, 0, {
        key: 'settings',
        label: '系统设置',
        icon: <SettingOutlined />,
        onClick: () => navigate('/settings'),
      });
    }
    
    return items;
  };
  
  return (
    <Layout className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="app-sider"
        theme="light"
        width={220}
      >
        <div className="logo">
          {collapsed ? 'NI' : 'NetInsight'}
        </div>
        {!loading && (
          <Menu
            mode="inline"
            selectedKeys={getSelectedKey()}
            style={{ borderRight: 0 }}
            items={getMenuItems()}
          />
        )}
      </Sider>
      <Layout>
        <Header className="app-header" style={{ background: token.colorBgContainer }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            className="trigger-button"
          />
          <div className="header-right">
            <Button 
              type="text" 
              icon={<BellOutlined />} 
              className="notification-button"
              onClick={() => navigate('/notifications')}
            />
            <Dropdown menu={{ items: getUserMenuItems() }} trigger={['click']}>
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                {!collapsed && <span className="username">{userData?.name || userData?.email || '用户'}</span>}
                {!collapsed && userData?.role && (
                  <span className="user-role">
                    {userData.role === 'admin' ? '管理员' : 
                     userData.role === 'analyst' ? '分析师' : '普通用户'}
                  </span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>加载中...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;