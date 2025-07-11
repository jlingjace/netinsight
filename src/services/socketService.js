import { io } from 'socket.io-client';
import { message } from 'antd';
import { tokenManager } from '../utils/httpClient';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
  }

  // 连接到WebSocket服务器
  connect() {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const token = tokenManager.getToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      this.socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3002', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      // 连接成功
      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket.id);
        this.connected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      // 连接确认
      this.socket.on('connected', (data) => {
        console.log('WebSocket connection confirmed:', data);
        message.success('实时服务连接成功');
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.connected = false;
        
        if (error.message.includes('Authentication')) {
          message.error('WebSocket认证失败，请重新登录');
          reject(error);
        } else {
          this.handleReconnect();
          reject(error);
        }
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.connected = false;
        
        if (reason === 'io server disconnect') {
          // 服务器主动断开，需要重新连接
          this.handleReconnect();
        }
      });

      // 设置事件监听器
      this.setupEventListeners();
    });
  }

  // 设置事件监听器
  setupEventListeners() {
    if (!this.socket) return;

    // 分析进度更新
    this.socket.on('analysis_progress', (data) => {
      this.emit('analysisProgress', data);
    });

    // 分析状态更新
    this.socket.on('analysis_status', (data) => {
      this.emit('analysisStatus', data);
    });

    // 批量操作进度
    this.socket.on('batch_progress', (data) => {
      this.emit('batchProgress', data);
    });

    // 系统通知
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
      this.showNotification(data);
    });

    // 状态更新
    this.socket.on('status_update', (data) => {
      this.emit('statusUpdate', data);
    });

    // 错误处理
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      message.error(`实时服务错误: ${error.message}`);
    });
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      message.error('实时服务连接失败，请刷新页面重试');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms 后重试...`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // 订阅分析进度
  subscribeToAnalysis(fileIds) {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot subscribe to analysis');
      return;
    }

    this.socket.emit('subscribe_analysis', { fileIds });
  }

  // 取消订阅分析进度
  unsubscribeFromAnalysis(fileIds) {
    if (!this.socket?.connected) return;
    this.socket.emit('unsubscribe_analysis', { fileIds });
  }

  // 请求实时状态
  requestStatus(type, ids) {
    if (!this.socket?.connected) return;
    this.socket.emit('request_status', { type, ids });
  }

  // 事件监听器管理
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // 显示通知
  showNotification(notification) {
    const { type, message: msg } = notification;
    
    switch (type) {
      case 'success':
        message.success(msg);
        break;
      case 'warning':
        message.warning(msg);
        break;
      case 'error':
        message.error(msg);
        break;
      case 'info':
      default:
        message.info(msg);
        break;
    }
  }

  // 获取连接状态
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // 获取Socket ID
  getSocketId() {
    return this.socket?.id;
  }
}

// 单例模式
const socketService = new SocketService();

export default socketService; 