# NetInsight Backend API

NetInsight网络数据分析平台的后端API服务。

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装和启动

#### 方法1: 使用启动脚本（推荐）
```bash
# 开发模式
chmod +x start.sh
./start.sh dev

# 生产模式
./start.sh
```

#### 方法2: 手动启动
```bash
# 1. 安装依赖
npm install

# 2. 创建环境配置
cp env.example .env

# 3. 初始化数据库
node scripts/init-db.js

# 4. 启动服务
npm start          # 生产模式
npm run dev        # 开发模式
```

## 📋 API 文档

### 认证相关 `/api/auth`

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 获取用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 文件管理 `/api/files`

#### 上传文件
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [pcap/har文件]
```

#### 获取文件列表
```http
GET /api/files?page=1&limit=20&status=completed&fileType=.pcap
Authorization: Bearer <token>
```

#### 获取文件详情
```http
GET /api/files/:fileId
Authorization: Bearer <token>
```

#### 下载文件
```http
GET /api/files/:fileId/download
Authorization: Bearer <token>
```

### 分析功能 `/api/analysis`

#### 开始分析
```http
POST /api/analysis/start/:fileId
Authorization: Bearer <token>
```

#### 获取分析结果
```http
GET /api/analysis/:analysisId
Authorization: Bearer <token>
```

### 项目管理 `/api/projects`

#### 创建项目
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "项目名称",
  "description": "项目描述",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

#### 获取项目列表
```http
GET /api/projects
Authorization: Bearer <token>
```

### 仪表板数据 `/api/dashboard`

#### 获取概览数据
```http
GET /api/dashboard/overview
Authorization: Bearer <token>
```

#### 获取性能指标
```http
GET /api/dashboard/metrics
Authorization: Bearer <token>
```

## 🗄️ 数据库结构

### 核心表
- `users` - 用户信息
- `files` - 文件记录
- `analysis_results` - 分析结果
- `projects` - 项目信息
- `project_members` - 项目成员
- `project_files` - 项目文件关联
- `user_sessions` - 用户会话
- `system_logs` - 系统日志

## ⚙️ 配置说明

### 环境变量
```bash
# 服务器配置
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT配置
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# 文件配置
MAX_FILE_SIZE=104857600  # 100MB
UPLOAD_DIR=./uploads
```

## 🔒 安全特性

- JWT身份认证
- 密码bcrypt加密
- 请求限流
- 文件类型验证
- SQL注入防护
- XSS防护（Helmet）

## 📊 监控和日志

- 操作日志记录
- 错误日志
- 性能监控
- 健康检查端点：`GET /health`

## 🚧 开发状态

### ✅ 已完成
- 用户认证系统
- 文件上传管理
- 基础分析功能（模拟数据）
- 项目管理
- 仪表板数据
- 系统日志

### 🔄 开发中
- PCAP解析引擎集成
- 高级分析算法
- 实时通知
- 缓存优化

### ⏳ 计划中
- 微服务架构
- 消息队列
- 高级安全特性
- API版本控制

## 🐛 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查data目录权限
   - 确保SQLite3正确安装

2. **文件上传失败**
   - 检查uploads目录权限
   - 确认文件大小限制

3. **JWT认证失败**
   - 检查JWT_SECRET配置
   - 确认token格式正确

### 日志查看
```bash
# 查看应用日志
npm run logs

# 查看错误日志
tail -f logs/error.log
```

## 📞 技术支持

如有问题，请查看：
1. 系统日志
2. API响应错误信息
3. 健康检查状态

---

**NetInsight Backend v1.0** - 企业级网络数据分析平台后端服务 