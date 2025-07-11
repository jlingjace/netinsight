import axios from 'axios';
import { message } from 'antd';
import API_CONFIG, { buildApiUrl } from '../config/api';

// 创建axios实例
const httpClient = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token管理
const TOKEN_KEY = 'netinsight_token';
const USER_KEY = 'netinsight_user';

export const tokenManager = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  
  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),
  
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

// 请求拦截器 - 添加认证token
httpClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 记录请求日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和token过期
httpClient.interceptors.response.use(
  (response) => {
    // 记录响应日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('Response interceptor error:', error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      // 处理不同的HTTP状态码
      switch (status) {
        case 401:
          // 未授权 - 清除token并重定向到登录页
          tokenManager.clear();
          message.error('登录已过期，请重新登录');
          
          // 如果不在登录页，则跳转到登录页
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          message.error('权限不足，无法访问此资源');
          break;
          
        case 404:
          message.error('请求的资源不存在');
          break;
          
        case 413:
          message.error('文件太大，请选择较小的文件');
          break;
          
        case 429:
          message.error('请求过于频繁，请稍后再试');
          break;
          
        case 500:
          message.error('服务器内部错误，请稍后再试');
          break;
          
        default:
          // 显示后端返回的错误信息
          const errorMessage = data?.message || data?.error || '请求失败，请稍后再试';
          message.error(errorMessage);
      }
    } else if (error.request) {
      // 网络错误
      message.error('网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      message.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// HTTP方法封装
export const http = {
  // GET请求
  get: (url, config = {}) => httpClient.get(url, config),
  
  // POST请求
  post: (url, data = {}, config = {}) => httpClient.post(url, data, config),
  
  // PUT请求
  put: (url, data = {}, config = {}) => httpClient.put(url, data, config),
  
  // DELETE请求
  delete: (url, config = {}) => httpClient.delete(url, config),
  
  // PATCH请求
  patch: (url, data = {}, config = {}) => httpClient.patch(url, data, config),
  
  // 文件上传
  upload: (url, formData, config = {}) => {
    return httpClient.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers
      }
    });
  },
  
  // 文件下载
  download: (url, config = {}) => {
    return httpClient.get(url, {
      ...config,
      responseType: 'blob'
    });
  }
};

// 响应数据提取器
export const extractData = (response) => response.data;

// 错误处理器
export const handleApiError = (error, defaultMessage = '操作失败') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  return defaultMessage;
};

export default httpClient; 