from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
import os
import logging
from datetime import timedelta

# 初始化数据库
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()

def configure_logging(app):
    """配置日志系统"""
    if not app.debug:
        # 设置日志级别
        app.logger.setLevel(logging.INFO)
        
        # 创建处理器
        file_handler = logging.FileHandler(os.path.join(app.instance_path, 'app.log'))
        file_handler.setLevel(logging.INFO)
        
        # 设置日志格式
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        
        # 添加处理器到应用日志器
        app.logger.addHandler(file_handler)

def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)
    
    # 确保实例文件夹存在
    try:
        os.makedirs(app.instance_path, exist_ok=True)
        os.makedirs(os.path.join(app.instance_path, 'uploads'), exist_ok=True)
        os.makedirs(os.path.join(app.instance_path, 'uploads', 'keys'), exist_ok=True)
    except OSError:
        pass
    
    # 加载配置
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key'),
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'app.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY', 'jwt_dev_key'),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=1),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
        UPLOAD_FOLDER=os.path.join(app.instance_path, 'uploads')
    )
    
    # 配置日志
    configure_logging(app)
    
    # 设置文件上传配置
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
    
    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # 配置CORS，正确处理预检请求
    cors.init_app(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)
    
    # 为OPTIONS请求添加处理
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    # 禁用自动重定向，直接处理斜杠缺失的请求
    app.url_map.strict_slashes = False
    
    # 注册认证相关蓝图
    from .auth import auth_bp
    app.register_blueprint(auth_bp)
    
    # 注册文件上传相关蓝图
    from .api.uploads import uploads_bp
    app.register_blueprint(uploads_bp)
    
    # 注册报告相关蓝图
    from .api.reports import reports_bp
    app.register_blueprint(reports_bp)
    
    @app.route('/healthcheck')
    def healthcheck():
        return {'status': 'ok'}
    
    # 添加错误处理
    @app.errorhandler(500)
    def handle_500(error):
        app.logger.error(f"500 error: {error}")
        return {"message": "服务器内部错误"}, 500
    
    @app.errorhandler(404)
    def handle_404(error):
        return {"message": "资源不存在"}, 404
    
    @app.errorhandler(403)
    def handle_403(error):
        return {"message": "没有权限访问此资源"}, 403
    
    return app 