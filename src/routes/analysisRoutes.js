const express = require('express');
const router = express.Router();

const { analysisLimiter } = require('../middleware/rateLimiter');
const File = require('../models/File');
const Analysis = require('../models/Analysis');
const { logger } = require('../utils/logger');
const { startAnalysis, reAnalyze, cancelAnalysis, getQueueStatus } = require('../services/analysisService');

/**
 * @route GET /api/analysis/:fileId
 * @desc 获取文件分析结果
 * @access Public
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: '文件不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (!file.analysisId) {
      return res.json({
        success: true,
        data: {
          fileId: fileId,
          status: file.analysisStatus,
          message: '分析尚未开始或正在进行中'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const analysis = await Analysis.findById(file.analysisId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: '分析记录不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        fileId: fileId,
        analysisId: analysis._id,
        status: analysis.status,
        startedAt: analysis.startedAt,
        completedAt: analysis.completedAt,
        duration: analysis.formattedDuration,
        config: analysis.config,
        results: analysis.results,
        error: analysis.error
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取分析结果错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取分析结果失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/analysis/:fileId/start
 * @desc 启动文件分析
 * @access Public
 */
router.post('/:fileId/start', analysisLimiter, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { analysisType = 'basic', options = {} } = req.body;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: '文件不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查文件是否有效
    if (!file.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: '文件无效，无法进行分析',
          details: file.validationErrors
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查是否已有分析在进行
    if (file.analysisStatus === 'running') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ANALYSIS_RUNNING',
          message: '该文件正在分析中'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 启动分析
    await startAnalysis(fileId);
    
    res.json({
      success: true,
      data: {
        fileId: fileId,
        message: '分析任务已启动',
        status: 'pending'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('启动分析错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '启动分析失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/analysis/:fileId/restart
 * @desc 重新分析文件
 * @access Public
 */
router.post('/:fileId/restart', analysisLimiter, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    await reAnalyze(fileId);
    
    res.json({
      success: true,
      data: {
        fileId: fileId,
        message: '重新分析任务已启动'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('重新分析错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || '重新分析失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route DELETE /api/analysis/:fileId/cancel
 * @desc 取消分析任务
 * @access Public
 */
router.delete('/:fileId/cancel', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const cancelled = await cancelAnalysis(fileId);
    
    if (cancelled) {
      res.json({
        success: true,
        data: {
          fileId: fileId,
          message: '分析任务已取消'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: '无法取消分析任务（可能已在运行中）'
        },
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('取消分析错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '取消分析失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/analysis/queue/status
 * @desc 获取分析队列状态
 * @access Public
 */
router.get('/queue/status', async (req, res) => {
  try {
    const queueStatus = getQueueStatus();
    
    res.json({
      success: true,
      data: queueStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取队列状态错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取队列状态失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/analysis/:fileId/summary
 * @desc 获取分析结果摘要
 * @access Public
 */
router.get('/:fileId/summary', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findById(fileId);
    if (!file || !file.analysisId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: '分析结果不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const analysis = await Analysis.findById(file.analysisId);
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ANALYSIS_INCOMPLETE',
          message: '分析尚未完成'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 提取关键摘要信息
    const summary = {
      fileInfo: {
        filename: file.originalName,
        fileType: file.fileType,
        fileSize: file.formattedSize,
        uploadedAt: file.uploadedAt
      },
      analysisInfo: {
        completedAt: analysis.completedAt,
        duration: analysis.formattedDuration,
        status: analysis.status
      },
      networkSummary: analysis.results?.summary || {},
      protocolDistribution: analysis.results?.protocols || [],
      topConnections: analysis.results?.connections?.topConnections?.slice(0, 5) || [],
      anomalies: analysis.results?.anomalies?.filter(a => a.severity === 'high' || a.severity === 'critical') || [],
      performance: analysis.results?.performance || {}
    };
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取分析摘要错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取分析摘要失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/analysis/stats
 * @desc 获取分析统计信息
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const analysisStats = await Analysis.getStats();
    const fileStats = await File.getStats();
    
    res.json({
      success: true,
      data: {
        analysis: analysisStats,
        files: fileStats,
        queue: getQueueStatus()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取统计信息错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取统计信息失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 