import React, { useState, useEffect } from 'react';
import { Card, Avatar, Tabs, Form, Input, Button, message, Spin, Divider, Typography, Row, Col, List } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { authService } from '../../services/api';
import './style.css';

const { Title, Paragraph } = Typography;

// 用户数据接口定义
interface UserData {
  id: string;
  email: string;
  name?: string;
  role: string;
  created_at?: string;
  last_login?: string;
  is_active: boolean;
}

const Profile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userData = await authService.getUserInfo();
        setUser(userData);
        form.setFieldsValue({
          name: userData.name,
          email: userData.email,
        });
      } catch (err) {
        console.error('获取用户信息失败:', err);
        message.error('获取用户信息失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [form]);

  const handleUpdateProfile = async (values: { name: string; email: string }) => {
    try {
      setUpdating(true);
      // TODO: 实现更新用户信息的API调用
      console.log('更新用户资料:', values);
      
      // 模拟API响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('资料更新成功');
      
      // 更新本地用户信息
      setUser((prev: UserData | null) => {
        if (!prev) return null;
        return {
          ...prev,
          name: values.name,
        };
      });
      
    } catch (err) {
      console.error('更新资料失败:', err);
      message.error('更新资料失败，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    try {
      setUpdating(true);
      await authService.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      message.success('密码修改成功');
      form.resetFields(['oldPassword', 'newPassword', 'confirmPassword']);
    } catch (err: any) {
      console.error('修改密码失败:', err);
      message.error(err.response?.data?.message || '修改密码失败，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  // 模拟用户分析历史
  const analysisList = [
    { id: 1, name: 'example.har', date: '2023-10-31 14:30:22', status: 'completed' },
    { id: 2, name: 'network_capture.pcap', date: '2023-10-30 09:15:45', status: 'completed' },
    { id: 3, name: 'api_requests.har', date: '2023-10-28 16:22:10', status: 'completed' },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Card className="profile-header-card">
        <div className="profile-header">
          <Avatar size={80} icon={<UserOutlined />} />
          <div className="profile-info">
            <Title level={3}>{user?.name || '用户'}</Title>
            <Paragraph>{user?.email}</Paragraph>
            <Paragraph>角色: {user?.role === 'admin' ? '管理员' : user?.role === 'analyst' ? '分析师' : '普通用户'}</Paragraph>
          </div>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="profile"
        className="profile-tabs"
        items={[
          {
            key: 'profile',
            label: (
              <span>
                <IdcardOutlined />
                个人资料
              </span>
            ),
            children: (
              <Card className="tab-card">
                <Form 
                  form={form}
                  layout="vertical"
                  onFinish={handleUpdateProfile}
                  requiredMark={false}
                >
                  <Form.Item 
                    name="email" 
                    label="邮箱" 
                    rules={[{ required: true, message: '请输入邮箱' }]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="邮箱" 
                      disabled 
                      className="read-only-input" 
                    />
                  </Form.Item>
                  
                  <Form.Item 
                    name="name" 
                    label="姓名" 
                    rules={[{ required: true, message: '请输入姓名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="姓名" />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={updating}
                      className="update-button"
                    >
                      更新资料
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'password',
            label: (
              <span>
                <LockOutlined />
                修改密码
              </span>
            ),
            children: (
              <Card className="tab-card">
                <Form 
                  form={form}
                  layout="vertical"
                  onFinish={handleChangePassword}
                  requiredMark={false}
                >
                  <Form.Item 
                    name="oldPassword" 
                    label="当前密码" 
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="当前密码" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="newPassword" 
                    label="新密码" 
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码长度不能少于6个字符' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="confirmPassword" 
                    label="确认密码" 
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={updating}
                      className="update-button"
                    >
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined />
                分析历史
              </span>
            ),
            children: (
              <Card className="tab-card">
                <List
                  itemLayout="horizontal"
                  dataSource={analysisList}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button type="link" key="view">查看</Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={item.name}
                        description={`分析时间: ${item.date} | 状态: ${
                          item.status === 'completed' ? '已完成' : '进行中'
                        }`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },

        ]}
      />
    </div>
  );
};

export default Profile;