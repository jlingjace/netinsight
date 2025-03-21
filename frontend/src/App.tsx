import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AppLayout from './components/Layout/AppLayout';
import PermissionRoute from './components/PermissionRoute';

// 文件上传和报告组件（占位）
const FileUpload = () => <div>文件上传功能正在开发中...</div>;
const Reports = () => <div>分析报告功能正在开发中...</div>;
const Notifications = () => <div>通知功能正在开发中...</div>;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 公共路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 应用布局 */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* 所有用户都可访问的路由 */}
          <Route path="dashboard" element={
            <PermissionRoute 
              element={<Dashboard />} 
            />
          } />
          
          <Route path="profile" element={
            <PermissionRoute 
              element={<Profile />}
            />
          } />
          
          <Route path="notifications" element={
            <PermissionRoute 
              element={<Notifications />}
            />
          } />
          
          {/* 需要分析师或管理员权限的路由 */}
          <Route path="upload" element={
            <PermissionRoute 
              requiredRole="analyst"
              element={<FileUpload />}
            />
          } />
          
          <Route path="reports" element={
            <PermissionRoute 
              requiredRole="analyst"
              element={<Reports />}
            />
          } />
          
          {/* 系统设置路由，需要管理员权限 */}
          <Route path="settings" element={
            <PermissionRoute 
              requiredRole="admin"
              element={<Settings />}
            />
          } />
        </Route>
        
        {/* 未匹配的路由 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 