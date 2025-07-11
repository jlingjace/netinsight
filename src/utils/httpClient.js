import axios from 'axios';
import { notification } from 'antd';

const buildApiUrl = (endpoint) => {
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  return `${baseURL}${endpoint}`;
};

// Token 管理
export const tokenManager = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  isAuthenticated: () => !!localStorage.getItem('token')
};

// 数据提取工具
export const extractData = (response) => {
  return response.data?.data || response.data;
};

// 错误处理工具
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || `HTTP ${status} Error`;
    
    if (status === 401) {
      tokenManager.removeToken();
      window.location.href = '/login';
      return;
    }
    
    notification.error({
      message: 'API Error',
      description: message,
      duration: 4.5,
    });
    
    throw new Error(message);
  } else if (error.request) {
    const message = 'Network error - please check your connection';
    notification.error({
      message: 'Network Error',
      description: message,
      duration: 4.5,
    });
    throw new Error(message);
  } else {
    const message = error.message || 'An unexpected error occurred';
    notification.error({
      message: 'Error',
      description: message,
      duration: 4.5,
    });
    throw new Error(message);
  }
};

// 创建 axios 实例
const createHttpClient = () => {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const token = tokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 构建完整的 URL
      if (!config.url.startsWith('http')) {
        config.url = buildApiUrl(config.url);
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      handleApiError(error);
      return Promise.reject(error);
    }
  );

  return instance;
};

// HTTP 客户端实例
export const http = createHttpClient();

// 便捷方法
export const httpClient = {
  get: (url, config = {}) => http.get(url, config),
  post: (url, data = {}, config = {}) => http.post(url, data, config),
  put: (url, data = {}, config = {}) => http.put(url, data, config),
  patch: (url, data = {}, config = {}) => http.patch(url, data, config),
  delete: (url, config = {}) => http.delete(url, config),
};

// 默认导出
export default httpClient; 