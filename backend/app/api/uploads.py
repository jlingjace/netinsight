import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ..auth.utils import jwt_required, analyst_required
from ..models.user import User
from ..models.file import File
from .. import db

uploads_bp = Blueprint('uploads', __name__, url_prefix='/api/files')

ALLOWED_EXTENSIONS = {'har', 'pcap', 'pcapng'}
TLS_KEY_EXTENSIONS = {'key', 'pem', 'txt'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

@uploads_bp.route('/', methods=['GET'])
@jwt_required
def get_user_files():
    """获取当前用户的所有上传文件"""
    current_user_id = request.user_id
    
    # 分析师可以看到自己上传的文件
    # 管理员可以看到所有文件
    user = User.query.get(current_user_id)
    if user.role == 'admin':
        files = File.query.order_by(File.created_at.desc()).all()
    else:
        files = File.query.filter_by(user_id=current_user_id).order_by(File.created_at.desc()).all()
    
    return jsonify([file.to_dict() for file in files])

@uploads_bp.route('/', methods=['POST'])
@jwt_required
@analyst_required
def upload_file():
    """上传文件API"""
    print(f"===DEBUG=== 接收到上传请求，路径: {request.path}, 方法: {request.method}")
    print(f"===DEBUG=== 请求URL: {request.url}")
    print(f"===DEBUG=== 请求头: {dict(request.headers)}")
    print("===DEBUG=== 开始处理文件上传请求")
    print(f"===DEBUG=== 请求内容类型: {request.content_type}")
    print(f"===DEBUG=== 表单数据: {request.form}")
    print(f"===DEBUG=== 文件: {request.files}")
    
    # 检查是否有文件
    if 'file' not in request.files:
        print("===DEBUG=== 错误: 没有上传文件")
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    print(f"===DEBUG=== 文件名: {file.filename}")
    
    # 检查文件名是否为空
    if file.filename == '':
        print("===DEBUG=== 错误: 未选择文件")
        return jsonify({'error': '未选择文件'}), 400
    
    # 检查文件类型
    if not allowed_file(file.filename, ALLOWED_EXTENSIONS):
        print(f"===DEBUG=== 错误: 不支持的文件类型 {file.filename}")
        return jsonify({'error': f'不支持的文件类型。请上传 {", ".join(ALLOWED_EXTENSIONS)} 格式的文件'}), 400
    
    # 检查文件大小
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    print(f"===DEBUG=== 文件大小: {file_size} 字节")
    
    if file_size > MAX_FILE_SIZE:
        print(f"===DEBUG=== 错误: 文件太大 {file_size} > {MAX_FILE_SIZE}")
        return jsonify({'error': f'文件太大。最大支持 {MAX_FILE_SIZE / 1024 / 1024}MB'}), 400
    
    # 检查是否有TLS密钥文件
    tls_key_file = None
    tls_key_path = None
    if 'tls_key' in request.files:
        tls_key_file = request.files['tls_key']
        print(f"===DEBUG=== 有TLS密钥文件: {tls_key_file.filename}")
        if tls_key_file.filename != '' and allowed_file(tls_key_file.filename, TLS_KEY_EXTENSIONS):
            # 保存TLS密钥文件
            tls_key_filename = secure_filename(tls_key_file.filename)
            tls_key_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'keys', tls_key_filename)
            print(f"===DEBUG=== TLS密钥文件路径: {tls_key_path}")
            tls_key_file.save(tls_key_path)
            print("===DEBUG=== TLS密钥文件已保存")
    
    # 获取分析类型
    analysis_type = request.form.get('analysis_type', 'comprehensive')
    print(f"===DEBUG=== 分析类型: {analysis_type}")
    
    # 为文件生成唯一ID
    file_id = str(uuid.uuid4())
    print(f"===DEBUG=== 文件ID: {file_id}")
    
    # 保存文件
    filename = secure_filename(file.filename)
    file_ext = filename.rsplit('.', 1)[1].lower()
    saved_filename = f"{file_id}.{file_ext}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], saved_filename)
    print(f"===DEBUG=== 保存文件路径: {file_path}")
    
    # 确保上传目录存在
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        print(f"===DEBUG=== 确保目录存在: {os.path.dirname(file_path)}")
        if tls_key_path:
            os.makedirs(os.path.dirname(tls_key_path), exist_ok=True)
            print(f"===DEBUG=== 确保TLS密钥目录存在: {os.path.dirname(tls_key_path)}")
        
        file.save(file_path)
        print("===DEBUG=== 文件已保存")
    except Exception as e:
        print(f"===DEBUG=== 保存文件出错: {str(e)}")
        return jsonify({'error': f'保存文件时出错: {str(e)}'}), 500
    
    try:
        # 保存文件信息到数据库
        new_file = File(
            id=file_id,
            filename=filename,
            saved_filename=saved_filename,
            file_path=file_path,
            file_type=file_ext,
            file_size=file_size,
            analysis_type=analysis_type,
            tls_key_path=tls_key_path,
            status="pending",
            user_id=request.user_id
        )
        
        db.session.add(new_file)
        db.session.commit()
        print("===DEBUG=== 文件信息已保存到数据库")
    except Exception as e:
        print(f"===DEBUG=== 保存数据库记录出错: {str(e)}")
        return jsonify({'error': f'保存数据库记录时出错: {str(e)}'}), 500
    
    # 这里应该触发一个后台任务来处理文件分析
    # 例如使用Celery或类似工具
    # start_analysis_task.delay(file_id)
    
    print("===DEBUG=== 文件上传完成，返回成功响应")
    return jsonify({
        'message': '文件上传成功，分析任务已提交',
        'file': new_file.to_dict()
    }), 201

@uploads_bp.route('/<file_id>', methods=['GET'])
@jwt_required
def get_file_details(file_id):
    """获取单个文件的详细信息"""
    current_user_id = request.user_id
    
    file = File.query.get(file_id)
    if not file:
        return jsonify({'error': '文件不存在'}), 404
    
    # 检查权限：只有文件上传者或管理员可以访问
    user = User.query.get(current_user_id)
    if file.user_id != current_user_id and user.role != 'admin':
        return jsonify({'error': '没有权限访问此文件'}), 403
    
    return jsonify(file.to_dict())

@uploads_bp.route('/<file_id>', methods=['DELETE'])
@jwt_required
def delete_file(file_id):
    """删除文件"""
    current_user_id = request.user_id
    
    file = File.query.get(file_id)
    if not file:
        return jsonify({'error': '文件不存在'}), 404
    
    # 检查权限：只有文件上传者或管理员可以删除
    user = User.query.get(current_user_id)
    if file.user_id != current_user_id and user.role != 'admin':
        return jsonify({'error': '没有权限删除此文件'}), 403
    
    # 删除物理文件
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
        
        if file.tls_key_path and os.path.exists(file.tls_key_path):
            os.remove(file.tls_key_path)
    except Exception as e:
        current_app.logger.error(f"删除文件时出错: {str(e)}")
    
    # 从数据库中删除记录
    db.session.delete(file)
    db.session.commit()
    
    return jsonify({'message': '文件已成功删除'}), 200 