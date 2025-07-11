const express = require('express');
const router = express.Router();

const { upload, validateFile, calculateFileHash } = require('../middleware/upload');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const File = require('../models/File');
const { logger } = require('../utils/logger');
const { startAnalysis } = require('../services/analysisService');

/**
 * @route POST /api/files/upload
 * @desc 上传网络抓包文件
 * @access Public (暂时)
 */
router.post('/upload', fileUploadLimiter, upload, validateFile, async (req, res) => {
  try {
    const { file, fileValidation } = req;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    logger.info(`文件上传请求: ${file.originalname} (${file.size} bytes) from ${clientIP}`);
    
    // 计算文件哈希
    const fileHash = await calculateFileHash(file.path);
    
    // 检查是否已存在相同文件
    const existingFile = await File.findByHash(fileHash);
    if (existingFile) {
      logger.info(`发现重复文件: ${fileHash}`);
      return res.json({
        success: true,
        data: {
          fileId: existingFile._id,
          message: '文件已存在，直接返回分析结果',
          isExisting: true,
          analysisStatus: existingFile.analysisStatus
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 获取文件类型
    const fileType = file.originalname.split('.').pop().toLowerCase();
    
    // 创建文件记录
    const fileRecord = new File({
      filename: file.filename,
      originalName: file.originalname,
      fileType: fileType,
      fileSize: file.size,
      filePath: file.path,
      fileHash: fileHash,
      clientIP: clientIP,
      isValid: fileValidation.isValid,
      metadata: fileValidation.metadata,
      status: 'uploaded'
    });
    
    await fileRecord.save();
    
    logger.info(`文件保存成功: ${fileRecord._id}`);
    
    // 异步启动分析
    try {
      await startAnalysis(fileRecord._id);
      logger.info(`分析任务已启动: ${fileRecord._id}`);
    } catch (analysisError) {
      logger.error('启动分析失败:', analysisError);
      // 不阻塞文件上传的响应
    }
    
    res.status(201).json({
      success: true,
      data: {
        fileId: fileRecord._id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        fileType: fileRecord.fileType,
        fileSize: fileRecord.fileSize,
        formattedSize: fileRecord.formattedSize,
        uploadedAt: fileRecord.uploadedAt,
        analysisStatus: fileRecord.analysisStatus,
        metadata: fileRecord.metadata
      },
      message: '文件上传成功，分析任务已开始',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('文件上传错误:', error);
    
    // 清理已上传的文件
    if (req.file && req.file.path) {
      const fs = require('fs');
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error('清理文件失败:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: '文件上传失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/files/:fileId
 * @desc 获取文件信息
 * @access Public
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findById(fileId).populate('analysisId');
    
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
    
    res.json({
      success: true,
      data: {
        fileId: file._id,
        filename: file.filename,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        formattedSize: file.formattedSize,
        status: file.status,
        uploadedAt: file.uploadedAt,
        analysisStatus: file.analysisStatus,
        analysisStartedAt: file.analysisStartedAt,
        analysisCompletedAt: file.analysisCompletedAt,
        analysisError: file.analysisError,
        metadata: file.metadata,
        isValid: file.isValid,
        validationErrors: file.validationErrors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取文件信息错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取文件信息失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/files/:fileId/status
 * @desc 获取文件分析状态
 * @access Public
 */
router.get('/:fileId/status', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findById(fileId, 'analysisStatus analysisStartedAt analysisCompletedAt analysisError');
    
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
    
    // 计算分析进度（简单估算）
    let progress = 0;
    if (file.analysisStatus === 'pending') progress = 0;
    else if (file.analysisStatus === 'running') progress = 50;
    else if (file.analysisStatus === 'completed') progress = 100;
    else if (file.analysisStatus === 'failed') progress = 0;
    
    res.json({
      success: true,
      data: {
        fileId: file._id,
        status: file.analysisStatus,
        progress: progress,
        startedAt: file.analysisStartedAt,
        completedAt: file.analysisCompletedAt,
        error: file.analysisError
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取文件状态错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取文件状态失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/files
 * @desc 获取文件列表
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, fileType } = req.query;
    
    // 构建查询条件
    const query = {};
    if (status) query.status = status;
    if (fileType) query.fileType = fileType;
    
    // 分页配置
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { uploadedAt: -1 },
      select: 'filename originalName fileType fileSize status uploadedAt analysisStatus metadata'
    };
    
    const files = await File.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .select(options.select);
    
    const total = await File.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        files: files,
        pagination: {
          current: options.page,
          limit: options.limit,
          total: total,
          pages: Math.ceil(total / options.limit)
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取文件列表错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取文件列表失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route DELETE /api/files/:fileId
 * @desc 删除文件
 * @access Public
 */
router.delete('/:fileId', async (req, res) => {
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
    
    // 删除物理文件
    const fs = require('fs');
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
      logger.info(`删除物理文件: ${file.filePath}`);
    }
    
    // 删除数据库记录
    await File.findByIdAndDelete(fileId);
    
    // 如果有关联的分析记录，也删除
    if (file.analysisId) {
      const Analysis = require('../models/Analysis');
      await Analysis.findByIdAndDelete(file.analysisId);
      logger.info(`删除分析记录: ${file.analysisId}`);
    }
    
    res.json({
      success: true,
      message: '文件删除成功',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('删除文件错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '删除文件失败'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 