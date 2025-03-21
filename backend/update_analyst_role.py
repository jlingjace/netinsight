#!/usr/bin/env python
from app import db, create_app
from app.models.user import User, Role

app = create_app()

def update_analyst_role():
    with app.app_context():
        # 查找分析师用户
        analyst_user = User.query.filter_by(email='analyst@example.com').first()
        
        if not analyst_user:
            print("分析师用户不存在！")
            return
        
        print(f"分析师用户信息（更改前）:")
        print(f"- ID: {analyst_user.id}")
        print(f"- 邮箱: {analyst_user.email}")
        print(f"- 角色代码: {analyst_user.role}")
        print(f"- 自定义角色ID: {analyst_user.role_id}")
        
        # 更新分析师角色代码
        analyst_user.role = 'analyst'
        db.session.commit()
        
        print(f"\n分析师用户信息（更改后）:")
        print(f"- ID: {analyst_user.id}")
        print(f"- 邮箱: {analyst_user.email}")
        print(f"- 角色代码: {analyst_user.role}")
        print(f"- 自定义角色ID: {analyst_user.role_id}")
        
        print("\n分析师用户角色已更新为'analyst'")

if __name__ == "__main__":
    update_analyst_role() 