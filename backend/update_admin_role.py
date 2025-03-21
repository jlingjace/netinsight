#!/usr/bin/env python
from app import db, create_app
from app.models.user import User, Role

app = create_app()

def update_admin_role():
    with app.app_context():
        # 查找管理员用户
        admin_user = User.query.filter_by(email='admin@example.com').first()
        
        if not admin_user:
            print("管理员用户不存在！")
            return
        
        print(f"管理员用户信息（更改前）:")
        print(f"- ID: {admin_user.id}")
        print(f"- 邮箱: {admin_user.email}")
        print(f"- 角色代码: {admin_user.role}")
        print(f"- 自定义角色ID: {admin_user.role_id}")
        
        # 更新管理员角色代码
        admin_user.role = 'admin'
        db.session.commit()
        
        print(f"\n管理员用户信息（更改后）:")
        print(f"- ID: {admin_user.id}")
        print(f"- 邮箱: {admin_user.email}")
        print(f"- 角色代码: {admin_user.role}")
        print(f"- 自定义角色ID: {admin_user.role_id}")
        
        print("\n管理员用户角色已更新为'admin'")

if __name__ == "__main__":
    update_admin_role() 