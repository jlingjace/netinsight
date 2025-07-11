import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Card,
  Upload,
  Button,
  Table,
  Progress,
  Space,
  Tag,
  Modal,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Alert,
  Divider,
  Tooltip
} from 'antd';
import {
  CloudUploadOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { fileService } from '../services/fileService';
import { useNavigate } from 'react-router-dom';
import RealTimeProgress from '../components/RealTimeProgress';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const BatchUpload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [analysisQueue, setAnalysisQueue] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings] = useState({
    autoAnalysis: true,
    maxConcurrent: 3,
    retryCount: 2,
    deleteAfterAnalysis: false
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    uploaded: 0,
    analyzing: 0,
    completed: 0,
    failed: 0
  });

  // 处理队列的引用
  const uploadQueueRef = useRef([]);
  const analysisQueueRef = useRef([]);
  const processingRef = useRef(false);

  useEffect(() => {
    loadFiles();
    
    // 定期更新统计信息
    const interval = setInterval(() => {
      updateStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadFiles, updateStats]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fileService.getFiles();
      setFiles(response.files || []);
      updateStats(response.files);
    } catch (error) {
      message.error('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (fileList = files) => {
    const newStats = {
      total: fileList.length,
      uploaded: fileList.filter(f => f.status === 'uploaded').length,
      analyzing: fileList.filter(f => f.status === 'processing').length,
      completed: fileList.filter(f => f.status === 'completed').length,
      failed: fileList.filter(f => f.status === 'error').length
    };
    setStats(newStats);
  };

  // 文件上传处理
  const handleFileUpload = async (fileList) => {
    const validFiles = fileList.filter(file => {
      if (!fileService.validateFileType(file)) {
        message.error(`文件 ${file.name} 格式不支持`);
        return false;
      }
      if (!fileService.validateFileSize(file)) {
        message.error(`文件 ${file.name} 大小超出限制`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // 添加到上传队列
    const newUploadQueue = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      status: 'pending',
      progress: 0,
      error: null
    }));

    setUploadQueue(prev => [...prev, ...newUploadQueue]);
    uploadQueueRef.current = [...uploadQueueRef.current, ...newUploadQueue];

    // 开始处理队列
    if (!processingRef.current) {
      processQueues();
    }
  };

  // 处理上传和分析队列
  const processQueues = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // 处理上传队列
      await processUploadQueue();
      
      // 如果启用自动分析，处理分析队列
      if (settings.autoAnalysis) {
        await processAnalysisQueue();
      }
    } catch (error) {
      console.error('处理队列失败:', error);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      await loadFiles(); // 刷新文件列表
    }
  };

  // 处理上传队列
  const processUploadQueue = async () => {
    const pendingUploads = uploadQueueRef.current.filter(item => item.status === 'pending');
    
    for (let i = 0; i < pendingUploads.length; i += settings.maxConcurrent) {
      const batch = pendingUploads.slice(i, i + settings.maxConcurrent);
      
      await Promise.all(batch.map(async (item) => {
        try {
          // 更新状态为上传中
          updateUploadItemStatus(item.id, 'uploading', 0);

          const response = await fileService.uploadFiles([item.file], (progress) => {
            updateUploadItemStatus(item.id, 'uploading', progress);
          });

          if (response.files && response.files.length > 0) {
            const uploadedFile = response.files[0];
            updateUploadItemStatus(item.id, 'completed', 100);
            
            // 如果启用自动分析，添加到分析队列
            if (settings.autoAnalysis) {
              analysisQueueRef.current.push({
                id: uploadedFile.id,
                fileName: uploadedFile.original_name,
                status: 'pending'
              });
            }
          }
        } catch (error) {
          updateUploadItemStatus(item.id, 'error', 0, error.message);
        }
      }));
    }
  };

  // 处理分析队列
  const processAnalysisQueue = async () => {
    const pendingAnalysis = analysisQueueRef.current.filter(item => item.status === 'pending');
    
    for (let i = 0; i < pendingAnalysis.length; i += settings.maxConcurrent) {
      const batch = pendingAnalysis.slice(i, i + settings.maxConcurrent);
      
      await Promise.all(batch.map(async (item) => {
        try {
          updateAnalysisItemStatus(item.id, 'analyzing');
          
          const { http } = await import('../utils/httpClient');
          await http.post(`/analysis/start/${item.id}`);
          
          updateAnalysisItemStatus(item.id, 'completed');
        } catch (error) {
          updateAnalysisItemStatus(item.id, 'error', error.message);
        }
      }));
    }
  };

  // 更新上传项状态
  const updateUploadItemStatus = (id, status, progress = 0, error = null) => {
    setUploadQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, progress, error } : item
    ));
    uploadQueueRef.current = uploadQueueRef.current.map(item => 
      item.id === id ? { ...item, status, progress, error } : item
    );
  };

  // 更新分析项状态
  const updateAnalysisItemStatus = (id, status, error = null) => {
    setAnalysisQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, error } : item
    ));
    analysisQueueRef.current = analysisQueueRef.current.map(item => 
      item.id === id ? { ...item, status, error } : item
    );
  };

  // 批量操作
  const handleBatchAnalysis = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要分析的文件');
      return;
    }

    const selectedFiles = files.filter(file => 
      selectedRowKeys.includes(file.id) && file.status === 'uploaded'
    );

    if (selectedFiles.length === 0) {
      message.warning('选中的文件中没有可以分析的文件');
      return;
    }

    // 添加到分析队列
    const newAnalysisItems = selectedFiles.map(file => ({
      id: file.id,
      fileName: file.original_name,
      status: 'pending'
    }));

    analysisQueueRef.current = [...analysisQueueRef.current, ...newAnalysisItems];
    setAnalysisQueue(prev => [...prev, ...newAnalysisItems]);

    // 开始处理
    if (!processingRef.current) {
      processQueues();
    }

    message.success(`已添加 ${selectedFiles.length} 个文件到分析队列`);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文件');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await fileService.deleteFiles(selectedRowKeys);
          message.success(`成功删除 ${selectedRowKeys.length} 个文件`);
          setSelectedRowKeys([]);
          await loadFiles();
        } catch (error) {
          message.error('批量删除失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBatchDownload = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要下载的文件');
      return;
    }

    message.info('正在准备下载，请稍候...');
    
    try {
      for (const fileId of selectedRowKeys) {
        const file = files.find(f => f.id === fileId);
        if (file) {
          await fileService.downloadFile(file.id, file.original_name);
        }
      }
      message.success('文件下载完成');
    } catch (error) {
      message.error('批量下载失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      ellipsis: true,
      render: (name, record) => (
        <Space>
          <FileTextOutlined />
          <span>{name}</span>
          {record.status === 'completed' && (
            <Tooltip title="分析完成">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 80,
      render: (type) => type?.toUpperCase() || '-'
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size) => fileService.formatFileSize(size)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusInfo = fileService.getFileStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
      filters: [
        { text: '已上传', value: 'uploaded' },
        { text: '处理中', value: 'processing' },
        { text: '已完成', value: 'completed' },
        { text: '失败', value: 'error' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_, record) => {
        const uploadItem = uploadQueue.find(item => item.file.name === record.original_name);
        const analysisItem = analysisQueue.find(item => item.id === record.id);
        
        if (uploadItem && uploadItem.status === 'uploading') {
          return <Progress percent={uploadItem.progress} size="small" />;
        }
        
        if (analysisItem && analysisItem.status === 'analyzing') {
          return <Progress percent={50} size="small" status="active" />;
        }
        
        if (record.status === 'processing') {
          return <Progress percent={50} size="small" status="active" />;
        }
        
        if (record.status === 'completed') {
          return <Progress percent={100} size="small" status="success" />;
        }
        
        if (record.status === 'error') {
          return <Progress percent={100} size="small" status="exception" />;
        }
        
        return '-';
      }
    },
    {
      title: '上传时间',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      width: 150,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'uploaded' && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleSingleAnalysis(record)}
            >
              分析
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/results/${record.id}`)}
            >
              查看
            </Button>
          )}
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => fileService.downloadFile(record.id, record.original_name)}
          >
            下载
          </Button>
        </Space>
      )
    }
  ];

  const handleSingleAnalysis = async (file) => {
    try {
      const { http } = await import('../utils/httpClient');
      await http.post(`/analysis/start/${file.id}`);
      message.success('分析任务已启动');
      await loadFiles();
    } catch (error) {
      message.error('启动分析失败');
    }
  };

  // 筛选后的文件列表
  const filteredFiles = files.filter(file => {
    if (filterStatus === 'all') return true;
    return file.status === filterStatus;
  });

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: loading || isProcessing,
    }),
  };

  // 实时状态变化处理函数
  const handleRealTimeStatusChange = (fileId, status, error) => {
    // 更新本地文件状态
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId 
          ? { ...file, status, error_message: error }
          : file
      )
    );
    
    // 更新统计信息
    updateStats();
  };

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">
              批量文件处理
            </Title>
            <Text className="page-description">
              支持多文件上传、批量分析和进度监控
            </Text>
          </div>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              处理设置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadFiles}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="总文件数"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="待分析"
              value={stats.uploaded}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="分析中"
              value={stats.analyzing}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 文件上传区域 */}
      <Card title="文件上传" className="dashboard-card" style={{ marginBottom: 24 }}>
        <Dragger
          multiple
          beforeUpload={() => false}
          onChange={({ fileList }) => handleFileUpload(fileList.map(item => item.originFileObj))}
          accept=".pcap,.pcapng,.har"
          disabled={loading || isProcessing}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持多文件上传，支持 .pcap、.pcapng、.har 格式，单个文件最大100MB
          </p>
        </Dragger>

        {/* 上传队列 */}
        {uploadQueue.length > 0 && (
          <div>
            <Divider orientation="left">上传队列</Divider>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {uploadQueue.map(item => (
                <div key={item.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.file.name}</span>
                    <Tag color={
                      item.status === 'completed' ? 'success' :
                      item.status === 'error' ? 'error' :
                      item.status === 'uploading' ? 'processing' : 'default'
                    }>
                      {item.status === 'pending' ? '等待中' :
                       item.status === 'uploading' ? '上传中' :
                       item.status === 'completed' ? '已完成' : '失败'}
                    </Tag>
                  </div>
                  {item.status === 'uploading' && (
                    <Progress percent={item.progress} size="small" />
                  )}
                  {item.error && (
                    <Text type="danger" style={{ fontSize: '12px' }}>{item.error}</Text>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 实时进度监控 */}
      {selectedRowKeys.length > 0 && (
        <RealTimeProgress 
          fileIds={selectedRowKeys}
          onStatusChange={handleRealTimeStatusChange}
        />
      )}

      {/* 文件列表 */}
      <Card title="文件列表" className="dashboard-card">
        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  disabled={selectedRowKeys.length === 0 || loading || isProcessing}
                  onClick={handleBatchAnalysis}
                >
                  批量分析
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={selectedRowKeys.length === 0 || loading}
                  onClick={handleBatchDownload}
                >
                  批量下载
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedRowKeys.length === 0 || loading}
                  onClick={handleBatchDelete}
                >
                  批量删除
                </Button>
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <Select
                placeholder="状态筛选"
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: '100%' }}
              >
                <Option value="all">全部状态</Option>
                <Option value="uploaded">已上传</Option>
                <Option value="processing">处理中</Option>
                <Option value="completed">已完成</Option>
                <Option value="error">失败</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary">
                {selectedRowKeys.length > 0 
                  ? `已选择 ${selectedRowKeys.length} 个文件` 
                  : `共 ${filteredFiles.length} 个文件`}
              </Text>
            </Col>
          </Row>
        </div>

        {/* 处理状态提示 */}
        {isProcessing && (
          <Alert
            message="正在处理文件"
            description="系统正在批量处理文件，请耐心等待..."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 文件表格 */}
        <Table
          columns={columns}
          dataSource={filteredFiles}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default BatchUpload; 