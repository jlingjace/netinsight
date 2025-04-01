import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, Radio, Switch, Spin, Alert, message, Typography, Divider } from 'antd';
import { FileOutlined, BarChartOutlined, SafetyOutlined, ApiOutlined, ClusterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './Generate.css';

const { Option } = Select;
const { Title, Text } = Typography;

interface FileType {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_time: string;
  status: string;
}

const GenerateReport: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [fileLoading, setFileLoading] = useState<boolean>(true);
  const [files, setFiles] = useState<FileType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 模拟获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setFileLoading(true);
        // 模拟API请求延迟
        await new Promise(resolve => setTimeout(resolve, 800));

        // 示例文件数据
        const mockFiles: FileType[] = [
          {
            id: '1',
            file_name: 'corporate_network_traffic.pcap',
            file_type: 'pcap',
            file_size: 15728640, // 15MB
            upload_time: '2023-03-14T10:30:00Z',
            status: 'processed'
          },
          {
            id: '2',
            file_name: 'website_traffic.har',
            file_type: 'har',
            file_size: 2097152, // 2MB
            upload_time: '2023-03-15T09:45:00Z',
            status: 'processed'
          },
          {
            id: '3',
            file_name: 'security_scan.pcap',
            file_type: 'pcap',
            file_size: 8388608, // 8MB
            upload_time: '2023-03-15T14:20:00Z',
            status: 'processed'
          }
        ];

        setFiles(mockFiles);
      } catch (err) {
        setError('获取文件列表失败，请稍后重试');
        console.error('获取文件列表失败:', err);
      } finally {
        setFileLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      console.log('提交的报告配置:', values);

      // 模拟API请求延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 模拟成功响应
      const mockResponse = {
        report_id: '123456789',
        status: 'success'
      };

      // 显示成功消息
      message.success('报告创建成功，正在处理数据...');

      // 重定向到报告详情页
      navigate(`/reports/${mockResponse.report_id}`);
    } catch (err) {
      setError('创建报告失败，请稍后重试');
      console.error('创建报告失败:', err);
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  return (
    <div className="generate-report-container">
      <Card className="generate-form-card">
        <Title level={3}>生成分析报告</Title>
        <Text type="secondary" className="form-subtitle">
          选择需要分析的网络流量文件并配置分析选项
        </Text>
        <Divider />

        {error && (
          <Alert message={error} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            report_type: 'comprehensive',
            include_topology: true,
            include_security: true,
            include_performance: true,
            enable_advanced_analysis: false
          }}
        >
          <Form.Item
            name="file_id"
            label="选择文件"
            rules={[{ required: true, message: '请选择要分析的文件' }]}
          >
            <Select
              placeholder="选择要分析的文件"
              loading={fileLoading}
              disabled={loading}
            >
              {files.map(file => (
                <Option key={file.id} value={file.id}>
                  <div className="file-option">
                    <FileOutlined className="file-icon" />
                    <div className="file-info">
                      <div className="file-name">{file.file_name}</div>
                      <div className="file-meta">
                        {file.file_type.toUpperCase()} | {formatFileSize(file.file_size)} | 上传于 {new Date(file.upload_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="报告标题"
            rules={[{ required: true, message: '请输入报告标题' }]}
          >
            <Input placeholder="输入报告标题" disabled={loading} />
          </Form.Item>

          <Form.Item
            name="report_type"
            label="分析类型"
            rules={[{ required: true, message: '请选择分析类型' }]}
          >
            <Radio.Group disabled={loading}>
              <Radio.Button value="comprehensive">
                <BarChartOutlined /> 综合分析
              </Radio.Button>
              <Radio.Button value="security">
                <SafetyOutlined /> 安全分析
              </Radio.Button>
              <Radio.Button value="performance">
                <ApiOutlined /> 性能分析
              </Radio.Button>
              <Radio.Button value="topology">
                <ClusterOutlined /> 网络拓扑
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="分析选项">
            <Card className="analysis-options-card">
              <Form.Item name="include_topology" valuePropName="checked">
                <Switch disabled={loading} /> 包含网络拓扑分析
              </Form.Item>
              <Form.Item name="include_security" valuePropName="checked">
                <Switch disabled={loading} /> 包含安全威胁检测
              </Form.Item>
              <Form.Item name="include_performance" valuePropName="checked">
                <Switch disabled={loading} /> 包含性能瓶颈分析
              </Form.Item>
              <Form.Item name="enable_advanced_analysis" valuePropName="checked">
                <Switch disabled={loading} /> 启用高级分析引擎（处理时间更长）
              </Form.Item>
            </Card>
          </Form.Item>

          <Form.Item className="form-actions">
            <Button type="primary" htmlType="submit" loading={loading} disabled={fileLoading}>
              生成报告
            </Button>
            <Button onClick={() => navigate('/reports')} disabled={loading} style={{ marginLeft: 8 }}>
              取消
            </Button>
          </Form.Item>
        </Form>

        {loading && (
          <div className="form-loading-overlay">
            <Spin tip="正在创建报告..." />
          </div>
        )}
      </Card>
    </div>
  );
};

export default GenerateReport; 