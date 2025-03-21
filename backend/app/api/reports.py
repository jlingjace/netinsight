import os
import uuid
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from ..models.report import Report, ReportEvent, HttpRequest
from ..models.user import User
from ..models.file import File
from .. import db
from ..auth.utils import jwt_required, admin_required, analyst_required
import random  # 仅用于演示，生成模拟数据

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

def generate_sample_report_data(file_type, file_id, user_id):
    """
    生成示例报告数据（仅用于演示）
    在实际应用中，这应该是由真实的分析引擎完成的
    """
    # 基本指标
    total_packets = random.randint(10000, 150000)
    total_connections = random.randint(500, 2000)
    unique_ips = random.randint(20, 100)
    
    # 性能指标
    avg_latency = round(random.uniform(50, 500), 2)  # ms
    packet_loss = round(random.uniform(0, 5), 2)  # %
    error_rate = round(random.uniform(0, 10), 2)  # %
    
    # 安全指标
    security_score = random.randint(60, 98)
    high_events = random.randint(0, 5)
    medium_events = random.randint(1, 10)
    low_events = random.randint(3, 15)
    
    # 创建安全事件
    security_events = []
    event_types = [
        ('端口扫描', 'high', '从{src}到{dst}的顺序端口扫描'),
        ('恶意DNS查询', 'medium', '检测到对{domain}的可疑DNS查询'),
        ('可疑SSH登录尝试', 'high', '多次SSH登录失败尝试，可能是暴力破解攻击'),
        ('未加密HTTP传输', 'medium', '检测到敏感信息通过未加密的HTTP协议传输'),
        ('过时的TLS版本', 'low', '检测到使用TLS 1.0的连接，建议升级到TLS 1.2以上')
    ]
    
    used_events = set()
    for _ in range(high_events + medium_events + low_events):
        idx = random.randint(0, len(event_types) - 1)
        if idx in used_events:
            continue
        used_events.add(idx)
        
        event_type, severity, desc_template = event_types[idx]
        src_ip = f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}"
        dst_ip = f"10.0.{random.randint(1, 254)}.{random.randint(1, 254)}"
        domain = f"example{random.randint(1, 99)}.com"
        
        desc = desc_template.format(src=src_ip, dst=dst_ip, domain=domain)
        
        event = {
            'event_type': event_type,
            'severity': severity,
            'source_ip': src_ip,
            'target_ip': dst_ip if 'scan' in event_type.lower() else None,
            'description': desc,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        security_events.append(event)
    
    # HTTP请求数据（如果是HAR文件）
    http_requests = []
    if file_type == 'har':
        domains = ['api.example.com', 'cdn.example.com', 'auth.example.com', 'analytics.example.com']
        methods = ['GET', 'POST', 'PUT', 'DELETE']
        paths = ['/users', '/data', '/auth', '/images', '/config', '/stats']
        status_codes = [200, 201, 400, 401, 403, 404, 500]
        
        for _ in range(random.randint(10, 30)):
            domain = random.choice(domains)
            method = random.choice(methods)
            path = random.choice(paths)
            status = random.choice(status_codes)
            duration = round(random.uniform(50, 3000), 2)
            size = random.randint(1, 500) * 1024  # 大小（字节）
            
            req = {
                'url': f"https://{domain}{path}",
                'method': method,
                'status_code': status,
                'content_type': 'application/json',
                'duration': duration,
                'size': size,
                'timestamp': datetime.utcnow().isoformat()
            }
            http_requests.append(req)
    
    # 汇总的详细数据
    detailed_data = {
        'protocol_distribution': {
            'TCP': round(random.uniform(40, 80), 1),
            'UDP': round(random.uniform(10, 40), 1),
            'ICMP': round(random.uniform(1, 10), 1),
            'Others': round(random.uniform(1, 10), 1)
        },
        'top_talkers': [
            {'ip': f"192.168.1.{random.randint(1, 254)}", 'packets': random.randint(1000, 5000)},
            {'ip': f"10.0.1.{random.randint(1, 254)}", 'packets': random.randint(500, 3000)},
            {'ip': f"172.16.1.{random.randint(1, 254)}", 'packets': random.randint(200, 1000)}
        ],
        'http_status_distribution': {
            '2xx': round(random.uniform(50, 90), 1),
            '3xx': round(random.uniform(5, 20), 1),
            '4xx': round(random.uniform(5, 20), 1),
            '5xx': round(random.uniform(1, 10), 1)
        }
    }
    
    return {
        'id': str(uuid.uuid4()),
        'file_id': file_id,
        'user_id': user_id,
        'title': f"网络流量分析报告",
        'report_type': 'comprehensive',
        'summary': f"此报告分析了网络流量文件，发现了{high_events}个高危事件和{medium_events}个中危事件。平均延迟为{avg_latency}ms，网络质量整体良好。",
        'total_packets': total_packets,
        'total_connections': total_connections,
        'unique_ips': unique_ips,
        'average_latency': avg_latency,
        'packet_loss': packet_loss,
        'error_rate': error_rate,
        'security_score': security_score,
        'high_severity_events': high_events,
        'medium_severity_events': medium_events,
        'low_severity_events': low_events,
        'detailed_data': detailed_data,
        'events': security_events,
        'http_requests': http_requests
    }

@reports_bp.route('/reports', methods=['GET'])
@jwt_required
def get_reports():
    """获取用户的分析报告列表"""
    current_user_id = request.user_id
    user = User.query.get(current_user_id)
    
    # 分页参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # 根据用户角色决定查询范围
    if user.role == 'admin':
        # 管理员可以查看所有报告
        reports_query = Report.query
    else:
        # 其他用户只能查看自己的报告
        reports_query = Report.query.filter_by(user_id=current_user_id)
    
    # 排序和分页
    reports_query = reports_query.order_by(Report.created_at.desc())
    paginated_reports = reports_query.paginate(page=page, per_page=per_page, error_out=False)
    
    reports_data = {
        'items': [report.to_dict() for report in paginated_reports.items],
        'total': paginated_reports.total,
        'pages': paginated_reports.pages,
        'page': page,
        'per_page': per_page
    }
    
    return jsonify(reports_data)

@reports_bp.route('/reports/<report_id>', methods=['GET'])
@jwt_required
def get_report_detail(report_id):
    """获取单个报告的详细信息"""
    current_user_id = request.user_id
    user = User.query.get(current_user_id)
    
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': '报告不存在'}), 404
    
    # 检查权限
    if report.user_id != current_user_id and user.role != 'admin':
        return jsonify({'error': '没有权限访问此报告'}), 403
    
    # 获取报告详情
    report_data = report.to_dict()
    
    # 添加详细数据
    report_data['detailedData'] = report.get_detailed_data()
    
    # 获取安全事件
    events = ReportEvent.query.filter_by(report_id=report_id).all()
    report_data['events'] = [event.to_dict() for event in events]
    
    # 获取HTTP请求（如果需要）
    include_http = request.args.get('include_http', 'false').lower() == 'true'
    if include_http:
        http_requests = HttpRequest.query.filter_by(report_id=report_id).all()
        report_data['httpRequests'] = [req.to_dict() for req in http_requests]
    
    return jsonify(report_data)

@reports_bp.route('/reports/generate/<file_id>', methods=['POST'])
@jwt_required
@analyst_required
def generate_report(file_id):
    """为指定文件生成分析报告"""
    current_user_id = request.user_id
    
    # 检查文件是否存在
    file = File.query.get(file_id)
    if not file:
        return jsonify({'error': '文件不存在'}), 404
    
    # 检查文件权限
    if file.user_id != current_user_id and User.query.get(current_user_id).role != 'admin':
        return jsonify({'error': '没有权限分析此文件'}), 403
    
    # 检查文件是否已有报告
    existing_report = Report.query.filter_by(file_id=file_id).first()
    if existing_report:
        return jsonify({'error': '此文件已有分析报告', 'reportId': existing_report.id}), 400
    
    # 分析类型
    analysis_type = request.json.get('analysis_type', 'comprehensive')
    
    # 实际应用中，这里应该启动异步任务进行文件分析
    # 为演示目的，我们直接生成模拟数据
    report_data = generate_sample_report_data(file.file_type, file_id, current_user_id)
    
    # 创建报告记录
    new_report = Report(
        id=report_data['id'],
        title=report_data['title'],
        report_type=analysis_type,
        summary=report_data['summary'],
        total_packets=report_data['total_packets'],
        total_connections=report_data['total_connections'],
        unique_ips=report_data['unique_ips'],
        average_latency=report_data['average_latency'],
        packet_loss=report_data['packet_loss'],
        error_rate=report_data['error_rate'],
        security_score=report_data['security_score'],
        high_severity_events=report_data['high_severity_events'],
        medium_severity_events=report_data['medium_severity_events'],
        low_severity_events=report_data['low_severity_events'],
        detailed_data=report_data['detailed_data'],
        status='completed',
        file_id=file_id,
        user_id=current_user_id,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    
    db.session.add(new_report)
    
    # 添加安全事件
    for event_data in report_data['events']:
        event = ReportEvent(
            report_id=new_report.id,
            event_type=event_data['event_type'],
            severity=event_data['severity'],
            source_ip=event_data['source_ip'],
            target_ip=event_data['target_ip'],
            description=event_data['description'],
            timestamp=datetime.utcnow(),
            status='active'
        )
        db.session.add(event)
    
    # 添加HTTP请求
    for req_data in report_data.get('http_requests', []):
        http_req = HttpRequest(
            report_id=new_report.id,
            url=req_data['url'],
            method=req_data['method'],
            status_code=req_data['status_code'],
            content_type=req_data['content_type'],
            duration=req_data['duration'],
            size=req_data['size'],
            timestamp=datetime.utcnow()
        )
        db.session.add(http_req)
    
    db.session.commit()
    
    # 更新文件状态
    file.status = 'completed'
    file.completed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': '报告生成成功',
        'reportId': new_report.id
    })

@reports_bp.route('/reports/events/<event_id>/update-status', methods=['PUT'])
@jwt_required
@analyst_required
def update_event_status(event_id):
    """更新安全事件状态"""
    current_user_id = request.user_id
    
    event = ReportEvent.query.get(event_id)
    if not event:
        return jsonify({'error': '事件不存在'}), 404
    
    # 检查权限
    report = Report.query.get(event.report_id)
    if not report:
        return jsonify({'error': '报告不存在'}), 404
    
    if report.user_id != current_user_id and User.query.get(current_user_id).role != 'admin':
        return jsonify({'error': '没有权限更新此事件'}), 403
    
    new_status = request.json.get('status')
    if not new_status or new_status not in ['active', 'resolved', 'ignored']:
        return jsonify({'error': '无效的状态值'}), 400
    
    event.status = new_status
    db.session.commit()
    
    return jsonify({
        'message': '事件状态已更新',
        'eventId': event.id,
        'status': event.status
    })

@reports_bp.route('/reports/export/<report_id>', methods=['GET'])
@jwt_required
def export_report(report_id):
    """导出报告为JSON格式"""
    current_user_id = request.user_id
    user = User.query.get(current_user_id)
    
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': '报告不存在'}), 404
    
    # 检查权限
    if report.user_id != current_user_id and user.role != 'admin':
        return jsonify({'error': '没有权限导出此报告'}), 403
    
    # 获取完整报告数据
    report_data = report.to_dict()
    report_data['detailedData'] = report.get_detailed_data()
    
    # 获取安全事件
    events = ReportEvent.query.filter_by(report_id=report_id).all()
    report_data['events'] = [event.to_dict() for event in events]
    
    # 获取HTTP请求
    http_requests = HttpRequest.query.filter_by(report_id=report_id).all()
    report_data['httpRequests'] = [req.to_dict() for req in http_requests]
    
    return jsonify({
        'message': '报告导出成功',
        'data': report_data
    }) 