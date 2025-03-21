import api from './api';

// 文件接口定义
export interface FileInfo {
  id: string;
  filename: string;
  fileType?: string;
  fileSize?: string;
  rawSize?: number;
  uploadTime?: string;
  timestamp?: number;
  status: string;
  statusText?: string;
  analysisType?: string;
  hasTlsKey?: boolean;
  userId?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
  per_page: number;
}

// 文件服务
export const fileService = {
  // 获取文件列表
  getFiles: async (page: number = 1, perPage: number = 10): Promise<FileInfo[]> => {
    try {
      const response = await api.get('/files/');
      return response.data || [];
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw error;
    }
  },
  
  // 上传文件
  uploadFile: async (file: File, tlsKeyFile?: File | null, analysisType: string = 'comprehensive'): Promise<{ fileId: string }> => {
    try {
      console.log('准备上传文件:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        tlsKeyFile: tlsKeyFile ? {
          name: tlsKeyFile.name,
          size: tlsKeyFile.size,
          type: tlsKeyFile.type
        } : null,
        analysisType
      });
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 添加TLS密钥文件（如果有）
      if (tlsKeyFile) {
        formData.append('tls_key', tlsKeyFile);
      }
      
      // 添加分析类型
      formData.append('analysis_type', analysisType);
      
      // 直接检查formData内容
      console.log('FormData已准备，内容:');
      for (let entry of Array.from(formData.entries())) {
        if (entry[1] instanceof File) {
          console.log(`- ${entry[0]}: File(${(entry[1] as File).name}, ${(entry[1] as File).type}, ${(entry[1] as File).size} bytes)`);
        } else {
          console.log(`- ${entry[0]}: ${entry[1]}`);
        }
      }
      
      // 打印完整请求URL
      const url = '/files/';
      console.log(`完整请求URL: ${api.defaults.baseURL}${url}`);
      
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // 打印完整响应结果
      console.log('上传响应:', response.data);
      
      // 处理后端返回的数据格式
      const fileData = response.data.file || response.data;
      console.log('处理后的文件数据:', fileData);
      
      return {
        fileId: fileData.id,
      };
    } catch (error: any) {
      console.error('文件上传失败:', error);
      if (error.response) {
        console.error('错误状态:', error.response.status);
        console.error('错误数据:', error.response.data);
        console.error('错误头信息:', error.response.headers);
      }
      throw error;
    }
  },
  
  // 获取文件详情
  getFileDetails: async (fileId: string): Promise<FileInfo> => {
    try {
      const response = await api.get(`/files/${fileId}/`);
      return response.data;
    } catch (error) {
      console.error('获取文件详情失败:', error);
      throw error;
    }
  },
  
  // 删除文件
  deleteFile: async (fileId: string): Promise<boolean> => {
    try {
      await api.delete(`/files/${fileId}/`);
      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      throw error;
    }
  }
};

export default fileService; 