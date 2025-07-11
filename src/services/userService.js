import httpClient from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/api';

class UserService {
  // 获取用户列表
  async getUsers(params = {}) {
    try {
      const response = await httpClient.get(API_ENDPOINTS.USERS.LIST, { params });
      return response.data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  // 获取用户统计信息
  async getUserStats() {
    try {
      const response = await httpClient.get(API_ENDPOINTS.USERS.STATS);
      return response.data;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  }

  // 获取用户详情
  async getUserById(id) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.USERS.LIST}/${id}`);
      return response.data.user;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  }

  // 创建用户
  async createUser(userData) {
    try {
      const response = await httpClient.post(API_ENDPOINTS.USERS.LIST, userData);
      return response.data;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  // 更新用户
  async updateUser(id, userData) {
    try {
      const response = await httpClient.put(`${API_ENDPOINTS.USERS.LIST}/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  // 删除用户
  async deleteUser(id) {
    try {
      const response = await httpClient.delete(`${API_ENDPOINTS.USERS.LIST}/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  // 切换用户状态
  async toggleUserStatus(id) {
    try {
      const response = await httpClient.post(API_ENDPOINTS.USERS.UPDATE_STATUS(id));
      return response.data;
    } catch (error) {
      console.error('切换用户状态失败:', error);
      throw error;
    }
  }

  // 重置用户密码
  async resetPassword(id, newPassword) {
    try {
      const response = await httpClient.post(`${API_ENDPOINTS.USERS.LIST}/${id}/reset-password`, {
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  // 获取用户操作日志
  async getUserLogs(id, params = {}) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.USERS.LIST}/${id}/logs`, { params });
      return response.data;
    } catch (error) {
      console.error('获取用户日志失败:', error);
      throw error;
    }
  }

  // 批量操作用户
  async batchUpdateUsers(userIds, updates) {
    try {
      const response = await httpClient.post(`${API_ENDPOINTS.USERS.LIST}/batch`, {
        userIds,
        updates
      });
      return response.data;
    } catch (error) {
      console.error('批量更新用户失败:', error);
      throw error;
    }
  }

  // 导出用户数据
  async exportUsers(params = {}) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.USERS.LIST}/export`, { 
        params,
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('导出用户数据失败:', error);
      throw error;
    }
  }

  // 导入用户数据
  async importUsers(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await httpClient.post(`${API_ENDPOINTS.USERS.LIST}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('导入用户数据失败:', error);
      throw error;
    }
  }

  // 验证用户名是否可用
  async checkUsernameAvailability(username) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.USERS.LIST}/check-username`, {
        params: { username }
      });
      return response.data.available;
    } catch (error) {
      console.error('检查用户名可用性失败:', error);
      throw error;
    }
  }

  // 验证邮箱是否可用
  async checkEmailAvailability(email) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.USERS.LIST}/check-email`, {
        params: { email }
      });
      return response.data.available;
    } catch (error) {
      console.error('检查邮箱可用性失败:', error);
      throw error;
    }
  }

  // 发送邮箱验证
  async sendEmailVerification(id) {
    try {
      const response = await httpClient.post(`${API_ENDPOINTS.USERS.LIST}/${id}/send-verification`);
      return response.data;
    } catch (error) {
      console.error('发送邮箱验证失败:', error);
      throw error;
    }
  }

  // 获取角色权限信息
  async getRolePermissions(role) {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.AUTH.ROLES}/${role}/permissions`);
      return response.data.permissions;
    } catch (error) {
      console.error('获取角色权限失败:', error);
      throw error;
    }
  }

  // 获取所有角色信息
  async getAllRoles() {
    try {
      const response = await httpClient.get(API_ENDPOINTS.AUTH.ROLES);
      return response.data.roles;
    } catch (error) {
      console.error('获取角色信息失败:', error);
      throw error;
    }
  }
}

export const userService = new UserService(); 