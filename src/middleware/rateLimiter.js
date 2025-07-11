const { RateLimiterMemory } = require('rate-limiter-flexible');
const { logger } = require('../utils/logger');

// 基础API速率限制
const rateLimiter = new RateLimiterMemory({
  points: 100, // 100个请求
  duration: 60, // 每60秒
  blockDuration: 60, // 阻塞60秒
});

// 文件上传专用速率限制
const fileUploadLimiter = new RateLimiterMemory({
  points: 10, // 10个文件
  duration: 3600, // 每小时
  blockDuration: 3600, // 阻塞1小时
});

// 数据分析专用速率限制
const analysisLimiter = new RateLimiterMemory({
  points: 5, // 5个分析任务
  duration: 300, // 每5分钟
  blockDuration: 300, // 阻塞5分钟
});

const createRateLimitMiddleware = (limiter, errorMessage) => {
  return async (req, res, next) => {
    try {
      const key = req.ip; // 使用IP作为限制键
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints;
      const msBeforeNext = rejRes.msBeforeNext;

      logger.warn(`速率限制触发: IP ${req.ip}, 剩余: ${remainingPoints}, 重置时间: ${msBeforeNext}ms`);

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: errorMessage || '请求频率过高，请稍后再试'
        },
        retryAfter: Math.round(msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = {
  rateLimiter: createRateLimitMiddleware(rateLimiter),
  fileUploadLimiter: createRateLimitMiddleware(fileUploadLimiter, '文件上传频率过高，请稍后再试'),
  analysisLimiter: createRateLimitMiddleware(analysisLimiter, '分析请求频率过高，请稍后再试')
}; 