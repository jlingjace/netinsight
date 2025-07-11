const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'netinsight-secret-key-2024';

/**
 * 认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: '未提供认证令牌'
      });
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从数据库获取用户信息（包括角色）
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, username, email, role, full_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: '用户不存在'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: '账户已被禁用'
      });
    }

    // 更新最后登录时间
    await db.run(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'analyst', // 默认角色
      fullName: user.full_name,
      isActive: user.is_active
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: '无效的认证令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: '认证令牌已过期'
      });
    } else {
      console.error('认证中间件错误:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: '认证过程中发生错误'
      });
    }
  }
};

/**
 * 可选认证中间件 - 如果有token则验证，没有则继续
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // 没有token，继续处理但不设置用户信息
      return next();
    }

    // 有token，尝试验证
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, username, email, role, full_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (user && user.is_active) {
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'analyst',
        fullName: user.full_name,
        isActive: user.is_active
      };
    }

    next();
  } catch (error) {
    // 认证失败但不阻止请求继续
    console.warn('可选认证失败:', error.message);
    next();
  }
};

/**
 * 生成JWT令牌
 * @param {Object} user - 用户对象
 * @returns {string} JWT令牌
 */
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * 验证令牌
 * @param {string} token - JWT令牌
 * @returns {Object} 解码后的用户信息
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * 刷新令牌
 * @param {string} token - 旧的JWT令牌
 * @returns {string} 新的JWT令牌
 */
function refreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // 生成新令牌
    return jwt.sign(
      { 
        userId: decoded.userId, 
        username: decoded.username,
        email: decoded.email,
        role: decoded.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  } catch (error) {
    throw new Error('无法刷新令牌');
  }
}

/**
 * 检查用户是否有特定角色
 * @param {Array|string} allowedRoles - 允许的角色
 * @returns {Function} 中间件函数
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '用户未认证'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '角色权限不足',
        required_roles: roles,
        user_role: req.user.role
      });
    }

    next();
  };
}

/**
 * 管理员权限检查
 */
const requireAdmin = requireRole('admin');

/**
 * 分析师或管理员权限检查
 */
const requireAnalyst = requireRole(['admin', 'analyst']);

// 管理员中间件（向后兼容）
const adminMiddleware = requireAdmin;

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  generateToken,
  verifyToken,
  refreshToken,
  requireRole,
  requireAdmin,
  requireAnalyst,
  adminMiddleware
}; 