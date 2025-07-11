#!/usr/bin/env python3
"""
PCAP文件分析脚本 - 简化版
"""

import sys
import json
import time
from datetime import datetime
from collections import Counter, defaultdict

try:
    from scapy.all import rdpcap, IP, TCP, UDP, ICMP, ARP, IPv6, DNS, Raw
except ImportError:
    print(json.dumps({
        "error": {
            "code": "IMPORT_ERROR",
            "message": "缺少scapy包: pip install scapy"
        }
    }))
    sys.exit(1)

def analyze_pcap(file_path, config):
    """分析PCAP文件"""
    try:
        packets = rdpcap(file_path)
        if len(packets) == 0:
            raise Exception("PCAP文件中没有数据包")
        
        results = {
            "summary": analyze_summary(packets),
            "protocols": analyze_protocols(packets),
            "network": analyze_network(packets),
            "transport": analyze_transport(packets),
            "temporal": analyze_temporal(packets),  # 新增：时间线分析
            "connections": analyze_connections(packets),
            "http_sessions": analyze_http_sessions(packets),  # 新增HTTP会话分析
            "anomalies": detect_anomalies(packets),
            "smart_insights": analyze_smart_insights(packets)  # 新增智能诊断引擎
        }
        
        return results
        
    except Exception as e:
        raise Exception(f"分析失败: {str(e)}")

def analyze_summary(packets):
    """基础统计"""
    total_packets = len(packets)
    total_bytes = sum(len(pkt) for pkt in packets)
    
    timestamps = [float(pkt.time) for pkt in packets if hasattr(pkt, 'time')]
    if timestamps:
        duration = max(timestamps) - min(timestamps)
        packets_per_sec = total_packets / duration if duration > 0 else 0
    else:
        duration = 0
        packets_per_sec = 0
    
    return {
        "totalPackets": total_packets,
        "totalBytes": total_bytes,
        "duration": duration,
        "avgPacketSize": total_bytes / total_packets if total_packets > 0 else 0,
        "packetsPerSecond": packets_per_sec
    }

def analyze_protocols(packets):
    """协议分析 - 增强版"""
    protocol_counts = Counter()
    
    # 应用层协议端口映射
    well_known_ports = {
        20: "FTP-DATA", 21: "FTP", 22: "SSH", 23: "Telnet",
        25: "SMTP", 53: "DNS", 67: "DHCP", 68: "DHCP",
        80: "HTTP", 110: "POP3", 143: "IMAP", 161: "SNMP",
        443: "HTTPS", 993: "IMAPS", 995: "POP3S"
    }
    
    for pkt in packets:
        # 网络层协议
        if IP in pkt:
            protocol_counts["IPv4"] += 1
            
            # 传输层协议 + 应用层协议识别
            if TCP in pkt:
                protocol_counts["TCP"] += 1
                # 基于端口识别应用层协议
                dport = pkt[TCP].dport
                sport = pkt[TCP].sport
                
                if dport in well_known_ports:
                    protocol_counts[well_known_ports[dport]] += 1
                elif sport in well_known_ports:
                    protocol_counts[well_known_ports[sport]] += 1
                    
            elif UDP in pkt:
                protocol_counts["UDP"] += 1
                # 基于端口识别应用层协议
                dport = pkt[UDP].dport
                sport = pkt[UDP].sport
                
                if dport in well_known_ports:
                    protocol_counts[well_known_ports[dport]] += 1
                elif sport in well_known_ports:
                    protocol_counts[well_known_ports[sport]] += 1
                    
            elif ICMP in pkt:
                protocol_counts["ICMP"] += 1
                
        elif IPv6 in pkt:
            protocol_counts["IPv6"] += 1
            
        elif ARP in pkt:
            protocol_counts["ARP"] += 1
            
        # 基于包内容的协议识别
        if DNS in pkt:
            protocol_counts["DNS"] += 1
            
        # HTTP识别（检查Raw层是否包含HTTP特征）
        if Raw in pkt:
            payload = pkt[Raw].load
            if isinstance(payload, bytes):
                payload_str = payload.decode('utf-8', errors='ignore')
                if any(method in payload_str[:50] for method in ['GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ']):
                    protocol_counts["HTTP"] += 1
                elif 'HTTP/' in payload_str[:100]:
                    protocol_counts["HTTP"] += 1
    
    total = len(packets)
    return [
        {
            "name": protocol,
            "packets": count,
            "percentage": (count / total * 100) if total > 0 else 0
        }
        for protocol, count in protocol_counts.most_common()
    ]

def analyze_network(packets):
    """网络层分析 - 增强版"""
    src_ips = Counter()
    dst_ips = Counter()
    ip_pairs = Counter()
    bytes_per_ip = defaultdict(int)
    
    ipv4_count = 0
    ipv6_count = 0
    
    for pkt in packets:
        if IP in pkt:
            ipv4_count += 1
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            pkt_size = len(pkt)
            
            src_ips[src_ip] += 1
            dst_ips[dst_ip] += 1
            bytes_per_ip[src_ip] += pkt_size
            bytes_per_ip[dst_ip] += pkt_size
            
            # 记录通信对
            ip_pair = f"{src_ip} <-> {dst_ip}"
            ip_pairs[ip_pair] += 1
            
        elif IPv6 in pkt:
            ipv6_count += 1
            
    return {
        "ipv4Packets": ipv4_count,
        "ipv6Packets": ipv6_count,
        "uniqueSourceIPs": len(src_ips),
        "uniqueDestinationIPs": len(dst_ips),
        "topSources": [
            {
                "ip": ip, 
                "packets": count,
                "bytes": bytes_per_ip[ip]
            } 
            for ip, count in src_ips.most_common(5)
        ],
        "topDestinations": [
            {
                "ip": ip, 
                "packets": count,
                "bytes": bytes_per_ip[ip]
            } 
            for ip, count in dst_ips.most_common(5)
        ],
        "topCommunications": [
            {
                "pair": pair,
                "packets": count
            }
            for pair, count in ip_pairs.most_common(5)
        ]
    }

def analyze_transport(packets):
    """传输层分析 - 增强版"""
    tcp_count = udp_count = icmp_count = 0
    tcp_flags = Counter()
    port_counts = Counter()
    port_services = {}
    tcp_bytes = udp_bytes = 0
    
    # 常见服务端口映射
    service_names = {
        20: "FTP-DATA", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
        53: "DNS", 67: "DHCP", 68: "DHCP", 80: "HTTP", 110: "POP3",
        143: "IMAP", 161: "SNMP", 443: "HTTPS", 993: "IMAPS", 995: "POP3S"
    }
    
    for pkt in packets:
        if TCP in pkt:
            tcp_count += 1
            tcp_bytes += len(pkt)
            dport = pkt[TCP].dport
            port_counts[dport] += 1
            
            # 记录TCP标志
            flags = pkt[TCP].flags
            if flags & 0x02:  # SYN
                tcp_flags["SYN"] += 1
            if flags & 0x10:  # ACK
                tcp_flags["ACK"] += 1
            if flags & 0x01:  # FIN
                tcp_flags["FIN"] += 1
            if flags & 0x04:  # RST
                tcp_flags["RST"] += 1
                
            # 记录端口对应的服务
            if dport in service_names:
                port_services[dport] = service_names[dport]
                
        elif UDP in pkt:
            udp_count += 1
            udp_bytes += len(pkt)
            dport = pkt[UDP].dport
            port_counts[dport] += 1
            
            if dport in service_names:
                port_services[dport] = service_names[dport]
                
        elif ICMP in pkt:
            icmp_count += 1
    
    # 构建端口统计（包含服务名）
    top_ports = []
    for port, count in port_counts.most_common(10):
        port_info = {
            "port": port,
            "packets": count,
            "service": port_services.get(port, "Unknown")
        }
        top_ports.append(port_info)
    
    return {
        "tcpPackets": tcp_count,
        "udpPackets": udp_count,
        "icmpPackets": icmp_count,
        "tcpBytes": tcp_bytes,
        "udpBytes": udp_bytes,
        "uniquePorts": len(port_counts),
        "topPorts": top_ports,
        "tcpFlags": dict(tcp_flags.most_common()),
        "connectionAttempts": tcp_flags.get("SYN", 0),
        "connectionResets": tcp_flags.get("RST", 0)
    }

def analyze_temporal(packets):
    """时间线分析 - 第二阶段核心功能"""
    import math
    from datetime import datetime
    
    timestamps = []
    time_data = []
    protocol_timeline = defaultdict(list)
    traffic_timeline = []
    
    # 收集所有时间戳
    for pkt in packets:
        if hasattr(pkt, 'time'):
            timestamps.append(float(pkt.time))
    
    if not timestamps:
        return {
            "startTime": None,
            "endTime": None,
            "timeDistribution": [],
            "trafficTimeline": [],
            "protocolTimeline": {},
            "peakTrafficTime": None,
            "trafficEvents": []
        }
    
    # 计算时间范围
    start_time = min(timestamps)
    end_time = max(timestamps)
    duration = end_time - start_time
    
    # 创建时间桶（每5秒一个桶，最多100个桶）
    if duration > 0:
        bucket_size = max(5.0, duration / 100)  # 至少5秒一个桶
        num_buckets = int(duration / bucket_size) + 1
    else:
        bucket_size = 5.0
        num_buckets = 1
    
    # 初始化时间桶
    time_buckets = [0] * num_buckets
    byte_buckets = [0] * num_buckets
    protocol_buckets = [defaultdict(int) for _ in range(num_buckets)]
    
    # 填充时间桶数据
    for pkt in packets:
        if hasattr(pkt, 'time'):
            pkt_time = float(pkt.time)
            bucket_index = min(int((pkt_time - start_time) / bucket_size), num_buckets - 1)
            
            time_buckets[bucket_index] += 1
            byte_buckets[bucket_index] += len(pkt)
            
            # 协议分类
            protocol = "Other"
            if IP in pkt:
                if TCP in pkt:
                    protocol = "TCP"
                elif UDP in pkt:
                    protocol = "UDP"
                elif ICMP in pkt:
                    protocol = "ICMP"
            elif ARP in pkt:
                protocol = "ARP"
            
            protocol_buckets[bucket_index][protocol] += 1
    
    # 构建时间线数据
    timeline_data = []
    max_traffic = 0
    peak_time_index = 0
    
    for i in range(num_buckets):
        bucket_time = start_time + (i * bucket_size)
        packets_in_bucket = time_buckets[i]
        bytes_in_bucket = byte_buckets[i]
        
        if bytes_in_bucket > max_traffic:
            max_traffic = bytes_in_bucket
            peak_time_index = i
        
        timeline_data.append({
            "timestamp": bucket_time,
            "packets": packets_in_bucket,
            "bytes": bytes_in_bucket,
            "rate": bytes_in_bucket / bucket_size if bucket_size > 0 else 0,  # bytes/sec
            "protocols": dict(protocol_buckets[i])
        })
    
    # 检测流量事件（异常高峰、安静期等）
    traffic_events = detect_traffic_events(timeline_data, bucket_size)
    
    # 构建协议时间线
    protocol_timeline_data = {}
    for protocol in ["TCP", "UDP", "ICMP", "ARP"]:
        protocol_timeline_data[protocol] = [
            {
                "timestamp": bucket_time,
                "packets": protocol_buckets[i].get(protocol, 0)
            }
            for i, bucket_time in enumerate([start_time + (i * bucket_size) for i in range(num_buckets)])
        ]
    
    return {
        "startTime": datetime.fromtimestamp(start_time).isoformat(),
        "endTime": datetime.fromtimestamp(end_time).isoformat(),
        "duration": duration,
        "bucketSize": bucket_size,
        "timeDistribution": timeline_data,
        "trafficTimeline": [
            {
                "timestamp": data["timestamp"],
                "bytes": data["bytes"],
                "packets": data["packets"],
                "rate": data["rate"]
            }
            for data in timeline_data
        ],
        "protocolTimeline": protocol_timeline_data,
        "peakTrafficTime": datetime.fromtimestamp(start_time + (peak_time_index * bucket_size)).isoformat(),
        "peakTrafficRate": max_traffic / bucket_size if bucket_size > 0 else 0,
        "trafficEvents": traffic_events
    }

def detect_traffic_events(timeline_data, bucket_size):
    """检测流量事件"""
    if len(timeline_data) < 3:
        return []
    
    events = []
    rates = [data["rate"] for data in timeline_data]
    avg_rate = sum(rates) / len(rates)
    
    # 检测高峰事件（超过平均值2倍）
    for i, data in enumerate(timeline_data):
        if data["rate"] > avg_rate * 2 and avg_rate > 0:
            events.append({
                "type": "traffic_spike",
                "timestamp": data["timestamp"],
                "severity": "high" if data["rate"] > avg_rate * 5 else "medium",
                "description": f"流量突增：{data['rate']:.1f} bytes/sec（平均值的{data['rate']/avg_rate:.1f}倍）",
                "details": {
                    "rate": data["rate"],
                    "average_rate": avg_rate,
                    "packets": data["packets"]
                }
            })
    
    # 检测安静期（低于平均值的20%，且持续多个时间桶）
    quiet_start = None
    for i, data in enumerate(timeline_data):
        if data["rate"] < avg_rate * 0.2:
            if quiet_start is None:
                quiet_start = i
        else:
            if quiet_start is not None and (i - quiet_start) >= 3:
                events.append({
                    "type": "quiet_period",
                    "timestamp": timeline_data[quiet_start]["timestamp"],
                    "severity": "low",
                    "description": f"网络安静期：持续{(i - quiet_start) * bucket_size:.1f}秒",
                    "details": {
                        "duration": (i - quiet_start) * bucket_size,
                        "avg_rate_during_period": sum(timeline_data[j]["rate"] for j in range(quiet_start, i)) / (i - quiet_start)
                    }
                })
            quiet_start = None
    
    return events

def analyze_connections(packets):
    """连接分析"""
    connections = defaultdict(int)
    
    for pkt in packets:
        if IP in pkt and TCP in pkt:
            conn_key = f"{pkt[IP].src}:{pkt[TCP].sport}->{pkt[IP].dst}:{pkt[TCP].dport}"
            connections[conn_key] += 1
    
    top_connections = [
        {
            "connection": conn,
            "packets": count
        }
        for conn, count in sorted(connections.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    
    return {
        "totalConnections": len(connections),
        "topConnections": top_connections
    }

def analyze_http_sessions(packets):
    """HTTP会话流重建 - 杀手级功能"""
    import re
    from collections import defaultdict
    
    http_sessions = []
    tcp_streams = defaultdict(list)  # 按TCP流分组
    
    # 第一步：按TCP流分组数据包
    for pkt in packets:
        if IP in pkt and TCP in pkt and Raw in pkt:
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            src_port = pkt[TCP].sport
            dst_port = pkt[TCP].dport
            
            # 创建双向流标识
            flow_key = tuple(sorted([(src_ip, src_port), (dst_ip, dst_port)]))
            tcp_streams[flow_key].append({
                'packet': pkt,
                'timestamp': float(pkt.time),
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'src_port': src_port,
                'dst_port': dst_port,
                'payload': pkt[Raw].load
            })
    
    # 第二步：从TCP流中提取HTTP会话
    for flow_key, stream_packets in tcp_streams.items():
        # 按时间排序
        stream_packets.sort(key=lambda x: x['timestamp'])
        
        # 检查是否包含HTTP流量
        http_packets = []
        for pkt_info in stream_packets:
            try:
                payload = pkt_info['payload']
                if isinstance(payload, bytes):
                    payload_str = payload.decode('utf-8', errors='ignore')
                    
                    # 检测HTTP请求/响应
                    if (payload_str.startswith(('GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ')) or
                        payload_str.startswith('HTTP/')):
                        http_packets.append(pkt_info)
                        
            except:
                continue
        
        if not http_packets:
            continue
            
        # 第三步：重建HTTP会话
        current_session = None
        
        for pkt_info in http_packets:
            try:
                payload_str = pkt_info['payload'].decode('utf-8', errors='ignore')
                
                # 检测HTTP请求
                if payload_str.startswith(('GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ')):
                    # 解析HTTP请求
                    request_data = parse_http_request(payload_str, pkt_info)
                    if request_data:
                        current_session = request_data
                        current_session['flow_key'] = str(flow_key)
                        current_session['request_timestamp'] = pkt_info['timestamp']
                        
                # 检测HTTP响应
                elif payload_str.startswith('HTTP/') and current_session:
                    # 解析HTTP响应
                    response_data = parse_http_response(payload_str, pkt_info)
                    if response_data:
                        current_session.update(response_data)
                        current_session['response_timestamp'] = pkt_info['timestamp']
                        current_session['response_time'] = (
                            pkt_info['timestamp'] - current_session['request_timestamp']
                        ) * 1000  # 转换为毫秒
                        
                        # 会话完成，添加到结果
                        http_sessions.append(current_session)
                        current_session = None
                        
            except Exception as e:
                continue
    
    # 按时间排序并限制返回数量
    http_sessions.sort(key=lambda x: x.get('request_timestamp', 0))
    
    return {
        "total_sessions": len(http_sessions),
        "sessions": http_sessions[:50],  # 返回前50个会话，避免数据过大
        "summary": {
            "unique_hosts": len(set(s.get('host', '') for s in http_sessions if s.get('host'))),
            "methods": list(set(s.get('method', '') for s in http_sessions if s.get('method'))),
            "status_codes": list(set(s.get('status_code', 0) for s in http_sessions if s.get('status_code')))
        }
    }

def parse_http_request(payload_str, pkt_info):
    """解析HTTP请求"""
    try:
        lines = payload_str.split('\r\n')
        if not lines:
            return None
            
        # 解析请求行
        request_line = lines[0]
        parts = request_line.split(' ')
        if len(parts) < 3:
            return None
            
        method = parts[0]
        url = parts[1]
        version = parts[2]
        
        # 解析头部
        headers = {}
        body = ""
        body_start = False
        
        for line in lines[1:]:
            if not body_start:
                if line == "":
                    body_start = True
                    continue
                if ":" in line:
                    key, value = line.split(":", 1)
                    headers[key.strip().lower()] = value.strip()
            else:
                body += line + "\n"
        
        return {
            'method': method,
            'url': url,
            'version': version,
            'host': headers.get('host', ''),
            'user_agent': headers.get('user-agent', ''),
            'content_type': headers.get('content-type', ''),
            'content_length': headers.get('content-length', ''),
            'request_headers': headers,
            'request_body': body.strip() if body.strip() else None,
            'src_ip': pkt_info['src_ip'],
            'dst_ip': pkt_info['dst_ip'],
            'src_port': pkt_info['src_port'],
            'dst_port': pkt_info['dst_port']
        }
        
    except Exception:
        return None

def parse_http_response(payload_str, pkt_info):
    """解析HTTP响应"""
    try:
        lines = payload_str.split('\r\n')
        if not lines:
            return None
            
        # 解析状态行
        status_line = lines[0]
        parts = status_line.split(' ')
        if len(parts) < 2:
            return None
            
        version = parts[0]
        status_code = int(parts[1])
        status_text = ' '.join(parts[2:]) if len(parts) > 2 else ''
        
        # 解析头部
        headers = {}
        body = ""
        body_start = False
        
        for line in lines[1:]:
            if not body_start:
                if line == "":
                    body_start = True
                    continue
                if ":" in line:
                    key, value = line.split(":", 1)
                    headers[key.strip().lower()] = value.strip()
            else:
                body += line + "\n"
        
        return {
            'status_code': status_code,
            'status_text': status_text,
            'response_version': version,
            'response_headers': headers,
            'response_body': body.strip() if body.strip() else None,
            'content_length_response': headers.get('content-length', ''),
            'content_type_response': headers.get('content-type', ''),
            'server': headers.get('server', '')
        }
        
    except Exception:
        return None

def detect_anomalies(packets):
    """增强异常检测"""
    anomalies = []
    
    if not packets:
        return anomalies
    
    # 收集统计数据
    total_packets = len(packets)
    ip_connections = defaultdict(set)  # 每个IP连接的端口数
    port_scan_ips = defaultdict(set)   # 扫描端口的IP
    failed_connections = defaultdict(int)  # 失败连接计数
    packet_sizes = []
    
    for pkt in packets:
        if IP in pkt:
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            
            # 收集包大小
            packet_sizes.append(len(pkt))
            
            if TCP in pkt:
                dst_port = pkt[TCP].dport
                ip_connections[src_ip].add(dst_port)
                
                # 检测TCP RST或FIN（可能的失败连接）
                flags = pkt[TCP].flags
                if flags & 0x04:  # RST flag
                    failed_connections[f"{src_ip}->{dst_ip}:{dst_port}"] += 1
                    
            elif UDP in pkt:
                dst_port = pkt[UDP].dport
                ip_connections[src_ip].add(dst_port)
    
    # 1. 检测大量ICMP流量
    icmp_count = sum(1 for pkt in packets if ICMP in pkt)
    icmp_percentage = (icmp_count / total_packets) * 100
    
    if icmp_percentage > 10:
        anomalies.append({
            "type": "high_icmp_traffic",
            "severity": "medium",
            "description": f"ICMP流量过高: {icmp_percentage:.1f}%",
            "details": {
                "count": icmp_count,
                "percentage": icmp_percentage
            }
        })
    
    # 2. 检测端口扫描
    for ip, ports in ip_connections.items():
        if len(ports) > 50:  # 连接超过50个不同端口
            anomalies.append({
                "type": "port_scan_detected",
                "severity": "high",
                "description": f"检测到端口扫描: {ip} 连接了 {len(ports)} 个端口",
                "details": {
                    "source_ip": ip,
                    "port_count": len(ports)
                }
            })
    
    # 3. 检测DDoS攻击特征
    ip_packet_count = Counter(pkt[IP].src for pkt in packets if IP in pkt)
    max_packets_per_ip = max(ip_packet_count.values()) if ip_packet_count else 0
    avg_packets_per_ip = sum(ip_packet_count.values()) / len(ip_packet_count) if ip_packet_count else 0
    
    if max_packets_per_ip > avg_packets_per_ip * 10 and max_packets_per_ip > 100:
        top_ip = ip_packet_count.most_common(1)[0]
        anomalies.append({
            "type": "potential_ddos",
            "severity": "high",
            "description": f"检测到潜在DDoS攻击: {top_ip[0]} 发送了 {top_ip[1]} 个包",
            "details": {
                "source_ip": top_ip[0],
                "packet_count": top_ip[1],
                "avg_packets_per_ip": int(avg_packets_per_ip)
            }
        })
    
    # 4. 检测异常端口使用
    port_counts = Counter()
    for pkt in packets:
        if TCP in pkt:
            port_counts[pkt[TCP].dport] += 1
        elif UDP in pkt:
            port_counts[pkt[UDP].dport] += 1
    
    # 检测非标准端口的大量流量
    unusual_ports = [port for port, count in port_counts.items() 
                    if port > 10000 and count > total_packets * 0.05]
    
    for port in unusual_ports:
        anomalies.append({
            "type": "unusual_port_activity",
            "severity": "medium",
            "description": f"异常端口活动: 端口 {port} 有大量流量",
            "details": {
                "port": port,
                "packet_count": port_counts[port]
            }
        })
    
    # 5. 检测包大小异常
    if packet_sizes:
        avg_size = sum(packet_sizes) / len(packet_sizes)
        large_packets = [size for size in packet_sizes if size > avg_size * 5]
        
        if len(large_packets) > total_packets * 0.1:  # 超过10%的包异常大
            anomalies.append({
                "type": "unusual_packet_sizes",
                "severity": "low",
                "description": f"检测到异常大的数据包: {len(large_packets)} 个包大小异常",
                "details": {
                    "large_packet_count": len(large_packets),
                    "avg_size": int(avg_size)
                }
            })
    
    # 6. 检测大量失败连接
    total_failed = sum(failed_connections.values())
    if total_failed > total_packets * 0.2:  # 超过20%的连接失败
        anomalies.append({
            "type": "high_connection_failures",
            "severity": "medium",
            "description": f"大量连接失败: {total_failed} 个失败连接",
            "details": {
                "failed_count": total_failed
            }
        })
    
    return anomalies

def analyze_smart_insights(packets):
    """智能诊断规则引擎 - 让非专家也能理解网络问题"""
    insights = {
        "performance_issues": [],
        "security_concerns": [],
        "optimization_suggestions": [],
        "error_patterns": [],
        "overall_health": "good"  # good, warning, critical
    }
    
    try:
        # 首先获取HTTP会话数据用于分析
        http_sessions_data = analyze_http_sessions(packets)
        sessions = http_sessions_data.get("sessions", [])
        
        if not sessions:
            insights["overall_health"] = "warning"
            insights["performance_issues"].append({
                "type": "no_http_traffic",
                "title": "未检测到HTTP流量",
                "description": "网络流量中没有发现HTTP会话，可能全部为加密流量(HTTPS)或其他协议",
                "severity": "low",
                "suggestion": "这是正常现象，现代网站通常使用HTTPS加密"
            })
            return insights
        
        # 性能问题分析
        insights["performance_issues"] = analyze_performance_issues(sessions)
        
        # 错误模式分析  
        insights["error_patterns"] = analyze_error_patterns(sessions)
        
        # 安全问题分析
        insights["security_concerns"] = analyze_security_concerns(sessions)
        
        # 优化建议分析
        insights["optimization_suggestions"] = analyze_optimization_suggestions(sessions)
        
        # 综合健康状态评估
        insights["overall_health"] = calculate_overall_health(insights)
        
        return insights
        
    except Exception as e:
        return {
            "performance_issues": [],
            "security_concerns": [],
            "optimization_suggestions": [],
            "error_patterns": [],
            "overall_health": "warning",
            "error": f"智能分析出错: {str(e)}"
        }

def analyze_performance_issues(sessions):
    """分析性能问题"""
    issues = []
    
    # 1. 慢查询API检测
    slow_requests = [s for s in sessions if s.get('response_time', 0) > 2000]  # >2秒
    if slow_requests:
        avg_slow_time = sum(s.get('response_time', 0) for s in slow_requests) / len(slow_requests)
        issues.append({
            "type": "slow_api_requests",
            "title": "发现慢查询API",
            "description": f"有 {len(slow_requests)} 个API请求响应时间超过2秒，平均 {avg_slow_time:.0f}ms",
            "severity": "high" if len(slow_requests) > 5 else "medium",
            "suggestion": "检查服务器性能、数据库查询或网络延迟问题",
            "details": {
                "slow_count": len(slow_requests),
                "avg_response_time": avg_slow_time,
                "slowest_urls": [s.get('url', '')[:50] for s in sorted(slow_requests, key=lambda x: x.get('response_time', 0), reverse=True)[:3]]
            }
        })
    
    # 2. 高延迟模式检测
    response_times = [s.get('response_time', 0) for s in sessions if s.get('response_time')]
    if response_times:
        avg_response_time = sum(response_times) / len(response_times)
        if avg_response_time > 1000:  # 平均响应时间>1秒
            issues.append({
                "type": "high_average_latency",
                "title": "整体网络延迟较高",
                "description": f"平均响应时间 {avg_response_time:.0f}ms，建议值应小于500ms",
                "severity": "medium",
                "suggestion": "检查网络连接质量、CDN配置或服务器地理位置",
                "details": {
                    "avg_response_time": avg_response_time,
                    "total_requests": len(response_times)
                }
            })
    
    # 3. 重复请求检测
    url_counts = {}
    for session in sessions:
        url = session.get('url', '')
        if url:
            url_counts[url] = url_counts.get(url, 0) + 1
    
    repeated_urls = [(url, count) for url, count in url_counts.items() if count > 3]
    if repeated_urls:
        issues.append({
            "type": "repeated_requests",
            "title": "发现重复请求",
            "description": f"有 {len(repeated_urls)} 个URL被重复请求多次，可能缺少缓存机制",
            "severity": "medium",
            "suggestion": "实施HTTP缓存策略或优化前端资源加载逻辑",
            "details": {
                "repeated_urls": [(url[:50], count) for url, count in sorted(repeated_urls, key=lambda x: x[1], reverse=True)[:5]]
            }
        })
    
    return issues

def analyze_error_patterns(sessions):
    """分析错误模式"""
    patterns = []
    
    # 1. 4xx客户端错误分析
    client_errors = [s for s in sessions if 400 <= s.get('status_code', 0) < 500]
    if client_errors:
        error_counts = {}
        for session in client_errors:
            code = session.get('status_code')
            error_counts[code] = error_counts.get(code, 0) + 1
        
        patterns.append({
            "type": "client_errors",
            "title": "客户端错误频发",
            "description": f"发现 {len(client_errors)} 个4xx错误，主要为: {', '.join(f'{code}({count}次)' for code, count in sorted(error_counts.items()))}",
            "severity": "high" if len(client_errors) > 10 else "medium",
            "suggestion": "检查前端代码、API调用路径或权限配置",
            "details": {
                "error_count": len(client_errors),
                "error_breakdown": error_counts,
                "sample_urls": [s.get('url', '')[:50] for s in client_errors[:3]]
            }
        })
    
    # 2. 5xx服务器错误分析
    server_errors = [s for s in sessions if s.get('status_code', 0) >= 500]
    if server_errors:
        patterns.append({
            "type": "server_errors",
            "title": "服务器错误警告",
            "description": f"发现 {len(server_errors)} 个5xx错误，服务器可能存在问题",
            "severity": "critical",
            "suggestion": "立即检查服务器日志、数据库连接或系统资源",
            "details": {
                "error_count": len(server_errors),
                "sample_urls": [s.get('url', '')[:50] for s in server_errors[:3]]
            }
        })
    
    # 3. 重定向链分析
    redirects = [s for s in sessions if 300 <= s.get('status_code', 0) < 400]
    if len(redirects) > len(sessions) * 0.2:  # 超过20%的请求是重定向
        patterns.append({
            "type": "excessive_redirects",
            "title": "重定向过多",
            "description": f"有 {len(redirects)} 个重定向响应({len(redirects)/len(sessions)*100:.1f}%)，可能影响性能",
            "severity": "medium",
            "suggestion": "优化URL结构，减少不必要的重定向",
            "details": {
                "redirect_count": len(redirects),
                "redirect_percentage": len(redirects)/len(sessions)*100
            }
        })
    
    return patterns

def analyze_security_concerns(sessions):
    """分析安全问题"""
    concerns = []
    
    # 1. HTTP明文传输检测
    http_sessions = [s for s in sessions if s.get('dst_port') == 80]
    if http_sessions:
        concerns.append({
            "type": "http_plaintext",
            "title": "发现HTTP明文传输",
            "description": f"有 {len(http_sessions)} 个HTTP请求使用明文传输，存在安全风险",
            "severity": "medium",
            "suggestion": "升级到HTTPS加密传输，保护用户数据安全",
            "details": {
                "http_count": len(http_sessions),
                "sample_hosts": list(set([s.get('host', '')[:30] for s in http_sessions[:5] if s.get('host')]))
            }
        })
    
    # 2. 敏感信息检测
    sensitive_patterns = []
    for session in sessions:
        url = session.get('url', '')
        # 检测URL中的潜在敏感信息
        if any(keyword in url.lower() for keyword in ['password', 'key', 'token', 'secret', 'auth']):
            sensitive_patterns.append(url[:50])
    
    if sensitive_patterns:
        concerns.append({
            "type": "sensitive_data_in_url",
            "title": "URL中可能包含敏感信息",
            "description": f"在 {len(sensitive_patterns)} 个URL中发现可能的敏感信息",
            "severity": "high",
            "suggestion": "避免在URL中传递密码、密钥等敏感信息，使用POST请求体或HTTP头部",
            "details": {
                "sensitive_urls": sensitive_patterns[:3]
            }
        })
    
    # 3. Cookie安全检测
    insecure_cookies = []
    for session in sessions:
        headers = session.get('response_headers', {})
        set_cookie = headers.get('set-cookie', '')
        if set_cookie and 'secure' not in set_cookie.lower():
            insecure_cookies.append(session.get('host', ''))
    
    if insecure_cookies:
        unique_hosts = list(set(insecure_cookies))
        concerns.append({
            "type": "insecure_cookies",
            "title": "Cookie缺少安全标志",
            "description": f"{len(unique_hosts)} 个域名的Cookie未设置Secure标志",
            "severity": "medium",
            "suggestion": "为Cookie添加Secure和HttpOnly标志，提高安全性",
            "details": {
                "affected_hosts": unique_hosts[:5]
            }
        })
    
    return concerns

def analyze_optimization_suggestions(sessions):
    """分析优化建议"""
    suggestions = []
    
    # 1. 缓存优化建议
    no_cache_sessions = []
    for session in sessions:
        headers = session.get('response_headers', {})
        cache_control = headers.get('cache-control', '').lower()
        if 'no-cache' in cache_control or not cache_control:
            no_cache_sessions.append(session)
    
    if len(no_cache_sessions) > len(sessions) * 0.3:  # 超过30%无缓存
        suggestions.append({
            "type": "cache_optimization",
            "title": "缺少HTTP缓存策略",
            "description": f"{len(no_cache_sessions)} 个响应未设置缓存策略，影响性能",
            "severity": "medium",
            "suggestion": "为静态资源设置适当的Cache-Control头部，减少重复请求",
            "details": {
                "no_cache_count": len(no_cache_sessions),
                "percentage": len(no_cache_sessions)/len(sessions)*100
            }
        })
    
    # 2. 压缩优化建议
    large_responses = [s for s in sessions if s.get('content_length_response') and 
                      s.get('content_length_response').isdigit() and 
                      int(s.get('content_length_response')) > 100000]  # >100KB
    
    uncompressed_large = []
    for session in large_responses:
        headers = session.get('response_headers', {})
        if 'gzip' not in headers.get('content-encoding', ''):
            uncompressed_large.append(session)
    
    if uncompressed_large:
        suggestions.append({
            "type": "compression_optimization",
            "title": "大文件未启用压缩",
            "description": f"{len(uncompressed_large)} 个大文件响应未启用gzip压缩",
            "severity": "medium",
            "suggestion": "为大文件启用gzip压缩，可减少50-70%的传输大小",
            "details": {
                "uncompressed_count": len(uncompressed_large),
                "sample_urls": [s.get('url', '')[:50] for s in uncompressed_large[:3]]
            }
        })
    
    # 3. 资源合并建议
    js_css_requests = [s for s in sessions if any(ext in s.get('url', '') for ext in ['.js', '.css'])]
    if len(js_css_requests) > 10:
        suggestions.append({
            "type": "resource_bundling",
            "title": "静态资源请求过多",
            "description": f"发现 {len(js_css_requests)} 个JS/CSS请求，建议合并减少请求数",
            "severity": "low",
            "suggestion": "使用Webpack等工具合并静态资源，减少HTTP请求数量",
            "details": {
                "js_css_count": len(js_css_requests)
            }
        })
    
    return suggestions

def calculate_overall_health(insights):
    """计算整体健康状态"""
    critical_count = 0
    high_count = 0
    medium_count = 0
    
    # 统计各种严重程度的问题
    for category in ['performance_issues', 'error_patterns', 'security_concerns', 'optimization_suggestions']:
        for issue in insights.get(category, []):
            severity = issue.get('severity', 'low')
            if severity == 'critical':
                critical_count += 1
            elif severity == 'high':
                high_count += 1
            elif severity == 'medium':
                medium_count += 1
    
    # 根据问题严重程度决定整体健康状态
    if critical_count > 0:
        return "critical"
    elif high_count > 2 or medium_count > 5:
        return "warning"
    elif high_count > 0 or medium_count > 2:
        return "warning"
    else:
        return "good"

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": {"message": "参数错误"}}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    config_json = sys.argv[2]
    
    try:
        config = json.loads(config_json)
        results = analyze_pcap(file_path, config)
        print(json.dumps(results, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": {"message": str(e)}}))
        sys.exit(1)

if __name__ == "__main__":
    main() 