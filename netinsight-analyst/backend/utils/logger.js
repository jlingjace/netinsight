const { getDatabase } = require('../config/database');

/**
 * 记录用户操作日志
 * @param {number} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {string} resourceType - 资源类型
 * @param {number} resourceId - 资源ID
 * @param {object} details - 详细信息
 * @param {string} ipAddress - IP地址
 * @param {string} userAgent - 用户代理
 */
async function logAction(userId, action, resourceType, resourceId, details, ipAddress, userAgent) {
  try {
    const db = getDatabase();
    
    await db.run(
      `INSERT INTO system_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ]
    );
    
  } catch (error) {
    console.error('Failed to log action:', error);
    // 日志记录失败不应该影响主要功能
  }
}

/**
 * 记录系统事件（无用户关联）
 * @param {string} action - 操作类型
 * @param {string} resourceType - 资源类型
 * @param {number} resourceId - 资源ID
 * @param {object} details - 详细信息
 */
async function logSystemEvent(action, resourceType, resourceId, details) {
  try {
    const db = getDatabase();
    
    await db.run(
      `INSERT INTO system_logs (action, resource_type, resource_id, details)
       VALUES (?, ?, ?, ?)`,
      [
        action,
        resourceType,
        resourceId,
        JSON.stringify(details)
      ]
    );
    
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
}

/**
 * 获取用户操作日志
 * @param {number} userId - 用户ID
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @returns {Promise<Array>} 日志记录列表
 */
async function getUserLogs(userId, limit = 50, offset = 0) {
  try {
    const db = getDatabase();
    
    const logs = await db.all(
      `SELECT action, resource_type, resource_id, details, ip_address, created_at
       FROM system_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
    
  } catch (error) {
    console.error('Failed to get user logs:', error);
    return [];
  }
}

/**
 * 获取系统日志（管理员功能）
 * @param {object} filters - 过滤条件
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @returns {Promise<Array>} 日志记录列表
 */
async function getSystemLogs(filters = {}, limit = 100, offset = 0) {
  try {
    const db = getDatabase();
    
    let sql = `
      SELECT l.*, u.email, u.name 
      FROM system_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.userId) {
      sql += ' AND l.user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      sql += ' AND l.action = ?';
      params.push(filters.action);
    }
    
    if (filters.resourceType) {
      sql += ' AND l.resource_type = ?';
      params.push(filters.resourceType);
    }
    
    if (filters.startDate) {
      sql += ' AND l.created_at >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND l.created_at <= ?';
      params.push(filters.endDate);
    }
    
    sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const logs = await db.all(sql, params);
    
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
    
  } catch (error) {
    console.error('Failed to get system logs:', error);
    return [];
  }
}

/**
 * 清理过期日志
 * @param {number} daysToKeep - 保留天数
 */
async function cleanupOldLogs(daysToKeep = 90) {
  try {
    const db = getDatabase();
    
    const result = await db.run(
      `DELETE FROM system_logs 
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [daysToKeep]
    );
    
    console.log(`Cleaned up ${result.changes} old log records`);
    return result.changes;
    
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
    return 0;
  }
}

/**
 * 获取日志统计信息
 * @param {string} period - 时间周期 ('day', 'week', 'month')
 * @returns {Promise<object>} 统计信息
 */
async function getLogStats(period = 'day') {
  try {
    const db = getDatabase();
    
    let dateFormat;
    switch (period) {
      case 'week':
        dateFormat = '%Y-%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }
    
    const stats = await db.all(
      `SELECT 
         strftime(?, created_at) as period,
         action,
         COUNT(*) as count
       FROM system_logs 
       WHERE created_at >= datetime('now', '-30 days')
       GROUP BY period, action
       ORDER BY period DESC, count DESC`,
      [dateFormat]
    );
    
    const userStats = await db.all(
      `SELECT 
         COUNT(DISTINCT user_id) as active_users,
         COUNT(*) as total_actions
       FROM system_logs 
       WHERE created_at >= datetime('now', '-1 day')`
    );
    
    return {
      actionStats: stats,
      userStats: userStats[0] || { active_users: 0, total_actions: 0 }
    };
    
  } catch (error) {
    console.error('Failed to get log stats:', error);
    return {
      actionStats: [],
      userStats: { active_users: 0, total_actions: 0 }
    };
  }
}

/**
 * 简单的控制台日志记录器
 */
const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }
};

module.exports = {
  logAction,
  logSystemEvent,
  getUserLogs,
  getSystemLogs,
  cleanupOldLogs,
  getLogStats,
  logger
}; 