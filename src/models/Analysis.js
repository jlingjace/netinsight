const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  // 关联文件
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: [true, '文件ID不能为空']
  },

  // 分析状态
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  
  // 时间信息
  startedAt: Date,
  completedAt: Date,
  duration: Number, // 分析耗时（毫秒）

  // 错误信息
  error: {
    code: String,
    message: String,
    details: String
  },

  // 分析结果
  results: {
    // 基础统计
    summary: {
      totalPackets: Number,
      totalBytes: Number,
      duration: Number, // 数据包时长（秒）
      avgPacketSize: Number,
      packetsPerSecond: Number
    },

    // 协议分析
    protocols: [{
      name: String,
      packets: Number,
      bytes: Number,
      percentage: Number
    }],

    // 网络层分析
    network: {
      ipv4Packets: Number,
      ipv6Packets: Number,
      topSources: [{
        ip: String,
        packets: Number,
        bytes: Number
      }],
      topDestinations: [{
        ip: String,
        packets: Number,
        bytes: Number
      }]
    },

    // 传输层分析
    transport: {
      tcpPackets: Number,
      udpPackets: Number,
      icmpPackets: Number,
      topPorts: [{
        port: Number,
        protocol: String,
        packets: Number,
        bytes: Number
      }]
    },

    // 时间分析 - 第二阶段核心功能
    temporal: {
      startTime: Date,
      endTime: Date,
      duration: Number,
      bucketSize: Number,
      peakTrafficTime: Date,
      peakTrafficRate: Number, // bytes/sec
      timeDistribution: [{
        timestamp: Date,
        packets: Number,
        bytes: Number,
        rate: Number,
        protocols: mongoose.Schema.Types.Mixed
      }],
      trafficTimeline: [{
        timestamp: Date,
        packets: Number,
        bytes: Number,
        rate: Number
      }],
      protocolTimeline: mongoose.Schema.Types.Mixed,
      trafficEvents: [mongoose.Schema.Types.Mixed]
    },

    // 性能指标
    performance: {
      avgLatency: Number,
      minLatency: Number,
      maxLatency: Number,
      jitter: Number,
      packetLoss: Number,
      throughput: Number, // bytes/sec
      retransmissions: Number
    },

    // 异常检测 - 使用更灵活的Schema
    anomalies: [mongoose.Schema.Types.Mixed],

    // 连接分析
    connections: {
      totalConnections: Number,
      activeConnections: Number,
      topConnections: [{
        source: String,
        destination: String,
        port: Number,
        protocol: String,
        packets: Number,
        bytes: Number,
        duration: Number
      }]
    },

    // HTTP会话流重建 - 杀手级功能
    http_sessions: {
      total_sessions: Number,
      summary: {
        unique_hosts: Number,
        methods: [String],
        status_codes: [Number]
      },
      sessions: [mongoose.Schema.Types.Mixed]
    },

    // 智能诊断引擎
    smart_insights: {
      overall_health: {
        type: String,
        enum: ['good', 'warning', 'critical'],
        default: 'good'
      },
      performance_issues: [mongoose.Schema.Types.Mixed],
      security_concerns: [mongoose.Schema.Types.Mixed],
      optimization_suggestions: [mongoose.Schema.Types.Mixed],
      error_patterns: [mongoose.Schema.Types.Mixed]
    }
  },

  // 分析配置
  config: {
    analysisType: {
      type: String,
      enum: ['basic', 'detailed', 'security'],
      default: 'basic'
    },
    options: {
      includePayload: { type: Boolean, default: false },
      detectAnomalies: { type: Boolean, default: true },
      performanceAnalysis: { type: Boolean, default: true }
    }
  },

  // 报告生成状态
  reportStatus: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  reportPath: String,
  reportGeneratedAt: Date
}, {
  timestamps: true,
  strict: false, // 允许保存Schema中未定义的字段
  strictQuery: false
});

// 索引优化
analysisSchema.index({ fileId: 1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ createdAt: -1 });

// 虚拟字段：分析耗时格式化
analysisSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return 'N/A';
  
  const seconds = Math.floor(this.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  }
  return `${seconds}秒`;
});

// 实例方法：更新分析状态
analysisSchema.methods.updateStatus = function(status, error = null) {
  this.status = status;
  
  if (status === 'running' && !this.startedAt) {
    this.startedAt = new Date();
  }
  
  if (status === 'completed' || status === 'failed') {
    this.completedAt = new Date();
    if (this.startedAt) {
      this.duration = this.completedAt - this.startedAt;
    }
    
    if (error) {
      this.error = error;
    }
  }
  
  return this.save();
};

// 实例方法：添加异常检测结果
analysisSchema.methods.addAnomaly = function(type, severity, description, details = {}) {
  if (!this.results.anomalies) {
    this.results.anomalies = [];
  }
  
  this.results.anomalies.push({
    type,
    severity,
    description,
    timestamp: new Date(),
    details
  });
  
  return this.save();
};

// 静态方法：获取分析统计
analysisSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Analysis', analysisSchema); 