from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from datetime import datetime
import uuid

# 角色与权限的多对多关系表
role_permissions = Table(
    'role_permissions',
    db.Model.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

class Permission(db.Model):
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(200))
    code = Column(String(100), unique=True, nullable=False)
    category = Column(String(50))  # 权限分类
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'code': self.code,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200))
    is_system = Column(Boolean, default=False)  # 是否为系统预设角色
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 角色与权限的多对多关系
    permissions = relationship('Permission', secondary=role_permissions, backref='roles')
    
    def to_dict(self, include_permissions=False):
        role_dict = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_system': self.is_system,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_permissions:
            role_dict['permissions'] = [perm.to_dict() for perm in self.permissions]
        
        return role_dict

class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), default='user')  # 'user', 'analyst', 'admin'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # 与自定义角色的关联
    role_id = Column(Integer, ForeignKey('roles.id'))
    user_role = relationship('Role', foreign_keys=[role_id])
    
    def __init__(self, email, password, name=None, role='user', role_id=None):
        self.email = email
        self.set_password(password)
        self.name = name
        self.role = role
        self.role_id = role_id
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def has_permission(self, permission_code):
        """检查用户是否拥有指定权限"""
        # 管理员拥有所有权限
        if self.role == 'admin':
            return True
        
        # 检查自定义角色权限
        if self.user_role:
            for permission in self.user_role.permissions:
                if permission.code == permission_code:
                    return True
        
        # 对传统角色的简单权限检查
        if self.role == 'analyst':
            # 分析师默认权限
            analyst_permissions = [
                'menu_dashboard', 'menu_file_upload', 'menu_reports',
                'action_view_reports', 'action_download_reports'
            ]
            return permission_code in analyst_permissions
        
        elif self.role == 'user':
            # 普通用户默认权限
            user_permissions = ['menu_dashboard']
            return permission_code in user_permissions
        
        return False
    
    def to_dict(self, include_role_permissions=False):
        """返回用户信息的字典表示"""
        user_dict = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
        
        if include_role_permissions and self.user_role:
            user_dict['custom_role'] = self.user_role.to_dict()
        
        return user_dict 