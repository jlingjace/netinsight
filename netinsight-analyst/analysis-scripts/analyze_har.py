#!/usr/bin/env python3
"""
HAR文件分析脚本
"""

import sys
import json
from datetime import datetime
from collections import Counter, defaultdict
from urllib.parse import urlparse

def analyze_har(file_path, config):
    """分析HAR文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
        
        if 'log' not in har_data or 'entries' not in har_data['log']:
            raise Exception("无效的HAR文件格式")
        
        entries = har_data['log']['entries']
        if not entries:
            raise Exception("HAR文件中没有网络请求记录")
        
        results = {
            "summary": analyze_summary(entries),
            "protocols": analyze_protocols(entries),
            "domains": analyze_domains(entries),
            "methods": analyze_methods(entries),
            "status_codes": analyze_status_codes(entries),
            "performance": analyze_performance(entries),
            "anomalies": detect_anomalies(entries)
        }
        
        return results
        
    except Exception as e:
        raise Exception(f"HAR分析失败: {str(e)}")

def analyze_summary(entries):
    """基础统计"""
    total_requests = len(entries)
    total_size = sum(
        entry.get('response', {}).get('bodySize', 0) + 
        entry.get('request', {}).get('bodySize', 0) 
        for entry in entries
    )
    
    # 计算时间跨度
    timestamps = []
    for entry in entries:
        if 'startedDateTime' in entry:
            try:
                timestamp = datetime.fromisoformat(entry['startedDateTime'].replace('Z', '+00:00'))
                timestamps.append(timestamp.timestamp())
            except:
                continue
    
    duration = max(timestamps) - min(timestamps) if timestamps else 0
    
    return {
        "totalRequests": total_requests,
        "totalBytes": total_size,
        "duration": duration,
        "avgRequestSize": total_size / total_requests if total_requests > 0 else 0,
        "requestsPerSecond": total_requests / duration if duration > 0 else 0
    }

def analyze_protocols(entries):
    """协议分析"""
    protocol_counts = Counter()
    
    for entry in entries:
        url = entry.get('request', {}).get('url', '')
        if url.startswith('https://'):
            protocol_counts['HTTPS'] += 1
        elif url.startswith('http://'):
            protocol_counts['HTTP'] += 1
        elif url.startswith('ws://'):
            protocol_counts['WebSocket'] += 1
        elif url.startswith('wss://'):
            protocol_counts['WebSocket Secure'] += 1
        else:
            protocol_counts['Other'] += 1
    
    total = len(entries)
    return [
        {
            "name": protocol,
            "requests": count,
            "percentage": (count / total * 100) if total > 0 else 0
        }
        for protocol, count in protocol_counts.most_common()
    ]

def analyze_domains(entries):
    """域名分析"""
    domain_counts = Counter()
    domain_sizes = defaultdict(int)
    
    for entry in entries:
        url = entry.get('request', {}).get('url', '')
        if url:
            try:
                domain = urlparse(url).netloc
                domain_counts[domain] += 1
                
                response_size = entry.get('response', {}).get('bodySize', 0)
                domain_sizes[domain] += response_size
            except:
                continue
    
    return [
        {
            "domain": domain,
            "requests": count,
            "totalBytes": domain_sizes[domain]
        }
        for domain, count in domain_counts.most_common(10)
    ]

def analyze_methods(entries):
    """HTTP方法分析"""
    method_counts = Counter()
    
    for entry in entries:
        method = entry.get('request', {}).get('method', 'UNKNOWN')
        method_counts[method] += 1
    
    total = len(entries)
    return [
        {
            "method": method,
            "requests": count,
            "percentage": (count / total * 100) if total > 0 else 0
        }
        for method, count in method_counts.most_common()
    ]

def analyze_status_codes(entries):
    """状态码分析"""
    status_counts = Counter()
    
    for entry in entries:
        status = entry.get('response', {}).get('status', 0)
        status_counts[status] += 1
    
    return [
        {
            "statusCode": status,
            "requests": count
        }
        for status, count in status_counts.most_common()
    ]

def analyze_performance(entries):
    """性能分析"""
    response_times = []
    sizes = []
    
    for entry in entries:
        # 响应时间
        time_data = entry.get('time', 0)
        if time_data > 0:
            response_times.append(time_data)
        
        # 响应大小
        size = entry.get('response', {}).get('bodySize', 0)
        if size > 0:
            sizes.append(size)
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    max_response_time = max(response_times) if response_times else 0
    min_response_time = min(response_times) if response_times else 0
    
    avg_size = sum(sizes) / len(sizes) if sizes else 0
    
    return {
        "avgResponseTime": avg_response_time,
        "maxResponseTime": max_response_time,
        "minResponseTime": min_response_time,
        "avgResponseSize": avg_size
    }

def detect_anomalies(entries):
    """异常检测"""
    anomalies = []
    
    # 检测高错误率
    error_count = sum(1 for entry in entries 
                     if entry.get('response', {}).get('status', 0) >= 400)
    error_rate = (error_count / len(entries)) * 100 if entries else 0
    
    if error_rate > 10:
        anomalies.append({
            "type": "high_error_rate",
            "severity": "high",
            "description": f"高错误率: {error_rate:.2f}%",
            "details": {"errorCount": error_count, "totalRequests": len(entries)}
        })
    
    # 检测慢请求
    slow_requests = [
        entry for entry in entries 
        if entry.get('time', 0) > 5000  # 超过5秒
    ]
    
    if slow_requests:
        anomalies.append({
            "type": "slow_requests",
            "severity": "medium",
            "description": f"发现 {len(slow_requests)} 个慢请求",
            "details": {"slowRequestCount": len(slow_requests)}
        })
    
    return anomalies

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": {"message": "参数错误"}}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    config_json = sys.argv[2]
    
    try:
        config = json.loads(config_json)
        results = analyze_har(file_path, config)
        print(json.dumps(results, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": {"message": str(e)}}))
        sys.exit(1)

if __name__ == "__main__":
    main() 