from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
import os

# 初始化数据库
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(test_config=None):
    # 创建并配置应用
    app = Flask(__name__, instance_relative_config=True)
    
    if test_config is None:
        # 从配置文件加载配置
        app.config.from_object('config.Config')
    else:
        # 使用测试配置
        app.config.from_mapping(test_config)
    
    # 确保实例文件夹存在
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # 允许跨域请求 - 更新CORS配置
    CORS(app, resources={r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }})
    
    # 注册蓝图
    from .api import api_bp
    from .auth import auth_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
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