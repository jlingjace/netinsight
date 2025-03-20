import os
from datetime import timedelta

class Config:
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-please-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    # 数据库配置 - 使用SQLite而不是PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'sqlite:///' + os.path.join(os.getcwd(), 'netinsight.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-please-change')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # 文件上传配置
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 标准版最大500MB
    
    # Redis配置 - 设置为可选
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    # Celery配置 - 设置为可选
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' 