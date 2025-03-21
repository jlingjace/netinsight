import React, { useEffect, useState } from 'react';
import { Route, Navigate, useLocation } from 'react-router-dom';
import { message, Spin } from 'antd';
import { authService } from '../../services/api';

interface PermissionRouteProps {
  requiredPermission?: string;
  requiredRole?: 'admin' | 'analyst' | 'user';
  element: React.ReactElement;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({
  requiredPermission,
  requiredRole,
  element
}) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // 检查是否已登录
        if (!authService.isAuthenticated()) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // 获取当前用户信息和权限
        const user = await authService.getUserInfo();
        setUserData(user);

        // 判断是否有访问权限
        if (requiredRole) {
          // 基于角色的访问控制
          if (requiredRole === 'admin' && user.role !== 'admin') {
            setHasAccess(false);
          } else if (requiredRole === 'analyst' && !['admin', 'analyst'].includes(user.role)) {
            setHasAccess(false);
          } else {
            setHasAccess(true);
          }
        } else if (requiredPermission) {
          // 基于权限的访问控制
          // 管理员拥有所有权限
          if (user.role === 'admin') {
            setHasAccess(true);
          } else {
            // 检查特定权限
            setHasAccess(user.permissions?.includes(requiredPermission) || false);
          }
        } else {
          // 无特殊要求，已登录即可访问
          setHasAccess(true);
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        message.error('权限验证失败，请重新登录');
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [requiredPermission, requiredRole]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="验证访问权限..." />
      </div>
    );
  }

  if (!hasAccess) {
    // 未登录或无权访问，重定向到登录页
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 克隆元素并传递用户数据
  return React.cloneElement(element, { userData });
};

export default PermissionRoute; 