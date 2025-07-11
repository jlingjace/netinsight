const fs = require('fs');
const path = require('path');
const pcap = require('pcap-parser');
const { logger } = require('../utils/logger');

/**
 * PCAP文件分析服务
 */
class PcapAnalysisService {
  constructor() {
    this.protocolMap = {
      1: 'ICMP',
      6: 'TCP', 
      17: 'UDP',
      2: 'IGMP',
      47: 'GRE',
      50: 'ESP',
      51: 'AH',
      89: 'OSPF',
      132: 'SCTP'
    };
  }

  /**
   * 分析PCAP文件
   * @param {string} filePath - PCAP文件路径
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzePcapFile(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        logger.info(`开始分析PCAP文件: ${filePath}, 大小: ${fileSize} bytes`);

        const analysisResult = {
          fileInfo: {
            path: filePath,
            size: fileSize,
            modifiedAt: stats.mtime
          },
          summary: {
            totalPackets: 0,
            totalBytes: 0,
            duration: 0,
            avgPacketSize: 0,
            startTime: null,
            endTime: null
          },
          protocols: {},
          connections: {
            topSources: {},
            topDestinations: {},
            topConnections: {}
          },
          ports: {},
          anomalies: [],
          timeline: []
        };

        const parser = pcap.parse(filePath);
        let firstTimestamp = null;
        let lastTimestamp = null;
        let packetCount = 0;
        let totalBytes = 0;

        parser.on('packet', (packet) => {
          try {
            packetCount++;
            const packetSize = packet.header.capturedLength;
            totalBytes += packetSize;

            // 记录时间戳
            const timestamp = packet.header.timestampSeconds * 1000 + 
                            Math.floor(packet.header.timestampMicroseconds / 1000);
            
            if (!firstTimestamp) {
              firstTimestamp = timestamp;
            }
            lastTimestamp = timestamp;

            // 解析包数据
            this.analyzePacketData(packet.data, analysisResult, timestamp);

            // 限制处理包数量，避免内存溢出
            if (packetCount >= 50000) {
              logger.warn(`达到包数量限制(50000)，停止解析`);
              parser.destroy();
            }

          } catch (error) {
            logger.error(`解析数据包 ${packetCount} 失败:`, error);
            // 继续处理下一个包
          }
        });

        parser.on('end', () => {
          try {
            // 计算汇总统计
            analysisResult.summary.totalPackets = packetCount;
            analysisResult.summary.totalBytes = totalBytes;
            analysisResult.summary.avgPacketSize = packetCount > 0 ? 
              Math.round(totalBytes / packetCount) : 0;
            
            if (firstTimestamp && lastTimestamp) {
              analysisResult.summary.duration = Math.max(1, 
                Math.round((lastTimestamp - firstTimestamp) / 1000));
              analysisResult.summary.startTime = new Date(firstTimestamp);
              analysisResult.summary.endTime = new Date(lastTimestamp);
            }

            // 转换协议统计为数组格式
            analysisResult.protocols = this.convertProtocolStats(analysisResult.protocols);
            
            // 转换连接统计
            analysisResult.connections = this.convertConnectionStats(analysisResult.connections);

            // 生成分析建议
            analysisResult.recommendations = this.generateRecommendations(analysisResult);

            logger.info(`PCAP分析完成: ${packetCount}个包, ${totalBytes}字节`);
            resolve(analysisResult);

          } catch (error) {
            logger.error('PCAP分析结果处理失败:', error);
            reject(error);
          }
        });

        parser.on('error', (error) => {
          logger.error('PCAP解析失败:', error);
          reject(error);
        });

      } catch (error) {
        logger.error('PCAP文件读取失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 分析单个数据包
   * @param {Buffer} data - 包数据
   * @param {Object} result - 分析结果对象
   * @param {number} timestamp - 时间戳
   */
  analyzePacketData(data, result, timestamp) {
    if (!data || data.length < 14) return;

    try {
      // 解析以太网头部
      const etherType = data.readUInt16BE(12);
      
      if (etherType === 0x0800) { // IPv4
        this.analyzeIPv4Packet(data.slice(14), result, timestamp);
      } else if (etherType === 0x0806) { // ARP
        this.incrementProtocol(result, 'ARP');
      } else if (etherType === 0x86DD) { // IPv6
        this.analyzeIPv6Packet(data.slice(14), result, timestamp);
      } else {
        this.incrementProtocol(result, `Ethernet-${etherType.toString(16)}`);
      }
    } catch (error) {
      logger.debug('包数据解析失败:', error);
      this.incrementProtocol(result, 'ParseError');
    }
  }

  /**
   * 分析IPv4数据包
   * @param {Buffer} data - IPv4数据
   * @param {Object} result - 分析结果
   * @param {number} timestamp - 时间戳
   */
  analyzeIPv4Packet(data, result, timestamp) {
    if (data.length < 20) return;

    const version = (data[0] >> 4) & 0x0F;
    if (version !== 4) return;

    const headerLength = (data[0] & 0x0F) * 4;
    const protocol = data[9];
    const sourceIP = `${data[12]}.${data[13]}.${data[14]}.${data[15]}`;
    const destIP = `${data[16]}.${data[17]}.${data[18]}.${data[19]}`;

    // 记录IP连接
    this.recordConnection(result, sourceIP, destIP);

    // 分析传输层协议
    const protocolName = this.protocolMap[protocol] || `IPv4-${protocol}`;
    this.incrementProtocol(result, protocolName);

    if (data.length > headerLength) {
      const payload = data.slice(headerLength);
      
      if (protocol === 6) { // TCP
        this.analyzeTCPPacket(payload, result, sourceIP, destIP);
      } else if (protocol === 17) { // UDP
        this.analyzeUDPPacket(payload, result, sourceIP, destIP);
      }
    }
  }

  /**
   * 分析IPv6数据包
   * @param {Buffer} data - IPv6数据
   * @param {Object} result - 分析结果
   * @param {number} timestamp - 时间戳
   */
  analyzeIPv6Packet(data, result, timestamp) {
    if (data.length < 40) return;

    const nextHeader = data[6];
    const protocolName = this.protocolMap[nextHeader] || `IPv6-${nextHeader}`;
    this.incrementProtocol(result, protocolName);

    // 简化的IPv6地址提取（仅用于统计）
    const sourceIP = 'IPv6-Source';
    const destIP = 'IPv6-Dest';
    this.recordConnection(result, sourceIP, destIP);
  }

  /**
   * 分析TCP数据包
   * @param {Buffer} data - TCP数据
   * @param {Object} result - 分析结果
   * @param {string} sourceIP - 源IP
   * @param {string} destIP - 目标IP
   */
  analyzeTCPPacket(data, result, sourceIP, destIP) {
    if (data.length < 20) return;

    const sourcePort = data.readUInt16BE(0);
    const destPort = data.readUInt16BE(2);
    const flags = data[13];

    // 记录端口使用
    this.recordPort(result, sourcePort, 'TCP');
    this.recordPort(result, destPort, 'TCP');

    // 记录详细连接
    const connection = `${sourceIP}:${sourcePort} -> ${destIP}:${destPort}`;
    this.recordDetailedConnection(result, connection);

    // 检测常见服务
    this.detectService(result, sourcePort, destPort, 'TCP');
  }

  /**
   * 分析UDP数据包
   * @param {Buffer} data - UDP数据
   * @param {Object} result - 分析结果
   * @param {string} sourceIP - 源IP
   * @param {string} destIP - 目标IP
   */
  analyzeUDPPacket(data, result, sourceIP, destIP) {
    if (data.length < 8) return;

    const sourcePort = data.readUInt16BE(0);
    const destPort = data.readUInt16BE(2);

    // 记录端口使用
    this.recordPort(result, sourcePort, 'UDP');
    this.recordPort(result, destPort, 'UDP');

    // 记录详细连接
    const connection = `${sourceIP}:${sourcePort} -> ${destIP}:${destPort}`;
    this.recordDetailedConnection(result, connection);

    // 检测常见服务
    this.detectService(result, sourcePort, destPort, 'UDP');
  }

  /**
   * 增加协议计数
   * @param {Object} result - 分析结果
   * @param {string} protocol - 协议名称
   */
  incrementProtocol(result, protocol) {
    result.protocols[protocol] = (result.protocols[protocol] || 0) + 1;
  }

  /**
   * 记录连接信息
   * @param {Object} result - 分析结果
   * @param {string} sourceIP - 源IP
   * @param {string} destIP - 目标IP
   */
  recordConnection(result, sourceIP, destIP) {
    result.connections.topSources[sourceIP] = 
      (result.connections.topSources[sourceIP] || 0) + 1;
    result.connections.topDestinations[destIP] = 
      (result.connections.topDestinations[destIP] || 0) + 1;
  }

  /**
   * 记录详细连接
   * @param {Object} result - 分析结果
   * @param {string} connection - 连接字符串
   */
  recordDetailedConnection(result, connection) {
    result.connections.topConnections[connection] = 
      (result.connections.topConnections[connection] || 0) + 1;
  }

  /**
   * 记录端口使用
   * @param {Object} result - 分析结果
   * @param {number} port - 端口号
   * @param {string} protocol - 协议类型
   */
  recordPort(result, port, protocol) {
    const key = `${port}/${protocol}`;
    result.ports[key] = (result.ports[key] || 0) + 1;
  }

  /**
   * 检测网络服务
   * @param {Object} result - 分析结果
   * @param {number} sourcePort - 源端口
   * @param {number} destPort - 目标端口
   * @param {string} protocol - 协议类型
   */
  detectService(result, sourcePort, destPort, protocol) {
    const wellKnownPorts = {
      20: 'FTP-Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet',
      25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
      80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
      993: 'IMAPS', 995: 'POP3S', 587: 'SMTP-TLS'
    };

    const service = wellKnownPorts[destPort] || wellKnownPorts[sourcePort];
    if (service) {
      this.incrementProtocol(result, service);
    }
  }

  /**
   * 转换协议统计为数组格式
   * @param {Object} protocols - 协议统计对象
   * @returns {Array} 协议数组
   */
  convertProtocolStats(protocols) {
    const totalPackets = Object.values(protocols).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(protocols)
      .map(([name, packets]) => ({
        name,
        packets,
        percentage: totalPackets > 0 ? (packets / totalPackets) * 100 : 0,
        bytes: packets * 1000 // 估算字节数
      }))
      .sort((a, b) => b.packets - a.packets);
  }

  /**
   * 转换连接统计
   * @param {Object} connections - 连接统计对象
   * @returns {Object} 转换后的连接统计
   */
  convertConnectionStats(connections) {
    return {
      topSources: Object.entries(connections.topSources)
        .map(([ip, packets]) => ({ ip, packets }))
        .sort((a, b) => b.packets - a.packets)
        .slice(0, 10),
      
      topDestinations: Object.entries(connections.topDestinations)
        .map(([ip, packets]) => ({ ip, packets }))
        .sort((a, b) => b.packets - a.packets)
        .slice(0, 10),
      
      topConnections: Object.entries(connections.topConnections)
        .map(([connection, packets]) => ({ connection, packets }))
        .sort((a, b) => b.packets - a.packets)
        .slice(0, 20)
    };
  }

  /**
   * 生成分析建议
   * @param {Object} result - 分析结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(result) {
    const recommendations = [];

    // 分析流量模式
    if (result.summary.totalPackets > 10000) {
      recommendations.push({
        type: 'performance',
        level: 'info',
        title: '高流量检测',
        description: `检测到大量网络流量 (${result.summary.totalPackets} 个包)，建议进一步分析流量模式`
      });
    }

    // 检查协议分布
    const protocols = result.protocols;
    if (protocols && Array.isArray(protocols)) {
      const tcpRatio = protocols.find(p => p.name === 'TCP')?.percentage || 0;
      const udpRatio = protocols.find(p => p.name === 'UDP')?.percentage || 0;

      if (udpRatio > 50) {
        recommendations.push({
          type: 'security',
          level: 'warning',
          title: 'UDP流量占比过高',
          description: `UDP流量占比 ${udpRatio.toFixed(1)}%，可能存在异常流量或攻击行为`
        });
      }
    }

    // 检查异常端口
    const ports = Object.keys(result.ports);
    const suspiciousPorts = ports.filter(port => {
      const portNum = parseInt(port.split('/')[0]);
      return portNum > 49152; // 动态端口范围
    });

    if (suspiciousPorts.length > 100) {
      recommendations.push({
        type: 'security',
        level: 'warning',
        title: '检测到大量高端口号连接',
        description: '可能存在端口扫描或异常连接行为'
      });
    }

    return recommendations;
  }
}

module.exports = new PcapAnalysisService(); 