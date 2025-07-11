import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Form, 
  Input, 
  Switch, 
  Button, 
  Select, 
  Slider,
  Row,
  Col,
  Divider,
  message,
  Alert,
  Tabs
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  DatabaseOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // 模拟保存设置
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('设置已保存');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('设置已重置');
  };

  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined />
          通用设置
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            language: 'zh-CN',
            theme: 'light',
            timezone: 'Asia/Shanghai',
            autoSave: true,
            pageSize: 20,
            maxFileSize: 100,
            enableDebug: false
          }}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="界面语言"
                name="language"
                rules={[{ required: true, message: '请选择界面语言' }]}
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                  <Option value="ja-JP">日本語</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="主题模式"
                name="theme"
                rules={[{ required: true, message: '请选择主题模式' }]}
              >
                <Select>
                  <Option value="light">亮色主题</Option>
                  <Option value="dark">暗色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="时区设置"
                name="timezone"
                rules={[{ required: true, message: '请选择时区' }]}
              >
                <Select>
                  <Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Option>
                  <Option value="America/New_York">America/New_York (UTC-5)</Option>
                  <Option value="Europe/London">Europe/London (UTC+0)</Option>
                  <Option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="分页大小"
                name="pageSize"
                rules={[{ required: true, message: '请设置分页大小' }]}
              >
                <Select>
                  <Option value={10}>10 条/页</Option>
                  <Option value={20}>20 条/页</Option>
                  <Option value={50}>50 条/页</Option>
                  <Option value={100}>100 条/页</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="最大文件大小 (MB)"
                name="maxFileSize"
              >
                <Slider
                  min={10}
                  max={500}
                  marks={{
                    10: '10MB',
                    100: '100MB',
                    250: '250MB',
                    500: '500MB'
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="自动保存"
                name="autoSave"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="启用调试模式"
                name="enableDebug"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )
    },
    {
      key: 'user',
      label: (
        <span>
          <UserOutlined />
          用户设置
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          initialValues={{
            username: 'admin',
            email: 'admin@example.com',
            department: 'IT部门',
            role: 'administrator'
          }}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱地址"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="部门"
                name="department"
              >
                <Select>
                  <Option value="IT部门">IT部门</Option>
                  <Option value="安全部门">安全部门</Option>
                  <Option value="运维部门">运维部门</Option>
                  <Option value="研发部门">研发部门</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色"
                name="role"
              >
                <Select disabled>
                  <Option value="administrator">管理员</Option>
                  <Option value="analyst">分析师</Option>
                  <Option value="viewer">查看者</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>修改密码</Title>
          <Row gutter={[24, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="当前密码"
                name="currentPassword"
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="新密码"
                name="newPassword"
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="确认密码"
                name="confirmPassword"
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          通知设置
        </span>
      ),
      children: (
        <div>
          <Alert
            message="通知设置"
            description="配置系统通知的接收方式和类型"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          
          <Form
            layout="vertical"
            initialValues={{
              emailNotifications: true,
              analysisComplete: true,
              systemAlerts: true,
              weeklyReport: false,
              browserNotifications: true
            }}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="邮件通知"
                  name="emailNotifications"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="分析完成通知"
                  name="analysisComplete"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="系统告警"
                  name="systemAlerts"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="浏览器通知"
                  name="browserNotifications"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="周报推送"
                  name="weeklyReport"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      )
    },
    {
      key: 'system',
      label: (
        <span>
          <DatabaseOutlined />
          系统设置
        </span>
      ),
      children: (
        <div>
          <Alert
            message="系统设置"
            description="这些设置需要管理员权限，修改后可能需要重启服务"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            layout="vertical"
            initialValues={{
              maxConcurrentTasks: 5,
              dataRetentionDays: 90,
              enableLogging: true,
              logLevel: 'info',
              enableCache: true,
              cacheSize: 1024
            }}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="最大并发任务数"
                  name="maxConcurrentTasks"
                >
                  <Slider
                    min={1}
                    max={20}
                    marks={{
                      1: '1',
                      5: '5',
                      10: '10',
                      20: '20'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="数据保留天数"
                  name="dataRetentionDays"
                >
                  <Slider
                    min={7}
                    max={365}
                    marks={{
                      7: '7天',
                      30: '30天',
                      90: '90天',
                      365: '365天'
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="日志级别"
                  name="logLevel"
                >
                  <Select>
                    <Option value="debug">Debug</Option>
                    <Option value="info">Info</Option>
                    <Option value="warn">Warning</Option>
                    <Option value="error">Error</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="缓存大小 (MB)"
                  name="cacheSize"
                >
                  <Slider
                    min={256}
                    max={4096}
                    marks={{
                      256: '256MB',
                      1024: '1GB',
                      2048: '2GB',
                      4096: '4GB'
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="启用日志记录"
                  name="enableLogging"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="启用缓存"
                  name="enableCache"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      )
    }
  ];

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div>
          <Title level={2} className="page-title">
            系统设置
          </Title>
          <Text className="page-description">
            配置系统参数和个人偏好设置
          </Text>
        </div>
      </div>

      <Card className="dashboard-card">
        <Tabs items={tabItems} />

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <Button onClick={handleReset}>
            <ReloadOutlined />
            重置
          </Button>
          <Button 
            type="primary" 
            loading={loading}
            onClick={() => form.submit()}
          >
            <SaveOutlined />
            保存设置
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings; 