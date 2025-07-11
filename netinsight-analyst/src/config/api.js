// API配置
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3002',
  API_PREFIX: '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// API端点
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    ROLES: '/auth/roles'
  },
  
  // 文件管理
  FILES: {
    UPLOAD: '/files/upload',
    LIST: '/files',
    DETAIL: (id) => `/files/${id}`,
    DOWNLOAD: (id) => `/files/${id}/download`,
    DELETE: (id) => `/files/${id}`,
    STATS: '/files/stats/summary'
  },
  
  // 分析功能
  ANALYSIS: {
    START: (fileId) => `/analysis/start/${fileId}`,
    LIST: '/analysis',
    DETAIL: (id) => `/analysis/${id}`,
    STATS: '/analysis/stats/summary'
  },
  
  // 项目管理
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    DETAIL: (id) => `/projects/${id}`,
    UPDATE: (id) => `/projects/${id}`,
    DELETE: (id) => `/projects/${id}`,
    ADD_FILES: (id) => `/projects/${id}/files`
  },
  
  // 仪表板
  DASHBOARD: {
    OVERVIEW: '/dashboard/overview',
    METRICS: '/dashboard/metrics',
    SYSTEM_STATUS: '/dashboard/system-status'
  },
  
  // 用户管理
  USERS: {
    LIST: '/users',
    STATS: '/users/stats',
    LOGS: '/users/logs',
    UPDATE_STATUS: (id) => `/users/${id}/status`
  }
};

// 构建完整的API URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${endpoint}`;
};

export default API_CONFIG; 