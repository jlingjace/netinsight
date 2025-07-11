const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// 配置multer文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pcap', '.pcapng', '.har'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${fileExt}. 支持的类型: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // 最多10个文件
  }
});

// 上传文件
router.post('/upload', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const db = getDatabase();
    const uploadedFiles = [];

    for (const file of req.files) {
      // 保存文件信息到数据库
      const result = await db.run(
        `INSERT INTO files (user_id, original_name, file_name, file_path, file_type, file_size, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId,
          file.originalname,
          file.filename,
          file.path,
          path.extname(file.originalname).toLowerCase(),
          file.size,
          'uploaded'
        ]
      );

      uploadedFiles.push({
        id: result.id,
        originalName: file.originalname,
        fileName: file.filename,
        fileType: path.extname(file.originalname).toLowerCase(),
        fileSize: file.size,
        status: 'uploaded'
      });

      // 记录日志
      await logAction(req.user.userId, 'file_upload', 'file', result.id, {
        originalName: file.originalname,
        fileSize: file.size,
        fileType: path.extname(file.originalname).toLowerCase()
      }, req.ip, req.get('User-Agent'));
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // 清理已上传的文件
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to cleanup file:', unlinkError);
        }
      }
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds the maximum limit of 100MB'
      });
    }

    res.status(500).json({
      error: 'File upload failed',
      message: error.message || 'An error occurred during file upload'
    });
  }
});

// 批量上传文件
router.post('/batch-upload', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: '没有上传文件'
      });
    }

    const db = getDatabase();
    const uploadedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // 验证文件类型
        const allowedTypes = ['.pcap', '.pcapng', '.har'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
          errors.push({
            filename: file.originalname,
            error: '不支持的文件类型'
          });
          continue;
        }

        // 保存文件记录到数据库
        const result = await db.run(
          `INSERT INTO files (
            user_id, original_name, file_path, file_type, file_size, 
            status, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            req.user.userId,
            file.originalname,
            file.path,
            fileExtension.substring(1), // 去掉点号
            file.size,
            'uploaded'
          ]
        );

        uploadedFiles.push({
          id: result.lastID,
          original_name: file.originalname,
          file_type: fileExtension.substring(1),
          file_size: file.size,
          status: 'uploaded'
        });

        await logAction(req.user.userId, 'file.upload', {
          fileId: result.lastID,
          fileName: file.originalname,
          fileSize: file.size
        });

      } catch (error) {
        console.error(`处理文件 ${file.originalname} 失败:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: req.files.length,
        success: uploadedFiles.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('批量上传错误:', error);
    res.status(500).json({
      error: 'Batch upload failed',
      message: '批量上传失败'
    });
  }
});

// 批量删除文件
router.post('/batch-delete', authMiddleware, async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid file IDs',
        message: '无效的文件ID列表'
      });
    }

    const db = getDatabase();
    const deletedFiles = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        // 检查文件是否存在且属于当前用户
        const file = await db.get(
          'SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = "admin")',
          [fileId, req.user.userId, req.user.role]
        );

        if (!file) {
          errors.push({
            fileId,
            error: '文件不存在或无权限删除'
          });
          continue;
        }

        // 删除物理文件
        if (file.file_path && fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }

        // 删除数据库记录
        await db.run('DELETE FROM files WHERE id = ?', [fileId]);

        // 删除相关的分析结果
        await db.run('DELETE FROM analysis_results WHERE file_id = ?', [fileId]);

        deletedFiles.push({
          id: fileId,
          original_name: file.original_name
        });

        await logAction(req.user.userId, 'file.delete', {
          fileId,
          fileName: file.original_name
        });

      } catch (error) {
        console.error(`删除文件 ${fileId} 失败:`, error);
        errors.push({
          fileId,
          error: error.message
        });
      }
    }

    res.json({
      message: `成功删除 ${deletedFiles.length} 个文件`,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: fileIds.length,
        success: deletedFiles.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('批量删除错误:', error);
    res.status(500).json({
      error: 'Batch delete failed',
      message: '批量删除失败'
    });
  }
});

// 批量下载文件
router.post('/batch-download', authMiddleware, async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid file IDs',
        message: '无效的文件ID列表'
      });
    }

    const db = getDatabase();
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="batch_files_${Date.now()}.zip"`);

    archive.pipe(res);

    let addedFiles = 0;

    for (const fileId of fileIds) {
      try {
        // 检查文件权限
        const file = await db.get(
          'SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = "admin")',
          [fileId, req.user.userId, req.user.role]
        );

        if (!file || !file.file_path || !fs.existsSync(file.file_path)) {
          continue;
        }

        // 添加文件到压缩包
        archive.file(file.file_path, { name: file.original_name });
        addedFiles++;

      } catch (error) {
        console.error(`处理文件 ${fileId} 失败:`, error);
      }
    }

    if (addedFiles === 0) {
      return res.status(404).json({
        error: 'No files found',
        message: '没有找到可下载的文件'
      });
    }

    await logAction(req.user.userId, 'file.batch_download', {
      fileIds,
      fileCount: addedFiles
    });

    archive.finalize();

  } catch (error) {
    console.error('批量下载错误:', error);
    res.status(500).json({
      error: 'Batch download failed',
      message: '批量下载失败'
    });
  }
});

// 获取批量操作状态
router.get('/batch-status/:batchId', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // 这里可以实现批量操作状态的跟踪
    // 目前返回模拟数据
    res.json({
      batchId,
      status: 'completed',
      progress: 100,
      total: 0,
      completed: 0,
      failed: 0,
      message: '批量操作已完成'
    });

  } catch (error) {
    console.error('获取批量状态错误:', error);
    res.status(500).json({
      error: 'Failed to get batch status',
      message: '获取批量状态失败'
    });
  }
});

// 获取用户文件列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    // 查询参数
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const fileType = req.query.fileType;

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (fileType) {
      whereClause += ' AND file_type = ?';
      params.push(fileType);
    }

    // 获取文件列表
    const files = await db.all(
      `SELECT id, original_name, file_name, file_type, file_size, status, 
              error_message, uploaded_at, processed_at
       FROM files 
       ${whereClause}
       ORDER BY uploaded_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 获取总数
    const totalResult = await db.get(
      `SELECT COUNT(*) as total FROM files ${whereClause}`,
      params
    );

    res.json({
      files: files,
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      error: 'Failed to get files',
      message: 'An error occurred while retrieving files'
    });
  }
});

// 获取文件详情
router.get('/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID'
      });
    }

    const db = getDatabase();
    
    const file = await db.get(
      `SELECT * FROM files 
       WHERE id = ? AND user_id = ?`,
      [fileId, req.user.userId]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // 获取分析结果
    const analysisResults = await db.all(
      `SELECT analysis_type, summary_data, created_at
       FROM analysis_results 
       WHERE file_id = ?
       ORDER BY created_at DESC`,
      [fileId]
    );

    res.json({
      file: {
        ...file,
        analysisResults: analysisResults.map(result => ({
          ...result,
          summary_data: result.summary_data ? JSON.parse(result.summary_data) : null
        }))
      }
    });

  } catch (error) {
    console.error('Get file details error:', error);
    res.status(500).json({
      error: 'Failed to get file details'
    });
  }
});

// 删除文件
router.delete('/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID'
      });
    }

    const db = getDatabase();
    
    // 获取文件信息
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.userId]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // 删除物理文件
    try {
      await fs.unlink(file.file_path);
    } catch (unlinkError) {
      console.warn('Failed to delete physical file:', unlinkError);
    }

    // 删除数据库记录（会级联删除相关的分析结果）
    await db.run('DELETE FROM files WHERE id = ?', [fileId]);

    // 记录日志
    await logAction(req.user.userId, 'file_delete', 'file', fileId, {
      originalName: file.original_name,
      fileSize: file.file_size
    }, req.ip, req.get('User-Agent'));

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file'
    });
  }
});

// 批量删除文件
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid file IDs',
        message: 'Please provide an array of file IDs'
      });
    }

    const db = getDatabase();
    const deletedFiles = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        const file = await db.get(
          'SELECT * FROM files WHERE id = ? AND user_id = ?',
          [fileId, req.user.userId]
        );

        if (file) {
          // 删除物理文件
          try {
            await fs.unlink(file.file_path);
          } catch (unlinkError) {
            console.warn(`Failed to delete physical file ${file.file_path}:`, unlinkError);
          }

          // 删除数据库记录
          await db.run('DELETE FROM files WHERE id = ?', [fileId]);
          
          deletedFiles.push({
            id: fileId,
            originalName: file.original_name
          });

          // 记录日志
          await logAction(req.user.userId, 'file_delete', 'file', fileId, {
            originalName: file.original_name,
            fileSize: file.file_size,
            batchOperation: true
          }, req.ip, req.get('User-Agent'));
        } else {
          errors.push({
            id: fileId,
            error: 'File not found'
          });
        }
      } catch (error) {
        errors.push({
          id: fileId,
          error: error.message
        });
      }
    }

    res.json({
      message: `Successfully deleted ${deletedFiles.length} files`,
      deletedFiles: deletedFiles,
      errors: errors
    });

  } catch (error) {
    console.error('Batch delete files error:', error);
    res.status(500).json({
      error: 'Failed to delete files'
    });
  }
});

// 下载文件
router.get('/:fileId/download', authMiddleware, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID'
      });
    }

    const db = getDatabase();
    
    const file = await db.get(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.userId]
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // 检查文件是否存在
    try {
      await fs.access(file.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'Physical file not found'
      });
    }

    // 记录下载日志
    await logAction(req.user.userId, 'file_download', 'file', fileId, {
      originalName: file.original_name
    }, req.ip, req.get('User-Agent'));

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    res.sendFile(path.resolve(file.file_path));

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      error: 'Failed to download file'
    });
  }
});

// 获取文件统计信息
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = await db.all(
      `SELECT 
         COUNT(*) as total_files,
         SUM(file_size) as total_size,
         file_type,
         status,
         COUNT(*) as count
       FROM files 
       WHERE user_id = ?
       GROUP BY file_type, status`,
      [req.user.userId]
    );

    const summary = {
      totalFiles: 0,
      totalSize: 0,
      byType: {},
      byStatus: {}
    };

    stats.forEach(stat => {
      summary.totalFiles += stat.count;
      summary.totalSize += stat.total_size || 0;
      
      if (!summary.byType[stat.file_type]) {
        summary.byType[stat.file_type] = 0;
      }
      summary.byType[stat.file_type] += stat.count;
      
      if (!summary.byStatus[stat.status]) {
        summary.byStatus[stat.status] = 0;
      }
      summary.byStatus[stat.status] += stat.count;
    });

    res.json(summary);

  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      error: 'Failed to get file statistics'
    });
  }
});

module.exports = router; 