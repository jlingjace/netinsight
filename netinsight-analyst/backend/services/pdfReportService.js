const puppeteer = require('puppeteer');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs').promises;
const path = require('path');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');

class PDFReportService {
  constructor() {
    this.chartRenderer = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white'
    });
  }

  async generateAnalysisReport(fileId, options = {}) {
    try {
      logger.info(`生成分析报告: 文件ID ${fileId}`);
      
      // 获取文件和分析数据
      const data = await this.getReportData(fileId);
      
      // 生成图表
      const charts = await this.generateCharts(data);
      
      // 生成HTML内容
      const htmlContent = await this.generateHTMLContent(data, charts, options);
      
      // 生成PDF
      const pdfBuffer = await this.generatePDF(htmlContent, options);
      
      logger.info(`PDF报告生成完成: 文件ID ${fileId}`);
      return pdfBuffer;
      
    } catch (error) {
      logger.error(`PDF报告生成失败: ${error.message}`, error);
      throw error;
    }
  }

  async getReportData(fileId) {
    const db = getDatabase();
    
    // 获取文件信息
    const file = await db.get(
      'SELECT * FROM files WHERE id = ?',
      [fileId]
    );
    
    if (!file) {
      throw new Error('文件不存在');
    }
    
    // 获取分析结果
    const analysisResult = await db.get(
      'SELECT * FROM analysis_results WHERE file_id = ?',
      [fileId]
    );
    
    if (!analysisResult) {
      throw new Error('分析结果不存在');
    }
    
    // 解析分析数据
    const analysisData = JSON.parse(analysisResult.result_data);
    
    return {
      file,
      analysisResult,
      analysisData,
      generatedAt: new Date().toISOString()
    };
  }

  async generateCharts(data) {
    const charts = {};
    const { analysisData } = data;
    
    try {
      // 根据分析类型生成不同的图表
      if (analysisData.analysis_type === 'har') {
        charts.statusCodes = await this.generateStatusCodeChart(analysisData);
        charts.contentTypes = await this.generateContentTypeChart(analysisData);
        charts.timeline = await this.generateTimelineChart(analysisData);
        charts.responseTimes = await this.generateResponseTimeChart(analysisData);
      } else if (analysisData.analysis_type === 'pcap') {
        charts.protocols = await this.generateProtocolChart(analysisData);
        charts.ipDistribution = await this.generateIPDistributionChart(analysisData);
        charts.portDistribution = await this.generatePortDistributionChart(analysisData);
        charts.trafficOverTime = await this.generateTrafficOverTimeChart(analysisData);
      }
      
      // 通用图表
      charts.summary = await this.generateSummaryChart(analysisData);
      
    } catch (error) {
      logger.error('生成图表失败:', error);
      // 即使图表生成失败，也继续生成报告
    }
    
    return charts;
  }

  async generateStatusCodeChart(data) {
    const statusCodes = data.status_codes || {};
    
    const chartConfig = {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCodes),
        datasets: [{
          data: Object.values(statusCodes),
          backgroundColor: [
            '#4CAF50', // 2xx - 绿色
            '#FFC107', // 3xx - 黄色
            '#FF5722', // 4xx - 橙色
            '#F44336', // 5xx - 红色
            '#9E9E9E'  // 其他 - 灰色
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'HTTP状态码分布',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'right',
            labels: { padding: 20 }
          }
        }
      }
    };
    
    return await this.chartRenderer.renderToBuffer(chartConfig);
  }

  async generateContentTypeChart(data) {
    const contentTypes = data.content_types || {};
    const topTypes = Object.entries(contentTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    const chartConfig = {
      type: 'bar',
      data: {
        labels: topTypes.map(([type]) => type.split('/')[1] || type),
        datasets: [{
          label: '请求数量',
          data: topTypes.map(([, count]) => count),
          backgroundColor: '#2196F3',
          borderColor: '#1976D2',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '内容类型分布（Top 10）',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '请求数量'
            }
          },
          x: {
            title: {
              display: true,
              text: '内容类型'
            }
          }
        }
      }
    };
    
    return await this.chartRenderer.renderToBuffer(chartConfig);
  }

  async generateProtocolChart(data) {
    const protocols = data.protocols || {};
    
    const chartConfig = {
      type: 'pie',
      data: {
        labels: Object.keys(protocols),
        datasets: [{
          data: Object.values(protocols),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '网络协议分布',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'right',
            labels: { padding: 20 }
          }
        }
      }
    };
    
    return await this.chartRenderer.renderToBuffer(chartConfig);
  }

  async generateTimelineChart(data) {
    const timeline = data.timeline || [];
    
    if (timeline.length === 0) {
      return null;
    }
    
    const chartConfig = {
      type: 'line',
      data: {
        labels: timeline.map(point => new Date(point.timestamp).toLocaleTimeString()),
        datasets: [{
          label: '请求数量',
          data: timeline.map(point => point.count),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '请求时间线',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '请求数量'
            }
          },
          x: {
            title: {
              display: true,
              text: '时间'
            }
          }
        }
      }
    };
    
    return await this.chartRenderer.renderToBuffer(chartConfig);
  }

  async generateSummaryChart(data) {
    const summaryData = {
      'Total Requests': data.total_requests || data.packet_count || 0,
      'Unique Domains': data.unique_domains || data.unique_ips || 0,
      'Data Size (MB)': Math.round((data.total_size || 0) / (1024 * 1024) * 100) / 100,
      'Analysis Duration (s)': data.duration || 0
    };
    
    const chartConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(summaryData),
        datasets: [{
          label: '指标值',
          data: Object.values(summaryData),
          backgroundColor: [
            '#4CAF50', '#2196F3', '#FF9800', '#9C27B0'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '分析摘要',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };
    
    return await this.chartRenderer.renderToBuffer(chartConfig);
  }

  async generateHTMLContent(data, charts, options) {
    const { file, analysisData } = data;
    
    // 将图表转换为base64
    const chartImages = {};
    for (const [key, buffer] of Object.entries(charts)) {
      if (buffer) {
        chartImages[key] = `data:image/png;base64,${buffer.toString('base64')}`;
      }
    }
    
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NetInsight 分析报告</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: #f8f9fa;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                margin-bottom: 30px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header h1 {
                margin: 0;
                font-size: 2.5em;
                font-weight: 300;
            }
            .header .subtitle {
                margin-top: 10px;
                opacity: 0.9;
                font-size: 1.1em;
            }
            .section {
                background: white;
                margin-bottom: 25px;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .section-header {
                background: #f8f9fa;
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
            }
            .section-header h2 {
                margin: 0;
                color: #495057;
                font-size: 1.5em;
            }
            .section-content {
                padding: 20px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .info-item {
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #007bff;
            }
            .info-item .label {
                font-weight: bold;
                color: #495057;
                margin-bottom: 5px;
            }
            .info-item .value {
                font-size: 1.2em;
                color: #007bff;
            }
            .chart-container {
                text-align: center;
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .chart-container img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            .data-table th,
            .data-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #dee2e6;
            }
            .data-table th {
                background: #e9ecef;
                font-weight: bold;
                color: #495057;
            }
            .data-table tr:hover {
                background: #f8f9fa;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding: 20px;
                color: #6c757d;
                border-top: 1px solid #dee2e6;
            }
            .badge {
                display: inline-block;
                padding: 4px 8px;
                font-size: 0.8em;
                border-radius: 4px;
                background: #28a745;
                color: white;
            }
            .badge.warning {
                background: #ffc107;
                color: #212529;
            }
            .badge.danger {
                background: #dc3545;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>NetInsight 分析报告</h1>
            <div class="subtitle">企业级网络数据分析平台</div>
            <div style="margin-top: 15px; font-size: 0.9em;">
                生成时间: ${new Date().toLocaleString('zh-CN')}
            </div>
        </div>

        <!-- 文件信息 -->
        <div class="section">
            <div class="section-header">
                <h2>📁 文件信息</h2>
            </div>
            <div class="section-content">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">文件名</div>
                        <div class="value">${file.original_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">文件类型</div>
                        <div class="value">${file.file_type.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">文件大小</div>
                        <div class="value">${this.formatFileSize(file.file_size)}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">上传时间</div>
                        <div class="value">${new Date(file.uploaded_at).toLocaleString('zh-CN')}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 分析摘要 -->
        <div class="section">
            <div class="section-header">
                <h2>📊 分析摘要</h2>
            </div>
            <div class="section-content">
                ${this.generateSummarySection(analysisData)}
                ${chartImages.summary ? `
                <div class="chart-container">
                    <img src="${chartImages.summary}" alt="分析摘要图表" />
                </div>
                ` : ''}
            </div>
        </div>

        <!-- 具体分析结果 -->
        ${this.generateAnalysisSection(analysisData, chartImages)}

        <!-- 详细数据 -->
        <div class="section">
            <div class="section-header">
                <h2>📋 详细数据</h2>
            </div>
            <div class="section-content">
                ${this.generateDetailedDataSection(analysisData)}
            </div>
        </div>

        <div class="footer">
            <p>本报告由 NetInsight 自动生成 | © 2024 NetInsight Platform</p>
            <p>报告ID: ${file.id}-${Date.now()}</p>
        </div>
    </body>
    </html>
    `;
    
    return html;
  }

  generateSummarySection(data) {
    if (data.analysis_type === 'har') {
      return `
        <div class="info-grid">
            <div class="info-item">
                <div class="label">总请求数</div>
                <div class="value">${data.total_requests || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">唯一域名</div>
                <div class="value">${data.unique_domains || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">总数据量</div>
                <div class="value">${this.formatFileSize(data.total_size || 0)}</div>
            </div>
            <div class="info-item">
                <div class="label">平均响应时间</div>
                <div class="value">${data.avg_response_time || 0} ms</div>
            </div>
        </div>
      `;
    } else if (data.analysis_type === 'pcap') {
      return `
        <div class="info-grid">
            <div class="info-item">
                <div class="label">数据包总数</div>
                <div class="value">${data.packet_count || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">唯一IP地址</div>
                <div class="value">${data.unique_ips || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">唯一端口</div>
                <div class="value">${data.unique_ports || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">分析时长</div>
                <div class="value">${data.duration || 0} 秒</div>
            </div>
        </div>
      `;
    }
    return '';
  }

  generateAnalysisSection(data, chartImages) {
    if (data.analysis_type === 'har') {
      return `
        <!-- HTTP状态码分析 -->
        <div class="section">
            <div class="section-header">
                <h2>🌐 HTTP状态码分析</h2>
            </div>
            <div class="section-content">
                ${chartImages.statusCodes ? `
                <div class="chart-container">
                    <img src="${chartImages.statusCodes}" alt="HTTP状态码分布" />
                </div>
                ` : ''}
                ${this.generateStatusCodeTable(data.status_codes)}
            </div>
        </div>

        <!-- 内容类型分析 -->
        <div class="section">
            <div class="section-header">
                <h2>📄 内容类型分析</h2>
            </div>
            <div class="section-content">
                ${chartImages.contentTypes ? `
                <div class="chart-container">
                    <img src="${chartImages.contentTypes}" alt="内容类型分布" />
                </div>
                ` : ''}
            </div>
        </div>

        <!-- 时间线分析 -->
        ${chartImages.timeline ? `
        <div class="section">
            <div class="section-header">
                <h2>⏰ 请求时间线</h2>
            </div>
            <div class="section-content">
                <div class="chart-container">
                    <img src="${chartImages.timeline}" alt="请求时间线" />
                </div>
            </div>
        </div>
        ` : ''}
      `;
    } else if (data.analysis_type === 'pcap') {
      return `
        <!-- 协议分析 -->
        <div class="section">
            <div class="section-header">
                <h2>🔗 网络协议分析</h2>
            </div>
            <div class="section-content">
                ${chartImages.protocols ? `
                <div class="chart-container">
                    <img src="${chartImages.protocols}" alt="网络协议分布" />
                </div>
                ` : ''}
                ${this.generateProtocolTable(data.protocols)}
            </div>
        </div>

        <!-- IP地址分析 -->
        <div class="section">
            <div class="section-header">
                <h2>🌍 IP地址分析</h2>
            </div>
            <div class="section-content">
                ${this.generateIPTable(data.ip_addresses)}
            </div>
        </div>
      `;
    }
    return '';
  }

  generateDetailedDataSection(data) {
    let content = '<div style="font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">';
    content += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    content += '</div>';
    return content;
  }

  generateStatusCodeTable(statusCodes) {
    if (!statusCodes || Object.keys(statusCodes).length === 0) {
      return '<p>没有状态码数据</p>';
    }

    let table = '<table class="data-table"><thead><tr><th>状态码</th><th>数量</th><th>占比</th></tr></thead><tbody>';
    const total = Object.values(statusCodes).reduce((sum, count) => sum + count, 0);
    
    Object.entries(statusCodes).forEach(([code, count]) => {
      const percentage = ((count / total) * 100).toFixed(2);
      table += `<tr><td>${code}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    
    table += '</tbody></table>';
    return table;
  }

  generateProtocolTable(protocols) {
    if (!protocols || Object.keys(protocols).length === 0) {
      return '<p>没有协议数据</p>';
    }

    let table = '<table class="data-table"><thead><tr><th>协议</th><th>数据包数量</th><th>占比</th></tr></thead><tbody>';
    const total = Object.values(protocols).reduce((sum, count) => sum + count, 0);
    
    Object.entries(protocols).forEach(([protocol, count]) => {
      const percentage = ((count / total) * 100).toFixed(2);
      table += `<tr><td>${protocol}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    
    table += '</tbody></table>';
    return table;
  }

  generateIPTable(ipAddresses) {
    if (!ipAddresses || ipAddresses.length === 0) {
      return '<p>没有IP地址数据</p>';
    }

    let table = '<table class="data-table"><thead><tr><th>IP地址</th><th>类型</th></tr></thead><tbody>';
    
    ipAddresses.slice(0, 20).forEach(ip => {
      const type = this.getIPType(ip);
      table += `<tr><td>${ip}</td><td><span class="badge ${type.class}">${type.name}</span></td></tr>`;
    });
    
    table += '</tbody></table>';
    return table;
  }

  getIPType(ip) {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { name: '内网', class: '' };
    }
    return { name: '外网', class: 'warning' };
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generatePDF(htmlContent, options = {}) {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfOptions = {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        ...options
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      
      return pdfBuffer;
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new PDFReportService(); 