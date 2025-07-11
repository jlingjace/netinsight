const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permission');
const Role = require('../models/Role');
const { logAction } = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'netinsight-secret-key-2024';

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, department, phone, role } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '用户名、邮箱和密码为必填项'
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

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password too weak',
        message: '密码长度至少6位'
      });
    }

    // 验证角色（如果提供）
    const userRole = role || 'analyst'; // 默认角色为分析师
    if (!Role.isValidRole(userRole)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: '无效的用户角色'
      });
    }

    const db = getDatabase();

    // 检查用户名是否已存在
    const existingUsername = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername) {
      return res.status(409).json({
        error: 'Username already exists',
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail) {
      return res.status(409).json({
        error: 'Email already exists',
        message: '邮箱已被注册'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.run(
      `INSERT INTO users (username, email, password, role, full_name, department, phone, is_active, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, userRole, fullName || null, department || null, phone || null, 1, 0]
    );

    // 获取创建的用户信息
    const newUser = await db.get(
      'SELECT id, username, email, role, full_name, department, phone, created_at FROM users WHERE id = ?',
      [result.lastID]
    );

    // 生成JWT令牌
    const token = generateToken(newUser);

    // 记录注册日志
    await logAction(newUser.id, 'user_register', 'user', newUser.id, {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }, req.ip, req.get('User-Agent'));

    res.status(201).json({
      message: '用户注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        department: newUser.department,
        phone: newUser.phone,
        createdAt: newUser.created_at
      },
      token
    });

  } catch (error) {
    console.error('用户注册错误:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: '注册过程中发生错误'
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email; // 支持用户名或邮箱登录

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: '请提供用户名和密码'
      });
    }

    const db = getDatabase();

    // 查找用户（支持用户名或邮箱登录）
    const user = await db.get(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
      [loginIdentifier, loginIdentifier]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '用户名或密码错误'
      });
    }

    // 更新最后登录时间
    await db.run(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // 生成JWT令牌
    const token = generateToken(user);

    // 记录登录日志
    await logAction(user.id, 'user_login', 'user', user.id, {
      username: user.username,
      loginMethod: 'password'
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department,
        phone: user.phone
      },
      token
    });

  } catch (error) {
    console.error('用户登录错误:', error);
    res.status(500).json({
      error: 'Login failed',
      message: '登录过程中发生错误'
    });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    const user = await db.get(
      `SELECT id, username, email, role, full_name, department, phone, 
              last_login_at, created_at, is_active, email_verified 
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    // 获取角色信息
    const roleInfo = Role.getRoleById(user.role);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        roleName: roleInfo ? roleInfo.name : '未知角色',
        fullName: user.full_name,
        department: user.department,
        phone: user.phone,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        isActive: user.is_active,
        emailVerified: user.email_verified
      },
      permissions: Role.getRolePermissions(user.role)
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: '获取用户信息失败'
    });
  }
});

// 更新用户信息
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, department, phone, email } = req.body;
    const userId = req.user.userId;

    const db = getDatabase();

    // 如果更新邮箱，检查是否已被使用
    if (email && email !== req.user.email) {
      const existingEmail = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingEmail) {
        return res.status(409).json({
          error: 'Email already exists',
          message: '邮箱已被其他用户使用'
        });
      }
    }

    // 更新用户信息
    await db.run(
      `UPDATE users SET 
         full_name = COALESCE(?, full_name),
         department = COALESCE(?, department),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fullName, department, phone, email, userId]
    );

    // 获取更新后的用户信息
    const updatedUser = await db.get(
      'SELECT id, username, email, role, full_name, department, phone FROM users WHERE id = ?',
      [userId]
    );

    // 记录更新日志
    await logAction(userId, 'user_update_profile', 'user', userId, {
      updatedFields: { fullName, department, phone, email }
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: '用户信息更新成功',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        fullName: updatedUser.full_name,
        department: updatedUser.department,
        phone: updatedUser.phone
      }
    });

  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      error: 'Update failed',
      message: '更新用户信息失败'
    });
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing passwords',
        message: '请提供当前密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password too weak',
        message: '新密码长度至少6位'
      });
    }

    const db = getDatabase();

    // 获取当前用户密码
    const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid current password',
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    // 记录密码修改日志
    await logAction(userId, 'user_change_password', 'user', userId, {
      action: 'password_changed'
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: '修改密码失败'
    });
  }
});

// 获取所有角色信息（管理员专用）
router.get('/roles', authMiddleware, requireAdmin(), (req, res) => {
  try {
    const roles = Role.getAllRoles();
    
    res.json({
      roles: Object.values(roles).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        level: role.level,
        permissions: role.permissions
      }))
    });

  } catch (error) {
    console.error('获取角色信息错误:', error);
    res.status(500).json({
      error: 'Failed to get roles',
      message: '获取角色信息失败'
    });
  }
});

// 用户登出
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 记录登出日志
    await logAction(userId, 'user_logout', 'user', userId, {
      action: 'logout'
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: '登出失败'
    });
  }
});

module.exports = router; 