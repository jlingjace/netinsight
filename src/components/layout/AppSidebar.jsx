import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileSearchOutlined,
  ProjectOutlined,
  BarChartOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  TeamOutlined,
  SecurityScanOutlined,
  ApiOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const AppSidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
      title: '概览和统计信息'
    },
    {
      key: '/analysis',
      icon: <FileSearchOutlined />,
      label: '文件分析',
      title: '上传和分析网络数据'
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
      title: '管理分析项目'
    },
    {
      type: 'divider'
    },
    {
      key: 'analysis-tools',
      icon: <BarChartOutlined />,
      label: '分析工具',
      children: [
        {
          key: '/upload',
          icon: <CloudUploadOutlined />,
          label: '批量上传',
          title: '批量上传和处理文件'
        },
        {
          key: '/protocols',
          icon: <SecurityScanOutlined />,
          label: '协议分析',
          title: '深度协议分析'
        },
        {
          key: '/performance',
          icon: <BarChartOutlined />,
          label: '性能分析',
          title: '网络性能监控'
        }
      ]
    },
    {
      key: 'collaboration',
      icon: <TeamOutlined />,
      label: '协作功能',
      children: [
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户管理',
          title: '管理系统用户和权限'
        },
        {
          key: '/teams',
          icon: <TeamOutlined />,
          label: '团队管理',
          title: '管理团队成员'
        },
        {
          key: '/sharing',
          icon: <ApiOutlined />,
          label: '共享分析',
          title: '分享分析结果'
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      title: '系统配置和偏好设置'
    }
  ];

  const handleMenuClick = ({ key }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    // 匹配当前路径对应的菜单项
    if (path.startsWith('/results/')) {
      return ['/analysis'];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];
    
    // 根据当前路径确定需要展开的子菜单
    if (['/upload', '/protocols', '/performance'].includes(path)) {
      openKeys.push('analysis-tools');
    }
    if (['/teams', '/sharing'].includes(path)) {
      openKeys.push('collaboration');
    }
    
    return openKeys;
  };

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      width={240}
      theme="light"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      {/* Logo区域 */}
      <div style={{ 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 24px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {!collapsed ? (
          <div className="logo">
            <SecurityScanOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <span style={{ marginLeft: 8, fontSize: 18, fontWeight: 600 }}>
              NetInsight
            </span>
          </div>
        ) : (
          <SecurityScanOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ 
          borderRight: 0,
          marginTop: 8
        }}
      />

      {/* 底部信息 */}
      {!collapsed && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 6,
          fontSize: 12,
          color: '#666',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            NetInsight v2.0
          </div>
          <div>
            企业级网络分析平台
          </div>
        </div>
      )}
    </Sider>
  );
};

export default AppSidebar; 