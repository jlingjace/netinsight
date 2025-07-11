const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error(err);

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      code: 'VALIDATION_ERROR',
      message: message.join(', ')
    };
    return res.status(400).json({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const message = '资源已存在';
    error = {
      code: 'DUPLICATE_ERROR',
      message
    };
    return res.status(400).json({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = {
      code: 'INVALID_TOKEN',
      message
    };
    return res.status(401).json({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      code: 'FILE_TOO_LARGE',
      message: '文件大小超过限制'
    };
    return res.status(400).json({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      code: 'INVALID_FILE_FIELD',
      message: '无效的文件字段'
    };
    return res.status(400).json({
      success: false,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // 默认服务器错误
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'SERVER_ERROR',
      message: error.message || '服务器内部错误'
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = { errorHandler }; 