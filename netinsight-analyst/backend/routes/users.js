const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/permission');
const Role = require('../models/Role');
const { logAction } = require('../utils/logger');

const router = express.Router();

// 获取用户列表（管理员专用）
router.get('/', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search, role, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '1=1';
    const params = [];
    
    // 搜索条件
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // 角色筛选
    if (role && role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    // 状态筛选
    if (status !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
    const db = getDatabase();
    
    // 获取总数
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );
    
    // 获取用户列表
    const users = await db.all(
      `SELECT id, username, email, role, full_name, department, phone, 
              last_login_at, created_at, is_active, email_verified
       FROM users 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    // 添加角色信息
    const usersWithRoleInfo = users.map(user => {
      const roleInfo = Role.getRoleById(user.role);
      return {
        ...user,
        roleName: roleInfo ? roleInfo.name : '未知角色',
        roleLevel: roleInfo ? roleInfo.level : 0
      };
    });
    
    await logAction(req.user.userId, 'user.list', { 
      search, role, status, 
      count: usersWithRoleInfo.length 
    });
    
    res.json({
      users: usersWithRoleInfo,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: countResult.total
      }
    });
    
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: '获取用户列表失败'
    });
  }
});

// 获取用户统计信息（管理员专用）
router.get('/stats', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const db = getDatabase();
    
    // 总用户数
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    
    // 活跃用户数
    const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    
    // 角色分布
    const roleStats = await db.all(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    // 最近7天注册用户
    const recentUsers = await db.get(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    
    // 最近30天登录用户
    const recentLogins = await db.get(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE last_login_at >= datetime('now', '-30 days')
    `);
    
    res.json({
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      inactiveUsers: totalUsers.count - activeUsers.count,
      recentRegistrations: recentUsers.count,
      recentLogins: recentLogins.count,
      roleDistribution: roleStats.map(stat => ({
        role: stat.role,
        roleName: Role.getRoleById(stat.role)?.name || '未知角色',
        count: stat.count
      }))
    });
    
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({
      error: 'Failed to get user stats',
      message: '获取用户统计失败'
    });
  }
});

// 创建用户（管理员专用）
router.post('/', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      role = 'analyst', 
      fullName, 
      department, 
      phone,
      isActive = true 
    } = req.body;
    
    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '用户名、邮箱和密码为必填项'
      });
    }
    
    // 验证角色
    if (!Role.isValidRole(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: '无效的用户角色'
      });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: '邮箱格式不正确'
      });
    }
    
    const db = getDatabase();
    
    // 检查用户名和邮箱是否已存在
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: '用户名或邮箱已存在'
      });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const result = await db.run(
      `INSERT INTO users (
        username, email, password, role, full_name, 
        department, phone, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [username, email, hashedPassword, role, fullName, department, phone, isActive ? 1 : 0]
    );
    
    await logAction(req.user.userId, 'user.create', { 
      targetUserId: result.lastID,
      username, email, role 
    });
    
    res.status(201).json({
      message: '用户创建成功',
      userId: result.lastID
    });
    
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: '创建用户失败'
    });
  }
});

// 获取用户详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // 检查权限：管理员可以查看所有用户，普通用户只能查看自己
    if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '权限不足'
      });
    }
    
    const db = getDatabase();
    const user = await db.get(
      `SELECT id, username, email, role, full_name, department, phone,
              last_login_at, created_at, updated_at, is_active, email_verified
       FROM users WHERE id = ?`,
      [id]
    );
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }
    
    // 添加角色信息
    const roleInfo = Role.getRoleById(user.role);
    const userWithRoleInfo = {
      ...user,
      roleName: roleInfo ? roleInfo.name : '未知角色',
      permissions: Role.getRolePermissions(user.role)
    };
    
    res.json({ user: userWithRoleInfo });
    
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: '获取用户详情失败'
    });
  }
});

// 更新用户信息
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const { 
      username, 
      email, 
      role, 
      fullName, 
      department, 
      phone, 
      isActive 
    } = req.body;
    
    // 检查权限
    const isAdmin = currentUser.role === 'admin';
    const isSelf = currentUser.userId === parseInt(id);
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '权限不足'
      });
    }
    
    // 非管理员不能修改角色和状态
    if (!isAdmin && (role !== undefined || isActive !== undefined)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '无权修改角色或状态'
      });
    }
    
    const db = getDatabase();
    
    // 检查用户是否存在
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    
    if (username !== undefined) {
      // 检查用户名是否已被其他用户使用
      const duplicateUsername = await db.get(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, id]
      );
      if (duplicateUsername) {
        return res.status(409).json({
          error: 'Username already exists',
          message: '用户名已存在'
        });
      }
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    
    if (email !== undefined) {
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          message: '邮箱格式不正确'
        });
      }
      
      // 检查邮箱是否已被其他用户使用
      const duplicateEmail = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      if (duplicateEmail) {
        return res.status(409).json({
          error: 'Email already exists',
          message: '邮箱已存在'
        });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    
    if (role !== undefined && isAdmin) {
      if (!Role.isValidRole(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: '无效的用户角色'
        });
      }
      updateFields.push('role = ?');
      updateValues.push(role);
    }
    
    if (fullName !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(fullName);
    }
    
    if (department !== undefined) {
      updateFields.push('department = ?');
      updateValues.push(department);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    
    if (isActive !== undefined && isAdmin) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: '没有要更新的字段'
      });
    }
    
    // 添加更新时间
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    // 执行更新
    await db.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    await logAction(currentUser.userId, 'user.update', { 
      targetUserId: parseInt(id),
      updatedFields: updateFields.map(field => field.split(' = ')[0])
    });
    
    res.json({ message: '用户信息更新成功' });
    
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: '更新用户失败'
    });
  }
});

// 删除用户（管理员专用）
router.delete('/:id', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能删除自己
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: '不能删除自己的账户'
      });
    }
    
    const db = getDatabase();
    
    // 检查用户是否存在
    const user = await db.get('SELECT username FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }
    
    // 软删除：设置为非活跃状态
    await db.run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    await logAction(req.user.userId, 'user.delete', { 
      targetUserId: parseInt(id),
      username: user.username
    });
    
    res.json({ message: '用户已删除' });
    
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: '删除用户失败'
    });
  }
});

// 重置用户密码（管理员专用）
router.post('/:id/reset-password', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: '密码长度至少6位'
      });
    }
    
    const db = getDatabase();
    
    // 检查用户是否存在
    const user = await db.get('SELECT username FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }
    
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
    
    await logAction(req.user.userId, 'user.reset_password', { 
      targetUserId: parseInt(id),
      username: user.username
    });
    
    res.json({ message: '密码重置成功' });
    
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: '重置密码失败'
    });
  }
});

// 切换用户状态（管理员专用）
router.post('/:id/toggle-status', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能禁用自己
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({
        error: 'Cannot disable self',
        message: '不能禁用自己的账户'
      });
    }
    
    const db = getDatabase();
    
    // 获取当前状态
    const user = await db.get('SELECT username, is_active FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }
    
    const newStatus = user.is_active ? 0 : 1;
    
    // 更新状态
    await db.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );
    
    await logAction(req.user.userId, 'user.toggle_status', { 
      targetUserId: parseInt(id),
      username: user.username,
      newStatus: newStatus ? 'active' : 'inactive'
    });
    
    res.json({ 
      message: `用户已${newStatus ? '启用' : '禁用'}`,
      isActive: Boolean(newStatus)
    });
    
  } catch (error) {
    console.error('切换用户状态错误:', error);
    res.status(500).json({
      error: 'Failed to toggle user status',
      message: '切换用户状态失败'
    });
  }
});

// 获取用户操作日志（管理员专用）
router.get('/:id/logs', authMiddleware, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const db = getDatabase();
    
    // 获取用户操作日志
    const logs = await db.all(`
      SELECT action, details, ip_address, user_agent, created_at
      FROM system_logs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [id, pageSize, offset]);
    
    // 获取总数
    const countResult = await db.get(
      'SELECT COUNT(*) as total FROM system_logs WHERE user_id = ?',
      [id]
    );
    
    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: countResult.total
      }
    });
    
  } catch (error) {
    console.error('获取用户日志错误:', error);
    res.status(500).json({
      error: 'Failed to get user logs',
      message: '获取用户日志失败'
    });
  }
});

module.exports = router; 