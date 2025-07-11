#!/bin/bash

echo "🚀 启动 NetInsight 前端项目..."
echo "📁 项目目录: $(pwd)"
echo "⏰ 启动时间: $(date)"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 启动开发服务器
echo "🌐 启动开发服务器..."
echo "📍 访问地址: http://localhost:3000"
echo "🛑 停止服务: Ctrl+C"
echo ""

npm start 