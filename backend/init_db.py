from app import create_app, db
from app.models import User

def init_database():
    """初始化数据库并创建测试用户"""
    app = create_app()
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        
        # 检查是否已有管理员用户
        admin = User.query.filter_by(email='admin@example.com').first()
        if not admin:
            # 创建管理员用户
            admin = User(
                email='admin@example.com',
                password='admin123',
                name='管理员',
                role='admin'
            )
            db.session.add(admin)
            
            # 创建测试分析师用户
            analyst = User(
                email='analyst@example.com',
                password='analyst123',
                name='分析师',
                role='analyst'
            )
            db.session.add(analyst)
            
            # 创建普通用户
            user = User(
                email='user@example.com',
                password='user123',
                name='普通用户',
                role='user'
            )
            db.session.add(user)
            
            db.session.commit()
            print("初始用户创建成功！")
        else:
            print("初始用户已存在，无需重新创建")

if __name__ == "__main__":
    init_database() 