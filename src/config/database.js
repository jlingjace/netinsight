const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`📊 MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    logger.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 监听连接事件
mongoose.connection.on('connected', () => {
  logger.info('📊 MongoDB 连接已建立');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB 连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB 连接已断开');
});

module.exports = { connectDB }; 