from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity
)
from app import db
from app.models import User
from app.auth import auth_bp

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # 验证请求数据
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': '邮箱和密码不能为空'}), 400
    
    # 检查邮箱是否已存在
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': '该邮箱已注册'}), 409
    
    # 创建新用户
    new_user = User(
        email=data['email'],
        password=data['password'],
        name=data.get('name')
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': '注册成功', 'user_id': new_user.id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # 验证请求数据
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': '邮箱和密码不能为空'}), 400
    
    # 查找用户
    user = User.query.filter_by(email=data['email']).first()
    
    # 验证用户和密码
    if not user or not user.check_password(data['password']):
        return jsonify({'message': '邮箱或密码错误'}), 401
    
    if not user.is_active:
        return jsonify({'message': '账号已被禁用'}), 403
    
    # 更新最后登录时间
    user.update_last_login()
    
    # 创建访问令牌和刷新令牌
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': '登录成功',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    
    return jsonify({
        'access_token': new_access_token
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user_info():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    return jsonify(user.to_dict()), 200 