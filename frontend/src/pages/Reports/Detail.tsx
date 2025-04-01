import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Tabs, Card, Table, Button, Tag, Divider, Row, Col, Statistic, Alert, Typography } from 'antd';
import { DownloadOutlined, AlertOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import NetworkTopology from '../../components/NetworkTopology';
import './Detail.css';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

// 安全事件严重程度对应的颜色和标签
const severityColors = {
  high: 'red',
  medium: 'orange',
  low: 'green',
};

const severityLabels = {
  high: '高危',
  medium: '中危',
  low: '低危',
};

interface HttpRequestType {
  id: string;
  url: string;
  method: string;
  status_code: number;
  content_type: string;
  duration: number;
  size: number;
  timestamp: string;
}

interface SecurityEventType {
  id: string;
  event_type: string;
  severity: 'high' | 'medium' | 'low';
  source_ip: string;
  target_ip?: string;
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'ignored';
}

interface DetailedDataType {
  protocol_distribution: Record<string, number>;
  top_talkers: Array<{ ip: string; packets: number }>;
  http_status_distribution: Record<string, number>;
}

interface ReportDetailType {
  id: string;
  title: string;
  summary: string;
  report_type: string;
  created_at: string;
  total_packets: number;
  total_connections: number;
  unique_ips: number;
  average_latency: number;
  packet_loss: number;
  error_rate: number;
  security_score: number;
  high_severity_events: number;
  medium_severity_events: number;
  low_severity_events: number;
  detailedData: DetailedDataType;
  events: SecurityEventType[];
  httpRequests?: HttpRequestType[];
}

const ReportDetail: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<ReportDetailType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // 模拟请求报告详情数据
  useEffect(() => {
    // 实际应用中，这里应该调用API获取数据
    const fetchReportDetail = async () => {
      try {
        setLoading(true);
        // 模拟API请求延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 示例报告数据
        const mockReport: ReportDetailType = {
          id: reportId || '1',
          title: '网络流量分析报告',
          summary: '此报告分析了网络流量文件，发现了3个高危事件和5个中危事件。平均延迟为120.5ms，网络质量整体良好。',
          report_type: 'comprehensive',
          created_at: '2023-03-15T08:30:00Z',
          total_packets: 125000,
          total_connections: 1250,
          unique_ips: 45,
          average_latency: 120.5,
          packet_loss: 0.5,
          error_rate: 2.3,
          security_score: 85,
          high_severity_events: 3,
          medium_severity_events: 5,
          low_severity_events: 8,
          detailedData: {
            protocol_distribution: {
              'TCP': 65.5,
              'UDP': 25.2,
              'ICMP': 5.3,
              'Others': 4.0
            },
            top_talkers: [
              { ip: '192.168.1.15', packets: 3500 },
              { ip: '10.0.0.1', packets: 2800 },
              { ip: '172.16.1.25', packets: 1200 }
            ],
            http_status_distribution: {
              '2xx': 75.5,
              '3xx': 10.2,
              '4xx': 12.3,
              '5xx': 2.0
            }
          },
          events: [
            {
              id: '1',
              event_type: '端口扫描',
              severity: 'high',
              source_ip: '192.168.1.15',
              target_ip: '10.0.0.1',
              description: '从192.168.1.15到10.0.0.1的顺序端口扫描',
              timestamp: '2023-03-15T09:15:00Z',
              status: 'active'
            },
            {
              id: '2',
              event_type: '恶意DNS查询',
              severity: 'medium',
              source_ip: '192.168.1.16',
              description: '检测到对example45.com的可疑DNS查询',
              timestamp: '2023-03-15T09:25:00Z',
              status: 'active'
            },
            {
              id: '3',
              event_type: '可疑SSH登录尝试',
              severity: 'high',
              source_ip: '192.168.1.17',
              target_ip: '10.0.0.2',
              description: '多次SSH登录失败尝试，可能是暴力破解攻击',
              timestamp: '2023-03-15T09:35:00Z',
              status: 'resolved'
            }
          ],
          httpRequests: [
            {
              id: '1',
              url: 'https://api.example.com/users',
              method: 'GET',
              status_code: 200,
              content_type: 'application/json',
              duration: 120,
              size: 5120,
              timestamp: '2023-03-15T09:10:00Z'
            },
            {
              id: '2',
              url: 'https://cdn.example.com/images',
              method: 'POST',
              status_code: 400,
              content_type: 'application/json',
              duration: 250,
              size: 1024,
              timestamp: '2023-03-15T09:12:00Z'
            },
            {
              id: '3',
              url: 'https://auth.example.com/login',
              method: 'POST',
              status_code: 500,
              content_type: 'application/json',
              duration: 500,
              size: 2048,
              timestamp: '2023-03-15T09:15:00Z'
            }
          ]
        };
        
        setReport(mockReport);
      } catch (error) {
        console.error('获取报告详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportDetail();
  }, [reportId]);
  
  // 事件状态变更处理函数
  const handleEventStatusChange = (eventId: string, newStatus: 'resolved' | 'ignored') => {
    if (!report) return;
    
    // 实际应用中，这里应该调用API更新状态
    setReport({
      ...report,
      events: report.events.map(event => 
        event.id === eventId ? { ...event, status: newStatus } : event
      )
    });
  };
  
  // 导出报告处理函数
  const handleExportReport = () => {
    // 实际应用中，这里应该调用API导出报告
    console.log('导出报告:', reportId);
  };
  
  // 安全事件表格列定义
  const eventColumns = [
    {
      title: '类型',
      dataIndex: 'event_type',
      key: 'event_type',
      width: 150,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: 'high' | 'medium' | 'low') => (
        <Tag color={severityColors[severity]}>
          {severityLabels[severity]}
        </Tag>
      ),
    },
    {
      title: '源IP',
      dataIndex: 'source_ip',
      key: 'source_ip',
      width: 130,
    },
    {
      title: '目标IP',
      dataIndex: 'target_ip',
      key: 'target_ip',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        switch (status) {
          case 'resolved':
            return <Tag color="success" icon={<CheckCircleOutlined />}>已解决</Tag>;
          case 'ignored':
            return <Tag color="default">已忽略</Tag>;
          default:
            return <Tag color="warning" icon={<ClockCircleOutlined />}>待处理</Tag>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: SecurityEventType) => (
        record.status === 'active' ? (
          <span>
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleEventStatusChange(record.id, 'resolved')}
            >
              标记为已解决
            </Button>
            <Divider type="vertical" />
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleEventStatusChange(record.id, 'ignored')}
            >
              忽略
            </Button>
          </span>
        ) : (
          <span>-</span>
        )
      ),
    },
  ];
  
  // HTTP请求表格列定义
  const httpColumns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
    },
    {
      title: '状态码',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 100,
      render: (code: number) => {
        let color = 'green';
        if (code >= 400 && code < 500) color = 'orange';
        if (code >= 500) color = 'red';
        return <Tag color={color}>{code}</Tag>;
      },
    },
    {
      title: '响应时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration: number) => `${duration}ms`,
      sorter: (a: HttpRequestType, b: HttpRequestType) => a.duration - b.duration,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => `${(size / 1024).toFixed(2)}KB`,
    },
  ];
  
  if (loading) {
    return (
      <div className="report-detail-loading">
        <Spin size="large" tip="加载报告数据..." />
      </div>
    );
  }
  
  if (!report) {
    return <Alert message="加载报告详情失败" type="error" />;
  }
  
  return (
    <div className="report-detail-container">
      <div className="report-header">
        <div className="report-title-section">
          <Title level={3}>{report.title}</Title>
          <Text type="secondary">创建于: {new Date(report.created_at).toLocaleString()}</Text>
        </div>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={handleExportReport}
        >
          导出报告
        </Button>
      </div>
      
      <Card className="report-summary-card">
        <div className="report-summary">{report.summary}</div>
        <Row gutter={[16, 16]} className="report-metrics">
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="数据包总数" 
              value={report.total_packets.toLocaleString()} 
              groupSeparator=","
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="连接数" 
              value={report.total_connections.toLocaleString()} 
              groupSeparator=","
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="唯一IP数" 
              value={report.unique_ips} 
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="安全评分" 
              value={report.security_score} 
              suffix="/100"
              valueStyle={{ color: report.security_score > 80 ? '#3f8600' : report.security_score > 60 ? '#faad14' : '#cf1322' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="平均延迟" 
              value={report.average_latency} 
              suffix="ms"
              valueStyle={{ color: report.average_latency < 100 ? '#3f8600' : report.average_latency < 200 ? '#faad14' : '#cf1322' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="丢包率" 
              value={report.packet_loss} 
              precision={2}
              suffix="%"
              valueStyle={{ color: report.packet_loss < 1 ? '#3f8600' : report.packet_loss < 3 ? '#faad14' : '#cf1322' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="错误率" 
              value={report.error_rate} 
              precision={2}
              suffix="%"
              valueStyle={{ color: report.error_rate < 2 ? '#3f8600' : report.error_rate < 5 ? '#faad14' : '#cf1322' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic 
              title="安全事件" 
              value={report.high_severity_events + report.medium_severity_events + report.low_severity_events} 
              suffix={
                <>
                  <Tag color="red">{report.high_severity_events}</Tag>
                  <Tag color="orange">{report.medium_severity_events}</Tag>
                  <Tag color="green">{report.low_severity_events}</Tag>
                </>
              }
            />
          </Col>
        </Row>
      </Card>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="report-tabs">
        <TabPane tab="总览" key="overview">
          <Card title="网络拓扑图">
            <NetworkTopology height={500} title="" />
          </Card>
          <div style={{ height: 16 }} />
          <Card title="数据统计">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={8}>
                <Card title="协议分布" size="small">
                  <pre>{JSON.stringify(report.detailedData.protocol_distribution, null, 2)}</pre>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card title="通信最频繁的IP" size="small">
                  <pre>{JSON.stringify(report.detailedData.top_talkers, null, 2)}</pre>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card title="HTTP状态码分布" size="small">
                  <pre>{JSON.stringify(report.detailedData.http_status_distribution, null, 2)}</pre>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
        
        <TabPane tab={
          <span>
            <AlertOutlined />
            安全事件 {report.high_severity_events > 0 && <Tag color="red">{report.high_severity_events}</Tag>}
          </span>
        } key="security">
          <Card title="安全事件">
            <Table 
              columns={eventColumns} 
              dataSource={report.events} 
              rowKey="id"
              pagination={false}
            />
          </Card>
        </TabPane>
        
        <TabPane tab="HTTP请求" key="http">
          <Card title="HTTP请求列表">
            <Table 
              columns={httpColumns} 
              dataSource={report.httpRequests || []} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ReportDetail; 