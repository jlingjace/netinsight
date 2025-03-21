import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, Upload, Button, Select, Input, message, Typography, 
  List, Tag, Space, Divider 
} from 'antd';
import { 
  InboxOutlined, 
  FileOutlined, 
  EyeOutlined,
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { fileService, FileInfo } from '../../services/fileService';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './style.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

// 支持的文件类型
const ACCEPTED_FILE_TYPES = ['.har', '.pcap', '.pcapng'];

// 文件类型标签颜色映射
const FILE_TYPE_COLORS: Record<string, string> = {
  'har': 'blue',
  'pcap': 'green',
  'pcapng': 'purple'
};

const FileUpload: React.FC = () => {
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tlsKeyFile, setTlsKeyFile] = useState<UploadFile | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('comprehensive');
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingFiles, setFetchingFiles] = useState<boolean>(true);
  
  // 获取用户文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setFetchingFiles(true);
        const response = await fileService.getFiles();
        setRecentFiles(response);
      } catch (err) {
        console.error('获取文件列表失败:', err);
        message.error('获取文件列表失败，请稍后重试');
      } finally {
        setFetchingFiles(false);
      }
    };

    fetchFiles();
  }, []);
  
  const handleBeforeUpload = (file: File) => {
    const isAcceptedType = ACCEPTED_FILE_TYPES.some(type => 
      file.name.toLowerCase().endsWith(type)
    );
    
    if (!isAcceptedType) {
      message.error(`${file.name} 不是支持的文件类型`);
      return Upload.LIST_IGNORE;
    }
    
    const isLt500M = file.size / 1024 / 1024 < 500;
    if (!isLt500M) {
      message.error('文件大小不能超过500MB');
      return Upload.LIST_IGNORE;
    }
    
    return false; // 阻止自动上传
  };
  
  const handleTlsKeyBeforeUpload = (file: File) => {
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('TLS密钥文件大小不能超过5MB');
      return Upload.LIST_IGNORE;
    }
    
    // 转换File为UploadFile，使用类型断言
    const uploadFile: UploadFile = {
      uid: `tls-key-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file as any
    };
    
    setTlsKeyFile(uploadFile);
    return false; // 阻止自动上传
  };
  
  const handleChange: UploadProps['onChange'] = ({ fileList }) => {
    setFileList(fileList);
  };
  
  const handleTlsKeyChange: UploadProps['onChange'] = ({ fileList }) => {
    if (fileList.length > 0) {
      setTlsKeyFile(fileList[0]);
    } else {
      setTlsKeyFile(null);
    }
  };
  
  const handleAnalysisTypeChange = (value: string) => {
    setAnalysisType(value);
  };
  
  const handleStartAnalysis = async () => {
    if (fileList.length === 0) {
      message.warning('请先上传文件');
      return;
    }
    
    setLoading(true);
    console.log('开始上传文件处理...');
    
    try {
      const file = fileList[0].originFileObj;
      
      if (!file) {
        message.error('文件对象无效');
        console.error('文件对象无效:', fileList[0]);
        setLoading(false);
        return;
      }
      
      // 检查文件类型
      console.log('文件类型检查:', file.name, file.type);
      const isAcceptedType = ACCEPTED_FILE_TYPES.some(type => 
        file.name.toLowerCase().endsWith(type)
      );
      
      if (!isAcceptedType) {
        message.error(`${file.name} 不是支持的文件类型`);
        console.error('不支持的文件类型:', file.name);
        setLoading(false);
        return;
      }
      
      // 获取TLS密钥文件（如果有）
      const tlsKeyFileObj = tlsKeyFile?.originFileObj || null;
      console.log('使用的TLS密钥文件:', tlsKeyFileObj ? tlsKeyFileObj.name : '无');
      console.log('使用的分析类型:', analysisType);
      
      // 直接使用api服务发送请求
      console.log('准备FormData...');
      const formData = new FormData();
      formData.append('file', file);
      
      if (tlsKeyFileObj) {
        formData.append('tls_key', tlsKeyFileObj);
      }
      
      formData.append('analysis_type', analysisType);
      
      console.log('发送上传请求...');
      // 使用api直接发送请求，不经过fileService
      const response = await api.post('/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('上传请求成功，响应:', response.data);
      
      // 处理返回的数据
      const fileData = response.data.file || response.data;
      const fileId = fileData.id;
      
      console.log('文件上传成功，文件ID:', fileId);
      message.success('文件上传成功，开始分析');
      
      // 清空文件列表
      setFileList([]);
      setTlsKeyFile(null);
      
      // 获取最新的文件列表
      console.log('获取最新文件列表...');
      const filesResponse = await fileService.getFiles();
      console.log('获取到的文件列表:', filesResponse);
      setRecentFiles(filesResponse);
      
    } catch (error: any) {
      console.error('文件上传失败:', error);
      const errorMessage = error.response?.data?.error || '文件上传失败，请稍后重试';
      console.error('错误消息:', errorMessage);
      console.error('错误详情:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data,
      });
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteFile = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      message.success('文件已成功删除');
      
      // 更新文件列表，移除已删除的文件
      setRecentFiles(recentFiles.filter(file => file.id !== fileId));
    } catch (error: any) {
      console.error('删除文件失败:', error);
      message.error(error.response?.data?.error || '删除文件失败，请稍后重试');
    }
  };
  
  const renderFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    const color = FILE_TYPE_COLORS[type] || 'default';
    return (
      <div className={`file-type-icon ${type}`}>
        {type.toUpperCase()}
      </div>
    );
  };
  
  const handleViewReport = (fileId: string) => {
    // 在实际应用中，这里应该跳转到分析报告页面
    navigate(`/reports/${fileId}`);
  };
  
  const getStatusTag = (status: string, statusText: string) => {
    let color = 'default';
    
    switch (status) {
      case 'pending':
        color = 'gold';
        break;
      case 'processing':
        color = 'blue';
        break;
      case 'completed':
        color = 'green';
        break;
      case 'failed':
        color = 'red';
        break;
    }
    
    return <Tag color={color}>{statusText}</Tag>;
  };
  
  return (
    <div className="file-upload-container">
      <Title level={2}>文件上传</Title>
      
      <Card className="upload-card">
        <Dragger
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={handleChange}
          maxCount={1}
          accept={ACCEPTED_FILE_TYPES.join(',')}
          showUploadList={true}
          customRequest={({ onSuccess }) => {
            if (onSuccess) {
              onSuccess("ok");
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">拖拽文件到此处或点击上传</p>
          <p className="ant-upload-hint">
            支持 HAR、pcap、pcapng 文件格式
          </p>
          <div className="file-types">
            <Tag color="blue">HAR</Tag>
            <Tag color="green">pcap</Tag>
            <Tag color="purple">pcapng</Tag>
          </div>
        </Dragger>
        
        <Divider />
        
        <div className="upload-options">
          <Title level={4}>上传选项</Title>
          
          <div className="option-item">
            <Text>分析类型</Text>
            <Select 
              value={analysisType} 
              onChange={handleAnalysisTypeChange}
              style={{ width: '100%' }}
            >
              <Option value="comprehensive">综合分析</Option>
              <Option value="performance">性能分析</Option>
              <Option value="security">安全分析</Option>
            </Select>
          </div>
          
          <div className="option-item">
            <Text>TLS密钥文件（可选）</Text>
            <Upload 
              maxCount={1} 
              fileList={tlsKeyFile ? [tlsKeyFile] : []}
              beforeUpload={handleTlsKeyBeforeUpload}
              onChange={handleTlsKeyChange}
              accept=".key,.pem,.txt"
              showUploadList={{ 
                showRemoveIcon: true 
              }}
            >
              <Button icon={<UploadOutlined />}>选择密钥文件</Button>
            </Upload>
          </div>
          
          <Button 
            type="primary" 
            className="start-analysis-btn"
            onClick={handleStartAnalysis}
            loading={loading}
          >
            开始分析
          </Button>
        </div>
      </Card>
      
      <div className="recent-uploads">
        <Title level={4}>最近上传</Title>
        <List
          className="recent-list"
          itemLayout="horizontal"
          loading={fetchingFiles}
          dataSource={recentFiles}
          locale={{ emptyText: '暂无上传记录' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button 
                  type="link" 
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFile(item.id)}
                  danger
                >
                  删除
                </Button>,
                <Button 
                  type="link" 
                  icon={<EyeOutlined />} 
                  onClick={() => handleViewReport(item.id)}
                  disabled={item.status !== 'completed'}
                >
                  查看报告
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={renderFileIcon(item.fileType || '')}
                title={item.filename}
                description={
                  <Space>
                    <span>{item.fileSize || '0 B'}</span>
                    <span>·</span>
                    <span>上传于 {item.uploadTime || '未知时间'}</span>
                    <span>·</span>
                    {getStatusTag(item.status, item.statusText || '未知状态')}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

export default FileUpload; 