import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { authService } from '../services/authService';
import './Login.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // 登录处理
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await authService.login(values);
      message.success('登录成功！');
      
      // 调用成功回调
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      // 错误消息已在httpClient中处理
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const handleRegister = async (values) => {
    setLoading(true);
    try {
      await authService.register(values);
      message.success('注册成功！请登录您的账户。');
      setActiveTab('login');
    } catch (error) {
      console.error('Register failed:', error);
      // 错误消息已在httpClient中处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay"></div>
      </div>
      
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <Title level={2} className="login-title">
            NetInsight
          </Title>
          <Text className="login-subtitle">
            企业级网络数据分析平台
          </Text>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          centered
          className="login-tabs"
        >
          <TabPane tab="登录" key="login">
            <Form
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址！' },
                  { type: 'email', message: '请输入有效的邮箱地址！' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱地址"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码！' },
                  { min: 6, message: '密码至少6位字符！' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-button"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>

            <div className="login-demo-account">
              <Text type="secondary">
                演示账户：admin@netinsight.com / admin123456
              </Text>
            </div>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                name="name"
                rules={[
                  { required: true, message: '请输入姓名！' },
                  { min: 2, message: '姓名至少2个字符！' },
                  { max: 50, message: '姓名不能超过50个字符！' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="姓名"
                  autoComplete="name"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址！' },
                  { type: 'email', message: '请输入有效的邮箱地址！' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱地址"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码！' },
                  { min: 6, message: '密码至少6位字符！' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码！' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致！'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-button"
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <div className="login-footer">
          <Text type="secondary">
            © 2024 NetInsight. 专业的网络数据分析解决方案
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login; 