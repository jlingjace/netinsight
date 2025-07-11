const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`创建上传目录: ${uploadDir}`);
}

// 支持的文件类型
const allowedFileTypes = {
  'pcap': ['application/vnd.tcpdump.pcap', 'application/octet-stream'],
  'cap': ['application/vnd.tcpdump.pcap', 'application/octet-stream'],
  'pcapng': ['application/vnd.tcpdump.pcap', 'application/octet-stream'],
  'har': ['application/json', 'text/json']
};

// 文件存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按日期创建子目录
    const dateDir = new Date().toISOString().slice(0, 10);
    const fullPath = path.join(uploadDir, dateDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名: timestamp_randomhash.extension
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}_${randomHash}${ext}`;
    
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mimeType = file.mimetype;
    
    logger.info(`文件上传检查: ${file.originalname}, 类型: ${mimeType}, 扩展名: ${ext}`);
    
    // 检查文件扩展名
    if (!allowedFileTypes[ext]) {
      return cb(new Error(`不支持的文件类型: ${ext}。支持的类型: ${Object.keys(allowedFileTypes).join(', ')}`), false);
    }
    
    // 检查MIME类型（宽松检查，因为网络文件的MIME类型可能不准确）
    const allowedMimes = allowedFileTypes[ext];
    if (!allowedMimes.includes(mimeType)) {
      logger.warn(`MIME类型不匹配: 期望 ${allowedMimes.join(' 或 ')}, 实际 ${mimeType}`);
      // 仍然允许通过，但会在后续验证中进行更严格的检查
    }
    
    cb(null, true);
  } catch (error) {
    logger.error('文件过滤器错误:', error);
    cb(error, false);
  }
};

// 文件大小限制
const getFileSizeLimit = (req) => {
  // 暂时移除文件大小限制，等订阅功能完成后再添加
  // TODO: 根据用户订阅计划设置不同的文件大小限制
  return parseInt(process.env.MAX_FILE_SIZE) || 1073741824; // 暂时设置为1GB
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: getFileSizeLimit(),
    files: 1 // 一次只允许上传一个文件
  }
});

// 文件验证中间件
const validateFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '请选择要上传的文件'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    
    // 基础文件验证
    const validation = await validateNetworkFile(file.path, ext);
    
    if (!validation.isValid) {
      // 删除无效文件
      fs.unlink(file.path, (err) => {
        if (err) logger.error('删除无效文件失败:', err);
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: '文件验证失败',
          details: validation.errors
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // 添加验证结果到请求对象
    req.fileValidation = validation;
    next();
    
  } catch (error) {
    logger.error('文件验证错误:', error);
    
    // 清理文件
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error('清理文件失败:', err);
      });
    }
    
    next(error);
  }
};

// 网络文件验证函数
const validateNetworkFile = async (filePath, fileType) => {
  const validation = {
    isValid: false,
    errors: [],
    metadata: {}
  };
  
  try {
    const stats = fs.statSync(filePath);
    validation.metadata.size = stats.size;
    
    // 检查文件是否为空
    if (stats.size === 0) {
      validation.errors.push('文件为空');
      return validation;
    }
    
    // 检查文件大小是否合理（最小1KB）
    if (stats.size < 1024) {
      validation.errors.push('文件太小，可能不是有效的网络抓包文件');
      return validation;
    }
    
    // 根据文件类型进行特定验证
    switch (fileType) {
      case 'pcap':
      case 'cap':
      case 'pcapng':
        await validatePcapFile(filePath, validation);
        break;
      case 'har':
        await validateHarFile(filePath, validation);
        break;
      default:
        validation.errors.push(`不支持的文件类型: ${fileType}`);
    }
    
    // 如果没有错误，则文件有效
    validation.isValid = validation.errors.length === 0;
    
  } catch (error) {
    logger.error('文件验证异常:', error);
    validation.errors.push(`文件验证失败: ${error.message}`);
  }
  
  return validation;
};

// PCAP文件验证
const validatePcapFile = async (filePath, validation) => {
  try {
    const buffer = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    
    // 检查PCAP魔数
    const magic = buffer.readUInt32LE(0);
    const magicBE = buffer.readUInt32BE(0);
    
    if (magic === 0xA1B2C3D4 || magic === 0xD4C3B2A1 || 
        magicBE === 0xA1B2C3D4 || magicBE === 0xD4C3B2A1) {
      validation.metadata.format = 'pcap';
      validation.metadata.version = `${buffer.readUInt16LE(4)}.${buffer.readUInt16LE(6)}`;
    } else if (magic === 0x0A0D0D0A) {
      // PCAPNG 格式
      validation.metadata.format = 'pcapng';
    } else {
      validation.errors.push('不是有效的PCAP文件格式');
    }
    
  } catch (error) {
    validation.errors.push(`PCAP文件验证失败: ${error.message}`);
  }
};

// HAR文件验证
const validateHarFile = async (filePath, validation) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const har = JSON.parse(content);
    
    // 检查HAR格式
    if (!har.log || !har.log.version || !har.log.entries) {
      validation.errors.push('不是有效的HAR文件格式');
      return;
    }
    
    validation.metadata.format = 'har';
    validation.metadata.version = har.log.version;
    validation.metadata.entries = har.log.entries.length;
    
    // 检查是否有有效的网络请求
    if (har.log.entries.length === 0) {
      validation.errors.push('HAR文件中没有网络请求记录');
    }
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      validation.errors.push('HAR文件JSON格式错误');
    } else {
      validation.errors.push(`HAR文件验证失败: ${error.message}`);
    }
  }
};

// 计算文件哈希
const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

module.exports = {
  upload: upload.single('file'),
  validateFile,
  calculateFileHash,
  validateNetworkFile
}; 