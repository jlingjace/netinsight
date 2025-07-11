import React from 'react';
import { Layout, Button, Dropdown, Avatar, Badge, Space, Typography, Tooltip } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader = ({ collapsed, onToggle, currentTheme, onThemeToggle, currentUser, onLogout }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // 用户菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  // 通知菜单
  const notificationItems = [
    {
      key: '1',
      label: (
        <div style={{ width: 300, padding: '8px 0' }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            新的分析任务完成
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            traffic-analysis-001.pcap 分析完成
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            2分钟前
          </div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <div style={{ width: 300, padding: '8px 0' }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            系统更新通知
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            NetInsight v2.0.1 现已可用
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            1小时前
          </div>
        </div>
      ),
    },
    {
      key: '3',
      label: (
        <div style={{ width: 300, padding: '8px 0' }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            存储空间提醒
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            当前存储使用率达到85%
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            3小时前
          </div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'all',
      label: (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <Button type="link" size="small">
            查看所有通知
          </Button>
        </div>
      ),
    },
  ];

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 监听全屏状态变化
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleUserMenuClick = ({ key }) => {
    switch (key) {
      case 'profile':
        console.log('打开个人资料');
        break;
      case 'settings':
        console.log('打开账户设置');
        break;
      case 'help':
        console.log('打开帮助中心');
        break;
      case 'logout':
        if (onLogout) {
          onLogout();
        }
        break;
      default:
        break;
    }
  };

  return (
    <Header 
      className="app-header"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: collapsed ? 80 : 240,
        zIndex: 1000,
        transition: 'left 0.2s',
        height: 64,
        lineHeight: '64px',
      }}
    >
      <div className="header-left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{
            fontSize: '16px',
            width: 40,
            height: 40,
          }}
        />
        
        <div style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 500 }}>
            网络数据分析平台
          </Text>
        </div>
      </div>

      <div className="header-right">
        <Space size="middle">
          {/* 主题切换 */}
          <Tooltip title={currentTheme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}>
            <Button
              type="text"
              icon={currentTheme === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={onThemeToggle}
              style={{ fontSize: 16 }}
            />
          </Tooltip>

          {/* 全屏切换 */}
          <Tooltip title={isFullscreen ? '退出全屏' : '进入全屏'}>
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{ fontSize: 16 }}
            />
          </Tooltip>

          {/* 语言切换 */}
          <Tooltip title="语言设置">
            <Button
              type="text"
              icon={<GlobalOutlined />}
              style={{ fontSize: 16 }}
            />
          </Tooltip>

          {/* 帮助提示 */}
          <Tooltip title="帮助文档">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              style={{ fontSize: 16 }}
            />
          </Tooltip>

          {/* 通知 */}
          <Dropdown
            menu={{ items: notificationItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: 16 }}
              />
            </Badge>
          </Dropdown>

          {/* 用户菜单 */}
          <Dropdown
            menu={{ 
              items: userMenuItems,
              onClick: handleUserMenuClick
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar 
                size="small" 
                src={currentUser?.avatar_url}
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1890ff' }}
              />
              <Text style={{ fontSize: 14 }}>
                {currentUser?.name || '用户'}
              </Text>
            </Space>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader; 