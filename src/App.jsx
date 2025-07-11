import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 导入页面组件
import Dashboard from './pages/Dashboard';
import FileAnalysis from './pages/FileAnalysis';
import ProjectManagement from './pages/ProjectManagement';
import AnalysisResults from './pages/AnalysisResults';
import Settings from './pages/Settings';
import Login from './components/Login';
import UserManagement from './pages/UserManagement';
import BatchUpload from './pages/BatchUpload';
import VisualizationDashboard from './pages/VisualizationDashboard';

// 导入布局组件
import AppHeader from './components/layout/AppHeader';
import AppSidebar from './components/layout/AppSidebar';
import AppFooter from './components/layout/AppFooter';

// 导入服务
import { authService } from './services/authService';

// 导入样式
import './styles/App.css';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = authService.getCurrentUserFromStorage();
          setCurrentUser(user);
          setIsAuthenticated(true);
          
          // 验证token是否仍然有效
          try {
            await authService.getCurrentUser();
          } catch (error) {
            // Token无效，清除认证状态
            authService.logout();
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleTheme = () => {
    setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // 未认证状态 - 显示登录页面
  if (!isAuthenticated) {
    return (
      <ConfigProvider 
        locale={zhCN}
        theme={{
          algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
        }}
      >
        <Login onLoginSuccess={handleLoginSuccess} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <Router>
        <Layout className="app-layout" style={{ minHeight: '100vh' }}>
          {/* 侧边栏 */}
          <AppSidebar collapsed={collapsed} />
          
          {/* 主要内容区域 */}
          <Layout className={`site-layout ${collapsed ? 'collapsed' : ''}`}>
            {/* 顶部导航 */}
            <AppHeader 
              collapsed={collapsed} 
              onToggle={toggleSidebar}
              currentTheme={currentTheme}
              onThemeToggle={toggleTheme}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
            
            {/* 内容区域 */}
            <Content className="site-layout-content">
              <div className="content-wrapper">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analysis" element={<FileAnalysis />} />
                  <Route path="/upload" element={<BatchUpload />} />
                  <Route path="/projects" element={<ProjectManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/results/:id" element={<AnalysisResults />} />
                  <Route path="/visualization/:id" element={<VisualizationDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </Content>
            
            {/* 底部 */}
            <AppFooter />
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App; 