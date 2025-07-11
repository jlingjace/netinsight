import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Progress, Tag, Space, Typography, Badge, Button, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import socketService from '../services/socketService';

const { Title, Text } = Typography;

const RealTimeProgress = ({ fileIds = [], onStatusChange }) => {
  const [progressData, setProgressData] = useState(new Map());
  const [statusData, setStatusData] = useState(new Map());
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);

  const handleProgressUpdate = useCallback((data) => {
    if (!mountedRef.current) return;
    
    const { fileId, progress } = data;
    setProgressData(prev => new Map(prev).set(fileId, progress));
  }, []);

  const handleStatusUpdate = useCallback((data) => {
    if (!mountedRef.current) return;
    
    const { fileId, status, error } = data;
    setStatusData(prev => new Map(prev).set(fileId, { status, error }));
    
    // 通知父组件状态变化
    if (onStatusChange) {
      onStatusChange(fileId, status, error);
    }
  }, [onStatusChange]);

  const handleNotification = useCallback((notification) => {
    console.log('Received notification:', notification);
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }
      
      if (mountedRef.current) {
        setConnected(true);
        
        // 设置事件监听器
        socketService.on('analysisProgress', handleProgressUpdate);
        socketService.on('analysisStatus', handleStatusUpdate);
        socketService.on('notification', handleNotification);
      }
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      if (mountedRef.current) {
        setConnected(false);
      }
    }
  }, [handleProgressUpdate, handleStatusUpdate, handleNotification]);

  const subscribeToFiles = useCallback((ids) => {
    if (socketService.isConnected()) {
      socketService.subscribeToAnalysis(ids);
      // 请求当前状态
      socketService.requestStatus('files', ids);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // 连接WebSocket
    connectSocket();
    
    // 订阅文件分析进度
    if (fileIds.length > 0) {
      subscribeToFiles(fileIds);
    }

    return () => {
      mountedRef.current = false;
      if (fileIds.length > 0) {
        socketService.unsubscribeFromAnalysis(fileIds);
      }
    };
  }, [fileIds, connectSocket, subscribeToFiles]);

  const getStatusInfo = (status) => {
    const statusMap = {
      'uploaded': { 
        color: 'blue', 
        text: '已上传', 
        icon: <ClockCircleOutlined /> 
      },
      'processing': { 
        color: 'orange', 
        text: '分析中', 
        icon: <PlayCircleOutlined /> 
      },
      'completed': { 
        color: 'green', 
        text: '已完成', 
        icon: <CheckCircleOutlined /> 
      },
      'error': { 
        color: 'red', 
        text: '分析失败', 
        icon: <ExclamationCircleOutlined /> 
      },
      'pending': { 
        color: 'default', 
        text: '等待中', 
        icon: <ClockCircleOutlined /> 
      }
    };
    
    return statusMap[status] || statusMap['pending'];
  };

  const reconnect = () => {
    setConnected(false);
    connectSocket();
  };

  if (fileIds.length === 0) {
    return null;
  }

  return (
    <Card 
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>实时进度监控</Title>
          <Badge 
            status={connected ? 'success' : 'error'} 
            text={connected ? '已连接' : '未连接'} 
          />
          {!connected && (
            <Button 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={reconnect}
            >
              重连
            </Button>
          )}
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {fileIds.map(fileId => {
          const progress = progressData.get(fileId) || 0;
          const status = statusData.get(fileId);
          const statusInfo = getStatusInfo(status?.status || 'pending');
          
          return (
            <div key={fileId} style={{ marginBottom: 8 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 4
              }}>
                <Space>
                  <Text strong>文件 #{fileId}</Text>
                  <Tag color={statusInfo.color} icon={statusInfo.icon}>
                    {statusInfo.text}
                  </Tag>
                </Space>
                <Text type="secondary">{progress}%</Text>
              </div>
              
              <Progress 
                percent={progress} 
                size="small"
                status={
                  status?.status === 'error' ? 'exception' :
                  status?.status === 'completed' ? 'success' :
                  status?.status === 'processing' ? 'active' : 'normal'
                }
                showInfo={false}
              />
              
              {status?.error && (
                <Tooltip title={status.error}>
                  <Text type="danger" style={{ fontSize: '12px' }}>
                    {status.error.length > 50 
                      ? `${status.error.substring(0, 50)}...` 
                      : status.error}
                  </Text>
                </Tooltip>
              )}
            </div>
          );
        })}
      </Space>
      
      {!connected && (
        <div style={{ 
          textAlign: 'center', 
          padding: '12px',
          background: '#fff2e8',
          border: '1px solid #ffbb96',
          borderRadius: '6px',
          marginTop: '8px'
        }}>
          <Text type="warning">
            实时服务连接中断，进度更新可能延迟
          </Text>
        </div>
      )}
    </Card>
  );
};

export default RealTimeProgress; 