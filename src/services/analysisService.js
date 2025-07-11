import { http, extractData } from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * 分析服务
 */
export const analysisService = {
  /**
   * 开始分析文件
   * @param {number} fileId - 文件ID
   * @returns {Promise<Object>} 分析结果
   */
  async startAnalysis(fileId) {
    try {
      const response = await http.post(API_ENDPOINTS.ANALYSIS.START(fileId));
      return extractData(response);
    } catch (error) {
      console.error('Start analysis error:', error);
      throw error;
    }
  },

  /**
   * 获取分析列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 分析状态
   * @returns {Promise<Object>} 分析列表
   */
  async getAnalysisList(params = {}) {
    try {
      const response = await http.get(API_ENDPOINTS.ANALYSIS.LIST, { params });
      return extractData(response);
    } catch (error) {
      console.error('Get analysis list error:', error);
      throw error;
    }
  },

  /**
   * 获取分析详情
   * @param {number} analysisId - 分析ID
   * @returns {Promise<Object>} 分析详情
   */
  async getAnalysisDetail(analysisId) {
    try {
      const response = await http.get(API_ENDPOINTS.ANALYSIS.DETAIL(analysisId));
      return extractData(response);
    } catch (error) {
      console.error('Get analysis detail error:', error);
      throw error;
    }
  },

  /**
   * 获取分析统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getAnalysisStats() {
    try {
      const response = await http.get(API_ENDPOINTS.ANALYSIS.STATS);
      return extractData(response);
    } catch (error) {
      console.error('Get analysis stats error:', error);
      throw error;
    }
  },

  /**
   * 获取分析状态显示信息
   * @param {string} status - 分析状态
   * @returns {Object} 状态信息
   */
  getAnalysisStatusInfo(status) {
    const statusMap = {
      'pending': { text: '等待中', color: 'default' },
      'running': { text: '分析中', color: 'processing' },
      'completed': { text: '已完成', color: 'success' },
      'failed': { text: '失败', color: 'error' }
    };
    
    return statusMap[status] || { text: '未知', color: 'default' };
  },

  /**
   * 格式化分析结果数据
   * @param {Object} result - 原始分析结果
   * @returns {Object} 格式化后的结果
   */
  formatAnalysisResult(result) {
    if (!result) return null;

    return {
      ...result,
      // 格式化协议分布数据
      protocolDistribution: result.protocol_distribution?.map(item => ({
        protocol: item.protocol,
        packets: item.packets,
        bytes: item.bytes,
        percentage: ((item.packets / result.total_packets) * 100).toFixed(2)
      })) || [],
      
      // 格式化流量统计
      trafficStats: {
        totalPackets: result.total_packets || 0,
        totalBytes: result.total_bytes || 0,
        duration: result.duration || 0,
        avgPacketSize: result.total_packets ? 
          Math.round(result.total_bytes / result.total_packets) : 0
      },
      
      // 格式化安全建议
      securityRecommendations: result.security_recommendations?.map(rec => ({
        level: rec.level,
        title: rec.title,
        description: rec.description,
        action: rec.action
      })) || []
    };
  }
};

export default analysisService; 