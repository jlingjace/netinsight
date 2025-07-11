import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Spin, Alert, Select, Button, Space, Typography } from 'antd';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { 
  FullscreenOutlined, 
  DownloadOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 添加字节数格式化函数
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const NetworkTopology = ({ analysisData, loading = false }) => {
  const [network, setNetwork] = useState(null);
  const [layoutType, setLayoutType] = useState('hierarchical');
  const [filterType, setFilterType] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  const initializeNetwork = useCallback(() => {
    if (!analysisData) return;

    // 准备节点和边数据
    const { nodes, edges } = prepareNetworkData(analysisData);
    
    // 创建DataSet
    const nodesDataSet = new DataSet(nodes);
    const edgesDataSet = new DataSet(edges);
    
    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet
    };

    // 网络配置
    const options = getNetworkOptions();

    // 销毁现有网络
    if (network) {
      network.destroy();
    }

    // 创建新网络
    const newNetwork = new Network(containerRef.current, data, options);
    
    // 设置事件监听器
    setupNetworkEvents(newNetwork);
    
    setNetwork(newNetwork);
    networkRef.current = newNetwork;
  }, [analysisData, network]);

  useEffect(() => {
    if (containerRef.current) {
      initializeNetwork();
    }
    
    return () => {
      if (network) {
        network.destroy();
      }
    };
  }, [analysisData, layoutType, filterType, initializeNetwork]);

  const prepareNetworkData = (data) => {
    console.log('NetworkTopology 数据处理:', data);
    
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    let nodeId = 1;

    // 检查数据类型和结构
    if (!data) {
      console.log('NetworkTopology: 没有数据');
      return { nodes: [], edges: [] };
    }

    if (data.analysis_type === 'pcap' || data.protocols) {
      console.log('处理PCAP数据');
      // PCAP数据的网络拓扑
      const ipAddresses = data.ip_addresses || [];
      const connections = data.connection_summary || data.connections?.topConnections || [];

      // 创建IP节点
      ipAddresses.forEach(ip => {
        if (!nodeMap.has(ip)) {
          const nodeType = getIPNodeType(ip);
          nodes.push({
            id: nodeId,
            label: ip,
            group: nodeType.group,
            title: `IP: ${ip}\n类型: ${nodeType.name}`,
            color: nodeType.color,
            size: 20
          });
          nodeMap.set(ip, nodeId);
          nodeId++;
        }
      });

      // 创建连接边
      if (Array.isArray(connections)) {
        connections.forEach(conn => {
          if (conn.connection) {
            const [src, dst] = conn.connection.split(' -> ');
            const srcClean = src.split(':')[0]; // 移除端口
            const dstClean = dst.split(':')[0];
            
            if (!nodeMap.has(srcClean)) {
              const nodeType = getIPNodeType(srcClean);
              nodes.push({
                id: nodeId,
                label: srcClean,
                group: nodeType.group,
                title: `IP: ${srcClean}\n类型: ${nodeType.name}`,
                color: nodeType.color,
                size: 20
              });
              nodeMap.set(srcClean, nodeId);
              nodeId++;
            }

            if (!nodeMap.has(dstClean)) {
              const nodeType = getIPNodeType(dstClean);
              nodes.push({
                id: nodeId,
                label: dstClean,
                group: nodeType.group,
                title: `IP: ${dstClean}\n类型: ${nodeType.name}`,
                color: nodeType.color,
                size: 20
              });
              nodeMap.set(dstClean, nodeId);
              nodeId++;
            }

            const srcId = nodeMap.get(srcClean);
            const dstId = nodeMap.get(dstClean);
            
            if (srcId && dstId && srcId !== dstId) {
              edges.push({
                id: `${srcId}-${dstId}`,
                from: srcId,
                to: dstId,
                label: `${conn.packets || 0} packets`,
                width: Math.min(Math.max((conn.packets || 0) / 100, 1), 10),
                color: getConnectionColor(conn.packets || 0)
              });
            }
          }
        });
      }

    } else if (data.summary?.topSources || data.summary?.topDestinations) {
      console.log('处理HAR数据');
      // HAR数据的域名拓扑
      const topSources = data.summary?.topSources || [];
      const topDestinations = data.summary?.topDestinations || [];

      // 创建中心客户端节点
      nodes.push({
        id: nodeId,
        label: 'Client',
        group: 'client',
        title: '客户端',
        color: '#2196F3',
        size: 30
      });
      const clientId = nodeId;
      nodeId++;

      // 创建域名节点（使用topSources）
      topSources.forEach(source => {
        const domain = source.ip.replace(/^https?:\/\//, '');
        if (!nodeMap.has(domain)) {
          // 估算字节数（如果没有bytes字段）
          const avgPacketSize = data.summary?.avgPacketSize || 1500;
          const estimatedBytes = source.bytes || (source.packets * avgPacketSize);
          
          nodes.push({
            id: nodeId,
            label: domain,
            group: 'domain',
            title: `域名: ${domain}\n请求数: ${source.packets}\n数据量: ${formatBytes(estimatedBytes)}`,
            color: '#4CAF50',
            size: Math.min(Math.max(source.packets / 5, 15), 40)
          });
          nodeMap.set(domain, nodeId);

          // 创建客户端到域名的连接
          edges.push({
            id: `${clientId}-${nodeId}`,
            from: clientId,
            to: nodeId,
            label: `${source.packets} 请求\n${formatBytes(estimatedBytes)}`,
            width: Math.min(Math.max(source.packets / 10, 1), 8),
            color: '#666'
          });

          nodeId++;
        }
      });
    }

    console.log(`NetworkTopology 生成: ${nodes.length} 节点, ${edges.length} 边`);
    return { nodes: filterNodes(nodes), edges: filterEdges(edges) };
  };

  const filterNodes = (nodes) => {
    if (filterType === 'all') return nodes;
    return nodes.filter(node => node.group === filterType);
  };

  const filterEdges = (edges) => {
    if (filterType === 'all') return edges;
    // 根据节点过滤边
    return edges;
  };

  const getIPNodeType = (ip) => {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
      return { name: '内网', group: 'internal', color: '#4CAF50' };
    } else if (ip.startsWith('127.')) {
      return { name: '本地', group: 'local', color: '#FF9800' };
    } else {
      return { name: '外网', group: 'external', color: '#F44336' };
    }
  };

  const getConnectionColor = (packets) => {
    if (packets > 1000) return '#F44336'; // 红色 - 高流量
    if (packets > 100) return '#FF9800';  // 橙色 - 中流量
    return '#4CAF50'; // 绿色 - 低流量
  };

  const getNetworkOptions = () => {
    const baseOptions = {
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 12,
          color: '#333'
        }
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 1 }
        },
        shadow: true,
        smooth: {
          type: 'continuous'
        }
      },
      groups: {
        internal: { color: { background: '#4CAF50', border: '#388E3C' } },
        external: { color: { background: '#F44336', border: '#D32F2F' } },
        local: { color: { background: '#FF9800', border: '#F57C00' } },
        domain: { color: { background: '#2196F3', border: '#1976D2' } },
        client: { color: { background: '#9C27B0', border: '#7B1FA2' } }
      },
      interaction: {
        hover: true,
        tooltipDelay: 300,
        hideEdgesOnDrag: true,
        hideNodesOnDrag: true
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 }
      }
    };

    // 根据布局类型添加特定配置
    if (layoutType === 'hierarchical') {
      baseOptions.layout = {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 150,
          nodeSpacing: 100
        }
      };
      baseOptions.physics.enabled = false;
    } else if (layoutType === 'force') {
      baseOptions.physics = {
        forceAtlas2Based: {
          gravitationalConstant: -26,
          centralGravity: 0.005,
          springLength: 230,
          springConstant: 0.18
        },
        maxVelocity: 146,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      };
    }

    return baseOptions;
  };

  const setupNetworkEvents = (network) => {
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        console.log('Node clicked:', nodeId);
        // 可以添加节点点击处理逻辑
      }
    });

    network.on('hoverNode', (params) => {
      // 节点悬停效果
      containerRef.current.style.cursor = 'pointer';
    });

    network.on('blurNode', (params) => {
      containerRef.current.style.cursor = 'default';
    });
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (network) {
      const canvas = network.getCanvas();
      const link = document.createElement('a');
      link.download = 'network-topology.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleRefresh = () => {
    if (network) {
      network.redraw();
      network.fit();
    }
  };

  if (loading) {
    return (
      <Card title="网络拓扑图">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在生成网络拓扑图...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card title="网络拓扑图">
        <Alert
          message="暂无数据"
          description="没有可用的网络数据来生成拓扑图"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>网络拓扑图</Title>
          <Space>
            <Select
              value={layoutType}
              onChange={setLayoutType}
              style={{ width: 120 }}
            >
              <Option value="hierarchical">层次布局</Option>
              <Option value="force">力导向布局</Option>
              <Option value="circle">环形布局</Option>
            </Select>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: 100 }}
            >
              <Option value="all">全部</Option>
              <Option value="internal">内网</Option>
              <Option value="external">外网</Option>
              <Option value="domain">域名</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            <Button icon={<DownloadOutlined />} onClick={handleDownload} />
            <Button icon={<FullscreenOutlined />} onClick={handleFullscreen} />
          </Space>
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '600px',
          background: '#fafafa',
          border: '1px solid #d9d9d9'
        }}
      />
      
      <div style={{ padding: '16px', background: '#f8f9fa', borderTop: '1px solid #d9d9d9' }}>
        <Space wrap>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              background: '#4CAF50', 
              borderRadius: '50%', 
              marginRight: 8 
            }} />
            <Text>内网节点</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              background: '#F44336', 
              borderRadius: '50%', 
              marginRight: 8 
            }} />
            <Text>外网节点</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              background: '#2196F3', 
              borderRadius: '50%', 
              marginRight: 8 
            }} />
            <Text>域名节点</Text>
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default NetworkTopology; 