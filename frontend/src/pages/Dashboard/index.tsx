import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Typography, Divider } from 'antd';
import { UploadOutlined, FileDoneOutlined, FileSearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { authService } from '../../services/api';
import './style.css';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await authService.getUserInfo();
        setUser(userData);
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError('获取用户信息失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // 未来会从API获取这些数据
  const mockStats = {
    totalAnalyses: 12,
    pendingAnalyses: 2,
    completedAnalyses: 10,
    lastAnalysisTime: '2023-10-31 14:30:22'
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <Title level={2}>欢迎回来，{user?.name || '用户'}！</Title>
        <Paragraph>开始上传网络流量文件进行分析，或查看您的报告。</Paragraph>
      </div>

      <Divider />

      <Title level={4}>分析概况</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总分析次数"
              value={mockStats.totalAnalyses}
              prefix={<FileSearchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中分析"
              value={mockStats.pendingAnalyses}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: mockStats.pendingAnalyses > 0 ? '#1890ff' : '' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成分析"
              value={mockStats.completedAnalyses}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="最近分析时间"
              value={mockStats.lastAnalysisTime}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={4}>快速操作</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="action-card" hoverable onClick={() => window.location.href = '/upload'}>
            <div className="action-content">
              <UploadOutlined className="action-icon" />
              <div className="action-text">
                <div className="action-title">上传文件</div>
                <div className="action-description">上传HAR或PCAP文件进行分析</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="action-card" hoverable onClick={() => window.location.href = '/reports'}>
            <div className="action-content">
              <FileSearchOutlined className="action-icon" />
              <div className="action-text">
                <div className="action-title">查看报告</div>
                <div className="action-description">浏览您的历史分析报告</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="action-card" hoverable onClick={() => window.location.href = '/profile'}>
            <div className="action-content">
              <FileDoneOutlined className="action-icon" />
              <div className="action-text">
                <div className="action-title">个人资料</div>
                <div className="action-description">管理您的账户设置</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 