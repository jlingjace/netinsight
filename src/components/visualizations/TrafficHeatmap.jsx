import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card, Empty, Spin } from 'antd';
import * as echarts from 'echarts';

// 添加字节数格式化函数
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const TrafficHeatmap = ({ analysisData, loading = false }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initChart = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const option = generateChartOption();
    chart.setOption(option);
  }, [analysisData]);

  useEffect(() => {
    if (analysisData && chartRef.current) {
      initChart();
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, [analysisData, initChart]);

  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const generateChartOption = () => {
    console.log('TrafficHeatmap 数据处理:', analysisData);
    
    if (!analysisData) {
      console.log('TrafficHeatmap: 没有数据');
      return getEmptyOption();
    }

    // 根据分析类型生成不同的热力图数据
    if (analysisData.summary?.topSources) {
      return generateHARHeatmap();
    } else if (analysisData.analysis_type === 'pcap' || analysisData.protocols) {
      return generatePCAPHeatmap();
    }

    console.log('TrafficHeatmap: 无法识别数据类型');
    return getEmptyOption();
  };

  const generateHARHeatmap = () => {
    console.log('生成HAR热力图');
    
    // 使用topSources数据生成域名vs时间的热力图
    const topSources = analysisData.summary?.topSources || [];
    
    if (topSources.length === 0) {
      console.log('HAR热力图: 没有topSources数据');
      return getEmptyOption();
    }

    // 生成域名vs协议的热力图
    const domains = topSources.slice(0, 10).map(source => 
      source.ip.replace(/^https?:\/\//, '')
    );
    const protocols = analysisData.protocols || [];
    
    // 生成热力图数据
    const data = [];
    domains.forEach((domain, domainIndex) => {
      protocols.forEach((protocol, protocolIndex) => {
        // 根据域名和协议生成相关性数据
        const sourceData = topSources.find(s => s.ip.includes(domain));
        const value = sourceData ? Math.floor(sourceData.packets / protocols.length) : 0;
        if (value > 0) {
          data.push([protocolIndex, domainIndex, value]);
        }
      });
    });

    const maxValue = Math.max(...data.map(item => item[2]), 1);

    return {
      title: {
        text: '域名与协议分布热力图',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        position: 'top',
        formatter: function (params) {
          const protocolName = protocols[params.value[0]]?.name || 'Unknown';
          const domain = domains[params.value[1]];
          const count = params.value[2];
          return `${domain}<br/>${protocolName}: ${count} 请求`;
        }
      },
      grid: {
        height: '60%',
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: protocols.map(p => p.name || p),
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: domains,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#e0f3ff', '#1890ff', '#0050b3']
        }
      },
      series: [{
        name: '请求数',
        type: 'heatmap',
        data: data,
        label: {
          show: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const generatePCAPHeatmap = () => {
    console.log('生成PCAP热力图');
    
    const ipAddresses = analysisData.ip_addresses || [];
    const protocols = analysisData.protocols || [];
    
    if (ipAddresses.length === 0) {
      console.log('PCAP热力图: 没有IP地址数据');
      return getEmptyOption();
    }

    // 生成IP vs 协议的热力图
    const protocolNames = Array.isArray(protocols) ? 
      protocols.map(p => p.name || p) : 
      Object.keys(protocols);
    const topIPs = ipAddresses.slice(0, 15); // 取前15个IP
    
    // 模拟IP和协议的关联数据
    const data = [];
    topIPs.forEach((ip, ipIndex) => {
      protocolNames.forEach((protocol, protocolIndex) => {
        // 这里可以根据实际数据生成更准确的关联
        const protocolData = Array.isArray(protocols) ? 
          protocols.find(p => (p.name || p) === protocol) :
          protocols[protocol];
        const value = protocolData ? 
          Math.floor(Math.random() * (protocolData.packets || protocolData) / 10) : 0;
        if (value > 0) {
          data.push([protocolIndex, ipIndex, value]);
        }
      });
    });

    const maxValue = Math.max(...data.map(item => item[2]), 1);

    return {
      title: {
        text: 'IP地址与协议分布热力图',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        position: 'top',
        formatter: function (params) {
          const protocol = protocolNames[params.value[0]];
          const ip = topIPs[params.value[1]];
          const count = params.value[2];
          return `${ip}<br/>${protocol}: ${count} 包`;
        }
      },
      grid: {
        height: '60%',
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: protocolNames,
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: topIPs,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#e0f3ff', '#1890ff', '#0050b3']
        }
      },
      series: [{
        name: '数据包',
        type: 'heatmap',
        data: data,
        label: {
          show: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const getEmptyOption = () => ({
    title: {
      text: '暂无数据',
      left: 'center',
      top: 'center',
      textStyle: {
        fontSize: 16,
        color: '#999'
      }
    }
  });

  if (loading) {
    return (
      <Card title="流量热力图">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card title="流量热力图">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  return (
    <Card title="流量热力图" bodyStyle={{ padding: '20px' }}>
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: '500px'
        }}
      />
    </Card>
  );
};

export default TrafficHeatmap; 