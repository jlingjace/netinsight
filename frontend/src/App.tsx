import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AppLayout from './components/Layout/AppLayout';
import { authService } from './services/api';

// 受保护的路由，需要登录才能访问
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // 记录用户尝试访问的URL，登录后可以重定向回来
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 认证页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 应用布局和受保护的路由 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          {/* 以下是占位路由，稍后实现 */}
          <Route path="upload" element={<div>文件上传功能正在开发中...</div>} />
          <Route path="reports" element={<div>分析报告功能正在开发中...</div>} />
          <Route path="settings" element={<div>设置功能正在开发中...</div>} />
          <Route path="notifications" element={<div>通知功能正在开发中...</div>} />
        </Route>
        
        {/* 未匹配的路由 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 