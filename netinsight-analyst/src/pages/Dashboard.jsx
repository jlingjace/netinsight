import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Typography, 
  Button, 
  Table, 
  Tag, 
  Progress,
  Space,
  Tooltip,
  Alert,
  List,
  Avatar,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  DatabaseOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { fileService } from '../services/fileService';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [systemStatus, setSystemStatus] = useState({});
  const [recentFiles, setRecentFiles] = useState([]);

  // 加载仪表板数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行加载所有数据
      const [overviewData, statusData, filesData] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getSystemStatus(),
        fileService.getFiles({ limit: 10, sort: 'created_at', order: 'desc' })
      ]);

      setOverview(overviewData);
      setSystemStatus(statusData);
      setRecentFiles(filesData.files || []);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      // 使用模拟数据作为后备
      setOverview({
        totalFiles: 0,
        totalAnalyses: 0,
        totalProjects: 0,
        storageUsed: 0
      });
      setSystemStatus({
        status: 'normal',
        uptime: '99.9%',
        performance: { cpu: 25, memory: 45, disk: 60 }
      });
      setRecentFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status) => {
    const statusInfo = fileService.getFileStatusInfo(status);
    const iconMap = {
      'uploaded': <ClockCircleOutlined />,
      'processing': <ClockCircleOutlined />,
      'completed': <CheckCircleOutlined />,
      'error': <ExclamationCircleOutlined />
    };
    
    return (
      <Tag color={statusInfo.color} icon={iconMap[status]}>
        {statusInfo.text}
      </Tag>
    );
  };

  // 最近文件表格列定义
  const recentFilesColumns = [
    {
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {fileService.formatFileSize(record.file_size)} • {new Date(record.created_at).toLocaleString()}
          </Text>
        </div>
      ),
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type) => (
        <Tag size="small">{type?.toUpperCase() || '-'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => navigate(`/results/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="下载文件">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => fileService.downloadFile(record.id, record.original_name)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 系统状态通知
  const systemNotifications = [
    {
      id: 1,
      type: 'success',
      title: '系统运行正常',
      description: '所有服务运行稳定，解析引擎性能良好',
      time: '刚刚'
    },
    {
      id: 2,
      type: 'info',
      title: '定期维护提醒',
      description: '系统将于本周日凌晨2:00-4:00进行定期维护',
      time: '2小时前'
    },
    {
      id: 3,
      type: 'warning',
      title: '存储空间提醒',
      description: '当前存储使用率达到75%，建议清理旧文件',
      time: '1天前'
    }
  ];

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">
              仪表板
            </Title>
            <Text className="page-description">
              系统概览和实时监控数据
            </Text>
          </div>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/analysis')}
            >
              新建分析
            </Button>
            <Button 
              icon={<PlayCircleOutlined />}
              onClick={() => navigate('/analysis')}
            >
              批量处理
            </Button>
          </Space>
        </div>
      </div>

      {/* 系统状态提醒 */}
      {systemStatus.status === 'warning' && (
        <Alert
          message="系统提醒"
          description="检测到部分服务响应缓慢，建议检查系统资源使用情况"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="总文件数"
              value={overview.totalFiles || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="分析任务"
              value={overview.totalAnalyses || 0}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#722ed1' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="项目数量"
              value={overview.totalProjects || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="存储使用"
              value={dashboardService.formatBytes(overview.storageUsed || 0)}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#faad14' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近文件 */}
        <Col xs={24} lg={16}>
          <Card 
            title="最近文件" 
            className="dashboard-card"
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/analysis')}
              >
                查看全部
              </Button>
            }
          >
            <Table
              columns={recentFilesColumns}
              dataSource={recentFiles}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
            />
          </Card>
        </Col>

        {/* 系统状态 */}
        <Col xs={24} lg={8}>
          <Card title="系统状态" className="dashboard-card">
            <Spin spinning={loading}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>CPU使用率</Text>
                  <Text>{systemStatus.performance?.cpu || 0}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.performance?.cpu || 0} 
                  size="small"
                  strokeColor={dashboardService.getStatusColor('', systemStatus.performance?.cpu || 0)}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>内存使用率</Text>
                  <Text>{systemStatus.performance?.memory || 0}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.performance?.memory || 0} 
                  size="small"
                  strokeColor={dashboardService.getStatusColor('', systemStatus.performance?.memory || 0)}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>存储使用率</Text>
                  <Text>{systemStatus.performance?.disk || 0}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.performance?.disk || 0} 
                  size="small"
                  strokeColor={dashboardService.getStatusColor('', systemStatus.performance?.disk || 0)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>系统运行时间</Text>
                  <Text>{systemStatus.uptime || '99.9%'}</Text>
                </div>
                <Tag color={systemStatus.status === 'normal' ? 'green' : 'orange'}>
                  {systemStatus.status === 'normal' ? '运行正常' : '需要关注'}
                </Tag>
              </div>
            </Spin>
          </Card>

          {/* 通知列表 */}
          <Card title="系统通知" className="dashboard-card" style={{ marginTop: 16 }}>
            <List
              size="small"
              dataSource={systemNotifications}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: item.type === 'success' ? '#52c41a' : 
                                           item.type === 'warning' ? '#faad14' : '#1890ff'
                        }}
                      >
                        {item.type === 'success' ? <CheckCircleOutlined /> : 
                         item.type === 'warning' ? <ExclamationCircleOutlined /> : 
                         <ClockCircleOutlined />}
                      </Avatar>
                    }
                    title={
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {item.title}
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                          {item.description}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.time}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 