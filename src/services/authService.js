import { http, extractData, tokenManager } from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * 认证服务
 */
export const authService = {
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.email - 邮箱
   * @param {string} credentials.password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(credentials) {
    try {
      const response = await http.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const data = extractData(response);
      
      // 保存token和用户信息
      if (data.token) {
        tokenManager.setToken(data.token);
      }
      if (data.user) {
        tokenManager.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * 用户注册
   * @param {Object} userInfo - 用户信息
   * @param {string} userInfo.email - 邮箱
   * @param {string} userInfo.password - 密码
   * @param {string} userInfo.name - 姓名
   * @returns {Promise<Object>} 注册结果
   */
  async register(userInfo) {
    try {
      const response = await http.post(API_ENDPOINTS.AUTH.REGISTER, userInfo);
      return extractData(response);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  /**
   * 获取当前用户信息
   * @returns {Promise<Object>} 用户信息
   */
  async getCurrentUser() {
    try {
      const response = await http.get(API_ENDPOINTS.AUTH.ME);
      const data = extractData(response);
      
      // 更新本地用户信息
      if (data.user) {
        tokenManager.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  /**
   * 用户登出
   */
  async logout() {
    try {
      // 清除本地存储
      tokenManager.clear();
      
      // 可选：调用后端登出接口
      // await http.post(API_ENDPOINTS.AUTH.LOGOUT);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // 即使后端调用失败，也要清除本地存储
      tokenManager.clear();
      throw error;
    }
  },

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isAuthenticated() {
    return !!tokenManager.getToken();
  },

  /**
   * 获取当前用户信息（从本地存储）
   * @returns {Object|null} 用户信息
   */
  getCurrentUserFromStorage() {
    return tokenManager.getUser();
  },

  /**
   * 检查用户权限
   * @param {string} requiredRole - 需要的角色
   * @returns {boolean} 是否有权限
   */
  hasPermission(requiredRole) {
    const user = tokenManager.getUser();
    if (!user) return false;
    
    // 角色权限级别：admin > user
    const roleHierarchy = {
      'admin': 2,
      'user': 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
};

export default authService; 