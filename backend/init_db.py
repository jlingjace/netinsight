from app import create_app, db
from app.models.user import User, Role, Permission

app = create_app()

def init_permissions():
    """初始化系统权限"""
    permissions = [
        # 菜单权限
        Permission('仪表盘菜单', 'menu_dashboard', '访问仪表盘菜单的权限', 'menu'),
        Permission('文件上传菜单', 'menu_file_upload', '访问文件上传菜单的权限', 'menu'),
        Permission('分析报告菜单', 'menu_reports', '访问分析报告菜单的权限', 'menu'),
        Permission('系统设置菜单', 'menu_settings', '访问系统设置菜单的权限', 'menu'),
        Permission('成员管理菜单', 'menu_user_management', '访问成员管理菜单的权限', 'menu'),
        Permission('角色权限管理菜单', 'menu_role_management', '访问角色权限管理菜单的权限', 'menu'),
        
        # 操作权限
        Permission('上传文件', 'action_upload_file', '上传文件的权限', 'action'),
        Permission('查看报告', 'action_view_report', '查看分析报告的权限', 'action'),
        Permission('创建报告', 'action_create_report', '创建新分析报告的权限', 'action'),
        Permission('管理用户', 'action_manage_users', '添加/编辑/删除用户的权限', 'action'),
        Permission('管理角色', 'action_manage_roles', '添加/编辑/删除角色的权限', 'action'),
        Permission('系统配置', 'action_system_config', '修改系统配置的权限', 'action'),
    ]
    
    # 检查权限是否存在，不存在则创建
    for permission in permissions:
        existing = Permission.query.filter_by(code=permission.code).first()
        if not existing:
            db.session.add(permission)
    
    db.session.commit()
    return permissions

def init_roles():
    """初始化预定义角色"""
    # 获取权限
    all_permissions = Permission.query.all()
    dashboard_permission = Permission.query.filter_by(code='menu_dashboard').first()
    upload_permission = Permission.query.filter_by(code='menu_file_upload').first()
    reports_permission = Permission.query.filter_by(code='menu_reports').first()
    
    # 创建管理员角色 (拥有所有权限)
    admin_role = Role.query.filter_by(name='管理员').first()
    if not admin_role:
        admin_role = Role('管理员', '系统管理员，拥有所有权限', True)
        admin_role.permissions = all_permissions
        db.session.add(admin_role)
    
    # 创建分析师角色 (可以上传文件和查看报告)
    analyst_role = Role.query.filter_by(name='分析师').first()
    if not analyst_role:
        analyst_role = Role('分析师', '可以上传文件和查看分析报告', True)
        analyst_role.permissions = [
            dashboard_permission,
            upload_permission,
            reports_permission,
            Permission.query.filter_by(code='action_upload_file').first(),
            Permission.query.filter_by(code='action_view_report').first(),
            Permission.query.filter_by(code='action_create_report').first()
        ]
        db.session.add(analyst_role)
    
    # 创建普通用户角色 (只能查看仪表盘)
    user_role = Role.query.filter_by(name='普通用户').first()
    if not user_role:
        user_role = Role('普通用户', '只能查看仪表盘', True)
        user_role.permissions = [dashboard_permission]
        db.session.add(user_role)
    
    db.session.commit()
    return admin_role, analyst_role, user_role

def init_users(admin_role, analyst_role, user_role):
    """初始化预设用户"""
    # 创建 admin 用户
    admin_user = User.query.filter_by(email='admin@example.com').first()
    if not admin_user:
        admin_user = User(
            email='admin@example.com',
            password='admin123',
            name='管理员',
            role='admin',
            role_id=admin_role.id
        )
        db.session.add(admin_user)
    else:
        admin_user.role_id = admin_role.id
    
    # 创建 analyst 用户
    analyst_user = User.query.filter_by(email='analyst@example.com').first()
    if not analyst_user:
        analyst_user = User(
            email='analyst@example.com',
            password='analyst123',
            name='分析师',
            role='analyst',
            role_id=analyst_role.id
        )
        db.session.add(analyst_user)
    else:
        analyst_user.role_id = analyst_role.id
    
    # 创建普通用户
    normal_user = User.query.filter_by(email='user@example.com').first()
    if not normal_user:
        normal_user = User(
            email='user@example.com',
            password='user123',
            name='普通用户',
            role='user',
            role_id=user_role.id
        )
        db.session.add(normal_user)
    else:
        normal_user.role_id = user_role.id
    
    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        # 创建数据库表
        db.create_all()
        
        # 初始化权限
        init_permissions()
        
        # 初始化角色
        admin_role, analyst_role, user_role = init_roles()
        
        # 初始化用户
        init_users(admin_role, analyst_role, user_role)
        
        print("数据库初始化完成！") 