#!/usr/bin/env python
from app import db, create_app
from app.models.user import User, Role, Permission

def init_db():
    """初始化数据库表结构"""
    app = create_app()
    with app.app_context():
        db.create_all()
        print("数据库表创建完成")
        
        # 初始化权限
        init_permissions()
        
        # 初始化角色
        init_roles()
        
        # 初始化用户
        init_users()
        
        print("数据库初始化完成")

def init_permissions():
    """初始化系统权限"""
    # 定义系统权限
    permissions = [
        # 菜单权限
        {'name': '仪表盘菜单', 'code': 'dashboard.view', 'category': 'menu'},
        {'name': '文件上传菜单', 'code': 'fileupload.view', 'category': 'menu'},
        {'name': '分析报告菜单', 'code': 'reports.view', 'category': 'menu'},
        {'name': '系统设置菜单', 'code': 'settings.view', 'category': 'menu'},
        
        # 操作权限
        {'name': '上传文件', 'code': 'file.upload', 'category': 'action'},
        {'name': '删除文件', 'code': 'file.delete', 'category': 'action'},
        {'name': '查看报告', 'code': 'report.view', 'category': 'action'},
        {'name': '管理用户', 'code': 'user.manage', 'category': 'action'},
        {'name': '管理角色', 'code': 'role.manage', 'category': 'action'},
    ]
    
    # 添加权限到数据库
    for perm_data in permissions:
        # 检查权限是否已存在
        existing = Permission.query.filter_by(code=perm_data['code']).first()
        if not existing:
            permission = Permission(
                name=perm_data['name'],
                code=perm_data['code'],
                category=perm_data['category']
            )
            db.session.add(permission)
    
    db.session.commit()
    print("权限初始化完成")

def init_roles():
    """初始化系统角色"""
    # 获取所有权限
    all_permissions = Permission.query.all()
    menu_permissions = Permission.query.filter_by(category='menu').all()
    dashboard_permission = Permission.query.filter_by(code='dashboard.view').first()
    
    # 定义角色及其权限
    roles = [
        {
            'name': '管理员',
            'description': '系统管理员，拥有所有权限',
            'permissions': all_permissions,
            'is_system': True
        },
        {
            'name': '分析师',
            'description': '可以上传文件和查看分析报告',
            'permissions': Permission.query.filter(
                Permission.code.in_(['dashboard.view', 'fileupload.view', 'reports.view', 'file.upload', 'file.delete', 'report.view'])
            ).all(),
            'is_system': True
        },
        {
            'name': '普通用户',
            'description': '只能查看仪表盘',
            'permissions': [dashboard_permission],
            'is_system': True
        }
    ]
    
    # 添加角色到数据库
    for role_data in roles:
        # 检查角色是否已存在
        existing = Role.query.filter_by(name=role_data['name']).first()
        if not existing:
            role = Role(
                name=role_data['name'],
                description=role_data['description'],
                is_system=role_data['is_system']
            )
            role.permissions = role_data['permissions']
            db.session.add(role)
    
    db.session.commit()
    print("角色初始化完成")

def init_users():
    """初始化预设用户"""
    # 获取角色
    admin_role = Role.query.filter_by(name='管理员').first()
    analyst_role = Role.query.filter_by(name='分析师').first()
    user_role = Role.query.filter_by(name='普通用户').first()
    
    # 预设用户列表
    preset_users = [
        {
            'email': 'admin@example.com',
            'password': 'admin123',
            'name': '管理员用户',
            'role_id': admin_role.id if admin_role else None
        },
        {
            'email': 'analyst@example.com',
            'password': 'analyst123',
            'name': '分析师用户',
            'role_id': analyst_role.id if analyst_role else None
        },
        {
            'email': 'user@example.com',
            'password': 'user123',
            'name': '普通用户',
            'role_id': user_role.id if user_role else None
        }
    ]
    
    # 添加用户到数据库
    for user_data in preset_users:
        # 检查用户是否已存在
        existing = User.query.filter_by(email=user_data['email']).first()
        if not existing and user_data['role_id']:
            # 根据User的实际构造函数调整创建方式
            try:
                user = User(
                    email=user_data['email'],
                    password=user_data['password'],  # 如果构造函数直接接受password
                    name=user_data['name'],
                    role_id=user_data['role_id']
                )
                db.session.add(user)
            except TypeError:
                # 如果上面的方式失败，尝试另一种方式（先创建再设置密码）
                user = User(
                    email=user_data['email'],
                    name=user_data['name'],
                    role_id=user_data['role_id']
                )
                user.set_password(user_data['password'])
                db.session.add(user)
    
    db.session.commit()
    print("用户初始化完成")

if __name__ == "__main__":
    init_db() 