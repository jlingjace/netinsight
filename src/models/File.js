const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  // 文件基本信息
  filename: {
    type: String,
    required: [true, '文件名不能为空']
  },
  originalName: {
    type: String,
    required: [true, '原始文件名不能为空']
  },
  fileType: {
    type: String,
    required: [true, '文件类型不能为空'],
    enum: ['pcap', 'cap', 'har', 'pcapng'],
    lowercase: true
  },
  fileSize: {
    type: Number,
    required: [true, '文件大小不能为空']
  },
  filePath: {
    type: String,
    required: [true, '文件路径不能为空']
  },
  fileHash: {
    type: String,
    required: [true, '文件哈希不能为空'],
    unique: true
  },

  // 文件状态
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },

  // 上传信息
  uploadedBy: {
    type: String,
    default: 'anonymous' // 临时使用，后续会接入用户系统
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  clientIP: {
    type: String
  },

  // 文件验证信息
  isValid: {
    type: Boolean,
    default: false
  },
  validationErrors: [{
    type: String
  }],

  // 分析相关
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  },
  analysisStatus: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  analysisStartedAt: Date,
  analysisCompletedAt: Date,
  analysisError: String,

  // 元数据
  metadata: {
    packets: Number,
    duration: Number,
    protocols: [String],
    size: Number
  }
}, {
  timestamps: true
});

// 索引优化
fileSchema.index({ fileHash: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ uploadedAt: -1 });
fileSchema.index({ analysisStatus: 1 });

// 虚拟字段：文件大小格式化
fileSchema.virtual('formattedSize').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.fileSize === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// 实例方法：更新分析状态
fileSchema.methods.updateAnalysisStatus = function(status, error = null) {
  this.analysisStatus = status;
  if (status === 'running' && !this.analysisStartedAt) {
    this.analysisStartedAt = new Date();
  }
  if (status === 'completed' || status === 'failed') {
    this.analysisCompletedAt = new Date();
    if (error) {
      this.analysisError = error;
    }
  }
  return this.save();
};

// 静态方法：根据哈希查找文件
fileSchema.statics.findByHash = function(hash) {
  return this.findOne({ fileHash: hash });
};

// 静态方法：获取统计信息
fileSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
        fileTypes: { $addToSet: '$fileType' }
      }
    }
  ]);
};

module.exports = mongoose.model('File', fileSchema); 