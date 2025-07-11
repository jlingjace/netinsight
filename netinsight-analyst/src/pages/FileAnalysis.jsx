import React from 'react';
import { Typography, Row, Col, Card } from 'antd';
import FileUploader from '../components/FileUploader';

const { Title, Text } = Typography;

const FileAnalysis = () => {
  return (
    <div className="page-container">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: 8, fontSize: 24, fontWeight: 600, color: '#262626' }}>
              文件分析
            </Title>
            <Text style={{ margin: 0, color: '#8c8c8c', fontSize: 14 }}>
              上传和分析网络数据包文件
            </Text>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{ marginTop: 24 }}>
        <FileUploader />
        
        {/* 使用说明 */}
        <Card 
          title="使用说明" 
          style={{ 
            marginTop: 24,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={8}>
              <div>
                <Title level={4}>支持的文件格式</Title>
                <ul>
                  <li><strong>.pcap</strong> - 标准的网络数据包捕获格式</li>
                  <li><strong>.pcapng</strong> - 新一代网络数据包捕获格式</li>
                  <li><strong>.har</strong> - HTTP Archive文件，Web请求分析</li>
                </ul>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div>
                <Title level={4}>分析功能</Title>
                <ul>
                  <li>协议识别和统计</li>
                  <li>网络流量分析</li>
                  <li>数据包时间序列分析</li>
                  <li>HTTP请求响应分析</li>
                </ul>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div>
                <Title level={4}>操作步骤</Title>
                <ul>
                  <li>1. 选择并上传文件</li>
                  <li>2. 点击"开始分析"启动分析</li>
                  <li>3. 等待分析完成</li>
                  <li>4. 查看分析结果</li>
                </ul>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default FileAnalysis; 