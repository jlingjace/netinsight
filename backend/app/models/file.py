from datetime import datetime
from .. import db
import time

def format_size(size_bytes):
    """将字节数转换为人类可读的格式"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    
    for unit in ['KB', 'MB', 'GB', 'TB']:
        size_bytes /= 1024.0
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
    
    return f"{size_bytes:.2f} PB"

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.String(36), primary_key=True)
    filename = db.Column(db.String(256), nullable=False)
    saved_filename = db.Column(db.String(256), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    analysis_type = db.Column(db.String(50), default='comprehensive')
    tls_key_path = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    analysis_result = db.Column(db.JSON, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # 外键关系
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('files', lazy=True))
    
    def __repr__(self):
        return f"<File {self.filename}>"
    
    def to_dict(self):
        """将File对象转换为字典"""
        # 计算文件大小的可读格式
        readable_size = format_size(self.file_size)
        
        # 计算上传时间的相对描述
        time_diff = datetime.utcnow() - self.created_at
        if time_diff.days > 0:
            if time_diff.days == 1:
                time_ago = "昨天"
            else:
                time_ago = f"{time_diff.days}天前"
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_ago = f"{hours}小时前"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_ago = f"{minutes}分钟前"
        else:
            time_ago = "刚刚"
        
        status_text = {
            'pending': '等待分析',
            'processing': '分析中',
            'completed': '分析完成',
            'failed': '分析失败'
        }.get(self.status, self.status)
        
        return {
            'id': self.id,
            'filename': self.filename,
            'fileType': self.file_type,
            'fileSize': readable_size,
            'rawSize': self.file_size,
            'uploadTime': time_ago,
            'timestamp': int(time.mktime(self.created_at.timetuple())),
            'status': self.status,
            'statusText': status_text,
            'analysisType': self.analysis_type,
            'hasTlsKey': self.tls_key_path is not None,
            'userId': self.user_id
        } 