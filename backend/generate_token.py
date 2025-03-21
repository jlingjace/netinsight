#!/usr/bin/env python
from flask_jwt_extended import create_access_token
from app import create_app

def generate_token(user_id='1'):
    app = create_app()
    with app.app_context():
        # 创建访问令牌
        token = create_access_token(identity=str(user_id))
        print(f"为用户ID {user_id} 生成的访问令牌:")
        print(token)
        return token

if __name__ == "__main__":
    generate_token() 