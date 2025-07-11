import React from 'react';
import { Layout, Typography, Space, Divider } from 'antd';
import { CopyrightOutlined, HeartFilled } from '@ant-design/icons';

const { Footer } = Layout;
const { Text, Link } = Typography;

const AppFooter = () => {
  return (
    <Footer style={{ 
      textAlign: 'center', 
      background: '#f0f2f5',
      padding: '24px 50px',
      borderTop: '1px solid #e8e8e8'
    }}>
      <Space split={<Divider type="vertical" />} size="middle">
        <Text type="secondary">
          <CopyrightOutlined /> 2024 NetInsight
        </Text>
        <Text type="secondary">
          企业级网络数据分析平台
        </Text>
        <Text type="secondary">
          版本 v2.0.0
        </Text>
      </Space>
      
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          使用 <HeartFilled style={{ color: '#ff4d4f' }} /> 构建 | 
          <Link href="#" style={{ marginLeft: 4 }}>隐私政策</Link> | 
          <Link href="#" style={{ marginLeft: 4 }}>服务条款</Link> | 
          <Link href="#" style={{ marginLeft: 4 }}>技术支持</Link>
        </Text>
      </div>
    </Footer>
  );
};

export default AppFooter; 