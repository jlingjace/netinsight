import api from './api';

// 报告接口定义
export interface Report {
  id: string;
  title: string;
  reportType: string;
  summary: string;
  status: string;
  metrics: {
    totalPackets: number;
    totalConnections: number;
    uniqueIps: number;
    averageLatency: number;
    packetLoss: number;
    errorRate: number;
  };
  security: {
    score: number;
    highSeverityEvents: number;
    mediumSeverityEvents: number;
    lowSeverityEvents: number;
  };
  fileId: string;
  fileName: string;
  userId: string;
  createdAt: string;
  completedAt: string;
  detailedData?: any;
  events?: ReportEvent[];
  httpRequests?: HttpRequest[];
}

// 安全事件接口定义
export interface ReportEvent {
  id: number;
  reportId: string;
  eventType: string;
  severity: string;
  sourceIp: string;
  targetIp?: string;
  description: string;
  details?: any;
  timestamp: string;
  status: string;
}

// HTTP请求接口定义
export interface HttpRequest {
  id: number;
  reportId: string;
  url: string;
  method: string;
  statusCode: number;
  contentType?: string;
  duration: number;
  size: number;
  timestamp: string;
  headers?: any;
  requestBody?: string;
  responseBody?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
  per_page: number;
}

// 报告服务
export const reportService = {
  // 获取报告列表
  getReports: async (page: number = 1, perPage: number = 10): Promise<PaginatedResponse<Report>> => {
    try {
      const response = await api.get('/reports', {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      console.error('获取报告列表失败:', error);
      throw error;
    }
  },
  
  // 获取单个报告详情
  getReportDetail: async (reportId: string, includeHttp: boolean = false): Promise<Report> => {
    try {
      const response = await api.get(`/reports/${reportId}`, {
        params: { include_http: includeHttp }
      });
      return response.data;
    } catch (error) {
      console.error('获取报告详情失败:', error);
      throw error;
    }
  },
  
  // 为文件生成报告
  generateReport: async (fileId: string, analysisType: string = 'comprehensive'): Promise<{ reportId: string }> => {
    try {
      const response = await api.post(`/reports/generate/${fileId}`, {
        analysis_type: analysisType
      });
      return {
        reportId: response.data.reportId
      };
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  },
  
  // 更新事件状态
  updateEventStatus: async (eventId: number, status: 'active' | 'resolved' | 'ignored'): Promise<{ eventId: number; status: string }> => {
    try {
      const response = await api.put(`/reports/events/${eventId}/update-status`, {
        status
      });
      return {
        eventId: response.data.eventId,
        status: response.data.status
      };
    } catch (error) {
      console.error('更新事件状态失败:', error);
      throw error;
    }
  },
  
  // 导出报告
  exportReport: async (reportId: string): Promise<any> => {
    try {
      const response = await api.get(`/reports/export/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('导出报告失败:', error);
      throw error;
    }
  }
}; 