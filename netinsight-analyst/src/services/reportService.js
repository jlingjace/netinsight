import httpClient from '../utils/httpClient';
import { message } from 'antd';

class ReportService {
  // 生成PDF报告
  async generatePDFReport(fileId, options = {}) {
    try {
      const { format = 'A4', orientation = 'portrait' } = options;
      
      const response = await httpClient.get(`/analysis/${fileId}/report/pdf`, {
        params: { format, orientation },
        responseType: 'blob'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analysis_report_${fileId}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // 清理
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('PDF报告下载成功');
      return { success: true };
      
    } catch (error) {
      console.error('PDF报告生成失败:', error);
      message.error('PDF报告生成失败');
      throw error;
    }
  }

  // 预览报告
  async previewReport(fileId) {
    try {
      const response = await httpClient.get(`/analysis/${fileId}/report/preview`, {
        responseType: 'text'
      });

      // 在新窗口中打开预览
      const newWindow = window.open('', '_blank');
      newWindow.document.write(response.data);
      newWindow.document.close();
      
      return { success: true };
      
    } catch (error) {
      console.error('报告预览失败:', error);
      message.error('报告预览失败');
      throw error;
    }
  }

  // 获取报告配置选项
  getReportOptions() {
    return {
      formats: [
        { label: 'A4', value: 'A4' },
        { label: 'A3', value: 'A3' },
        { label: 'Letter', value: 'Letter' },
        { label: 'Legal', value: 'Legal' }
      ],
      orientations: [
        { label: '纵向', value: 'portrait' },
        { label: '横向', value: 'landscape' }
      ]
    };
  }

  // 批量生成报告
  async batchGenerateReports(fileIds, options = {}) {
    try {
      const results = [];
      const errors = [];

      for (const fileId of fileIds) {
        try {
          await this.generatePDFReport(fileId, options);
          results.push({ fileId, success: true });
        } catch (error) {
          errors.push({ fileId, error: error.message });
        }
      }

      if (errors.length > 0) {
        message.warning(`${results.length} 个报告生成成功，${errors.length} 个失败`);
      } else {
        message.success(`成功生成 ${results.length} 个报告`);
      }

      return { results, errors };
      
    } catch (error) {
      console.error('批量报告生成失败:', error);
      message.error('批量报告生成失败');
      throw error;
    }
  }
}

export const reportService = new ReportService(); 