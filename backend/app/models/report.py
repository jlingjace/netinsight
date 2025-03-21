from datetime import datetime
from .. import db
import json

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.String(36), primary_key=True)
    report_type = db.Column(db.String(50), nullable=False)  # 'security', 'performance', 'comprehensive'
    title = db.Column(db.String(256), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    
    # 报告指标数据
    total_packets = db.Column(db.Integer, nullable=True)
    total_connections = db.Column(db.Integer, nullable=True)
    unique_ips = db.Column(db.Integer, nullable=True)
    
    # 性能指标
    average_latency = db.Column(db.Float, nullable=True)  # 平均延迟(ms)
    packet_loss = db.Column(db.Float, nullable=True)      # 丢包率(%)
    error_rate = db.Column(db.Float, nullable=True)       # 错误率(%)
    
    # 安全指标
    security_score = db.Column(db.Integer, nullable=True)  # 0-100的安全评分
    high_severity_events = db.Column(db.Integer, nullable=True)  # 高危事件数量
    medium_severity_events = db.Column(db.Integer, nullable=True)  # 中危事件数量
    low_severity_events = db.Column(db.Integer, nullable=True)  # 低危事件数量
    
    # 详细分析数据 (JSON格式)
    detailed_data = db.Column(db.JSON, nullable=True)
    
    # 状态和时间信息
    status = db.Column(db.String(20), default='generating')  # 'generating', 'completed', 'failed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # 关联信息
    file_id = db.Column(db.String(36), db.ForeignKey('files.id'), nullable=False)
    file = db.relationship('File', backref=db.backref('reports', lazy=True))
    
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('reports', lazy=True))
    
    def __repr__(self):
        return f"<Report {self.id}: {self.title}>"
    
    def to_dict(self):
        """将Report对象转换为字典"""
        return {
            'id': self.id,
            'title': self.title,
            'reportType': self.report_type,
            'summary': self.summary,
            'status': self.status,
            'metrics': {
                'totalPackets': self.total_packets,
                'totalConnections': self.total_connections,
                'uniqueIps': self.unique_ips,
                'averageLatency': self.average_latency,
                'packetLoss': self.packet_loss,
                'errorRate': self.error_rate
            },
            'security': {
                'score': self.security_score,
                'highSeverityEvents': self.high_severity_events,
                'mediumSeverityEvents': self.medium_severity_events,
                'lowSeverityEvents': self.low_severity_events
            },
            'fileId': self.file_id,
            'fileName': self.file.filename if self.file else None,
            'userId': self.user_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def get_detailed_data(self):
        """获取详细分析数据"""
        return self.detailed_data
    
class ReportEvent(db.Model):
    __tablename__ = 'report_events'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False)
    report = db.relationship('Report', backref=db.backref('events', lazy=True))
    
    event_type = db.Column(db.String(50), nullable=False)  # 'port_scan', 'malicious_dns', 等
    severity = db.Column(db.String(20), nullable=False)  # 'high', 'medium', 'low'
    source_ip = db.Column(db.String(50), nullable=True)
    target_ip = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # 'active', 'resolved', 'ignored'
    
    def __repr__(self):
        return f"<ReportEvent {self.id}: {self.event_type}>"
    
    def to_dict(self):
        """将ReportEvent对象转换为字典"""
        return {
            'id': self.id,
            'reportId': self.report_id,
            'eventType': self.event_type,
            'severity': self.severity,
            'sourceIp': self.source_ip,
            'targetIp': self.target_ip,
            'description': self.description,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status
        }

class HttpRequest(db.Model):
    __tablename__ = 'http_requests'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False)
    report = db.relationship('Report', backref=db.backref('http_requests', lazy=True))
    
    url = db.Column(db.String(512), nullable=False)
    method = db.Column(db.String(10), nullable=False)  # GET, POST, etc.
    status_code = db.Column(db.Integer, nullable=True)
    content_type = db.Column(db.String(128), nullable=True)
    duration = db.Column(db.Float, nullable=True)  # 请求持续时间(ms)
    size = db.Column(db.Integer, nullable=True)  # 响应大小(字节)
    timestamp = db.Column(db.DateTime, nullable=True)
    headers = db.Column(db.JSON, nullable=True)
    request_body = db.Column(db.Text, nullable=True)
    response_body = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f"<HttpRequest {self.id}: {self.method} {self.url}>"
    
    def to_dict(self):
        """将HttpRequest对象转换为字典"""
        return {
            'id': self.id,
            'reportId': self.report_id,
            'url': self.url,
            'method': self.method,
            'statusCode': self.status_code,
            'contentType': self.content_type,
            'duration': self.duration,
            'size': self.size,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'headers': self.headers,
            'requestBody': self.request_body,
            'responseBody': self.response_body
        } 