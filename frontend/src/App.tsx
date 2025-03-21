import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import FileUploadPage from './pages/FileUpload';
import AppLayout from './components/Layout/AppLayout';
import PermissionRoute from './components/PermissionRoute';
import TestUpload from './components/TestUpload';

// 导入报告相关组件
import ReportList from './pages/Reports';
import ReportDetail from './pages/Reports/ReportDetail';
import GenerateReport from './pages/Reports/ReportGenerate';

// 通知组件（占位）
const Notifications = () => <div>通知功能正在开发中...</div>;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 公共路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/test-upload" element={<TestUpload />} />
        
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
              element={<FileUploadPage />}
            />
          } />
          
          {/* 报告相关路由 */}
          <Route path="reports" element={
            <PermissionRoute 
              requiredRole="analyst"
              element={<ReportList />}
            />
          } />
          
          <Route path="reports/generate" element={
            <PermissionRoute 
              requiredRole="analyst"
              element={<GenerateReport />}
            />
          } />
          
          <Route path="reports/:reportId" element={
            <PermissionRoute 
              requiredRole="analyst"
              element={<ReportDetail />}
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