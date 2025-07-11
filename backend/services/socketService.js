const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3002"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // 认证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        
        next();
      } catch (error) {
        console.error('Socket authentication failed:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // 连接处理
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('Socket.IO service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const username = socket.username;
    
    console.log(`User ${username} (${userId}) connected via socket ${socket.id}`);
    
    // 存储用户连接
    this.connectedUsers.set(userId, socket);
    this.userSockets.set(socket.id, userId);

    // 加入用户房间
    socket.join(`user_${userId}`);
    
    // 如果是管理员，加入管理员房间
    if (socket.role === 'admin') {
      socket.join('admin');
    }

    // 发送连接确认
    socket.emit('connected', {
      message: 'Successfully connected to real-time service',
      userId,
      timestamp: new Date().toISOString()
    });

    // 处理客户端事件
    this.setupEventHandlers(socket);

    // 记录连接日志
    logAction(userId, 'socket.connect', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  }

  setupEventHandlers(socket) {
    const userId = socket.userId;

    // 订阅分析进度
    socket.on('subscribe_analysis', (data) => {
      const { fileIds } = data;
      if (Array.isArray(fileIds)) {
        fileIds.forEach(fileId => {
          socket.join(`analysis_${fileId}`);
        });
        socket.emit('subscribed', { 
          type: 'analysis', 
          fileIds,
          message: 'Subscribed to analysis progress updates'
        });
      }
    });

    // 取消订阅分析进度
    socket.on('unsubscribe_analysis', (data) => {
      const { fileIds } = data;
      if (Array.isArray(fileIds)) {
        fileIds.forEach(fileId => {
          socket.leave(`analysis_${fileId}`);
        });
        socket.emit('unsubscribed', { 
          type: 'analysis', 
          fileIds,
          message: 'Unsubscribed from analysis progress updates'
        });
      }
    });

    // 请求实时状态
    socket.on('request_status', async (data) => {
      try {
        const { type, ids } = data;
        
        if (type === 'files' && Array.isArray(ids)) {
          const { getDatabase } = require('../config/database');
          const db = getDatabase();
          
          const files = await db.all(
            `SELECT id, original_name, status, analysis_progress 
             FROM files 
             WHERE id IN (${ids.map(() => '?').join(',')}) 
             AND (user_id = ? OR ? = "admin")`,
            [...ids, userId, socket.role]
          );
          
          socket.emit('status_update', {
            type: 'files',
            data: files,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error handling status request:', error);
        socket.emit('error', { message: 'Failed to get status' });
      }
    });

    // 断开连接处理
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.username} (${userId}) disconnected: ${reason}`);
      
      // 清理连接记录
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      
      // 记录断开连接日志
      logAction(userId, 'socket.disconnect', {
        socketId: socket.id,
        reason,
        timestamp: new Date().toISOString()
      });
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  }

  // 发送分析进度更新
  emitAnalysisProgress(fileId, progress) {
    if (!this.io) return;

    const progressData = {
      fileId,
      progress: Math.round(progress),
      timestamp: new Date().toISOString(),
      type: 'analysis_progress'
    };

    // 发送到订阅了此文件分析的客户端
    this.io.to(`analysis_${fileId}`).emit('analysis_progress', progressData);
    
    // 发送到管理员
    this.io.to('admin').emit('analysis_progress', progressData);
  }

  // 发送分析状态更新
  emitAnalysisStatus(fileId, status, error = null) {
    if (!this.io) return;

    const statusData = {
      fileId,
      status,
      error,
      timestamp: new Date().toISOString(),
      type: 'analysis_status'
    };

    // 发送到订阅了此文件分析的客户端
    this.io.to(`analysis_${fileId}`).emit('analysis_status', statusData);
    
    // 发送到管理员
    this.io.to('admin').emit('analysis_status', statusData);
  }

  // 发送批量操作进度
  emitBatchProgress(batchId, progress, summary) {
    if (!this.io) return;

    const progressData = {
      batchId,
      progress,
      summary,
      timestamp: new Date().toISOString(),
      type: 'batch_progress'
    };

    // 发送到所有连接的客户端
    this.io.emit('batch_progress', progressData);
  }

  // 发送系统通知
  emitSystemNotification(message, type = 'info', targetUsers = null) {
    if (!this.io) return;

    const notification = {
      message,
      type,
      timestamp: new Date().toISOString()
    };

    if (targetUsers && Array.isArray(targetUsers)) {
      // 发送给特定用户
      targetUsers.forEach(userId => {
        this.io.to(`user_${userId}`).emit('notification', notification);
      });
    } else {
      // 发送给所有用户
      this.io.emit('notification', notification);
    }
  }

  // 获取在线用户数量
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // 获取在线用户列表
  getOnlineUsers() {
    const users = [];
    this.connectedUsers.forEach((socket, userId) => {
      users.push({
        userId,
        username: socket.username,
        role: socket.role,
        connectedAt: socket.handshake.time
      });
    });
    return users;
  }

  // 向特定用户发送消息
  emitToUser(userId, event, data) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // 向管理员发送消息
  emitToAdmins(event, data) {
    if (!this.io) return;
    this.io.to('admin').emit(event, data);
  }
}

// 单例模式
const socketService = new SocketService();

module.exports = socketService; 