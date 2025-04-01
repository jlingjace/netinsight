import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Spin, Card, Select, Tooltip, Button } from 'antd';
import { FullscreenOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import 'echarts/lib/chart/graph';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/title';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/toolbox';
import './index.css';

interface Node {
  id: string;
  name: string;
  value: number; // 流量大小，用于决定节点大小
  category: number; // 类别，例如0=客户端, 1=服务器, 2=路由器
  symbolSize: number; // 节点图形大小
  itemStyle?: {
    color?: string; // 节点颜色
    borderColor?: string; // 边框颜色
  };
  label?: {
    show: boolean; // 是否显示标签
  };
  tooltip?: {
    formatter: string; // 提示信息
  };
  x?: number; // 指定初始x坐标
  y?: number; // 指定初始y坐标
  // 额外属性，用于节点详情展示
  ipAddress?: string;
  packetCount?: number;
  bytesTransferred?: number;
  suspicious?: boolean;
}

interface Link {
  source: string; // 源节点ID
  target: string; // 目标节点ID
  value: number; // 连接值，表示流量大小
  lineStyle?: {
    color?: string; // 线条颜色
    width?: number; // 线条宽度
    type?: 'solid' | 'dashed' | 'dotted'; // 线条类型
    curveness?: number; // 曲度，0-1
  };
  label?: {
    show: boolean; // 是否显示标签
    formatter: string; // 标签格式
  };
  tooltip?: {
    formatter: string; // 提示信息
  };
  // 额外属性
  protocol?: string;
  packetCount?: number;
  bytesTransferred?: number;
  suspicious?: boolean;
}

interface Category {
  name: string;
  itemStyle?: {
    color?: string;
  };
}

interface TopologyData {
  nodes: Node[];
  links: Link[];
  categories: Category[];
  loading: boolean;
}

interface NetworkTopologyProps {
  data?: TopologyData;
  height?: number | string;
  title?: string;
  onNodeClick?: (node: Node) => void;
  onLinkClick?: (link: Link) => void;
  loading?: boolean;
}

const defaultCategories: Category[] = [
  { name: '客户端', itemStyle: { color: '#5470c6' } },
  { name: '服务器', itemStyle: { color: '#91cc75' } },
  { name: '路由设备', itemStyle: { color: '#fac858' } },
  { name: '安全设备', itemStyle: { color: '#ee6666' } },
  { name: '可疑节点', itemStyle: { color: '#ff0000' } },
];

// 生成演示数据
const generateDemoData = (): TopologyData => {
  const nodes: Node[] = [];
  const links: Link[] = [];
  
  // 客户端节点
  for (let i = 1; i <= 5; i++) {
    nodes.push({
      id: `client${i}`,
      name: `客户端 ${i}`,
      value: Math.random() * 20 + 10,
      category: 0,
      symbolSize: 30,
      ipAddress: `192.168.1.${i+10}`,
      packetCount: Math.floor(Math.random() * 1000),
      bytesTransferred: Math.floor(Math.random() * 10000000),
      suspicious: false
    });
  }
  
  // 服务器节点
  for (let i = 1; i <= 3; i++) {
    nodes.push({
      id: `server${i}`,
      name: `服务器 ${i}`,
      value: Math.random() * 30 + 20,
      category: 1,
      symbolSize: 40,
      ipAddress: `10.0.0.${i}`,
      packetCount: Math.floor(Math.random() * 5000),
      bytesTransferred: Math.floor(Math.random() * 50000000),
      suspicious: i === 3 // 第3台服务器标记为可疑
    });
    
    // 如果是可疑服务器，修改类别
    if (i === 3) {
      nodes[nodes.length - 1].category = 4;
    }
  }
  
  // 路由设备
  nodes.push({
    id: 'router1',
    name: '核心路由器',
    value: 50,
    category: 2,
    symbolSize: 50,
    ipAddress: '10.0.0.254',
    packetCount: Math.floor(Math.random() * 10000),
    bytesTransferred: Math.floor(Math.random() * 100000000),
    suspicious: false
  });
  
  // 安全设备
  nodes.push({
    id: 'firewall1',
    name: '防火墙',
    value: 40,
    category: 3,
    symbolSize: 45,
    ipAddress: '10.0.0.253',
    packetCount: Math.floor(Math.random() * 8000),
    bytesTransferred: Math.floor(Math.random() * 80000000),
    suspicious: false
  });
  
  // 创建链接
  // 所有客户端连接到路由器
  for (let i = 1; i <= 5; i++) {
    links.push({
      source: `client${i}`,
      target: 'router1',
      value: Math.random() * 10 + 1,
      protocol: 'TCP',
      packetCount: Math.floor(Math.random() * 1000),
      bytesTransferred: Math.floor(Math.random() * 10000000),
      suspicious: false,
      lineStyle: {
        width: Math.random() * 3 + 1,
        type: 'solid',
        curveness: 0.1
      }
    });
  }
  
  // 路由器连接到所有服务器
  for (let i = 1; i <= 3; i++) {
    links.push({
      source: 'router1',
      target: `server${i}`,
      value: Math.random() * 8 + 2,
      protocol: 'TCP',
      packetCount: Math.floor(Math.random() * 5000),
      bytesTransferred: Math.floor(Math.random() * 50000000),
      suspicious: i === 3, // 到第3台服务器的连接标记为可疑
      lineStyle: {
        width: Math.random() * 5 + 2,
        type: 'solid', 
        curveness: 0.1,
        // 可疑连接使用红色
        color: i === 3 ? '#ff0000' : undefined
      }
    });
  }
  
  // 路由器连接到防火墙
  links.push({
    source: 'router1',
    target: 'firewall1',
    value: 15,
    protocol: 'Multiple',
    packetCount: Math.floor(Math.random() * 8000),
    bytesTransferred: Math.floor(Math.random() * 80000000),
    suspicious: false,
    lineStyle: {
      width: 6,
      type: 'solid',
      curveness: 0.1
    }
  });

  return {
    nodes,
    links,
    categories: defaultCategories,
    loading: false
  };
};

const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  data,
  height = 600,
  title = '网络拓扑图',
  onNodeClick,
  onLinkClick,
  loading = false
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // 使用演示数据或传入的数据
  const topologyData = data || generateDemoData();
  
  useEffect(() => {
    // 初始化图表
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
      
      const option = {
        title: {
          text: title,
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params: any) {
            if (params.dataType === 'node') {
              const node = params.data as Node;
              return `
                <div style="font-weight:bold;margin-bottom:5px;">${node.name}</div>
                <div>IP地址: ${node.ipAddress || 'N/A'}</div>
                <div>数据包: ${node.packetCount?.toLocaleString() || 0}</div>
                <div>传输量: ${formatBytes(node.bytesTransferred || 0)}</div>
                ${node.suspicious ? '<div style="color:red;margin-top:5px;">⚠️ 可疑节点</div>' : ''}
              `;
            } else if (params.dataType === 'edge') {
              const link = params.data as Link;
              return `
                <div style="font-weight:bold;margin-bottom:5px;">连接详情</div>
                <div>源: ${getNodeNameById(link.source as string)}</div>
                <div>目标: ${getNodeNameById(link.target as string)}</div>
                <div>协议: ${link.protocol || 'Unknown'}</div>
                <div>数据包: ${link.packetCount?.toLocaleString() || 0}</div>
                <div>传输量: ${formatBytes(link.bytesTransferred || 0)}</div>
                ${link.suspicious ? '<div style="color:red;margin-top:5px;">⚠️ 可疑流量</div>' : ''}
              `;
            }
            return '';
          }
        },
        legend: {
          data: topologyData.categories.map(cat => cat.name),
          orient: 'vertical',
          left: 'left'
        },
        animationDurationUpdate: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
          {
            type: 'graph',
            layout: 'force',
            force: {
              repulsion: 300,
              edgeLength: 120,
              gravity: 0.1
            },
            roam: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}'
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 10
              }
            },
            data: topologyData.nodes,
            links: topologyData.links,
            categories: topologyData.categories,
            draggable: true,
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8]
          }
        ]
      };
      
      // 使用any类型绕过类型检查，因为ECharts的类型定义有问题
      chartInstance.current.setOption(option as any);
      
      // 监听节点点击事件
      chartInstance.current.on('click', function(params: any) {
        if (params.dataType === 'node' && onNodeClick) {
          onNodeClick(params.data as Node);
        } else if (params.dataType === 'edge' && onLinkClick) {
          onLinkClick(params.data as Link);
        }
      });
    }
    
    // 窗口大小变化时重新调整图表大小
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [topologyData, title, onNodeClick, onLinkClick]);
  
  // 格式化字节数为可读形式
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 根据节点ID获取节点名称
  const getNodeNameById = (id: string): string => {
    const node = topologyData.nodes.find(n => n.id === id);
    return node ? node.name : id;
  };
  
  // 重置图表视图
  const resetView = () => {
    chartInstance.current?.dispatchAction({
      type: 'restore'
    });
  };
  
  // 切换到全屏模式
  const toggleFullscreen = () => {
    if (chartRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartRef.current.requestFullscreen();
      }
    }
  };
  
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <div>
            <Select
              style={{ width: 150, marginRight: 8 }}
              placeholder="筛选视图"
              defaultValue="all"
            >
              <Select.Option value="all">所有节点</Select.Option>
              <Select.Option value="suspicious">仅可疑节点</Select.Option>
              <Select.Option value="clients">仅客户端</Select.Option>
              <Select.Option value="servers">仅服务器</Select.Option>
            </Select>
            <Tooltip title="筛选器">
              <Button icon={<FilterOutlined />} style={{ marginRight: 8 }} />
            </Tooltip>
            <Tooltip title="重置视图">
              <Button icon={<ReloadOutlined />} onClick={resetView} style={{ marginRight: 8 }} />
            </Tooltip>
            <Tooltip title="全屏">
              <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen} />
            </Tooltip>
          </div>
        </div>
      }
      bodyStyle={{ height, padding: 0 }}
    >
      {loading || topologyData.loading ? (
        <div className="topology-loading-container">
          <Spin tip="加载中..." size="large" />
        </div>
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      )}
    </Card>
  );
};

export default NetworkTopology; 