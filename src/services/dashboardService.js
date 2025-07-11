import { http, extractData } from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * 仪表板服务
 */
export const dashboardService = {
  /**
   * 获取仪表板概览数据
   * @returns {Promise<Object>} 概览数据
   */
  async getOverview() {
    try {
      const response = await http.get(API_ENDPOINTS.DASHBOARD.OVERVIEW);
      return extractData(response);
    } catch (error) {
      console.error('Get dashboard overview error:', error);
      throw error;
    }
  },

  /**
   * 获取仪表板指标数据
   * @param {Object} params - 查询参数
   * @param {string} params.timeRange - 时间范围 (1h, 24h, 7d, 30d)
   * @returns {Promise<Object>} 指标数据
   */
  async getMetrics(params = {}) {
    try {
      const response = await http.get(API_ENDPOINTS.DASHBOARD.METRICS, { params });
      return extractData(response);
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      throw error;
    }
  },

  /**
   * 获取系统状态
   * @returns {Promise<Object>} 系统状态
   */
  async getSystemStatus() {
    try {
      const response = await http.get(API_ENDPOINTS.DASHBOARD.SYSTEM_STATUS);
      return extractData(response);
    } catch (error) {
      console.error('Get system status error:', error);
      throw error;
    }
  },

  /**
   * 格式化文件类型分布数据
   * @param {Array} data - 原始数据
   * @returns {Array} 格式化后的数据
   */
  formatFileTypeDistribution(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      type: item.file_type?.toUpperCase() || '未知',
      count: item.count || 0,
      percentage: item.percentage || 0
    }));
  },

  /**
   * 格式化活动趋势数据
   * @param {Array} data - 原始数据
   * @returns {Array} 格式化后的数据
   */
  formatActivityTrend(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      date: item.date,
      uploads: item.uploads || 0,
      analyses: item.analyses || 0,
      projects: item.projects || 0
    }));
  },

  /**
   * 格式化性能指标数据
   * @param {Object} metrics - 原始指标数据
   * @returns {Object} 格式化后的指标
   */
  formatPerformanceMetrics(metrics) {
    if (!metrics) return {};
    
    return {
      cpu: {
        usage: metrics.cpu_usage || 0,
        cores: metrics.cpu_cores || 1,
        load: metrics.cpu_load || []
      },
      memory: {
        usage: metrics.memory_usage || 0,
        total: metrics.memory_total || 0,
        used: metrics.memory_used || 0,
        free: metrics.memory_free || 0
      },
      disk: {
        usage: metrics.disk_usage || 0,
        total: metrics.disk_total || 0,
        used: metrics.disk_used || 0,
        free: metrics.disk_free || 0
      },
      network: {
        bytesIn: metrics.network_bytes_in || 0,
        bytesOut: metrics.network_bytes_out || 0,
        packetsIn: metrics.network_packets_in || 0,
        packetsOut: metrics.network_packets_out || 0
      }
    };
  },

  /**
   * 获取状态颜色
   * @param {string} status - 状态值
   * @param {number} value - 数值
   * @returns {string} 颜色值
   */
  getStatusColor(status, value) {
    if (status === 'error' || value >= 90) return '#ff4d4f';
    if (status === 'warning' || value >= 70) return '#faad14';
    if (status === 'success' || value < 70) return '#52c41a';
    return '#d9d9d9';
  },

  /**
   * 格式化字节大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 格式化百分比
   * @param {number} value - 数值
   * @param {number} total - 总数
   * @returns {string} 百分比字符串
   */
  formatPercentage(value, total) {
    if (!total || total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  },

  /**
   * 格式化时间范围标签
   * @param {string} timeRange - 时间范围
   * @returns {string} 标签
   */
  getTimeRangeLabel(timeRange) {
    const labels = {
      '1h': '最近1小时',
      '24h': '最近24小时',
      '7d': '最近7天',
      '30d': '最近30天'
    };
    
    return labels[timeRange] || '未知时间范围';
  }
};

export default dashboardService; 