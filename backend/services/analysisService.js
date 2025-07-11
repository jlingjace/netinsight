const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');
const socketService = require('./socketService');
const harAnalysisService = require('./harAnalysisService');

class AnalysisService {
  async analyzeFile(file) {
    const db = getDatabase();
    
    try {
      logger.info(`开始分析文件: ${file.original_name} (ID: ${file.id})`);
      
      // 发送开始分析状态
      socketService.emitAnalysisStatus(file.id, 'processing');
      socketService.emitAnalysisProgress(file.id, 0);

      // 根据文件类型选择分析方法
      let result;
      if (file.file_type === 'har') {
        result = await this.analyzeHARFile(file);
      } else if (file.file_type === 'pcap' || file.file_type === 'pcapng') {
        result = await this.analyzePCAPFile(file);
      } else {
        throw new Error(`不支持的文件类型: ${file.file_type}`);
      }

      // 保存分析结果
      await this.saveAnalysisResult(file.id, result);
      
      // 更新文件状态为完成
      await db.run(
        'UPDATE files SET status = ?, analysis_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', file.id]
      );

      // 发送完成状态
      socketService.emitAnalysisProgress(file.id, 100);
      socketService.emitAnalysisStatus(file.id, 'completed');
      
      logger.info(`文件分析完成: ${file.original_name}`);
      return result;

    } catch (error) {
      logger.error(`文件分析失败: ${file.original_name}`, error);
      
      // 更新文件状态为错误
      await db.run(
        'UPDATE files SET status = ?, error_message = ? WHERE id = ?',
        ['error', error.message, file.id]
      );

      // 发送错误状态
      socketService.emitAnalysisStatus(file.id, 'error', error.message);
      
      throw error;
    }
  }

  async analyzeHARFile(file) {
    try {
      logger.info(`分析HAR文件: ${file.original_name}`);
      
      // 发送进度更新
      socketService.emitAnalysisProgress(file.id, 10);

      // 使用HAR分析服务进行分析
      const harResult = await harAnalysisService.analyzeHarFile(file.file_path);
      
      socketService.emitAnalysisProgress(file.id, 80);

      // 转换为标准格式
      const result = {
        file_id: file.id,
        analysis_type: 'har_analysis',
        summary: harResult.summary,
        protocols: harResult.protocols,
        connections: harResult.connections,
        performance: harResult.performance,
        security: harResult.security,
        anomalies: harResult.anomalies,
        recommendations: harResult.recommendations,
        timeline: harResult.timeline,
        created_at: new Date().toISOString()
      };

      socketService.emitAnalysisProgress(file.id, 90);
      return result;

    } catch (error) {
      logger.error(`HAR文件分析失败: ${error.message}`);
      throw error;
    }
  }

  async analyzePCAPFile(file) {
    try {
      logger.info(`分析PCAP文件: ${file.original_name}`);
      
      // 发送进度更新
      socketService.emitAnalysisProgress(file.id, 10);

      const pcapParser = require('pcap-parser');
      const stats = {
        packetCount: 0,
        protocols: {},
        totalSize: 0,
        startTime: null,
        endTime: null,
        ipAddresses: new Set(),
        ports: new Set(),
        connections: new Map(),
        errors: []
      };

      return new Promise((resolve, reject) => {
        const parser = pcapParser.parse(file.file_path);
        let progressCount = 0;
        const updateInterval = 1000; // 每1000个包更新一次进度

        parser.on('packet', (packet) => {
          try {
            progressCount++;
            
            // 定期更新进度
            if (progressCount % updateInterval === 0) {
              const progress = Math.min(30 + (progressCount / 10000) * 50, 80);
              socketService.emitAnalysisProgress(file.id, progress);
            }

            this.analyzePacket(packet, stats);
            
          } catch (error) {
            stats.errors.push(`包 ${progressCount} 解析错误: ${error.message}`);
          }
        });

        parser.on('end', () => {
          try {
            socketService.emitAnalysisProgress(file.id, 90);

            // 执行高级分析
            const anomalies = this.detectNetworkAnomalies(stats);
            const performance = this.analyzeNetworkPerformance(stats);
            
            // 转换TCP连接数据为可序列化格式
            const tcpConnectionSummary = [];
            if (stats.tcpConnections) {
              stats.tcpConnections.forEach(connection => {
                tcpConnectionSummary.push({
                  source: `${connection.sourceIP}:${connection.sourcePort}`,
                  destination: `${connection.destIP}:${connection.destPort}`,
                  state: connection.state,
                  handshakeComplete: connection.handshakeComplete,
                  handshakeDuration: connection.handshakeDuration,
                  totalPackets: connection.packets.length,
                  totalBytes: connection.totalBytes,
                  retransmissions: connection.retransmissions.length,
                  avgRTT: connection.rttMeasurements.length > 0 ? 
                    connection.rttMeasurements.reduce((sum, m) => sum + m.rtt, 0) / connection.rttMeasurements.length : 0
                });
              });
            }

            const result = {
              file_id: file.id,
              analysis_type: 'pcap',
              packet_count: stats.packetCount,
              protocols: stats.protocols,
              total_size: stats.totalSize,
              duration: stats.endTime && stats.startTime ? 
                (stats.endTime - stats.startTime) / 1000 : 0,
              unique_ips: stats.ipAddresses.size,
              unique_ports: stats.ports.size,
              top_protocols: this.getTopProtocols(stats.protocols),
              ip_addresses: Array.from(stats.ipAddresses).slice(0, 100),
              top_ports: Array.from(stats.ports).slice(0, 50),
              connection_summary: this.summarizeConnections(stats.connections),
              
              // 新增的高级分析数据
              tcp_connections: tcpConnectionSummary,
              network_anomalies: anomalies,
              performance_analysis: performance,
              
              errors: stats.errors.slice(0, 10),
              created_at: new Date().toISOString()
            };

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        parser.on('error', (error) => {
          logger.error(`PCAP解析错误: ${error.message}`);
          reject(error);
        });
      });

    } catch (error) {
      logger.error(`PCAP文件分析失败: ${error.message}`);
      throw error;
    }
  }

  analyzeHAREntries(entries) {
    const stats = {
      domains: new Set(),
      statusCodes: {},
      contentTypes: {},
      totalSize: 0,
      totalResponseTime: 0,
      timeline: [],
      performanceMetrics: {},
      securityIssues: [],
      // 新增时间序列分析
      timeSeriesData: {
        requestTimeline: [],
        responseTimeDistribution: [],
        delayJitterAnalysis: [],
        burstTrafficDetection: [],
        hourlyDistribution: new Array(24).fill(0),
        weeklyDistribution: new Array(7).fill(0)
      },
      // 新增性能指标
      performanceAnalysis: {
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowestRequests: [],
        fastestRequests: [],
        timeoutRequests: [],
        errorRateByTime: []
      }
    };

    const responseTimes = [];
    const timelineData = [];
    let previousRequestTime = null;

    entries.forEach((entry, index) => {
      try {
        const request = entry.request;
        const response = entry.response;
        const startTime = new Date(entry.startedDateTime);
        const responseTime = entry.time || 0;
        
        // 基础统计
        const url = new URL(request.url);
        stats.domains.add(url.hostname);
        
        stats.statusCodes[response.status] = (stats.statusCodes[response.status] || 0) + 1;
        
        const contentType = this.getContentType(response);
        if (contentType) {
          stats.contentTypes[contentType] = (stats.contentTypes[contentType] || 0) + 1;
        }
        
        const size = (response.content?.size || 0) + (request.bodySize || 0);
        stats.totalSize += size;
        stats.totalResponseTime += responseTime;
        
        responseTimes.push(responseTime);
        
        // 时间序列分析
        const timePoint = {
          timestamp: startTime.getTime(),
          responseTime: responseTime,
          size: size,
          status: response.status,
          url: request.url,
          method: request.method
        };
        
        timelineData.push(timePoint);
        
        // 请求时间线分析
        stats.timeSeriesData.requestTimeline.push({
          time: startTime.toISOString(),
          count: 1,
          responseTime: responseTime,
          size: size,
          status: response.status
        });
        
        // 延迟抖动分析
        if (previousRequestTime) {
          const timeDiff = startTime.getTime() - previousRequestTime;
          stats.timeSeriesData.delayJitterAnalysis.push({
            interval: timeDiff,
            responseTime: responseTime,
            timestamp: startTime.getTime()
          });
        }
        previousRequestTime = startTime.getTime();
        
        // 小时分布统计
        const hour = startTime.getHours();
        stats.timeSeriesData.hourlyDistribution[hour]++;
        
        // 星期分布统计
        const dayOfWeek = startTime.getDay();
        stats.timeSeriesData.weeklyDistribution[dayOfWeek]++;
        
        // 收集慢请求和快请求
        if (responseTime > 5000) { // 超过5秒的慢请求
          stats.performanceAnalysis.slowestRequests.push({
            url: request.url,
            responseTime: responseTime,
            timestamp: startTime.toISOString(),
            status: response.status
          });
        }
        
        if (responseTime < 100 && responseTime > 0) { // 小于100ms的快请求
          stats.performanceAnalysis.fastestRequests.push({
            url: request.url,
            responseTime: responseTime,
            timestamp: startTime.toISOString(),
            status: response.status
          });
        }
        
        // 超时请求检测
        if (responseTime > 30000) { // 超过30秒视为超时
          stats.performanceAnalysis.timeoutRequests.push({
            url: request.url,
            responseTime: responseTime,
            timestamp: startTime.toISOString()
          });
        }
        
      } catch (error) {
        console.error(`分析HAR条目 ${index} 失败:`, error);
      }
    });

    // 计算性能统计
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      
      stats.performanceAnalysis.averageResponseTime = stats.totalResponseTime / responseTimes.length;
      stats.performanceAnalysis.medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
      stats.performanceAnalysis.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      stats.performanceAnalysis.p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    }
    
    // 突发流量检测
    stats.timeSeriesData.burstTrafficDetection = this.detectBurstTraffic(timelineData);
    
    // 响应时间分布分析
    stats.timeSeriesData.responseTimeDistribution = this.analyzeResponseTimeDistribution(responseTimes);
    
    // 错误率时间分析
    stats.performanceAnalysis.errorRateByTime = this.analyzeErrorRateByTime(timelineData);
    
    // 计算平均响应时间
    stats.avgResponseTime = responseTimes.length > 0 ? 
      stats.totalResponseTime / responseTimes.length : 0;
    
    // 生成时间线数据
    stats.timeline = this.generateTimeline(timelineData);

    return stats;
  }

  // 新增辅助方法
  detectBurstTraffic(timelineData) {
    const burstThreshold = 10; // 10个请求/秒视为突发
    const windowSize = 1000; // 1秒窗口
    const bursts = [];
    
    // 按时间窗口分组
    const timeWindows = new Map();
    
    timelineData.forEach(point => {
      const windowStart = Math.floor(point.timestamp / windowSize) * windowSize;
      if (!timeWindows.has(windowStart)) {
        timeWindows.set(windowStart, []);
      }
      timeWindows.get(windowStart).push(point);
    });
    
    // 检测突发流量
    timeWindows.forEach((requests, windowStart) => {
      if (requests.length >= burstThreshold) {
        bursts.push({
          startTime: new Date(windowStart).toISOString(),
          endTime: new Date(windowStart + windowSize).toISOString(),
          requestCount: requests.length,
          averageResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
          totalSize: requests.reduce((sum, r) => sum + r.size, 0)
        });
      }
    });
    
    return bursts;
  }

  analyzeResponseTimeDistribution(responseTimes) {
    const buckets = [0, 100, 200, 500, 1000, 2000, 5000, 10000, Infinity];
    const distribution = buckets.slice(0, -1).map((bucket, index) => ({
      range: `${bucket}-${buckets[index + 1] === Infinity ? '∞' : buckets[index + 1]}ms`,
      count: 0,
      percentage: 0
    }));
    
    responseTimes.forEach(time => {
      for (let i = 0; i < buckets.length - 1; i++) {
        if (time >= buckets[i] && time < buckets[i + 1]) {
          distribution[i].count++;
          break;
        }
      }
    });
    
    // 计算百分比
    const total = responseTimes.length;
    distribution.forEach(bucket => {
      bucket.percentage = total > 0 ? (bucket.count / total) * 100 : 0;
    });
    
    return distribution;
  }

  analyzeErrorRateByTime(timelineData) {
    const hourlyErrors = new Array(24).fill(0);
    const hourlyTotal = new Array(24).fill(0);
    
    timelineData.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      hourlyTotal[hour]++;
      if (point.status >= 400) {
        hourlyErrors[hour]++;
      }
    });
    
    return hourlyErrors.map((errors, hour) => ({
      hour,
      errorRate: hourlyTotal[hour] > 0 ? (errors / hourlyTotal[hour]) * 100 : 0,
      totalRequests: hourlyTotal[hour],
      errorCount: errors
    }));
  }

  analyzePacket(packet, stats) {
    try {
      stats.packetCount++;
      const timestamp = packet.header.timestampSeconds * 1000 + 
                       Math.floor(packet.header.timestampMicroseconds / 1000);
      
      if (!stats.startTime) {
        stats.startTime = timestamp;
      }
      stats.endTime = timestamp;
      
      const packetSize = packet.header.capturedLength;
      stats.totalSize += packetSize;
      
      // 解析以太网层
      if (packet.data && packet.data.length >= 14) {
        const etherType = packet.data.readUInt16BE(12);
        
        if (etherType === 0x0800) { // IPv4
          this.analyzeIPv4Packet(packet.data.slice(14), stats, timestamp, packetSize);
        } else if (etherType === 0x0806) { // ARP
          stats.protocols['ARP'] = (stats.protocols['ARP'] || 0) + 1;
        }
      }
      
    } catch (error) {
      stats.errors.push(`包解析错误: ${error.message}`);
    }
  }

  analyzeIPv4Packet(data, stats, timestamp, packetSize) {
    if (data.length < 20) return;
    
    const version = (data[0] >> 4) & 0x0F;
    if (version !== 4) return;
    
    const headerLength = (data[0] & 0x0F) * 4;
    const protocol = data[9];
    const sourceIP = `${data[12]}.${data[13]}.${data[14]}.${data[15]}`;
    const destIP = `${data[16]}.${data[17]}.${data[18]}.${data[19]}`;
    
    // 记录IP地址
    stats.ipAddresses.add(sourceIP);
    stats.ipAddresses.add(destIP);
    
    // 协议统计
    const protocolName = this.getProtocolName(protocol);
    stats.protocols[protocolName] = (stats.protocols[protocolName] || 0) + 1;
    
    // TCP连接分析
    if (protocol === 6 && data.length > headerLength) { // TCP
      this.analyzeTCPPacket(data.slice(headerLength), stats, sourceIP, destIP, timestamp, packetSize);
    } else if (protocol === 17 && data.length > headerLength) { // UDP
      this.analyzeUDPPacket(data.slice(headerLength), stats, sourceIP, destIP, timestamp);
    }
  }

  analyzeTCPPacket(data, stats, sourceIP, destIP, timestamp, packetSize) {
    if (data.length < 20) return;
    
    const sourcePort = data.readUInt16BE(0);
    const destPort = data.readUInt16BE(2);
    const sequenceNumber = data.readUInt32BE(4);
    const acknowledgmentNumber = data.readUInt32BE(8);
    const headerLength = ((data[12] >> 4) & 0x0F) * 4;
    const flags = data[13];
    const windowSize = data.readUInt16BE(14);
    
    // 记录端口
    stats.ports.add(`${sourcePort}/tcp`);
    stats.ports.add(`${destPort}/tcp`);
    
    // TCP标志位解析
    const tcpFlags = {
      fin: (flags & 0x01) !== 0,
      syn: (flags & 0x02) !== 0,
      rst: (flags & 0x04) !== 0,
      psh: (flags & 0x08) !== 0,
      ack: (flags & 0x10) !== 0,
      urg: (flags & 0x20) !== 0
    };
    
    const connectionKey = `${sourceIP}:${sourcePort}-${destIP}:${destPort}`;
    const reverseConnectionKey = `${destIP}:${destPort}-${sourceIP}:${sourcePort}`;
    
    // 初始化TCP连接分析结构
    if (!stats.tcpConnections) {
      stats.tcpConnections = new Map();
    }
    
    // 获取或创建连接状态
    let connection = stats.tcpConnections.get(connectionKey) || 
                    stats.tcpConnections.get(reverseConnectionKey);
    
    if (!connection) {
      connection = {
        sourceIP,
        sourcePort,
        destIP,
        destPort,
        state: 'UNKNOWN',
        packets: [],
        handshakeComplete: false,
        handshakePackets: [],
        rttMeasurements: [],
        retransmissions: [],
        windowSizes: [],
        totalBytes: 0,
        startTime: timestamp,
        lastActivity: timestamp,
        synTime: null,
        synAckTime: null,
        ackTime: null
      };
      stats.tcpConnections.set(connectionKey, connection);
    }
    
    // 记录包信息
    const packetInfo = {
      timestamp,
      sourceIP,
      sourcePort,
      destIP,
      destPort,
      sequenceNumber,
      acknowledgmentNumber,
      flags: tcpFlags,
      windowSize,
      dataLength: Math.max(0, data.length - headerLength),
      direction: connection.sourceIP === sourceIP ? 'forward' : 'reverse'
    };
    
    connection.packets.push(packetInfo);
    connection.lastActivity = timestamp;
    connection.totalBytes += packetInfo.dataLength;
    connection.windowSizes.push({ timestamp, windowSize, direction: packetInfo.direction });
    
    // TCP三次握手分析
    this.analyzeTCPHandshake(connection, packetInfo, tcpFlags);
    
    // RTT测量
    this.measureRTT(connection, packetInfo, tcpFlags);
    
    // 重传检测
    this.detectRetransmission(connection, packetInfo);
    
    // 连接状态跟踪
    this.updateTCPConnectionState(connection, tcpFlags);
    
    // 记录连接统计
    const connSummaryKey = `${sourceIP} -> ${destIP}`;
    if (!stats.connections.has(connSummaryKey)) {
      stats.connections.set(connSummaryKey, { packets: 0, bytes: 0 });
    }
    const connSummary = stats.connections.get(connSummaryKey);
    connSummary.packets++;
    connSummary.bytes += packetSize;
  }

  analyzeTCPHandshake(connection, packetInfo, tcpFlags) {
    const { timestamp, sourceIP, destIP } = packetInfo;
    
    // SYN包（握手第一步）
    if (tcpFlags.syn && !tcpFlags.ack) {
      connection.synTime = timestamp;
      connection.handshakePackets.push({
        type: 'SYN',
        timestamp,
        source: sourceIP,
        dest: destIP
      });
      connection.state = 'SYN_SENT';
    }
    
    // SYN-ACK包（握手第二步）
    else if (tcpFlags.syn && tcpFlags.ack) {
      connection.synAckTime = timestamp;
      connection.handshakePackets.push({
        type: 'SYN-ACK',
        timestamp,
        source: sourceIP,
        dest: destIP
      });
      connection.state = 'SYN_RECEIVED';
    }
    
    // ACK包（握手第三步）
    else if (tcpFlags.ack && !tcpFlags.syn && connection.state === 'SYN_RECEIVED') {
      connection.ackTime = timestamp;
      connection.handshakePackets.push({
        type: 'ACK',
        timestamp,
        source: sourceIP,
        dest: destIP
      });
      connection.handshakeComplete = true;
      connection.state = 'ESTABLISHED';
      
      // 计算握手时间
      if (connection.synTime && connection.synAckTime) {
        connection.handshakeDuration = timestamp - connection.synTime;
      }
    }
  }

  measureRTT(connection, packetInfo, tcpFlags) {
    // 简单的RTT测量：SYN到SYN-ACK的时间
    if (tcpFlags.syn && tcpFlags.ack && connection.synTime) {
      const rtt = packetInfo.timestamp - connection.synTime;
      connection.rttMeasurements.push({
        timestamp: packetInfo.timestamp,
        rtt: rtt,
        type: 'handshake'
      });
    }
    
    // 可以添加更复杂的RTT测量逻辑，比如基于数据包的ACK
  }

  detectRetransmission(connection, packetInfo) {
    // 检测重传：相同序列号的包
    const sameSeqPackets = connection.packets.filter(p => 
      p.sequenceNumber === packetInfo.sequenceNumber &&
      p.sourceIP === packetInfo.sourceIP &&
      p.timestamp < packetInfo.timestamp
    );
    
    if (sameSeqPackets.length > 0) {
      connection.retransmissions.push({
        originalTimestamp: sameSeqPackets[0].timestamp,
        retransmissionTimestamp: packetInfo.timestamp,
        sequenceNumber: packetInfo.sequenceNumber,
        delay: packetInfo.timestamp - sameSeqPackets[0].timestamp
      });
    }
  }

  updateTCPConnectionState(connection, tcpFlags) {
    if (tcpFlags.rst) {
      connection.state = 'RESET';
    } else if (tcpFlags.fin) {
      if (connection.state === 'ESTABLISHED') {
        connection.state = 'FIN_WAIT';
      } else if (connection.state === 'FIN_WAIT') {
        connection.state = 'CLOSED';
      }
    }
  }

  // 辅助方法
  getProtocolName(protocolNumber) {
    const protocolMap = {
      1: 'ICMP',
      6: 'TCP',
      17: 'UDP',
      2: 'IGMP',
      47: 'GRE',
      50: 'ESP',
      51: 'AH',
      89: 'OSPF'
    };
    return protocolMap[protocolNumber] || `Protocol-${protocolNumber}`;
  }

  analyzeUDPPacket(data, stats, sourceIP, destIP, timestamp) {
    if (data.length < 8) return;
    
    const sourcePort = data.readUInt16BE(0);
    const destPort = data.readUInt16BE(2);
    
    stats.ports.add(`${sourcePort}/udp`);
    stats.ports.add(`${destPort}/udp`);
    
    // 记录UDP连接
    const connSummaryKey = `${sourceIP} -> ${destIP}`;
    if (!stats.connections.has(connSummaryKey)) {
      stats.connections.set(connSummaryKey, { packets: 0, bytes: 0 });
    }
    const connSummary = stats.connections.get(connSummaryKey);
    connSummary.packets++;
  }

  // 异常检测功能
  detectNetworkAnomalies(stats) {
    const anomalies = [];
    
    // 1. 网络延迟异常检测
    if (stats.tcpConnections) {
      const rttValues = [];
      stats.tcpConnections.forEach(connection => {
        connection.rttMeasurements.forEach(measurement => {
          rttValues.push(measurement.rtt);
        });
      });
      
      if (rttValues.length > 0) {
        const avgRTT = rttValues.reduce((sum, rtt) => sum + rtt, 0) / rttValues.length;
        const highRTTThreshold = avgRTT * 3; // 3倍于平均RTT视为异常
        
        const highRTTConnections = [];
        stats.tcpConnections.forEach(connection => {
          const avgConnectionRTT = connection.rttMeasurements.length > 0 ? 
            connection.rttMeasurements.reduce((sum, m) => sum + m.rtt, 0) / connection.rttMeasurements.length : 0;
          
          if (avgConnectionRTT > highRTTThreshold) {
            highRTTConnections.push({
              connection: `${connection.sourceIP}:${connection.sourcePort} -> ${connection.destIP}:${connection.destPort}`,
              avgRTT: avgConnectionRTT
            });
          }
        });
        
        if (highRTTConnections.length > 0) {
          anomalies.push({
            type: 'high_latency',
            severity: 'warning',
            description: `检测到${highRTTConnections.length}个高延迟连接`,
            details: highRTTConnections,
            threshold: highRTTThreshold
          });
        }
      }
    }
    
    // 2. 丢包率分析
    if (stats.tcpConnections) {
      const retransmissionStats = [];
      stats.tcpConnections.forEach(connection => {
        if (connection.packets.length > 0) {
          const retransmissionRate = (connection.retransmissions.length / connection.packets.length) * 100;
          if (retransmissionRate > 5) { // 超过5%重传率视为异常
            retransmissionStats.push({
              connection: `${connection.sourceIP}:${connection.sourcePort} -> ${connection.destIP}:${connection.destPort}`,
              retransmissionRate: retransmissionRate.toFixed(2),
              totalPackets: connection.packets.length,
              retransmissions: connection.retransmissions.length
            });
          }
        }
      });
      
      if (retransmissionStats.length > 0) {
        anomalies.push({
          type: 'high_packet_loss',
          severity: 'error',
          description: `检测到${retransmissionStats.length}个高丢包率连接`,
          details: retransmissionStats
        });
      }
    }
    
    // 3. 异常流量模式识别
    const protocolDistribution = this.getTopProtocols(stats.protocols);
    const totalPackets = stats.packetCount;
    
    protocolDistribution.forEach(protocol => {
      const percentage = (protocol.count / totalPackets) * 100;
      
      // 检测异常高的UDP流量（可能是DDoS）
      if (protocol.name === 'UDP' && percentage > 70) {
        anomalies.push({
          type: 'suspicious_udp_traffic',
          severity: 'warning',
          description: `UDP流量占比异常高 (${percentage.toFixed(1)}%)`,
          details: { protocol: 'UDP', percentage: percentage.toFixed(1) }
        });
      }
      
      // 检测异常高的ICMP流量（可能是ping flood）
      if (protocol.name === 'ICMP' && percentage > 30) {
        anomalies.push({
          type: 'suspicious_icmp_traffic',
          severity: 'warning',
          description: `ICMP流量占比异常高 (${percentage.toFixed(1)}%)`,
          details: { protocol: 'ICMP', percentage: percentage.toFixed(1) }
        });
      }
    });
    
    // 4. 潜在安全威胁检测
    this.detectSecurityThreats(stats, anomalies);
    
    return anomalies;
  }

  detectSecurityThreats(stats, anomalies) {
    // 端口扫描检测
    const ipPortMap = new Map();
    
    if (stats.tcpConnections) {
      stats.tcpConnections.forEach(connection => {
        const sourceKey = connection.sourceIP;
        if (!ipPortMap.has(sourceKey)) {
          ipPortMap.set(sourceKey, new Set());
        }
        ipPortMap.get(sourceKey).add(connection.destPort);
      });
      
      // 检测单个IP访问过多端口（可能是端口扫描）
      ipPortMap.forEach((ports, ip) => {
        if (ports.size > 20) { // 访问超过20个端口视为可疑
          anomalies.push({
            type: 'port_scan_detected',
            severity: 'error',
            description: `检测到可能的端口扫描行为`,
            details: {
              sourceIP: ip,
              portsAccessed: ports.size,
              ports: Array.from(ports).slice(0, 10) // 只显示前10个端口
            }
          });
        }
      });
    }
    
    // 检测异常连接模式
    const ipConnectionCount = new Map();
    if (stats.connections) {
      stats.connections.forEach((connInfo, connKey) => {
        const [sourceIP] = connKey.split(' -> ');
        ipConnectionCount.set(sourceIP, (ipConnectionCount.get(sourceIP) || 0) + connInfo.packets);
      });
      
      // 检测异常高的连接数（可能是DDoS）
      ipConnectionCount.forEach((packetCount, ip) => {
        if (packetCount > stats.packetCount * 0.5) { // 单个IP超过总流量50%
          anomalies.push({
            type: 'suspicious_traffic_volume',
            severity: 'warning',
            description: `单个IP产生异常大的流量`,
            details: {
              sourceIP: ip,
              packetCount: packetCount,
              percentage: ((packetCount / stats.packetCount) * 100).toFixed(1)
            }
          });
        }
      });
    }
  }

  // 性能分析功能
  analyzeNetworkPerformance(stats) {
    const performance = {
      bandwidthUtilization: {},
      responseTimeStats: {},
      networkQualityScore: 0,
      bottleneckAnalysis: [],
      recommendations: []
    };
    
    // 带宽利用率分析
    if (stats.endTime && stats.startTime) {
      const durationSeconds = (stats.endTime - stats.startTime) / 1000;
      const throughputBps = (stats.totalSize * 8) / durationSeconds; // bits per second
      
      performance.bandwidthUtilization = {
        totalBytes: stats.totalSize,
        durationSeconds: durationSeconds.toFixed(2),
        averageThroughput: this.formatBandwidth(throughputBps),
        peakThroughput: 'N/A', // 需要时间窗口分析
        utilization: 'N/A' // 需要知道链路容量
      };
    }
    
    // TCP连接性能分析
    if (stats.tcpConnections) {
      const connectionPerformance = [];
      let totalRTT = 0;
      let rttCount = 0;
      
      stats.tcpConnections.forEach(connection => {
        const connPerf = {
          connection: `${connection.sourceIP}:${connection.sourcePort} -> ${connection.destIP}:${connection.destPort}`,
          handshakeComplete: connection.handshakeComplete,
          handshakeDuration: connection.handshakeDuration || 0,
          totalPackets: connection.packets.length,
          totalBytes: connection.totalBytes,
          retransmissions: connection.retransmissions.length,
          avgRTT: 0
        };
        
        if (connection.rttMeasurements.length > 0) {
          connPerf.avgRTT = connection.rttMeasurements.reduce((sum, m) => sum + m.rtt, 0) / connection.rttMeasurements.length;
          totalRTT += connPerf.avgRTT;
          rttCount++;
        }
        
        connectionPerformance.push(connPerf);
      });
      
      performance.responseTimeStats = {
        averageRTT: rttCount > 0 ? (totalRTT / rttCount).toFixed(2) : 0,
        connectionCount: stats.tcpConnections.size,
        handshakeSuccessRate: this.calculateHandshakeSuccessRate(stats.tcpConnections)
      };
    }
    
    // 网络质量评分（0-100）
    performance.networkQualityScore = this.calculateNetworkQualityScore(stats, performance);
    
    // 瓶颈识别
    performance.bottleneckAnalysis = this.identifyBottlenecks(stats, performance);
    
    // 性能建议
    performance.recommendations = this.generatePerformanceRecommendations(stats, performance);
    
    return performance;
  }

  formatBandwidth(bps) {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
    return `${bps.toFixed(2)} bps`;
  }

  calculateHandshakeSuccessRate(tcpConnections) {
    let successful = 0;
    let total = 0;
    
    tcpConnections.forEach(connection => {
      total++;
      if (connection.handshakeComplete) {
        successful++;
      }
    });
    
    return total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
  }

  calculateNetworkQualityScore(stats, performance) {
    let score = 100;
    
    // 基于重传率扣分
    if (stats.tcpConnections) {
      let totalRetransmissions = 0;
      let totalPackets = 0;
      
      stats.tcpConnections.forEach(connection => {
        totalRetransmissions += connection.retransmissions.length;
        totalPackets += connection.packets.length;
      });
      
      const retransmissionRate = totalPackets > 0 ? (totalRetransmissions / totalPackets) * 100 : 0;
      score -= retransmissionRate * 10; // 每1%重传率扣10分
    }
    
    // 基于握手成功率扣分
    if (performance.responseTimeStats) {
      const handshakeRate = parseFloat(performance.responseTimeStats.handshakeSuccessRate);
      score -= (100 - handshakeRate) * 0.5; // 握手失败率扣分
    }
    
    return Math.max(0, Math.min(100, score)).toFixed(1);
  }

  identifyBottlenecks(stats, performance) {
    const bottlenecks = [];
    
    // 高延迟连接
    if (stats.tcpConnections && performance.responseTimeStats.averageRTT > 1000) {
      bottlenecks.push({
        type: 'high_latency',
        description: '网络延迟较高',
        value: `${performance.responseTimeStats.averageRTT}ms`,
        impact: 'medium'
      });
    }
    
    // 高重传率
    if (stats.tcpConnections) {
      let totalRetransmissions = 0;
      let totalPackets = 0;
      
      stats.tcpConnections.forEach(connection => {
        totalRetransmissions += connection.retransmissions.length;
        totalPackets += connection.packets.length;
      });
      
      const retransmissionRate = totalPackets > 0 ? (totalRetransmissions / totalPackets) * 100 : 0;
      if (retransmissionRate > 5) {
        bottlenecks.push({
          type: 'high_retransmission',
          description: '重传率过高',
          value: `${retransmissionRate.toFixed(2)}%`,
          impact: 'high'
        });
      }
    }
    
    return bottlenecks;
  }

  generatePerformanceRecommendations(stats, performance) {
    const recommendations = [];
    
    // 基于分析结果生成建议
    if (performance.bottleneckAnalysis.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: '网络性能优化建议',
        description: '检测到网络性能瓶颈，建议进行网络优化'
      });
    }
    
    if (parseFloat(performance.networkQualityScore) < 80) {
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: '网络质量改进',
        description: '网络质量评分较低，建议检查网络配置和硬件状态'
      });
    }
    
    return recommendations;
  }
}

module.exports = new AnalysisService(); 