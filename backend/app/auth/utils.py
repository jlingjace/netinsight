import jwt
from flask import request, jsonify, current_app
from functools import wraps
from ..models.user import User
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # 直接使用Flask-JWT-Extended的验证方法
            verify_jwt_in_request()
            
            # 获取用户ID
            user_id = get_jwt_identity()
            request.user_id = user_id
            
            print(f"==DEBUG== 使用Flask-JWT-Extended验证通过，用户ID: {user_id}")
            
        except Exception as e:
            print(f"==DEBUG== Flask-JWT-Extended验证失败: {str(e)}")
            return jsonify({'error': f'认证失败: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # 直接使用Flask-JWT-Extended的验证方法
            verify_jwt_in_request()
            
            # 获取用户ID
            user_id = get_jwt_identity()
            request.user_id = user_id
            
            # 检查用户是否为管理员
            user = User.query.get(user_id)
            if not user or user.role != 'admin':
                return jsonify({'error': '该操作需要管理员权限'}), 403
            
        except Exception as e:
            return jsonify({'error': f'认证失败: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def analyst_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # 直接使用Flask-JWT-Extended的验证方法
            verify_jwt_in_request()
            
            # 获取用户ID
            user_id = get_jwt_identity()
            request.user_id = user_id
            
            # 检查用户是否为管理员或分析师
            user = User.query.get(user_id)
            if not user or (user.role != 'admin' and user.role != 'analyst'):
                return jsonify({'error': '该操作需要分析师或管理员权限'}), 403
            
        except Exception as e:
            return jsonify({'error': f'认证失败: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def permission_required(permission_code):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            try:
                # 直接使用Flask-JWT-Extended的验证方法
                verify_jwt_in_request()
                
                # 获取用户ID
                user_id = get_jwt_identity()
                request.user_id = user_id
                
                # 查询用户
                user = User.query.get(user_id)
                if not user:
                    return jsonify({'error': '用户不存在'}), 401
                
                # 管理员拥有所有权限
                if user.role == 'admin':
                    return f(*args, **kwargs)
                
                # 检查用户是否有指定权限
                for role in user.roles:
                    for perm in role.permissions:
                        if perm.code == permission_code:
                            return f(*args, **kwargs)
                
                return jsonify({'error': f'需要 {permission_code} 权限'}), 403
                
            except Exception as e:
                return jsonify({'error': f'认证失败: {str(e)}'}), 401
            
        return decorated
    return decorator 