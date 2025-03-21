#!/usr/bin/env python
from app import db, create_app
from app.models.user import User, Role, Permission

app = create_app()

def check_admin_user():
    with app.app_context():
        admin_user = User.query.filter_by(email='admin@example.com').first()
        
        if not admin_user:
            print("管理员用户不存在！")
            return
        
        print(f"管理员用户信息:")
        print(f"- ID: {admin_user.id}")
        print(f"- 邮箱: {admin_user.email}")
        print(f"- 角色代码: {admin_user.role}")
        print(f"- 自定义角色ID: {admin_user.role_id}")
        
        # 检查自定义角色
        if admin_user.role_id:
            role = Role.query.get(admin_user.role_id)
            if role:
                print(f"- 自定义角色名称: {role.name}")
                print(f"- 自定义角色描述: {role.description}")
                
                # 检查角色权限
                print(f"- 角色权限列表:")
                if role.permissions:
                    for perm in role.permissions:
                        print(f"  * {perm.name} ({perm.code})")
                else:
                    print("  * 无权限")
        else:
            print("- 未关联自定义角色")
        
        # 检查内置角色权限
        if admin_user.role == 'admin':
            # 管理员拥有所有权限
            print("- 作为管理员，拥有所有权限")
        
        # 从数据库检索所有菜单权限
        menu_permissions = Permission.query.filter(Permission.code.like("%.view")).all()
        print("\n系统中的菜单权限:")
        for perm in menu_permissions:
            print(f"- {perm.name} ({perm.code})")

if __name__ == "__main__":
    check_admin_user() 