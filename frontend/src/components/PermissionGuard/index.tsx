import React, { useEffect, useState } from 'react';
import { authService } from '../../services/api';

export interface PermissionGuardProps {
  /**
   * 需要的权限代码
   */
  permission?: string;
  
  /**
   * 需要的角色，如果指定则检查用户是否具有该角色
   */
  requiredRole?: 'admin' | 'analyst' | 'user';
  
  /**
   * 子组件
   */
  children: React.ReactNode;
  
  /**
   * 如果无权访问，是否渲染占位内容
   */
  renderPlaceholder?: boolean;
  
  /**
   * 自定义占位内容
   */
  placeholder?: React.ReactNode;
}

/**
 * 权限守卫组件，用于控制UI元素的显示
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  requiredRole,
  children,
  renderPlaceholder = false,
  placeholder
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // 检查是否已登录
        if (!authService.isAuthenticated()) {
          setHasPermission(false);
          setLoading(false);
          return;
        }
        
        // 获取用户信息
        const user = await authService.getUserInfo();
        
        if (requiredRole) {
          // 基于角色的权限检查
          if (requiredRole === 'admin') {
            setHasPermission(user.role === 'admin');
          } else if (requiredRole === 'analyst') {
            setHasPermission(['admin', 'analyst'].includes(user.role));
          } else {
            // 所有用户都有权限
            setHasPermission(true);
          }
        } else if (permission) {
          // 基于权限代码的检查
          if (user.role === 'admin') {
            // 管理员拥有所有权限
            setHasPermission(true);
          } else {
            // 检查特定权限
            setHasPermission(user.permissions?.includes(permission) || false);
          }
        } else {
          // 无需特殊权限
          setHasPermission(true);
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkPermission();
  }, [permission, requiredRole]);
  
  // 加载中不显示任何内容
  if (loading) {
    return null;
  }
  
  // 无权限且不需要占位符，则不渲染任何内容
  if (!hasPermission && !renderPlaceholder) {
    return null;
  }
  
  // 有权限，渲染子组件
  if (hasPermission) {
    return <>{children}</>;
  }
  
  // 无权限但需要渲染占位符
  return <>{placeholder || <div style={{ display: 'none' }} />}</>;
};

/**
 * 基于角色的权限守卫，更简单的API
 */
export const RoleGuard: React.FC<{
  role: 'admin' | 'analyst' | 'user';
  children: React.ReactNode;
  renderPlaceholder?: boolean;
  placeholder?: React.ReactNode;
}> = ({ role, children, renderPlaceholder, placeholder }) => {
  return (
    <PermissionGuard
      requiredRole={role}
      renderPlaceholder={renderPlaceholder}
      placeholder={placeholder}
    >
      {children}
    </PermissionGuard>
  );
};

/**
 * 管理员守卫
 */
export const AdminGuard: React.FC<{
  children: React.ReactNode;
  renderPlaceholder?: boolean;
  placeholder?: React.ReactNode;
}> = ({ children, renderPlaceholder, placeholder }) => {
  return (
    <PermissionGuard
      requiredRole="admin"
      renderPlaceholder={renderPlaceholder}
      placeholder={placeholder}
    >
      {children}
    </PermissionGuard>
  );
};

/**
 * 分析师守卫
 */
export const AnalystGuard: React.FC<{
  children: React.ReactNode;
  renderPlaceholder?: boolean;
  placeholder?: React.ReactNode;
}> = ({ children, renderPlaceholder, placeholder }) => {
  return (
    <PermissionGuard
      requiredRole="analyst"
      renderPlaceholder={renderPlaceholder}
      placeholder={placeholder}
    >
      {children}
    </PermissionGuard>
  );
};

export default PermissionGuard; 