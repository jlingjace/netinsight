# NetInsight - 网络检测分析平台

NetInsight是一个基于前后端架构的网络检测分析平台，支持用户上传HAR文件和TCPdump生成的pcap文件，通过后端数据分析引擎生成多维度的网络环境报告，帮助用户和网络管理员快速识别网络性能瓶颈、安全威胁及流量模式问题。

## 项目功能

- **多协议支持**：兼容 HAR（HTTP 流量）和 pcap（全流量）文件
- **智能分析**：自动识别网络延迟、丢包、异常请求、安全威胁
- **可视化报告**：交互式图表展示流量分布、性能指标、安全事件
- **角色化视图**：为不同角色提供定制化分析视角（如性能/安全/运维）
- **问题自动定位**：智能推荐可能的问题根因和解决方案
- **权限管理**：基于角色的权限管理，精细控制用户访问权限

## 技术栈

- **前端**：React + TypeScript + Ant Design Pro
- **后端**：Python Flask + Celery（异步任务处理）
- **数据库**：SQLite/PostgreSQL + Redis + InfluxDB
- **文件解析**：内置JSON解析引擎 + Scapy/tshark

## 项目结构

```
/
├── frontend/              // 前端React应用
│   ├── public/            // 静态资源
│   └── src/               // 源代码
│       ├── components/    // 组件
│       ├── pages/         // 页面
│       ├── services/      // API服务
│       ├── utils/         // 工具函数
│       └── App.tsx        // 主应用
├── backend/               // 后端Flask应用
│   ├── app/               // 应用代码
│   │   ├── api/           // API路由
│   │   ├── auth/          // 认证模块
│   │   ├── models/        // 数据模型
│   │   ├── services/      // 业务逻辑
│   │   └── utils/         // 工具函数
│   ├── config/            // 配置文件
│   └── tests/             // 测试代码
├── docs/                  // 文档
├── proto/                 // 原型设计
└── docker/                // Docker配置
```

## 开发指南

### 环境配置

1. 安装Node.js和npm
2. 安装Python 3.8+和pip
3. 安装SQLite或PostgreSQL和Redis

### 启动前端

```bash
cd frontend
npm install
npm start
```

### 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py  # 初始化数据库和测试用户
python wsgi.py
```

## 功能模块

- **用户认证**：注册、登录、密码重置
- **文件上传**：支持HAR和pcap文件上传
- **数据分析**：流量统计、性能指标、安全检测
- **报告生成**：交互式仪表盘、自定义报告
- **用户管理**：角色权限、团队协作
- **权限控制**：基于角色的访问控制，精细权限配置
- **告警通知**：异常检测、通知渠道

## 开发进度

### 已完成的功能
- [x] 用户认证模块（登录、注册、密码重置）
- [x] 仪表盘基础功能
- [x] 文件上传基础功能
- [x] 数据分析引擎初版
- [x] 成员管理模块（成员添加、角色分配、密码重置）
- [x] 角色权限管理模块（自定义角色、权限配置、访问控制）

### 正在开发的功能
- [ ] 数据可视化报表功能
- [ ] 高级分析引擎优化
- [ ] 告警系统
- [ ] 数据导出功能

### 测试账号

系统已预置以下测试账号：

- 管理员: `admin@example.com` / `admin123`
- 分析师: `analyst@example.com` / `analyst123` 
- 普通用户: `user@example.com` / `user123`

### 访问权限说明

系统实现了基于角色的权限管理：

- **管理员**：拥有所有功能的访问和操作权限
- **分析师**：可以访问仪表盘、文件上传和报告分析功能
- **普通用户**：只能访问仪表盘功能

管理员可以通过角色权限管理功能，创建自定义角色并分配具体权限，实现更精细的权限控制。

### 进行中功能

- [ ] 文件上传功能
- [ ] 网络分析报告展示
- [ ] 数据可视化和图表展示

### 计划功能

- [ ] 团队协作功能
- [ ] 告警和通知系统
- [ ] 数据导出
- [ ] 移动端适配

## 问题排查

如遇到问题，请检查：

1. 确保前后端服务均已启动
2. 检查浏览器控制台是否有错误信息
3. 后端服务日志中是否有异常记录
4. 数据库连接是否正常

## 贡献指南

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request 