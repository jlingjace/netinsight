import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// 请求拦截器，添加token和日志
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 调试日志
    console.log(`请求: ${config.method?.toUpperCase()} ${config.url}`, config.data || {});
    
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误和调试
api.interceptors.response.use(
  (response) => {
    console.log(`响应: ${response.status}`, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 打印详细错误信息
    console.error('API错误:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: originalRequest?.url,
      method: originalRequest?.method
    });
    
    // 如果是401错误（未授权）且没有重试过，尝试刷新token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // 没有刷新令牌，需要重新登录
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // 尝试刷新令牌
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          }
        );
        
        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);
        
        // 使用新token重试原始请求
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新令牌失败，需要重新登录
        console.error('刷新令牌失败:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// 身份验证服务
export const authService = {
  // 用户注册
  register: async (userData: { email: string; password: string; name?: string }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  },
  
  // 用户登录
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('登录请求:', credentials);
      const response = await api.post('/auth/login', credentials);
      
      // 存储令牌
      const { access_token, refresh_token, user } = response.data;
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },
  
  // 登出
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  
  // 获取用户信息
  getUserInfo: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  },
  
  // 检查是否已认证
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  // 修改密码
  changePassword: async (passwordData: { oldPassword: string; newPassword: string }) => {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }
};

export default api;