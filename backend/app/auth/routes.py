from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity
)
from app import db
from app.models.user import User, Role, Permission
from app.auth import auth_bp
import secrets
import string

# 生成随机密码的函数
def generate_random_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# 验证管理员权限
def admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'message': '需要管理员权限'}), 403
        
        return fn(*args, **kwargs)
    
    wrapper.__name__ = fn.__name__
    return wrapper

# 权限验证装饰器
def permission_required(permission_code):
    def decorator(fn):
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'message': '未认证用户'}), 401
                
            # 管理员拥有所有权限
            if user.role == 'admin':
                return fn(*args, **kwargs)
                
            # 检查用户角色是否有指定权限
            if user.has_permission(permission_code):
                return fn(*args, **kwargs)
            
            return jsonify({'message': '没有权限执行此操作'}), 403
        
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # 验证请求数据
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': '邮箱和密码不能为空'}), 400
    
    # 检查邮箱是否已存在
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': '该邮箱已注册'}), 409
    
    # 获取普通用户角色
    user_role = Role.query.filter_by(name='普通用户').first()
    
    # 创建新用户
    new_user = User(
        email=data['email'],
        password=data['password'],
        name=data.get('name'),
        role='user',
        role_id=user_role.id if user_role else None
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
    
    # 获取用户权限
    user_data = user.to_dict(include_role_permissions=True)
    # 添加用户权限列表
    user_permissions = []
    
    if user.role == 'admin':
        # 管理员拥有所有权限
        all_permissions = Permission.query.all()
        user_permissions = [perm.code for perm in all_permissions]
    elif user.user_role:
        # 获取自定义角色的权限
        user_permissions = [perm.code for perm in user.user_role.permissions]
    
    user_data['permissions'] = user_permissions
    
    return jsonify({
        'message': '登录成功',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_data
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
    
    # 获取用户数据(包含角色和权限)
    user_data = user.to_dict(include_role_permissions=True)
    
    # 添加用户权限列表
    user_permissions = []
    
    if user.role == 'admin':
        # 管理员拥有所有权限
        all_permissions = Permission.query.all()
        user_permissions = [perm.code for perm in all_permissions]
    elif user.user_role:
        # 获取自定义角色的权限
        user_permissions = [perm.code for perm in user.user_role.permissions]
    
    user_data['permissions'] = user_permissions
    
    return jsonify(user_data), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    data = request.get_json()
    if not data or not data.get('oldPassword') or not data.get('newPassword'):
        return jsonify({'message': '请提供旧密码和新密码'}), 400
    
    # 验证旧密码
    if not user.check_password(data['oldPassword']):
        return jsonify({'message': '当前密码错误'}), 401
    
    # 更新密码
    user.set_password(data['newPassword'])
    db.session.commit()
    
    return jsonify({'message': '密码修改成功'}), 200

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """获取所有用户列表，仅限管理员"""
    users = User.query.all()
    return jsonify([user.to_dict(include_role_permissions=True) for user in users]), 200

@auth_bp.route('/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """更新用户信息，包括角色，仅限管理员"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    data = request.get_json()
    if 'role' in data and data['role'] in ['user', 'analyst', 'admin']:
        user.role = data['role']
    
    if 'name' in data:
        user.name = data['name']
    
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    
    if 'role_id' in data:
        role = Role.query.get(data['role_id'])
        if role:
            user.role_id = role.id
            # 如果设置了自定义角色，更新对应的传统角色字段
            if role.name == '管理员':
                user.role = 'admin'
            elif role.name == '分析师':
                user.role = 'analyst'
            else:
                user.role = 'user'
    
    db.session.commit()
    return jsonify(user.to_dict(include_role_permissions=True)), 200

@auth_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@admin_required
def reset_user_password(user_id):
    """重置用户密码，仅限管理员"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    # 生成随机密码
    new_password = generate_random_password()
    user.set_password(new_password)
    db.session.commit()
    
    # 在实际应用中，这里应该发送邮件通知用户
    return jsonify({
        'message': '密码重置成功',
        'temp_password': new_password  # 注意：实际环境中不应直接返回密码
    }), 200

@auth_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """创建新用户，仅限管理员"""
    data = request.get_json()
    
    # 验证请求数据
    if not data or not data.get('email'):
        return jsonify({'message': '邮箱不能为空'}), 400
    
    # 检查邮箱是否已存在
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': '该邮箱已注册'}), 409
    
    # 生成随机初始密码
    password = data.get('password') or generate_random_password()
    
    # 查找对应的角色
    role_id = data.get('role_id')
    role_obj = None
    if role_id:
        role_obj = Role.query.get(role_id)
    
    # 确定角色代码
    role_code = data.get('role', 'user')
    if role_obj:
        if role_obj.name == '管理员':
            role_code = 'admin'
        elif role_obj.name == '分析师':
            role_code = 'analyst'
        else:
            role_code = 'user'
    
    # 创建新用户
    new_user = User(
        email=data['email'],
        password=password,
        name=data.get('name'),
        role=role_code,
        role_id=role_id
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    result = new_user.to_dict(include_role_permissions=True)
    # 仅在首次创建时返回临时密码
    if not data.get('password'):
        result['temp_password'] = password
    
    return jsonify(result), 201

# 角色管理接口
@auth_bp.route('/roles', methods=['GET'])
@permission_required('menu_role_management')
def get_all_roles():
    """获取所有角色"""
    roles = Role.query.all()
    return jsonify([role.to_dict(include_permissions=True) for role in roles]), 200

@auth_bp.route('/roles/<role_id>', methods=['GET'])
@permission_required('menu_role_management')
def get_role(role_id):
    """获取单个角色详情"""
    role = Role.query.get(role_id)
    if not role:
        return jsonify({'message': '角色不存在'}), 404
    
    return jsonify(role.to_dict(include_permissions=True)), 200

@auth_bp.route('/roles', methods=['POST'])
@permission_required('action_manage_roles')
def create_role():
    """创建新角色"""
    data = request.get_json()
    
    # 验证请求数据
    if not data or not data.get('name'):
        return jsonify({'message': '角色名称不能为空'}), 400
    
    # 检查角色名是否已存在
    if Role.query.filter_by(name=data['name']).first():
        return jsonify({'message': '该角色名称已存在'}), 409
    
    # 创建新角色
    new_role = Role(
        name=data['name'],
        description=data.get('description')
    )
    
    # 添加权限
    if 'permission_ids' in data and isinstance(data['permission_ids'], list):
        permissions = Permission.query.filter(Permission.id.in_(data['permission_ids'])).all()
        new_role.permissions = permissions
    
    db.session.add(new_role)
    db.session.commit()
    
    return jsonify(new_role.to_dict(include_permissions=True)), 201

@auth_bp.route('/roles/<role_id>', methods=['PUT'])
@permission_required('action_manage_roles')
def update_role(role_id):
    """更新角色信息"""
    role = Role.query.get(role_id)
    if not role:
        return jsonify({'message': '角色不存在'}), 404
    
    # 系统预设角色不允许修改名称
    if role.is_system and request.json.get('name') and request.json.get('name') != role.name:
        return jsonify({'message': '系统预设角色不允许修改名称'}), 403
    
    data = request.get_json()
    
    if 'name' in data:
        # 检查是否存在同名角色
        existing = Role.query.filter(Role.name == data['name'], Role.id != role_id).first()
        if existing:
            return jsonify({'message': '该角色名称已存在'}), 409
        role.name = data['name']
    
    if 'description' in data:
        role.description = data['description']
    
    # 更新权限
    if 'permission_ids' in data and isinstance(data['permission_ids'], list):
        permissions = Permission.query.filter(Permission.id.in_(data['permission_ids'])).all()
        role.permissions = permissions
    
    db.session.commit()
    
    return jsonify(role.to_dict(include_permissions=True)), 200

@auth_bp.route('/roles/<role_id>', methods=['DELETE'])
@permission_required('action_manage_roles')
def delete_role(role_id):
    """删除角色"""
    role = Role.query.get(role_id)
    if not role:
        return jsonify({'message': '角色不存在'}), 404
    
    # 系统预设角色不允许删除
    if role.is_system:
        return jsonify({'message': '系统预设角色不允许删除'}), 403
    
    # 检查是否有用户使用该角色
    users_with_role = User.query.filter_by(role_id=role_id).count()
    if users_with_role > 0:
        return jsonify({
            'message': '无法删除该角色，因为有用户正在使用',
            'affected_users': users_with_role
        }), 400
    
    db.session.delete(role)
    db.session.commit()
    
    return jsonify({'message': '角色删除成功'}), 200

# 权限管理接口
@auth_bp.route('/permissions', methods=['GET'])
@permission_required('menu_role_management')
def get_all_permissions():
    """获取所有权限"""
    permissions = Permission.query.all()
    return jsonify([permission.to_dict() for permission in permissions]), 200

@auth_bp.route('/permissions/categories', methods=['GET'])
@permission_required('menu_role_management')
def get_permission_categories():
    """获取权限分类"""
    categories = db.session.query(Permission.category).distinct().all()
    return jsonify([category[0] for category in categories]), 200