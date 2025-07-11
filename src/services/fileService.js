import { http, extractData } from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/api';
import { message } from 'antd';

/**
 * 文件管理服务
 */
export const fileService = {
  /**
   * 上传文件
   * @param {FileList|File[]} files - 要上传的文件
   * @param {Function} onProgress - 上传进度回调
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFiles(files, onProgress) {
    try {
      const formData = new FormData();
      
      // 添加文件到FormData
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      const response = await http.upload(API_ENDPOINTS.FILES.UPLOAD, formData, {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      
      return extractData(response);
    } catch (error) {
      console.error('Upload files error:', error);
      throw error;
    }
  },

  /**
   * 获取文件列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 文件状态
   * @param {string} params.fileType - 文件类型
   * @returns {Promise<Object>} 文件列表
   */
  async getFiles(params = {}) {
    try {
      const response = await http.get(API_ENDPOINTS.FILES.LIST, { params });
      return extractData(response);
    } catch (error) {
      console.error('Get files error:', error);
      throw error;
    }
  },

  /**
   * 获取文件详情
   * @param {number} fileId - 文件ID
   * @returns {Promise<Object>} 文件详情
   */
  async getFileDetail(fileId) {
    try {
      const response = await http.get(API_ENDPOINTS.FILES.DETAIL(fileId));
      return extractData(response);
    } catch (error) {
      console.error('Get file detail error:', error);
      throw error;
    }
  },

  /**
   * 删除文件
   * @param {number} fileId - 文件ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFile(fileId) {
    try {
      const response = await http.delete(API_ENDPOINTS.FILES.DELETE(fileId));
      return extractData(response);
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  },

  /**
   * 批量删除文件
   * @param {number[]} fileIds - 文件ID数组
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFiles(fileIds) {
    try {
      const response = await http.delete(API_ENDPOINTS.FILES.LIST, {
        data: { fileIds }
      });
      return extractData(response);
    } catch (error) {
      console.error('Delete files error:', error);
      throw error;
    }
  },

  /**
   * 批量分析文件
   * @param {number[]} fileIds - 文件ID数组
   * @returns {Promise<Object>} 批量操作结果
   */
  async batchAnalyze(fileIds) {
    try {
      const response = await http.post(API_ENDPOINTS.ANALYSIS.BATCH_START, { fileIds });
      return extractData(response);
    } catch (error) {
      console.error('批量分析失败:', error);
      throw error;
    }
  },

  /**
   * 获取批量操作状态
   * @param {string} batchId - 批量操作ID
   * @returns {Promise<Object>} 批量操作状态
   */
  async getBatchStatus(batchId) {
    try {
      const response = await http.get(API_ENDPOINTS.FILES.BATCH_STATUS(batchId));
      return extractData(response);
    } catch (error) {
      console.error('获取批量操作状态失败:', error);
      throw error;
    }
  },

  /**
   * 批量下载文件
   * @param {number[]} fileIds - 文件ID数组
   * @returns {Promise<Object>} 批量下载结果
   */
  async batchDownload(fileIds) {
    try {
      const response = await http.post(API_ENDPOINTS.FILES.BATCH_DOWNLOAD, { fileIds }, { responseType: 'blob' });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch_files_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      
      // 清理
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('文件下载成功');
      return extractData(response);
    } catch (error) {
      console.error('批量下载失败:', error);
      message.error('文件下载失败');
      throw error;
    }
  },

  /**
   * 下载文件
   * @param {number} fileId - 文件ID
   * @param {string} fileName - 文件名
   * @returns {Promise<void>}
   */
  async downloadFile(fileId, fileName) {
    try {
      const response = await http.download(API_ENDPOINTS.FILES.DOWNLOAD(fileId));
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // 清理
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('文件下载成功');
    } catch (error) {
      console.error('Download file error:', error);
      message.error('文件下载失败');
      throw error;
    }
  },

  /**
   * 获取文件统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getFileStats() {
    try {
      const response = await http.get(API_ENDPOINTS.FILES.STATS);
      return extractData(response);
    } catch (error) {
      console.error('Get file stats error:', error);
      throw error;
    }
  },

  /**
   * 验证文件类型
   * @param {File} file - 文件对象
   * @returns {boolean} 是否有效
   */
  validateFileType(file) {
    const allowedTypes = ['.pcap', '.pcapng', '.har'];
    const fileName = file.name.toLowerCase();
    const isValid = allowedTypes.some(type => fileName.endsWith(type));
    
    console.log('文件类型验证:', {
      fileName: file.name,
      fileType: file.type,
      isValid: isValid
    });
    
    return isValid;
  },

  /**
   * 验证文件大小
   * @param {File} file - 文件对象
   * @param {number} maxSize - 最大大小（字节）
   * @returns {boolean} 是否有效
   */
  validateFileSize(file, maxSize = 100 * 1024 * 1024) { // 默认100MB
    return file.size <= maxSize;
  },

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 获取文件状态显示文本
   * @param {string} status - 文件状态
   * @returns {Object} 状态信息
   */
  getFileStatusInfo(status) {
    const statusMap = {
      'uploaded': { text: '已上传', color: 'blue' },
      'processing': { text: '处理中', color: 'orange' },
      'completed': { text: '已完成', color: 'green' },
      'error': { text: '处理失败', color: 'red' },
      'pending': { text: '等待中', color: 'default' }
    };
    
    return statusMap[status] || { text: '未知', color: 'default' };
  }
};

export default fileService; 