import React, { useState } from 'react';
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
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { authService } from '../../services/api';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  
  // 获取存储的用户信息
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
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
    return ['dashboard'];
  };
  
  // 用户下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];
  
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
        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          style={{ borderRight: 0 }}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: '仪表盘',
              onClick: () => handleMenuClick('/dashboard'),
            },
            {
              key: 'upload',
              icon: <UploadOutlined />,
              label: '文件上传',
              onClick: () => handleMenuClick('/upload'),
            },
            {
              key: 'reports',
              icon: <FileTextOutlined />,
              label: '分析报告',
              onClick: () => handleMenuClick('/reports'),
            },
          ]}
        />
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
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                {!collapsed && <span className="username">{user?.name || user?.email || '用户'}</span>}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout; 