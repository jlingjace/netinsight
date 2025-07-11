const Role = require('../models/Role');
const { logger } = require('../utils/logger');

/**
 * 权限检查中间件
 * @param {string} permission - 所需权限
 * @param {Object} options - 选项
 * @returns {Function} Express中间件
 */
function requirePermission(permission, options = {}) {
  return (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用户未认证'
        });
      }

      const { userId, role } = req.user;
      const { resourceIdParam = null, allowOwner = true } = options;

      // 获取资源所有者ID（如果指定了参数名）
      let resourceOwnerId = null;
      if (resourceIdParam && req.params[resourceIdParam]) {
        // 这里需要根据资源类型查询数据库获取所有者ID
        // 暂时使用简化逻辑
        resourceOwnerId = req.resourceOwnerId || null;
      }

      // 检查权限
      const hasPermission = Role.hasResourcePermission(
        role, 
        permission, 
        userId, 
        resourceOwnerId
      );

      if (!hasPermission) {
        logger.warn(`权限检查失败: 用户 ${userId} (${role}) 尝试访问 ${permission}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: '权限不足',
          required_permission: permission
        });
      }

      logger.debug(`权限检查通过: 用户 ${userId} (${role}) 访问 ${permission}`);
      next();

    } catch (error) {
      logger.error('权限检查中间件错误:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: '权限检查失败'
      });
    }
  };
}

/**
 * 角色检查中间件
 * @param {string|Array} allowedRoles - 允许的角色
 * @returns {Function} Express中间件
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用户未认证'
        });
      }

      const userRole = req.user.role;
      
      if (!roles.includes(userRole)) {
        logger.warn(`角色检查失败: 用户 ${req.user.userId} (${userRole}) 需要角色 ${roles.join(' 或 ')}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: '角色权限不足',
          required_roles: roles,
          user_role: userRole
        });
      }

      next();

    } catch (error) {
      logger.error('角色检查中间件错误:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: '角色检查失败'
      });
    }
  };
}

/**
 * 管理员权限检查中间件
 * @returns {Function} Express中间件
 */
function requireAdmin() {
  return requireRole('admin');
}

/**
 * 资源所有者检查中间件
 * @param {string} resourceType - 资源类型 (file, analysis, user)
 * @param {string} idParam - 参数名 (默认为 'id')
 * @returns {Function} Express中间件
 */
function requireOwnerOrAdmin(resourceType, idParam = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '用户未认证'
        });
      }

      const { userId, role } = req.user;
      const resourceId = req.params[idParam];

      // 管理员可以访问所有资源
      if (role === 'admin') {
        return next();
      }

      if (!resourceId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '缺少资源ID'
        });
      }

      // 查询资源所有者
      const resourceOwnerId = await getResourceOwner(resourceType, resourceId);
      
      if (!resourceOwnerId) {
        return res.status(404).json({
          error: 'Not Found',
          message: '资源不存在'
        });
      }

      if (resourceOwnerId !== userId) {
        logger.warn(`资源访问被拒绝: 用户 ${userId} 尝试访问 ${resourceType} ${resourceId} (所有者: ${resourceOwnerId})`);
        return res.status(403).json({
          error: 'Forbidden',
          message: '只能访问自己的资源'
        });
      }

      // 将资源所有者ID添加到请求对象中，供其他中间件使用
      req.resourceOwnerId = resourceOwnerId;
      next();

    } catch (error) {
      logger.error('资源所有者检查中间件错误:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: '资源权限检查失败'
      });
    }
  };
}

/**
 * 获取资源所有者ID
 * @param {string} resourceType - 资源类型
 * @param {string} resourceId - 资源ID
 * @returns {Promise<number|null>} 所有者ID
 */
async function getResourceOwner(resourceType, resourceId) {
  const { getDatabase } = require('../config/database');
  const db = getDatabase();

  try {
    let query;
    let params = [resourceId];

    switch (resourceType) {
      case 'file':
        query = 'SELECT user_id FROM files WHERE id = ?';
        break;
      case 'analysis':
        query = `
          SELECT f.user_id 
          FROM analysis_results ar 
          JOIN files f ON ar.file_id = f.id 
          WHERE ar.id = ?
        `;
        break;
      case 'user':
        query = 'SELECT id as user_id FROM users WHERE id = ?';
        break;
      default:
        throw new Error(`不支持的资源类型: ${resourceType}`);
    }

    const result = await db.get(query, params);
    return result ? result.user_id : null;

  } catch (error) {
    logger.error(`获取资源所有者失败 (${resourceType}:${resourceId}):`, error);
    return null;
  }
}

/**
 * 权限信息中间件 - 添加权限信息到响应
 * @returns {Function} Express中间件
 */
function addPermissionInfo() {
  return (req, res, next) => {
    if (req.user) {
      const { role } = req.user;
      const roleInfo = Role.getRoleById(role);
      
      req.userPermissions = {
        role: role,
        roleName: roleInfo ? roleInfo.name : '未知角色',
        permissions: Role.getRolePermissions(role),
        level: roleInfo ? roleInfo.level : 0
      };
    }
    
    next();
  };
}

/**
 * 检查特定权限的辅助函数
 * @param {Object} user - 用户对象
 * @param {string} permission - 权限名称
 * @param {number} resourceOwnerId - 资源所有者ID
 * @returns {boolean} 是否有权限
 */
function checkPermission(user, permission, resourceOwnerId = null) {
  if (!user) return false;
  
  return Role.hasResourcePermission(
    user.role,
    permission,
    user.userId,
    resourceOwnerId
  );
}

/**
 * 权限装饰器 - 为路由添加权限检查
 * @param {string} permission - 所需权限
 * @param {Object} options - 选项
 * @returns {Function} 装饰器函数
 */
function withPermission(permission, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(req, res, next) {
      const middleware = requirePermission(permission, options);
      middleware(req, res, () => {
        originalMethod.call(this, req, res, next);
      });
    };
    
    return descriptor;
  };
}

module.exports = {
  requirePermission,
  requireRole,
  requireAdmin,
  requireOwnerOrAdmin,
  addPermissionInfo,
  checkPermission,
  withPermission,
  getResourceOwner
}; 