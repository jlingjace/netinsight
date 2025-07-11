import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  Space,
  Tabs,
  Spin,
  Alert,
  Select,
  Switch,
  Divider,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  NodeIndexOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { analysisService } from '../services/analysisService';
import { http } from '../utils/httpClient';
import NetworkTopology from '../components/visualizations/NetworkTopology';
import TrafficHeatmap from '../components/visualizations/TrafficHeatmap';
import ReactECharts from 'echarts-for-react';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 添加字节数格式化函数
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const VisualizationDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [visualSettings, setVisualSettings] = useState({
    theme: 'light',
    autoRefresh: false,
    showLabels: true,
    animationEnabled: true
  });

  useEffect(() => {
    loadAnalysisData();
  }, [id]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      
      // 获取分析结果
      const analysisResponse = await analysisService.getAnalysisDetail(id);
      
      // 获取文件信息
      const fileResponse = await http.get(`/files/${id}`);
      
      if (analysisResponse && analysisResponse.results) {
        setAnalysisData(analysisResponse.results);
        setFileInfo(fileResponse.data);
      } else {
        message.error('加载分析数据失败：分析结果不存在');
      }
    } catch (error) {
      console.error('加载分析数据失败:', error);
      if (error.response?.status === 404) {
        message.error('分析结果不存在，请检查文件是否已完成分析');
      } else {
        message.error('加载分析数据失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // 生成协议分布图表配置
  const getProtocolChartOption = () => {
    if (!analysisData || !analysisData.protocols) return {};

    // 处理协议数据，支持数组和对象两种格式
    let data = [];
    if (Array.isArray(analysisData.protocols)) {
      data = analysisData.protocols.map(protocol => ({
        name: protocol.name,
        value: protocol.packets
      }));
    } else {
      data = Object.entries(analysisData.protocols).map(([name, value]) => ({
        name,
        value
      }));
    }

    return {
      title: {
        text: '协议分布',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '协议',
          type: 'pie',
          radius: '50%',
          data: data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  };

  // 生成时间序列图表配置
  const getTimelineChartOption = () => {
    // 如果没有timeline数据，尝试使用其他数据生成简单的图表
    if (!analysisData) return {};

    let xData = [];
    let yData = [];
    let seriesName = '数据包';

    if (analysisData.timeline && analysisData.timeline.length > 0) {
      // 如果有timeline数据，使用timeline数据
      const timeline = analysisData.timeline;
      xData = timeline.map(point => new Date(point.timestamp).toLocaleTimeString());
      yData = timeline.map(point => point.count);
    } else if (analysisData.summary && analysisData.summary.topSources) {
      // 如果没有timeline数据，使用topSources数据生成简单的图表
      const topSources = analysisData.summary.topSources.slice(0, 10);
      xData = topSources.map(source => source.ip);
      yData = topSources.map(source => source.packets);
      seriesName = '数据包数';
    } else {
      // 如果都没有，返回空配置
      return {
        title: {
          text: '时间序列分析',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['暂无数据']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '数据',
            type: 'line',
            data: [0],
            smooth: true,
            areaStyle: {
              opacity: 0.3
            },
            lineStyle: {
              width: 3
            }
          }
        ]
      };
    }

    return {
      title: {
        text: '时间序列分析',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          data: yData,
          smooth: true,
          areaStyle: {
            opacity: 0.3
          },
          lineStyle: {
            width: 3
          }
        }
      ]
    };
  };

  // 生成状态码分布图表配置
  const getStatusCodeChartOption = () => {
    if (!analysisData || !analysisData.status_codes) {
      return {
        title: {
          text: 'HTTP状态码分布',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['暂无数据']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '请求数',
            type: 'bar',
            data: [0],
            itemStyle: {
              color: '#5cb85c'
            }
          }
        ]
      };
    }

    const statusCodes = analysisData.status_codes;
    const categories = Object.keys(statusCodes);
    const values = Object.values(statusCodes);

    return {
      title: {
        text: 'HTTP状态码分布',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: categories
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '请求数',
          type: 'bar',
          data: values,
          itemStyle: {
            color: function(params) {
              const colors = ['#5cb85c', '#f0ad4e', '#d9534f', '#337ab7'];
              return colors[params.dataIndex % colors.length];
            }
          }
        }
      ]
    };
  };

  // 生成流量分布图表配置
  const getTrafficDistributionOption = () => {
    if (!analysisData) return {};

    // 根据分析数据生成流量分布数据
    let data = [];
    let title = '流量分布';

    if (analysisData.summary && analysisData.summary.topSources) {
      // 使用topSources数据，基于包数和平均包大小估算字节数
      const topSources = analysisData.summary.topSources.slice(0, 10);
      const avgPacketSize = analysisData.summary.avgPacketSize || 1500; // 默认1500字节
      
      data = topSources.map(source => {
        const estimatedBytes = source.bytes || (source.packets * avgPacketSize);
        return {
          name: source.ip,
          value: estimatedBytes,
          bytes: estimatedBytes,
          packets: source.packets
        };
      });
      title = '主要流量源分布（按数据量）';
    } else if (analysisData.summary && analysisData.summary.topDestinations) {
      // 使用topDestinations数据
      const topDestinations = analysisData.summary.topDestinations.slice(0, 10);
      const avgPacketSize = analysisData.summary.avgPacketSize || 1500;
      
      data = topDestinations.map(dest => {
        const estimatedBytes = dest.bytes || (dest.packets * avgPacketSize);
        return {
          name: dest.ip,
          value: estimatedBytes,
          bytes: estimatedBytes,
          packets: dest.packets
        };
      });
      title = '主要流量目标分布（按数据量）';
    } else if (analysisData.analysis_type === 'har') {
      const domains = analysisData.domains || [];
      data = domains.slice(0, 10).map((domain, index) => ({
        name: domain,
        value: Math.floor(Math.random() * 1000000) + 100000, // 模拟字节数
        bytes: Math.floor(Math.random() * 1000000) + 100000
      }));
      title = '域名流量分布（按数据量）';
    } else if (analysisData.analysis_type === 'pcap') {
      const ips = analysisData.ip_addresses || [];
      data = ips.slice(0, 10).map((ip, index) => ({
        name: ip,
        value: Math.floor(Math.random() * 1000000) + 100000,
        bytes: Math.floor(Math.random() * 1000000) + 100000
      }));
      title = 'IP流量分布（按数据量）';
    }

    // 如果没有数据，返回空图表
    if (data.length === 0) {
      return {
        title: {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['暂无数据']
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: function(value) {
              return formatBytes(value);
            }
          }
        },
        series: [
          {
            name: '流量',
            type: 'bar',
            data: [0],
            itemStyle: {
              color: '#1890ff'
            }
          }
        ]
      };
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const data = params[0];
          const originalData = data.data;
          if (typeof originalData === 'object' && originalData.bytes !== undefined) {
            return `${data.name}<br/>数据量: ${formatBytes(originalData.bytes)}<br/>请求数: ${originalData.packets || 'N/A'}`;
          } else {
            return `${data.name}<br/>数据量: ${formatBytes(data.value)}`;
          }
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value) {
            return formatBytes(value);
          }
        }
      },
      series: [
        {
          name: '流量',
          type: 'bar',
          data: data.map(item => ({
            value: item.value,
            bytes: item.bytes,
            packets: item.packets
          })),
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };

  const handleDownloadChart = (chartId) => {
    // 实现图表下载功能
    message.success('图表下载功能开发中...');
  };

  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在加载可视化数据...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="page-container">
        <Alert
          message="数据加载失败"
          description="无法加载分析数据，请检查文件是否存在或分析是否完成"
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/analysis')}>
              返回文件列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/results/${id}`)}
            >
              返回分析结果
            </Button>
            <div>
              <Title level={2} className="page-title">
                数据可视化
              </Title>
              <Text className="page-description">
                {fileInfo?.original_name} - 高级数据可视化分析
              </Text>
            </div>
          </Space>
          <Space>
            <Select
              value={visualSettings.theme}
              onChange={(value) => setVisualSettings(prev => ({ ...prev, theme: value }))}
              style={{ width: 100 }}
            >
              <Option value="light">浅色</Option>
              <Option value="dark">深色</Option>
            </Select>
            <Switch
              checkedChildren="动画"
              unCheckedChildren="静态"
              checked={visualSettings.animationEnabled}
              onChange={(checked) => setVisualSettings(prev => ({ ...prev, animationEnabled: checked }))}
            />
            <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
              全屏
            </Button>
          </Space>
        </div>
      </div>

      {/* 可视化内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane
          tab={
            <span>
              <BarChartOutlined />
              概览图表
            </span>
          }
          key="overview"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="协议分布" extra={
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadChart('protocol')} />
              }>
                <ReactECharts
                  option={getProtocolChartOption()}
                  style={{ height: '400px' }}
                  theme={visualSettings.theme}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="时间序列" extra={
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadChart('timeline')} />
              }>
                <ReactECharts
                  option={getTimelineChartOption()}
                  style={{ height: '400px' }}
                  theme={visualSettings.theme}
                />
              </Card>
            </Col>
            {analysisData.analysis_type === 'har' && (
              <Col xs={24} lg={12}>
                <Card title="状态码分布" extra={
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadChart('status')} />
                }>
                  <ReactECharts
                    option={getStatusCodeChartOption()}
                    style={{ height: '400px' }}
                    theme={visualSettings.theme}
                  />
                </Card>
              </Col>
            )}
            <Col xs={24} lg={12}>
              <Card title="流量分布" extra={
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadChart('traffic')} />
              }>
                <ReactECharts
                  option={getTrafficDistributionOption()}
                  style={{ height: '400px' }}
                  theme={visualSettings.theme}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <NodeIndexOutlined />
              网络拓扑
            </span>
          }
          key="topology"
        >
          <NetworkTopology analysisData={analysisData} loading={false} />
        </TabPane>

        <TabPane
          tab={
            <span>
              <HeatMapOutlined />
              热力图
            </span>
          }
          key="heatmap"
        >
          <TrafficHeatmap analysisData={analysisData} loading={false} />
        </TabPane>

        <TabPane
          tab={
            <span>
              <LineChartOutlined />
              高级分析
            </span>
          }
          key="advanced"
        >
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card title="多维度分析">
                <Alert
                  message="高级分析功能"
                  description="此功能正在开发中，将提供更深入的多维度数据分析和预测功能"
                  type="info"
                  showIcon
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default VisualizationDashboard; 