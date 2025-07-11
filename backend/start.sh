#!/bin/bash

echo "🔄 正在启动NetInsight后端服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16.0或更高版本"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 检查是否存在package.json
if [ ! -f "package.json" ]; then
    echo "❌ 未找到package.json文件，请确保在正确的目录中运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 创建必要的目录
echo "📁 正在创建必要的目录..."
mkdir -p uploads
mkdir -p data
mkdir -p logs

# 复制环境配置文件（如果不存在）
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        echo "⚙️  正在创建环境配置文件..."
        cp env.example .env
        echo "✅ 已创建.env文件，请根据需要修改配置"
    else
        echo "⚠️  未找到env.example文件，将使用默认配置"
    fi
fi

# 初始化数据库
echo "🗄️  正在初始化数据库..."
node scripts/init-db.js

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

# 启动服务器
echo "🚀 正在启动服务器..."
if [ "$1" = "dev" ]; then
    echo "🔧 开发模式启动..."
    npm run dev
else
    echo "🏭 生产模式启动..."
    npm start
fi 