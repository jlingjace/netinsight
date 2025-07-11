const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * HAR文件分析服务
 */
class HarAnalysisService {
  constructor() {
    this.httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    this.statusCodeCategories = {
      '1xx': 'Informational',
      '2xx': 'Success',
      '3xx': 'Redirection', 
      '4xx': 'Client Error',
      '5xx': 'Server Error'
    };
  }

  /**
   * 分析HAR文件
   * @param {string} filePath - HAR文件路径
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeHarFile(filePath, options = {}) {
    try {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      logger.info(`开始分析HAR文件: ${filePath}, 大小: ${fileSize} bytes`);

      // 读取HAR文件
      const harContent = fs.readFileSync(filePath, 'utf8');
      const harData = JSON.parse(harContent);

      if (!harData.log || !harData.log.entries) {
        throw new Error('无效的HAR文件格式');
      }

      const entries = harData.log.entries;
      logger.info(`HAR文件包含 ${entries.length} 个HTTP请求`);

      const analysisResult = {
        fileInfo: {
          path: filePath,
          size: fileSize,
          modifiedAt: stats.mtime,
          version: harData.log.version,
          creator: harData.log.creator
        },
        summary: {
          totalRequests: entries.length,
          totalBytes: 0,
          duration: 0,
          avgResponseTime: 0,
          startTime: null,
          endTime: null
        },
        protocols: {},
        connections: {
          topHosts: {},
          topPaths: {},
          topConnections: {}
        },
        performance: {
          slowestRequests: [],
          fastestRequests: [],
          errorRequests: [],
          methodDistribution: {},
          statusCodeDistribution: {},
          contentTypeDistribution: {}
        },
        security: {
          httpRequests: 0,
          httpsRequests: 0,
          mixedContent: false,
          insecureRequests: []
        },
        anomalies: [],
        timeline: []
      };

      // 分析每个HTTP请求
      this.analyzeHttpEntries(entries, analysisResult);

      // 生成分析建议
      analysisResult.recommendations = this.generateRecommendations(analysisResult);

      logger.info(`HAR分析完成: ${entries.length}个请求`);
      return analysisResult;

    } catch (error) {
      logger.error('HAR文件分析失败:', error);
      throw error;
    }
  }

  /**
   * 分析HTTP请求条目
   * @param {Array} entries - HTTP请求数组
   * @param {Object} result - 分析结果对象
   */
  analyzeHttpEntries(entries, result) {
    let totalResponseTime = 0;
    let totalBytes = 0;
    let startTime = null;
    let endTime = null;

    // 添加字节数统计
    const hostBytes = {};
    const hostPackets = {};

    entries.forEach((entry, index) => {
      try {
        const request = entry.request;
        const response = entry.response;
        const timings = entry.timings;

        // 解析URL
        const url = new URL(request.url);
        const host = url.hostname;
        const protocol = url.protocol.replace(':', '');
        const method = request.method;
        const statusCode = response.status;

        // 计算响应时间
        const responseTime = entry.time || 0;
        totalResponseTime += responseTime;

        // 计算传输字节数
        const responseSize = response.bodySize > 0 ? response.bodySize : 
          (response.content ? response.content.size : 0);
        const requestSize = request.bodySize > 0 ? request.bodySize : 0;
        const totalSize = responseSize + requestSize;
        totalBytes += totalSize;

        // 统计主机的字节数和包数
        if (!hostBytes[host]) {
          hostBytes[host] = 0;
          hostPackets[host] = 0;
        }
        hostBytes[host] += totalSize;
        hostPackets[host] += 1;

        // 记录时间范围
        const requestTime = new Date(entry.startedDateTime);
        if (!startTime || requestTime < startTime) {
          startTime = requestTime;
        }
        const endRequestTime = new Date(requestTime.getTime() + responseTime);
        if (!endTime || endRequestTime > endTime) {
          endTime = endRequestTime;
        }

        // 协议统计
        this.incrementCounter(result.protocols, protocol.toUpperCase());

        // 主机统计
        this.incrementCounter(result.connections.topHosts, host);

        // 路径统计
        this.incrementCounter(result.connections.topPaths, url.pathname);

        // 连接统计
        const connection = `${protocol}://${host}`;
        this.incrementCounter(result.connections.topConnections, connection);

        // HTTP方法统计
        this.incrementCounter(result.performance.methodDistribution, method);

        // 状态码统计
        const statusCategory = this.getStatusCategory(statusCode);
        this.incrementCounter(result.performance.statusCodeDistribution, statusCategory);

        // Content-Type统计
        const contentType = this.getContentType(response);
        if (contentType) {
          this.incrementCounter(result.performance.contentTypeDistribution, contentType);
        }

        // 安全分析
        this.analyzeRequestSecurity(url, result);

        // 性能分析
        this.analyzeRequestPerformance(entry, result, index);

        // 异常检测
        this.detectAnomalies(entry, result, index);

      } catch (error) {
        logger.debug(`分析HTTP请求 ${index} 失败:`, error);
      }
    });

    // 计算汇总统计
    result.summary.totalBytes = totalBytes;
    result.summary.totalPackets = entries.length; // 添加包数统计
    result.summary.avgResponseTime = entries.length > 0 ? 
      Math.round(totalResponseTime / entries.length) : 0;
    result.summary.startTime = startTime;
    result.summary.endTime = endTime;
    result.summary.duration = startTime && endTime ? 
      Math.round((endTime - startTime) / 1000) : 0;

    // 生成topSources和topDestinations数据
    result.summary.topSources = Object.entries(hostPackets)
      .map(([ip, packets]) => ({ 
        ip, 
        packets, 
        bytes: hostBytes[ip] || 0 
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);

    result.summary.topDestinations = Object.entries(hostPackets)
      .map(([ip, packets]) => ({ 
        ip: `https://${ip}`, 
        packets, 
        bytes: hostBytes[ip] || 0 
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);

    // 转换统计数据
    this.convertStats(result);
  }

  /**
   * 分析请求安全性
   * @param {URL} url - 请求URL
   * @param {Object} result - 分析结果
   */
  analyzeRequestSecurity(url, result) {
    if (url.protocol === 'https:') {
      result.security.httpsRequests++;
    } else if (url.protocol === 'http:') {
      result.security.httpRequests++;
      result.security.insecureRequests.push(url.href);
    }

    // 检测混合内容
    if (!result.security.mixedContent && 
        result.security.httpsRequests > 0 && result.security.httpRequests > 0) {
      result.security.mixedContent = true;
    }
  }

  /**
   * 分析请求性能
   * @param {Object} entry - HTTP请求条目
   * @param {Object} result - 分析结果
   * @param {number} index - 请求索引
   */
  analyzeRequestPerformance(entry, result, index) {
    const responseTime = entry.time || 0;
    const statusCode = entry.response.status;

    const requestInfo = {
      index: index + 1,
      url: entry.request.url,
      method: entry.request.method,
      statusCode: statusCode,
      responseTime: Math.round(responseTime),
      size: entry.response.bodySize || entry.response.content?.size || 0
    };

    // 记录最慢的请求
    if (responseTime > 2000) { // 超过2秒
      result.performance.slowestRequests.push(requestInfo);
    }

    // 记录最快的请求
    if (responseTime < 100 && responseTime > 0) { // 小于100ms
      result.performance.fastestRequests.push(requestInfo);
    }

    // 记录错误请求
    if (statusCode >= 400) {
      result.performance.errorRequests.push(requestInfo);
    }
  }

  /**
   * 检测异常
   * @param {Object} entry - HTTP请求条目
   * @param {Object} result - 分析结果
   * @param {number} index - 请求索引
   */
  detectAnomalies(entry, result, index) {
    const responseTime = entry.time || 0;
    const statusCode = entry.response.status;
    const url = entry.request.url;

    // 超长响应时间
    if (responseTime > 10000) { // 超过10秒
      result.anomalies.push({
        type: 'performance',
        severity: 'high',
        description: `请求 ${index + 1} 响应时间过长: ${Math.round(responseTime)}ms`,
        url: url,
        details: { responseTime, statusCode }
      });
    }

    // 频繁的服务器错误
    if (statusCode >= 500) {
      result.anomalies.push({
        type: 'error',
        severity: 'medium',
        description: `请求 ${index + 1} 服务器错误: ${statusCode}`,
        url: url,
        details: { statusCode, method: entry.request.method }
      });
    }

    // 可疑的重定向
    if (statusCode >= 300 && statusCode < 400 && responseTime > 1000) {
      result.anomalies.push({
        type: 'security',
        severity: 'low',
        description: `请求 ${index + 1} 可疑重定向: ${statusCode}`,
        url: url,
        details: { statusCode, responseTime }
      });
    }
  }

  /**
   * 获取状态码分类
   * @param {number} statusCode - HTTP状态码
   * @returns {string} 状态码分类
   */
  getStatusCategory(statusCode) {
    const category = Math.floor(statusCode / 100) + 'xx';
    return `${category} ${this.statusCodeCategories[category] || 'Unknown'}`;
  }

  /**
   * 获取Content-Type
   * @param {Object} response - HTTP响应对象
   * @returns {string} Content-Type
   */
  getContentType(response) {
    const headers = response.headers || [];
    const contentTypeHeader = headers.find(h => 
      h.name.toLowerCase() === 'content-type');
    
    if (contentTypeHeader) {
      const contentType = contentTypeHeader.value.split(';')[0].trim();
      return contentType;
    }
    
    return null;
  }

  /**
   * 增加计数器
   * @param {Object} counter - 计数器对象
   * @param {string} key - 键名
   */
  incrementCounter(counter, key) {
    counter[key] = (counter[key] || 0) + 1;
  }

  /**
   * 转换统计数据格式
   * @param {Object} result - 分析结果
   */
  convertStats(result) {
    // 转换协议统计
    result.protocols = this.convertToArray(result.protocols, 'name', 'requests');

    // 转换连接统计
    result.connections.topHosts = this.convertToArray(
      result.connections.topHosts, 'host', 'requests').slice(0, 10);
    result.connections.topPaths = this.convertToArray(
      result.connections.topPaths, 'path', 'requests').slice(0, 10);
    result.connections.topConnections = this.convertToArray(
      result.connections.topConnections, 'connection', 'requests').slice(0, 20);

    // 排序性能数据
    result.performance.slowestRequests = result.performance.slowestRequests
      .sort((a, b) => b.responseTime - a.responseTime).slice(0, 10);
    result.performance.fastestRequests = result.performance.fastestRequests
      .sort((a, b) => a.responseTime - b.responseTime).slice(0, 10);
    result.performance.errorRequests = result.performance.errorRequests
      .sort((a, b) => b.statusCode - a.statusCode);

    // 转换分布统计
    result.performance.methodDistribution = this.convertToArray(
      result.performance.methodDistribution, 'method', 'count');
    result.performance.statusCodeDistribution = this.convertToArray(
      result.performance.statusCodeDistribution, 'status', 'count');
    result.performance.contentTypeDistribution = this.convertToArray(
      result.performance.contentTypeDistribution, 'contentType', 'count');
  }

  /**
   * 将对象转换为数组格式
   * @param {Object} obj - 源对象
   * @param {string} keyName - 键字段名
   * @param {string} valueName - 值字段名
   * @returns {Array} 转换后的数组
   */
  convertToArray(obj, keyName, valueName) {
    return Object.entries(obj)
      .map(([key, value]) => ({ [keyName]: key, [valueName]: value }))
      .sort((a, b) => b[valueName] - a[valueName]);
  }

  /**
   * 生成分析建议
   * @param {Object} result - 分析结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(result) {
    const recommendations = [];

    // 性能建议
    if (result.summary.avgResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        level: 'warning',
        title: '平均响应时间过长',
        description: `平均响应时间 ${result.summary.avgResponseTime}ms，建议优化服务器性能或网络连接`
      });
    }

    // 安全建议
    if (result.security.httpRequests > 0) {
      recommendations.push({
        type: 'security',
        level: 'warning',
        title: '检测到HTTP请求',
        description: `发现 ${result.security.httpRequests} 个HTTP请求，建议使用HTTPS确保数据安全`
      });
    }

    if (result.security.mixedContent) {
      recommendations.push({
        type: 'security',
        level: 'error',
        title: '混合内容警告',
        description: '检测到HTTP和HTTPS混合使用，可能导致安全风险'
      });
    }

    // 错误建议
    const errorRate = result.performance.errorRequests.length / result.summary.totalRequests;
    if (errorRate > 0.1) { // 错误率超过10%
      recommendations.push({
        type: 'reliability',
        level: 'error',
        title: '高错误率',
        description: `错误率 ${(errorRate * 100).toFixed(1)}%，建议检查服务器状态和API接口`
      });
    }

    // 缓存建议
    const staticResources = result.performance.contentTypeDistribution.filter(item => 
      item.contentType && (
        item.contentType.includes('javascript') ||
        item.contentType.includes('css') ||
        item.contentType.includes('image')
      )
    );

    if (staticResources.length > 0) {
      recommendations.push({
        type: 'performance',
        level: 'info',
        title: '静态资源优化',
        description: '建议为静态资源（JS、CSS、图片）配置适当的缓存策略'
      });
    }

    return recommendations;
  }
}

module.exports = new HarAnalysisService(); 