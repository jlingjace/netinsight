import React, { useState, useEffect } from 'react';
import { Typography, Alert } from 'antd';
import FileUploadComponent from '../../components/FileUpload';
import { authService } from '../../services/api';
import { AdminGuard, AnalystGuard } from '../../components/PermissionGuard';
import './style.css';

const { Title, Paragraph } = Typography;

const FileUploadPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userData = await authService.getUserInfo();
        setUser(userData);
      } catch (err) {
        console.error('获取用户信息失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <div className="file-upload-page">
      <div className="page-header">
        <div>
          <Title level={2}>文件上传</Title>
          <Paragraph>
            上传网络通信文件进行分析，支持HAR、pcap、pcapng格式
          </Paragraph>
        </div>
      </div>

      <AnalystGuard
        renderPlaceholder={true}
        placeholder={
          <Alert
            message="需要分析师权限"
            description="您没有权限访问文件上传功能。如需开通权限，请联系管理员升级您的账户。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        }
      >
        <FileUploadComponent />
      </AnalystGuard>
    </div>
  );
};

export default FileUploadPage; 