// 手工实现的pcap解析器
export async function parsePcap(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const buffer = e.target.result;
        const dataView = new DataView(buffer);
        
        console.log('=== PCAP解析开始 ===');
        console.log('文件名:', file.name);
        console.log('文件大小:', buffer.byteLength, '字节');
        console.log('文件类型:', file.type);
        
        let packetCount = 0;
        const protocols = {};
        const debugInfo = {
          fileSize: buffer.byteLength,
          fileName: file.name,
          parseSteps: []
        };
        
        // 检查pcap文件头部
        if (buffer.byteLength < 24) {
          const error = '文件太小，不是有效的pcap文件';
          console.error(error);
          resolve({
            packetCount: 0,
            protocols: { 'Error': 1 },
            fileSize: buffer.byteLength,
            timestamp: Date.now(),
            error: error,
            debugInfo: debugInfo
          });
          return;
        }
        
        debugInfo.parseSteps.push('文件大小检查通过');
        
        // 读取魔数
        const magic = dataView.getUint32(0, true); // little endian
        const magicBE = dataView.getUint32(0, false); // big endian
        
        console.log('Magic number (LE):', '0x' + magic.toString(16).toUpperCase());
        console.log('Magic number (BE):', '0x' + magicBE.toString(16).toUpperCase());
        
        let littleEndian = true;
        let validMagic = false;
        
        // 检查各种可能的魔数
        if (magic === 0xa1b2c3d4) {
          littleEndian = true;
          validMagic = true;
          debugInfo.parseSteps.push('检测到标准PCAP格式 (Little Endian)');
        } else if (magicBE === 0xa1b2c3d4) {
          littleEndian = false;
          validMagic = true;
          debugInfo.parseSteps.push('检测到标准PCAP格式 (Big Endian)');
        } else if (magic === 0xd4c3b2a1) {
          littleEndian = true;
          validMagic = true;
          debugInfo.parseSteps.push('检测到PCAP格式 (Little Endian, 反序)');
        } else if (magicBE === 0xd4c3b2a1) {
          littleEndian = false;
          validMagic = true;
          debugInfo.parseSteps.push('检测到PCAP格式 (Big Endian, 反序)');
        } else if (magic === 0x0a0d0d0a) {
          // PCAPNG 格式
          const error = '检测到PCAPNG格式，当前版本暂不支持';
          console.error(error);
          resolve({
            packetCount: 0,
            protocols: { 'PCAPNG': 1 },
            fileSize: buffer.byteLength,
            timestamp: Date.now(),
            error: error,
            debugInfo: debugInfo
          });
          return;
        }
        
        if (!validMagic) {
          const error = `不是有效的pcap文件格式，魔数: 0x${magic.toString(16).toUpperCase()}`;
          console.error(error);
          
          // 尝试分析文件头部的前几个字节
          const headerBytes = [];
          for (let i = 0; i < Math.min(16, buffer.byteLength); i++) {
            headerBytes.push('0x' + dataView.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
          }
          console.log('文件头部字节:', headerBytes.join(' '));
          
          resolve({
            packetCount: 0,
            protocols: { 'Invalid': 1 },
            fileSize: buffer.byteLength,
            timestamp: Date.now(),
            error: error,
            debugInfo: { ...debugInfo, headerBytes: headerBytes }
          });
          return;
        }
        
        console.log('字节序:', littleEndian ? 'Little Endian' : 'Big Endian');
        
        // 读取版本信息
        const versionMajor = dataView.getUint16(4, littleEndian);
        const versionMinor = dataView.getUint16(6, littleEndian);
        const snaplen = dataView.getUint32(16, littleEndian);
        const linkType = dataView.getUint32(20, littleEndian);
        
        console.log(`版本: ${versionMajor}.${versionMinor}`);
        console.log('链路类型:', linkType, getLinkTypeName(linkType));
        console.log('快照长度:', snaplen);
        
        debugInfo.parseSteps.push(`版本: ${versionMajor}.${versionMinor}, 链路类型: ${linkType}`);
        
        // 开始解析包
        let offset = 24; // 跳过全局头部
        let parseErrors = 0;
        
        console.log('开始解析数据包...');
        
        while (offset + 16 <= buffer.byteLength) {
          try {
            // 读取包头部（16字节）
            const tsSec = dataView.getUint32(offset, littleEndian);
            const tsUsec = dataView.getUint32(offset + 4, littleEndian);
            const inclLen = dataView.getUint32(offset + 8, littleEndian);
            const origLen = dataView.getUint32(offset + 12, littleEndian);
            
            console.log(`包 ${packetCount + 1}: 时间=${tsSec}.${tsUsec}, 捕获长度=${inclLen}, 原始长度=${origLen}`);
            
            // 检查包长度是否合理
            if (inclLen > snaplen || inclLen > 65535) {
              console.warn(`包 ${packetCount + 1} 长度异常: ${inclLen}, 跳过`);
              parseErrors++;
              break;
            }
            
            // 检查包数据是否完整
            if (offset + 16 + inclLen > buffer.byteLength) {
              console.log('包数据不完整，停止解析');
              break;
            }
            
            packetCount++;
            
            // 解析包数据
            const packetData = new Uint8Array(buffer, offset + 16, inclLen);
            const protocol = analyzePacket(packetData, linkType);
            
            protocols[protocol] = (protocols[protocol] || 0) + 1;
            
            // 移动到下一个包
            offset += 16 + inclLen;
            
            // 限制解析包数量，避免处理过大文件时卡住
            if (packetCount >= 10000) {
              console.log('达到最大解析包数量限制，停止解析');
              break;
            }
            
          } catch (err) {
            console.error(`解析包 ${packetCount + 1} 时出错:`, err);
            parseErrors++;
            if (parseErrors > 10) {
              console.error('解析错误过多，停止解析');
              break;
            }
            // 尝试跳过这个包
            offset += 16;
          }
        }
        
        console.log('=== 解析完成 ===');
        console.log('总包数:', packetCount);
        console.log('协议统计:', protocols);
        console.log('解析错误:', parseErrors);
        
        debugInfo.parseSteps.push(`解析完成: ${packetCount}个包, ${parseErrors}个错误`);
        
        // 如果没有解析到任何包，返回错误信息
        if (packetCount === 0) {
          const error = '未能解析到任何数据包';
          console.error(error);
          resolve({
            packetCount: 0,
            protocols: { 'NoPackets': 1 },
            fileSize: buffer.byteLength,
            timestamp: Date.now(),
            error: error,
            debugInfo: debugInfo
          });
          return;
        }
        
        resolve({ 
          packetCount, 
          protocols,
          fileSize: buffer.byteLength,
          timestamp: Date.now(),
          debugInfo: debugInfo
        });
        
      } catch (err) {
        console.error('解析pcap文件失败:', err);
        reject(new Error('解析pcap文件失败: ' + err.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// 获取链路类型名称
function getLinkTypeName(linkType) {
  const linkTypes = {
    0: 'NULL',
    1: 'ETHERNET',
    6: 'TOKEN_RING',
    7: 'ARCNET',
    8: 'SLIP',
    9: 'PPP',
    10: 'FDDI',
    101: 'RAW_IP',
    105: 'IEEE802_11',
    113: 'LINUX_SLL',
    127: 'IEEE802_11_RADIOTAP'
  };
  return linkTypes[linkType] || `UNKNOWN(${linkType})`;
}

// 分析包内容，识别协议
function analyzePacket(data, linkType) {
  try {
    console.log(`分析包: 长度=${data.length}, 链路类型=${linkType}`);
    
    // 根据链路类型解析
    if (linkType === 1) { // Ethernet
      return analyzeEthernet(data);
    } else if (linkType === 101) { // Raw IP
      return analyzeIP(data);
    } else if (linkType === 113) { // Linux SLL
      return analyzeLinuxSLL(data);
    } else if (linkType === 105) { // IEEE 802.11
      return analyze80211(data);
    } else {
      return `LinkType-${linkType}`;
    }
  } catch (err) {
    console.log('包分析失败:', err);
    return 'ParseError';
  }
}

// 分析Linux SLL (Linux cooked capture)
function analyzeLinuxSLL(data) {
  if (data.length < 16) {
    return 'SLL-Short';
  }
  
  // SLL header: 16 bytes
  const protocolType = (data[14] << 8) | data[15];
  
  switch (protocolType) {
    case 0x0800:
      return analyzeIP(data.slice(16));
    case 0x0806:
      return 'ARP';
    case 0x86DD:
      return 'IPv6';
    default:
      return `SLL-0x${protocolType.toString(16)}`;
  }
}

// 分析802.11无线帧
function analyze80211(data) {
  if (data.length < 24) {
    return '802.11-Short';
  }
  
  const frameControl = data[0];
  const frameType = (frameControl >> 2) & 0x03;
  const frameSubtype = (frameControl >> 4) & 0x0F;
  
  switch (frameType) {
    case 0:
      return '802.11-Management';
    case 1:
      return '802.11-Control';
    case 2:
      return '802.11-Data';
    default:
      return '802.11-Unknown';
  }
}

// 分析以太网帧
function analyzeEthernet(data) {
  if (data.length < 14) {
    return 'Ethernet-Short';
  }
  
  // 获取EtherType（第12-13字节）
  const etherType = (data[12] << 8) | data[13];
  
  console.log(`以太网帧: EtherType=0x${etherType.toString(16)}`);
  
  switch (etherType) {
    case 0x0800:
      return analyzeIP(data.slice(14));
    case 0x0806:
      return 'ARP';
    case 0x86DD:
      return 'IPv6';
    case 0x8100:
      return 'VLAN';
    case 0x8847:
      return 'MPLS';
    case 0x8848:
      return 'MPLS-Multicast';
    default:
      return `Ethernet-0x${etherType.toString(16)}`;
  }
}

// 分析IP包
function analyzeIP(data) {
  if (data.length < 20) {
    return 'IP-Short';
  }
  
  const version = (data[0] >> 4) & 0x0F;
  
  console.log(`IP包: 版本=${version}, 长度=${data.length}`);
  
  if (version === 4) {
    const protocol = data[9];
    const headerLength = (data[0] & 0x0F) * 4;
    
    console.log(`IPv4: 协议=${protocol}, 头部长度=${headerLength}`);
    
    switch (protocol) {
      case 1:
        return 'ICMP';
      case 2:
        return 'IGMP';
      case 6:
        return analyzeTCP(data.slice(headerLength));
      case 17:
        return analyzeUDP(data.slice(headerLength));
      case 47:
        return 'GRE';
      case 50:
        return 'ESP';
      case 51:
        return 'AH';
      case 89:
        return 'OSPF';
      case 132:
        return 'SCTP';
      default:
        return `IPv4-${protocol}`;
    }
  } else if (version === 6) {
    if (data.length < 40) {
      return 'IPv6-Short';
    }
    const nextHeader = data[6];
    
    console.log(`IPv6: 下一个头部=${nextHeader}`);
    
    switch (nextHeader) {
      case 6:
        return analyzeTCP(data.slice(40));
      case 17:
        return analyzeUDP(data.slice(40));
      case 58:
        return 'ICMPv6';
      case 132:
        return 'SCTP';
      default:
        return `IPv6-${nextHeader}`;
    }
  } else {
    return `IP-v${version}`;
  }
}

// 分析TCP包
function analyzeTCP(data) {
  if (data.length < 20) {
    return 'TCP-Short';
  }
  
  const srcPort = (data[0] << 8) | data[1];
  const dstPort = (data[2] << 8) | data[3];
  
  // 根据端口号识别应用层协议
  const port = Math.min(srcPort, dstPort);
  
  if (port === 80) return 'HTTP';
  if (port === 443) return 'HTTPS';
  if (port === 21) return 'FTP';
  if (port === 22) return 'SSH';
  if (port === 23) return 'Telnet';
  if (port === 25) return 'SMTP';
  if (port === 53) return 'DNS';
  if (port === 110) return 'POP3';
  if (port === 143) return 'IMAP';
  if (port === 993) return 'IMAPS';
  if (port === 995) return 'POP3S';
  
  return 'TCP';
}

// 分析UDP包
function analyzeUDP(data) {
  if (data.length < 8) {
    return 'UDP-Short';
  }
  
  const srcPort = (data[0] << 8) | data[1];
  const dstPort = (data[2] << 8) | data[3];
  
  // 根据端口号识别应用层协议
  const port = Math.min(srcPort, dstPort);
  
  if (port === 53) return 'DNS';
  if (port === 67 || port === 68) return 'DHCP';
  if (port === 69) return 'TFTP';
  if (port === 123) return 'NTP';
  if (port === 161) return 'SNMP';
  if (port === 514) return 'Syslog';
  
  return 'UDP';
} 