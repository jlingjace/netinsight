# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 安装Python和pip
RUN apk add --no-cache python3 py3-pip python3-dev curl

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装Node.js依赖
RUN npm ci --only=production

# 创建Python虚拟环境并安装Python依赖
COPY requirements.txt ./
RUN python3 -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# 确保虚拟环境在所有后续命令中都被激活
ENV PATH="/opt/venv/bin:$PATH"

# 复制应用代码
COPY src/ ./src/
COPY public/ ./public/
COPY analysis-scripts/ ./analysis-scripts/

# 创建必要的目录
RUN mkdir -p uploads logs

# 设置权限
RUN chmod +x analysis-scripts/*.py

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"] 