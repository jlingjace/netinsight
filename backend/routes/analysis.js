const express = require('express');
const router = express.Router();
const path = require('path');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const pcapAnalysisService = require('../services/pcapAnalysisService');
const harAnalysisService = require('../services/harAnalysisService');

// 获取分析结果列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const analysisType = req.query.type;

    let whereClause = 'WHERE f.user_id = ?';
    const params = [req.user.userId];

    if (analysisType) {
      whereClause += ' AND ar.analysis_type = ?';
      params.push(analysisType);
    }

    const analysisResults = await db.all(
      `SELECT 
         ar.id,
         ar.analysis_type,
         ar.summary_data,
         ar.created_at,
         f.id as file_id,
         f.original_name,
         f.file_type,
         f.file_size
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       ${whereClause}
       ORDER BY ar.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalResult = await db.get(
      `SELECT COUNT(*) as total 
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       ${whereClause}`,
      params
    );

    res.json({
      analysisResults: analysisResults.map(result => ({
        ...result,
        summary_data: result.summary_data ? JSON.parse(result.summary_data) : null
      })),
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get analysis results error:', error);
    res.status(500).json({
      error: 'Failed to get analysis results'
    });
  }
});

// 获取分析结果详情
router.get('/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID'
      });
    }

    const db = getDatabase();
    
    // 检查文件是否存在
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.userId]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // 检查是否有分析结果
    const analysisResult = await db.get(
      'SELECT * FROM analysis_results WHERE file_id = ?',
      [fileId]
    );

    if (!analysisResult) {
      return res.json({
        fileId: fileId,
        status: file.status,
        message: file.status === 'processing' ? 
          'Analysis in progress' : 'Analysis not started'
      });
    }

    // 解析JSON数据
    const parsedResult = {
      id: analysisResult.id,
      fileId: fileId,
      analysisType: analysisResult.analysis_type,
      status: 'completed',
      startedAt: analysisResult.created_at,
      completedAt: analysisResult.created_at,
      results: {
        summary: analysisResult.summary_data ? JSON.parse(analysisResult.summary_data) : null,
        protocols: analysisResult.summary_data ? 
          Object.entries(JSON.parse(analysisResult.summary_data).protocolDistribution || {}).map(([name, packets]) => ({
            name,
            packets,
            percentage: (packets / (JSON.parse(analysisResult.summary_data).totalPackets || 1)) * 100
          })) : [],
        connections: {
          topConnections: analysisResult.summary_data ? 
            (JSON.parse(analysisResult.summary_data).topSources || []).map(source => ({
              connection: `${source.ip}:* -> *:*`,
              packets: source.packets
            })) : []
        },
        anomalies: analysisResult.recommendations ? 
          JSON.parse(analysisResult.recommendations).filter(rec => rec.level === 'warning' || rec.level === 'error').map(rec => ({
            description: rec.description,
            severity: rec.level === 'error' ? 'high' : 'medium'
          })) : []
      }
    };

    res.json(parsedResult);

  } catch (error) {
    console.error('Get analysis result details error:', error);
    res.status(500).json({
      error: 'Failed to get analysis result details',
      message: error.message
    });
  }
});

// 触发文件分析（使用真实分析引擎）
router.post('/start/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID'
      });
    }

    const db = getDatabase();
    
    // 检查文件是否存在
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.userId]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    if (file.status === 'processing') {
      return res.status(409).json({
        error: 'File is already being processed'
      });
    }

    // 更新文件状态为处理中
    await db.run(
      'UPDATE files SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['processing', fileId]
    );

    // 异步处理分析任务
    setImmediate(async () => {
      try {
        console.log(`开始分析文件: ${file.original_name} (${file.file_type})`);
        
        // 如果file_path已经是绝对路径，直接使用；否则组合路径
        const filePath = path.isAbsolute(file.file_path) ? 
          file.file_path : 
          path.join(__dirname, '..', file.file_path);
        
        console.log(`文件路径: ${filePath}`);
        let analysisResult;

        // 根据文件类型选择分析引擎
        if (file.file_type === '.har') {
          console.log('使用HAR分析引擎');
          analysisResult = await harAnalysisService.analyzeHarFile(filePath);
        } else if (['.pcap', '.pcapng', '.cap'].includes(file.file_type)) {
          console.log('使用PCAP分析引擎');
          analysisResult = await pcapAnalysisService.analyzePcapFile(filePath);
        } else {
          throw new Error(`不支持的文件类型: ${file.file_type}`);
        }

        // 转换分析结果为前端需要的格式
        const formattedResult = formatAnalysisResult(analysisResult, file.file_type);

        // 保存分析结果
        await db.run(
          `INSERT INTO analysis_results (file_id, analysis_type, summary_data, detailed_data, chart_data, recommendations)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            file.file_type === '.har' ? 'har_analysis' : 'pcap_analysis',
            JSON.stringify(formattedResult.summary),
            JSON.stringify(analysisResult),
            JSON.stringify(formattedResult.chartData),
            JSON.stringify(analysisResult.recommendations || [])
          ]
        );

        // 更新文件状态为完成
        await db.run(
          'UPDATE files SET status = ? WHERE id = ?',
          ['completed', fileId]
        );

        console.log(`文件分析完成: ${file.original_name}`);

      } catch (error) {
        console.error('Analysis processing error:', error);
        
        // 更新文件状态为错误
        const errorMessage = error && error.message ? error.message : 
          (typeof error === 'string' ? error : '分析过程中发生未知错误');
        
        await db.run(
          'UPDATE files SET status = ?, error_message = ? WHERE id = ?',
          ['error', errorMessage, fileId]
        );
      }
    });

    // 记录日志
    await logAction(req.user.userId, 'analysis_start', 'file', fileId, {
      originalName: file.original_name,
      fileType: file.file_type
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: 'Analysis started successfully',
      fileId: fileId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Start analysis error:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error.message
    });
  }
});

/**
 * 格式化分析结果为前端需要的格式
 * @param {Object} analysisResult - 原始分析结果
 * @param {string} fileType - 文件类型
 * @returns {Object} 格式化后的结果
 */
function formatAnalysisResult(analysisResult, fileType) {
  const summary = analysisResult.summary;
  
  let formattedSummary;
  let chartData;

  if (fileType === '.har') {
    // HAR文件结果格式化
    formattedSummary = {
      totalPackets: summary.totalRequests,
      totalBytes: summary.totalBytes,
      duration: summary.duration,
      avgPacketSize: summary.totalRequests > 0 ? 
        Math.round(summary.totalBytes / summary.totalRequests) : 0,
      protocolDistribution: analysisResult.protocols.reduce((acc, protocol) => {
        acc[protocol.name] = protocol.requests;
        return acc;
      }, {}),
      topSources: analysisResult.connections.topHosts.map(host => ({
        ip: host.host,
        packets: host.requests
      })),
      topDestinations: analysisResult.connections.topConnections.map(conn => ({
        ip: conn.connection,
        packets: conn.requests
      }))
    };

    chartData = {
      protocolChart: analysisResult.protocols.map(protocol => ({
        protocol: protocol.name,
        count: protocol.requests
      })),
      methodChart: analysisResult.performance.methodDistribution.map(method => ({
        method: method.method,
        count: method.count
      })),
      statusChart: analysisResult.performance.statusCodeDistribution.map(status => ({
        status: status.status,
        count: status.count
      }))
    };

  } else {
    // PCAP文件结果格式化
    formattedSummary = {
      totalPackets: summary.totalPackets,
      totalBytes: summary.totalBytes,
      duration: summary.duration,
      avgPacketSize: summary.avgPacketSize,
      protocolDistribution: analysisResult.protocols.reduce((acc, protocol) => {
        acc[protocol.name] = protocol.packets;
        return acc;
      }, {}),
      topSources: analysisResult.connections.topSources,
      topDestinations: analysisResult.connections.topDestinations
    };

    chartData = {
      protocolChart: analysisResult.protocols.map(protocol => ({
        protocol: protocol.name,
        count: protocol.packets
      })),
      timelineChart: generateTimelineData(summary)
    };
  }

  return {
    summary: formattedSummary,
    chartData: chartData
  };
}

/**
 * 生成时间线数据
 * @param {Object} summary - 汇总信息
 * @returns {Array} 时间线数据
 */
function generateTimelineData(summary) {
  // 简单的时间线数据生成
  const duration = summary.duration || 60;
  const totalPackets = summary.totalPackets || 0;
  const timelineData = [];
  
  const intervals = Math.min(10, duration);
  const packetsPerInterval = Math.floor(totalPackets / intervals);
  
  for (let i = 0; i < intervals; i++) {
    const time = Math.floor((duration / intervals) * i);
    const packets = packetsPerInterval + Math.floor(Math.random() * (packetsPerInterval * 0.3));
    
    timelineData.push({
      time: `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}:00`,
      packets: packets
    });
  }
  
  return timelineData;
}

// 获取分析统计信息
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = await db.all(
      `SELECT 
         analysis_type,
         COUNT(*) as count,
         AVG(julianday(created_at) - julianday((SELECT uploaded_at FROM files WHERE id = file_id))) * 24 * 60 as avg_processing_time_minutes
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       WHERE f.user_id = ?
       GROUP BY analysis_type`,
      [req.user.userId]
    );

    const totalAnalysis = await db.get(
      `SELECT COUNT(*) as total
       FROM analysis_results ar
       JOIN files f ON ar.file_id = f.id
       WHERE f.user_id = ?`,
      [req.user.userId]
    );

    res.json({
      totalAnalysis: totalAnalysis.total || 0,
      byType: stats
    });

  } catch (error) {
    console.error('Get analysis stats error:', error);
    res.status(500).json({
      error: 'Failed to get analysis statistics'
    });
  }
});

// 批量启动分析
router.post('/batch-start', authMiddleware, async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid file IDs',
        message: '无效的文件ID列表'
      });
    }

    const db = getDatabase();
    const analysisResults = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        // 检查文件是否存在且属于当前用户
        const file = await db.get(
          'SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = "admin") AND status = "uploaded"',
          [fileId, req.user.userId, req.user.role]
        );

        if (!file) {
          errors.push({
            fileId,
            error: '文件不存在、无权限或状态不正确'
          });
          continue;
        }

        // 更新文件状态为处理中
        await db.run(
          'UPDATE files SET status = ?, analysis_started_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['processing', fileId]
        );

        // 启动异步分析
        setImmediate(async () => {
          try {
            const analysisService = require('../services/analysisService');
            await analysisService.analyzeFile(file);
          } catch (error) {
            console.error(`分析文件 ${fileId} 失败:`, error);
            // 更新状态为错误
            await db.run(
              'UPDATE files SET status = ?, error_message = ? WHERE id = ?',
              ['error', error.message, fileId]
            );
          }
        });

        analysisResults.push({
          fileId,
          fileName: file.original_name,
          status: 'processing'
        });

        await logAction(req.user.userId, 'analysis.batch_start', {
          fileId,
          fileName: file.original_name
        });

      } catch (error) {
        console.error(`处理文件 ${fileId} 失败:`, error);
        errors.push({
          fileId,
          error: error.message
        });
      }
    }

    res.json({
      message: `成功启动 ${analysisResults.length} 个文件的分析`,
      results: analysisResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: fileIds.length,
        started: analysisResults.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('批量分析错误:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: '批量分析启动失败'
    });
  }
});

// 获取批量分析状态
router.get('/batch-status/:batchId', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { fileIds } = req.query;

    if (!fileIds) {
      return res.status(400).json({
        error: 'File IDs required',
        message: '需要提供文件ID列表'
      });
    }

    const db = getDatabase();
    const fileIdList = fileIds.split(',').map(id => parseInt(id));
    
    const files = await db.all(
      `SELECT id, original_name, status, error_message 
       FROM files 
       WHERE id IN (${fileIdList.map(() => '?').join(',')}) 
       AND (user_id = ? OR ? = "admin")`,
      [...fileIdList, req.user.userId, req.user.role]
    );

    const statusSummary = {
      total: files.length,
      processing: files.filter(f => f.status === 'processing').length,
      completed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'error').length
    };

    const progress = statusSummary.total > 0 
      ? Math.round(((statusSummary.completed + statusSummary.failed) / statusSummary.total) * 100)
      : 0;

    res.json({
      batchId,
      progress,
      status: progress === 100 ? 'completed' : 'processing',
      summary: statusSummary,
      files: files.map(file => ({
        id: file.id,
        name: file.original_name,
        status: file.status,
        error: file.error_message
      }))
    });

  } catch (error) {
    console.error('获取批量分析状态错误:', error);
    res.status(500).json({
      error: 'Failed to get batch status',
      message: '获取批量分析状态失败'
    });
  }
});

// 生成PDF报告
router.get('/:id/report/pdf', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'A4', orientation = 'portrait' } = req.query;

    // 检查文件权限
    const db = getDatabase();
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = "admin")',
      [id, req.user.userId, req.user.role]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: '文件不存在或无权限访问'
      });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({
        error: 'Analysis not completed',
        message: '文件分析尚未完成'
      });
    }

    // 生成PDF报告
    const pdfReportService = require('../services/pdfReportService');
    const pdfBuffer = await pdfReportService.generateAnalysisReport(id, {
      format,
      orientation
    });

    // 设置响应头
    const filename = `${file.original_name}_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 记录操作日志
    await logAction(req.user.userId, 'report.generate_pdf', {
      fileId: id,
      fileName: file.original_name,
      format,
      orientation
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF报告生成失败:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: 'PDF报告生成失败: ' + error.message
    });
  }
});

// 预览PDF报告（HTML版本）
router.get('/:id/report/preview', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查文件权限
    const db = getDatabase();
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = "admin")',
      [id, req.user.userId, req.user.role]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: '文件不存在或无权限访问'
      });
    }

    if (file.status !== 'completed') {
      return res.status(400).json({
        error: 'Analysis not completed',
        message: '文件分析尚未完成'
      });
    }

    // 生成HTML预览
    const pdfReportService = require('../services/pdfReportService');
    const data = await pdfReportService.getReportData(id);
    const charts = await pdfReportService.generateCharts(data);
    const htmlContent = await pdfReportService.generateHTMLContent(data, charts);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);

  } catch (error) {
    console.error('报告预览生成失败:', error);
    res.status(500).json({
      error: 'Preview generation failed',
      message: '报告预览生成失败: ' + error.message
    });
  }
});

module.exports = router; 