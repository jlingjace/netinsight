import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Tabs,
  Spin,
  Alert,
  Modal,
  Descriptions,
  List,
  Divider,
  Timeline,
  Badge,
  Form,
  Select,
  Empty,
  Collapse,
  Dropdown,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DashboardOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileOutlined,
  MoreOutlined,
  EyeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { http } from '../utils/httpClient';
import { analysisService } from '../services/analysisService';
import { reportService } from '../services/reportService';
import ReactECharts from 'echarts-for-react';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const AnalysisResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    loadAnalysisResult();
  }, [id]);

  const loadAnalysisResult = async () => {
    try {
      setLoading(true);
      setError(null);

      // 先获取文件信息
      const fileResponse = await http.get(`/files/${id}`);
      if (fileResponse.data) {
        setFileInfo(fileResponse.data);
      }

      // 然后获取分析结果
      try {
        const analysisResponse = await http.get(`/analysis/${id}`);
        if (analysisResponse.data && analysisResponse.data.results) {
          setResult(analysisResponse.data);
        } else {
          setError('分析结果不存在或尚未完成');
        }
      } catch (analysisError) {
        // 如果分析结果不存在，检查文件状态
        if (fileResponse.data) {
          const fileStatus = fileResponse.data.status;
          if (fileStatus === 'uploaded') {
            setError('文件尚未开始分析，请在文件分析页面启动分析');
          } else if (fileStatus === 'processing') {
            setError('文件正在分析中，请稍后再试');
          } else if (fileStatus === 'error') {
            setError('文件分析失败：' + (fileResponse.data.error_message || '未知错误'));
          } else {
            setError('分析结果不存在或已被删除');
          }
        } else {
          setError('文件不存在');
        }
      }
    } catch (err) {
      console.error('加载分析结果失败:', err);
      if (err.response?.status === 404) {
        setError('分析结果不存在或已被删除');
      } else {
        setError('加载分析结果失败: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result || !fileInfo) return;
    
    try {
      message.loading('正在生成PDF报告...', 2);
      await reportService.generatePDFReport(result, fileInfo);
      message.success('PDF报告已下载');
    } catch (error) {
      console.error('PDF下载失败:', error);
      message.error('PDF报告生成失败: ' + error.message);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result || !fileInfo) return;
    
    try {
      await reportService.exportToCSV(result, fileInfo);
      message.success('CSV数据已下载');
    } catch (error) {
      console.error('CSV下载失败:', error);
      message.error('CSV导出失败: ' + error.message);
    }
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-result-${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('JSON数据已下载');
  };

  const handlePreviewHTML = () => {
    if (!result || !fileInfo) return;
    
    try {
      const htmlContent = reportService.generateHTMLReport(result, fileInfo);
      const newWindow = window.open('', '_blank');
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } catch (error) {
      console.error('HTML预览失败:', error);
      message.error('HTML预览失败: ' + error.message);
    }
  };

  const handleGeneratePDFReport = async (options = {}) => {
    try {
      setReportGenerating(true);
      await reportService.generatePDFReport(result, fileInfo, options);
      setReportModalVisible(false);
    } catch (error) {
      // Error already handled in service
    } finally {
      setReportGenerating(false);
    }
  };

  const handlePreviewReport = async () => {
    try {
      await reportService.previewReport(result, fileInfo);
    } catch (error) {
      // Error already handled in service
    }
  };

  const reportOptions = reportService.getReportOptions();

  const reportMenuItems = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'PDF报告',
      onClick: () => setReportModalVisible(true)
    },
    {
      key: 'preview',
      icon: <EyeOutlined />,
      label: '预览报告',
      onClick: handlePreviewReport
    },
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: '打印报告',
      onClick: () => {
        window.print();
      }
    }
  ];

  // 下载菜单项
  const downloadMenuItems = [
    {
      key: 'pdf',
      label: 'PDF报告',
      icon: <FilePdfOutlined />,
      onClick: handleDownloadPDF
    },
    {
      key: 'csv',
      label: 'CSV数据',
      icon: <FileExcelOutlined />,
      onClick: handleDownloadCSV
    },
    {
      key: 'json',
      label: 'JSON原始数据',
      icon: <FileOutlined />,
      onClick: handleDownloadJSON
    },
    {
      type: 'divider'
    },
    {
      key: 'preview',
      label: '预览HTML报告',
      icon: <FileTextOutlined />,
      onClick: handlePreviewHTML
    }
  ];

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    });
  };

  // 格式化字节大小
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'default', text: '等待中' },
      'processing': { color: 'processing', text: '分析中' },
      'completed': { color: 'success', text: '已完成' },
      'error': { color: 'error', text: '失败' }
    };
    
    const config = statusMap[status] || statusMap.pending;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 时间序列分析组件
  const TimeSeriesAnalysis = ({ timeSeriesData }) => {
    if (!timeSeriesData) return null;

    // 请求时间线图表
    const getRequestTimelineOption = () => ({
      title: { text: '请求时间线分析', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'time',
        name: '时间'
      },
      yAxis: [
        { type: 'value', name: '请求数', position: 'left' },
        { type: 'value', name: '响应时间(ms)', position: 'right' }
      ],
      series: [
        {
          name: '请求数',
          type: 'line',
          data: timeSeriesData.requestTimeline?.map(item => [item.time, item.count]) || [],
          smooth: true
        },
        {
          name: '响应时间',
          type: 'line',
          yAxisIndex: 1,
          data: timeSeriesData.requestTimeline?.map(item => [item.time, item.responseTime]) || [],
          smooth: true
        }
      ]
    });

    // 响应时间分布图表
    const getResponseTimeDistributionOption = () => ({
      title: { text: '响应时间分布', left: 'center' },
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'category',
        data: timeSeriesData.responseTimeDistribution?.map(item => item.range) || []
      },
      yAxis: { type: 'value', name: '请求数' },
      series: [{
        name: '请求数',
        type: 'bar',
        data: timeSeriesData.responseTimeDistribution?.map(item => item.count) || [],
        itemStyle: {
          color: function(params) {
            const colors = ['#52c41a', '#1890ff', '#faad14', '#ff7875', '#f5222d'];
            return colors[params.dataIndex % colors.length];
          }
        }
      }]
    });

    // 小时分布热力图
    const getHourlyDistributionOption = () => ({
      title: { text: '24小时请求分布', left: 'center' },
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'category',
        data: Array.from({length: 24}, (_, i) => `${i}:00`)
      },
      yAxis: { type: 'value', name: '请求数' },
      series: [{
        name: '请求数',
        type: 'bar',
        data: timeSeriesData.hourlyDistribution || [],
        itemStyle: {
          color: '#1890ff'
        }
      }]
    });

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="请求时间线分析">
              <ReactECharts option={getRequestTimelineOption()} style={{ height: 300 }} />
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="响应时间分布">
              <ReactECharts option={getResponseTimeDistributionOption()} style={{ height: 250 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="24小时分布">
              <ReactECharts option={getHourlyDistributionOption()} style={{ height: 250 }} />
            </Card>
          </Col>
        </Row>

        {timeSeriesData.burstTrafficDetection?.length > 0 && (
          <Card title="突发流量检测" style={{ marginTop: 16 }}>
            <List
              dataSource={timeSeriesData.burstTrafficDetection}
              renderItem={burst => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: '#faad14' }} />}
                    title={`突发流量: ${burst.requestCount} 请求/秒`}
                    description={
                      <div>
                        <Text>时间范围: {new Date(burst.startTime).toLocaleString()} - {new Date(burst.endTime).toLocaleString()}</Text><br/>
                        <Text>平均响应时间: {burst.averageResponseTime.toFixed(2)}ms</Text><br/>
                        <Text>总数据量: {(burst.totalSize / 1024).toFixed(2)} KB</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  // TCP连接分析组件
  const TCPConnectionAnalysis = ({ tcpConnections, performanceAnalysis }) => {
    if (!tcpConnections || tcpConnections.length === 0) return null;

    const columns = [
      {
        title: '源地址',
        dataIndex: 'source',
        key: 'source',
        width: 150
      },
      {
        title: '目标地址',
        dataIndex: 'destination',
        key: 'destination',
        width: 150
      },
      {
        title: '连接状态',
        dataIndex: 'state',
        key: 'state',
        width: 100,
        render: (state) => {
          const colorMap = {
            'ESTABLISHED': 'green',
            'SYN_SENT': 'blue',
            'SYN_RECEIVED': 'orange',
            'FIN_WAIT': 'purple',
            'CLOSED': 'gray',
            'RESET': 'red'
          };
          return <Tag color={colorMap[state] || 'default'}>{state}</Tag>;
        }
      },
      {
        title: '握手状态',
        dataIndex: 'handshakeComplete',
        key: 'handshakeComplete',
        width: 100,
        render: (complete) => complete ? 
          <Badge status="success" text="完成" /> : 
          <Badge status="error" text="未完成" />
      },
      {
        title: '握手时间',
        dataIndex: 'handshakeDuration',
        key: 'handshakeDuration',
        width: 100,
        render: (duration) => duration ? `${duration.toFixed(2)}ms` : '-'
      },
      {
        title: '数据包数',
        dataIndex: 'totalPackets',
        key: 'totalPackets',
        width: 100
      },
      {
        title: '传输字节',
        dataIndex: 'totalBytes',
        key: 'totalBytes',
        width: 100,
        render: (bytes) => `${(bytes / 1024).toFixed(2)} KB`
      },
      {
        title: '重传次数',
        dataIndex: 'retransmissions',
        key: 'retransmissions',
        width: 100,
        render: (count) => count > 0 ? 
          <Text type="warning">{count}</Text> : 
          <Text type="success">{count}</Text>
      },
      {
        title: '平均RTT',
        dataIndex: 'avgRTT',
        key: 'avgRTT',
        width: 100,
        render: (rtt) => rtt > 0 ? `${rtt.toFixed(2)}ms` : '-'
      }
    ];

    // TCP连接状态分布图表
    const getConnectionStateOption = () => {
      const stateCounts = {};
      tcpConnections.forEach(conn => {
        stateCounts[conn.state] = (stateCounts[conn.state] || 0) + 1;
      });

      return {
        title: { text: 'TCP连接状态分布', left: 'center' },
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        series: [{
          name: '连接状态',
          type: 'pie',
          radius: '50%',
          data: Object.entries(stateCounts).map(([state, count]) => ({
            value: count,
            name: state
          }))
        }]
      };
    };

    // RTT分布图表
    const getRTTDistributionOption = () => {
      const rttValues = tcpConnections
        .filter(conn => conn.avgRTT > 0)
        .map(conn => conn.avgRTT);

      if (rttValues.length === 0) return {};

      return {
        title: { text: 'RTT分布', left: 'center' },
        tooltip: { trigger: 'item' },
        xAxis: { type: 'value', name: 'RTT (ms)' },
        yAxis: { type: 'value', name: '连接数' },
        series: [{
          name: 'RTT分布',
          type: 'scatter',
          data: rttValues.map((rtt, index) => [rtt, index + 1]),
          symbolSize: 6
        }]
      };
    };

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总连接数"
                value={tcpConnections.length}
                prefix={<GlobalOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="握手成功率"
                value={performanceAnalysis?.responseTimeStats?.handshakeSuccessRate || 0}
                suffix="%"
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均RTT"
                value={performanceAnalysis?.responseTimeStats?.averageRTT || 0}
                suffix="ms"
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="网络质量评分"
                value={performanceAnalysis?.networkQualityScore || 0}
                suffix="/100"
                prefix={<DashboardOutlined />}
                valueStyle={{ 
                  color: performanceAnalysis?.networkQualityScore > 80 ? '#3f8600' : 
                         performanceAnalysis?.networkQualityScore > 60 ? '#faad14' : '#cf1322' 
                }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="连接状态分布">
              <ReactECharts option={getConnectionStateOption()} style={{ height: 250 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="RTT分布">
              <ReactECharts option={getRTTDistributionOption()} style={{ height: 250 }} />
            </Card>
          </Col>
        </Row>

        <Card title="TCP连接详情" style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            dataSource={tcpConnections}
            rowKey={(record) => `${record.source}-${record.destination}`}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {performanceAnalysis?.bottleneckAnalysis?.length > 0 && (
          <Card title="性能瓶颈分析" style={{ marginTop: 16 }}>
            <List
              dataSource={performanceAnalysis.bottleneckAnalysis}
              renderItem={bottleneck => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<ThunderboltOutlined style={{ 
                      color: bottleneck.impact === 'high' ? '#ff4d4f' : 
                             bottleneck.impact === 'medium' ? '#faad14' : '#1890ff' 
                    }} />}
                    title={bottleneck.description}
                    description={
                      <div>
                        <Text>类型: {bottleneck.type}</Text><br/>
                        <Text>数值: {bottleneck.value}</Text><br/>
                        <Text>影响程度: <Tag color={
                          bottleneck.impact === 'high' ? 'red' : 
                          bottleneck.impact === 'medium' ? 'orange' : 'blue'
                        }>{bottleneck.impact}</Tag></Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  // 异常检测组件
  const AnomalyDetection = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) {
      return (
        <Alert
          message="未检测到异常"
          description="网络流量模式正常，未发现异常行为。"
          type="success"
          showIcon
        />
      );
    }

    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'error': return '#ff4d4f';
        case 'warning': return '#faad14';
        case 'info': return '#1890ff';
        default: return '#52c41a';
      }
    };

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case 'error': return <WarningOutlined />;
        case 'warning': return <WarningOutlined />;
        case 'info': return <SafetyCertificateOutlined />;
        default: return <SafetyCertificateOutlined />;
      }
    };

    // 异常类型分布
    const getAnomalyTypeDistribution = () => {
      const typeCounts = {};
      anomalies.forEach(anomaly => {
        typeCounts[anomaly.type] = (typeCounts[anomaly.type] || 0) + 1;
      });

      return {
        title: { text: '异常类型分布', left: 'center' },
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        series: [{
          name: '异常类型',
          type: 'pie',
          radius: '50%',
          data: Object.entries(typeCounts).map(([type, count]) => ({
            value: count,
            name: type
          }))
        }]
      };
    };

    // 异常严重程度分布
    const getSeverityDistribution = () => {
      const severityCounts = {};
      anomalies.forEach(anomaly => {
        severityCounts[anomaly.severity] = (severityCounts[anomaly.severity] || 0) + 1;
      });

      return {
        title: { text: '严重程度分布', left: 'center' },
        tooltip: { trigger: 'item' },
        xAxis: {
          type: 'category',
          data: Object.keys(severityCounts)
        },
        yAxis: { type: 'value', name: '数量' },
        series: [{
          name: '异常数量',
          type: 'bar',
          data: Object.entries(severityCounts).map(([severity, count]) => ({
            value: count,
            itemStyle: { color: getSeverityColor(severity) }
          }))
        }]
      };
    };

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="异常总数"
                value={anomalies.length}
                prefix={<WarningOutlined />}
                valueStyle={{ color: anomalies.length > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高危异常"
                value={anomalies.filter(a => a.severity === 'error').length}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="警告异常"
                value={anomalies.filter(a => a.severity === 'warning').length}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="信息异常"
                value={anomalies.filter(a => a.severity === 'info').length}
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="异常类型分布">
              <ReactECharts option={getAnomalyTypeDistribution()} style={{ height: 250 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="严重程度分布">
              <ReactECharts option={getSeverityDistribution()} style={{ height: 250 }} />
            </Card>
          </Col>
        </Row>

        <Card title="异常详情" style={{ marginTop: 16 }}>
          <Timeline>
            {anomalies.map((anomaly, index) => (
              <Timeline.Item
                key={index}
                dot={getSeverityIcon(anomaly.severity)}
                color={getSeverityColor(anomaly.severity)}
              >
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Card.Meta
                    title={
                      <div>
                        <Tag color={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity.toUpperCase()}
                        </Tag>
                        {anomaly.description}
                      </div>
                    }
                    description={
                      <div>
                        <Text>类型: {anomaly.type}</Text>
                        {anomaly.details && (
                          <div style={{ marginTop: 8 }}>
                            <Descriptions size="small" column={1}>
                              {Object.entries(anomaly.details).map(([key, value]) => (
                                <Descriptions.Item key={key} label={key}>
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </Descriptions.Item>
                              ))}
                            </Descriptions>
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </div>
    );
  };

  // 性能分析组件
  const PerformanceAnalysis = ({ performanceAnalysis }) => {
    if (!performanceAnalysis) return null;

    const { bandwidthUtilization, responseTimeStats, networkQualityScore, recommendations } = performanceAnalysis;

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card>
              <Statistic
                title="网络质量评分"
                value={networkQualityScore}
                suffix="/100"
                prefix={<DashboardOutlined />}
                valueStyle={{ 
                  color: networkQualityScore > 80 ? '#3f8600' : 
                         networkQualityScore > 60 ? '#faad14' : '#cf1322' 
                }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均吞吐量"
                value={bandwidthUtilization?.averageThroughput || 'N/A'}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="传输时长"
                value={bandwidthUtilization?.durationSeconds || 0}
                suffix="秒"
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {bandwidthUtilization && (
          <Card title="带宽利用率分析" style={{ marginTop: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="总传输字节">{bandwidthUtilization.totalBytes?.toLocaleString()} bytes</Descriptions.Item>
              <Descriptions.Item label="传输时长">{bandwidthUtilization.durationSeconds} 秒</Descriptions.Item>
              <Descriptions.Item label="平均吞吐量">{bandwidthUtilization.averageThroughput}</Descriptions.Item>
              <Descriptions.Item label="峰值吞吐量">{bandwidthUtilization.peakThroughput}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {responseTimeStats && (
          <Card title="响应时间统计" style={{ marginTop: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="平均RTT">{responseTimeStats.averageRTT} ms</Descriptions.Item>
              <Descriptions.Item label="连接数量">{responseTimeStats.connectionCount}</Descriptions.Item>
              <Descriptions.Item label="握手成功率">{responseTimeStats.handshakeSuccessRate}%</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {recommendations && recommendations.length > 0 && (
          <Card title="性能优化建议" style={{ marginTop: 16 }}>
            <List
              dataSource={recommendations}
              renderItem={recommendation => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<ThunderboltOutlined style={{ 
                      color: recommendation.priority === 'high' ? '#ff4d4f' : 
                             recommendation.priority === 'medium' ? '#faad14' : '#1890ff' 
                    }} />}
                    title={recommendation.title}
                    description={
                      <div>
                        <Text>{recommendation.description}</Text><br/>
                        <Tag color={
                          recommendation.priority === 'high' ? 'red' : 
                          recommendation.priority === 'medium' ? 'orange' : 'blue'
                        }>
                          {recommendation.priority} 优先级
                        </Tag>
                        <Tag>{recommendation.category}</Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '50vh' 
        }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 16 }}>正在加载分析结果...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={loadAnalysisResult}>
                重试
              </Button>
              <Button size="small" onClick={() => navigate('/analysis')}>
                返回分析页面
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="page-container">
        <Empty
          description="没有找到分析结果"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/analysis')}>
            返回分析页面
          </Button>
        </Empty>
      </div>
    );
  }

  // 处理分析结果数据
  const analysisData = result.results || {};
  const summary = analysisData.summary || {};
  const protocols = analysisData.protocols || [];
  const connections = analysisData.connections || {};
  const anomalies = analysisData.anomalies || [];
  const timeSeriesData = analysisData.timeSeriesData || {};
  const tcpConnections = analysisData.tcpConnections || [];
  const performanceAnalysis = analysisData.performanceAnalysis || {};
  
  // 新增：从不同的数据源提取异常和性能数据
  const networkAnomalies = analysisData.network_anomalies || [];
  const networkPerformance = analysisData.performance_analysis || {};
  const harTimeSeriesData = analysisData.time_series_analysis || {};
  const harPerformanceData = analysisData.performance_analysis || {};

  // 协议统计表格列
  const protocolColumns = [
    {
      title: '协议类型',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Tag color="blue">{name}</Tag>
      ),
    },
    {
      title: '数据包数量',
      dataIndex: 'packets',
      key: 'packets',
      render: (packets) => packets?.toLocaleString() || 0,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage?.toFixed(1) || 0}%`,
    },
    {
      title: '数据量',
      dataIndex: 'bytes',
      key: 'bytes',
      render: (bytes) => formatBytes(bytes || 0),
    },
  ];

  // 连接表格列
  const connectionColumns = [
    {
      title: '连接',
      dataIndex: 'connection',
      key: 'connection',
      ellipsis: true,
    },
    {
      title: '数据包',
      dataIndex: 'packets',
      key: 'packets',
      render: (packets) => packets?.toLocaleString() || 0,
    },
  ];

  // 状态码分布列
  const statusCodeColumns = [
    {
      title: '状态码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color={code >= 200 && code < 300 ? 'success' : code >= 400 && code < 500 ? 'error' : 'warning'}>{code}</Tag>,
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      render: (count) => count?.toLocaleString() || 0,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => `${percentage?.toFixed(1) || 0}%`,
    },
  ];

  // 获取协议分布图表选项
  const getProtocolDistributionOption = () => {
    const protocolCounts = {};
    protocols.forEach(protocol => {
      protocolCounts[protocol.name] = (protocolCounts[protocol.name] || 0) + protocol.packets;
    });

    const totalPackets = protocols.reduce((sum, p) => sum + p.packets, 0);

    return {
      title: { text: '协议分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
      series: [{
        name: '协议',
        type: 'pie',
        radius: '50%',
        data: Object.entries(protocolCounts).map(([name, count]) => ({
          value: count,
          name: name
        })).sort((a, b) => b.value - a.value),
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        }
      }]
    };
  };

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/analysis')}
            >
              返回
            </Button>
            <div>
              <Title level={2} className="page-title">
                分析结果
              </Title>
              <Text className="page-description">
                文件: {fileInfo?.original_name || `ID: ${id}`} | 
                分析时间: {result.completedAt ? new Date(result.completedAt).toLocaleString() : '进行中'}
              </Text>
            </div>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => navigate(`/visualization/${id}`)}
            >
              可视化分析
            </Button>
            <Dropdown
              menu={{
                items: reportMenuItems.map(item => ({
                  key: item.key,
                  icon: item.icon,
                  label: item.label,
                  onClick: item.onClick
                }))
              }}
              placement="bottomRight"
            >
              <Button icon={<FileTextOutlined />}>
                生成报告 <MoreOutlined />
              </Button>
            </Dropdown>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleGeneratePDFReport()}
              loading={reportGenerating}
            >
              下载PDF
            </Button>
            <Button 
              icon={<ShareAltOutlined />}
              onClick={handleShare}
            >
              分享结果
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadAnalysisResult}
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {/* 分析状态 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <Text strong>分析状态:</Text> {getStatusTag(result.status)}
              </div>
              {result.status === 'error' && result.error && (
                <Alert
                  message="分析错误"
                  description={result.error.message || '分析过程中发生错误'}
                  type="error"
                  showIcon
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 基本统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总数据包"
              value={summary.totalPackets || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总数据量"
              value={formatBytes(summary.totalBytes || 0)}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="持续时间"
              value={summary.duration || 0}
              suffix="秒"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均包大小"
              value={summary.avgPacketSize || 0}
              suffix="字节"
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 协议统计 */}
        <Col xs={24} lg={12}>
          <Card title="协议统计" className="dashboard-card">
            {protocols.length > 0 ? (
              <Table
                columns={protocolColumns}
                dataSource={protocols}
                rowKey="name"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty 
                description="没有检测到协议数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* 文件信息 */}
        <Col xs={24} lg={12}>
          <Card title="文件信息" className="dashboard-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="文件名">
                {fileInfo?.original_name || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="文件类型">
                {fileInfo?.file_type?.toUpperCase() || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {formatBytes(fileInfo?.file_size || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {fileInfo?.created_at ? new Date(fileInfo.created_at).toLocaleString() : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="分析类型">
                {result.analysisType || 'protocol_analysis'}
              </Descriptions.Item>
              <Descriptions.Item label="分析状态">
                {getStatusTag(result.status)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* 详细分析 */}
      {result.status === 'completed' && (
        <Card title="详细分析" className="dashboard-card" style={{ marginTop: 16 }}>
          <Tabs defaultActiveKey="overview" type="card">
            <TabPane tab="概览" key="overview">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title={analysisData.analysis_type === 'har' ? '总请求数' : '总数据包数'}
                      value={analysisData.analysis_type === 'har' ? analysisData.total_requests : analysisData.packet_count}
                      prefix={<FileTextOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="文件大小"
                      value={formatBytes(fileInfo?.file_size || 0)}
                      prefix={<FileTextOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title={analysisData.analysis_type === 'har' ? '唯一域名' : '唯一IP'}
                      value={analysisData.analysis_type === 'har' ? analysisData.unique_domains : analysisData.unique_ips}
                      prefix={<GlobalOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title={analysisData.analysis_type === 'har' ? '平均响应时间' : '传输时长'}
                      value={analysisData.analysis_type === 'har' ? 
                        (analysisData.avg_response_time || 0).toFixed(2) : 
                        (analysisData.duration || 0).toFixed(2)}
                      suffix={analysisData.analysis_type === 'har' ? 'ms' : 's'}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 协议分布图表 */}
              <Card title="协议分布" style={{ marginTop: 16 }}>
                <ReactECharts option={getProtocolDistributionOption()} style={{ height: 300 }} />
              </Card>
            </TabPane>

            {/* 时间序列分析标签页 */}
            {(analysisData.time_series_analysis && Object.keys(analysisData.time_series_analysis).length > 0) && (
              <TabPane tab="时间序列分析" key="timeseries">
                <TimeSeriesAnalysis timeSeriesData={analysisData.time_series_analysis} />
              </TabPane>
            )}

            {/* TCP连接分析标签页 */}
            {(analysisData.tcp_connections && analysisData.tcp_connections.length > 0) && (
              <TabPane tab="TCP连接分析" key="tcp">
                <TCPConnectionAnalysis tcpConnections={analysisData.tcp_connections} performanceAnalysis={analysisData.performance_analysis} />
              </TabPane>
            )}

            {/* 异常检测标签页 */}
            {(analysisData.network_anomalies && analysisData.network_anomalies.length > 0) && (
              <TabPane tab="异常检测" key="anomalies">
                <AnomalyDetection anomalies={analysisData.network_anomalies} />
              </TabPane>
            )}

            {/* 性能分析标签页 */}
            {(analysisData.performance_analysis && Object.keys(analysisData.performance_analysis).length > 0) && (
              <TabPane tab="性能分析" key="performance">
                <PerformanceAnalysis performanceAnalysis={analysisData.performance_analysis} />
              </TabPane>
            )}

            <TabPane tab="详细数据" key="details">
              <Collapse defaultActiveKey={['protocols']}>
                {/* 协议统计 */}
                <Panel header="协议统计" key="protocols">
                  <Table
                    columns={protocolColumns}
                    dataSource={protocols}
                    rowKey="name"
                    pagination={false}
                    size="small"
                  />
                </Panel>

                {/* 连接统计 */}
                {connections.topConnections && connections.topConnections.length > 0 && (
                  <Panel header="主要连接" key="connections">
                    <Table
                      columns={connectionColumns}
                      dataSource={connections.topConnections}
                      rowKey="connection"
                      pagination={false}
                      size="small"
                    />
                  </Panel>
                )}

                {/* 状态码分布 (仅HAR) */}
                {analysisData.analysis_type === 'har' && analysisData.status_codes && (
                  <Panel header="状态码分布" key="status-codes">
                    <Table
                      columns={statusCodeColumns}
                      dataSource={Object.entries(analysisData.status_codes).map(([code, count]) => ({
                        code: parseInt(code),
                        count,
                        percentage: (count / analysisData.total_requests) * 100
                      }))}
                      rowKey="code"
                      pagination={false}
                      size="small"
                    />
                  </Panel>
                )}

                {/* IP地址列表 (仅PCAP) */}
                {analysisData.analysis_type === 'pcap' && analysisData.ip_addresses && (
                  <Panel header="IP地址列表" key="ip-addresses">
                    <Space wrap>
                      {analysisData.ip_addresses.map((ip, index) => (
                        <Tag key={index} color="blue">{ip}</Tag>
                      ))}
                    </Space>
                  </Panel>
                )}

                {/* 域名列表 (仅HAR) */}
                {analysisData.analysis_type === 'har' && analysisData.domains && (
                  <Panel header="域名列表" key="domains">
                    <Space wrap>
                      {analysisData.domains.map((domain, index) => (
                        <Tag key={index} color="green">{domain}</Tag>
                      ))}
                    </Space>
                  </Panel>
                )}

                {/* 错误信息 */}
                {analysisData.errors && analysisData.errors.length > 0 && (
                  <Panel header="错误信息" key="errors">
                    <List
                      dataSource={analysisData.errors}
                      renderItem={error => (
                        <List.Item>
                          <Alert message={error} type="error" showIcon />
                        </List.Item>
                      )}
                    />
                  </Panel>
                )}

                {/* 原始数据 */}
                <Panel header="原始分析数据" key="raw">
                  <div style={{ 
                    background: '#f6f8fa', 
                    padding: 16, 
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 400,
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(analysisData, null, 2)}
                  </div>
                </Panel>
              </Collapse>
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* PDF报告配置模态框 */}
      <Modal
        title="生成PDF报告"
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          layout="vertical"
          onFinish={handleGeneratePDFReport}
          initialValues={{
            format: 'A4',
            orientation: 'portrait'
          }}
        >
          <Form.Item
            label="页面格式"
            name="format"
            rules={[{ required: true, message: '请选择页面格式' }]}
          >
            <Select>
              {reportOptions.formats.map(format => (
                <Select.Option key={format.value} value={format.value}>
                  {format.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="页面方向"
            name="orientation"
            rules={[{ required: true, message: '请选择页面方向' }]}
          >
            <Select>
              {reportOptions.orientations.map(orientation => (
                <Select.Option key={orientation.value} value={orientation.value}>
                  {orientation.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setReportModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={reportGenerating}
                icon={<FilePdfOutlined />}
              >
                生成PDF
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnalysisResults; 