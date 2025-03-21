import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, Space, Tag, 
  message, Popconfirm, Switch, Typography, Card
} from 'antd';
import { 
  UserAddOutlined, EditOutlined, LockOutlined, 
  DeleteOutlined, CheckCircleOutlined, StopOutlined
} from '@ant-design/icons';
import { userManagementService, User } from '../../services/api';
import './styles.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserManagementProps {
  currentUserRole?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [form] = Form.useForm();

  // 检查当前用户是否有管理员权限
  const isAdmin = currentUserRole === 'admin';

  // 获取所有用户
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.getAllUsers();
      setUsers(data);
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchUsers();
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => text || record.email.split('@')[0]
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        let displayText = '普通用户';
        
        if (role === 'admin') {
          color = 'red';
          displayText = '管理员';
        } else if (role === 'analyst') {
          color = 'green';
          displayText = '分析师';
        }
        
        return <Tag color={color}>{displayText}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => 
        isActive ? 
          <Tag icon={<CheckCircleOutlined />} color="success">已启用</Tag> : 
          <Tag icon={<StopOutlined />} color="error">已禁用</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-'
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (text: string) => text ? new Date(text).toLocaleString() : '从未登录'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEdit(record)}
            disabled={!isAdmin}
          >
            编辑
          </Button>
          <Button 
            icon={<LockOutlined />} 
            size="small"
            onClick={() => handleResetPassword(record)}
            disabled={!isAdmin}
          >
            重置密码
          </Button>
        </Space>
      ),
    },
  ];

  // 处理添加用户
  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 处理编辑用户
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    setModalVisible(true);
  };

  // 处理重置密码
  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setTempPassword('');
    setPasswordModalVisible(true);
  };

  // 确认重置密码
  const confirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    try {
      const result = await userManagementService.resetUserPassword(resetPasswordUser.id);
      setTempPassword(result.temp_password);
      message.success('密码重置成功');
    } catch (error) {
      message.error('密码重置失败');
      console.error('密码重置失败:', error);
    }
  };

  // 保存用户信息
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户
        await userManagementService.updateUser(editingUser.id, values);
        message.success('用户信息更新成功');
      } else {
        // 创建用户
        const result = await userManagementService.createUser(values);
        if (result.temp_password) {
          setResetPasswordUser({...result});
          setTempPassword(result.temp_password);
          setPasswordModalVisible(true);
        }
        message.success('用户创建成功');
      }
      
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('操作失败，请检查表单内容');
      console.error('保存用户信息失败:', error);
    }
  };

  // 复制临时密码到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword)
      .then(() => message.success('密码已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <Title level={4}>成员管理</Title>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={handleAdd}
          disabled={!isAdmin}
        >
          添加成员
        </Button>
      </div>

      <Table 
        loading={loading}
        columns={columns} 
        dataSource={users} 
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {/* 创建/编辑用户表单 */}
      <Modal
        title={editingUser ? '编辑成员' : '添加成员'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input disabled={!!editingUser} placeholder="请输入成员的邮箱地址" />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
          >
            <Input placeholder="请输入成员的姓名" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="user"
          >
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="analyst">分析师</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="is_active"
              label="账号状态"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          )}

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码（可选）"
              extra="如果不填写，系统将自动生成随机密码"
            >
              <Input.Password placeholder="请输入初始密码，或留空自动生成" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码确认 */}
      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={
          tempPassword ? [
            <Button key="copy" type="primary" onClick={copyToClipboard}>
              复制密码
            </Button>,
            <Button key="close" onClick={() => setPasswordModalVisible(false)}>
              关闭
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setPasswordModalVisible(false)}>
              取消
            </Button>,
            <Button key="confirm" type="primary" onClick={confirmResetPassword}>
              确认重置
            </Button>
          ]
        }
      >
        {tempPassword ? (
          <div>
            <p>已为用户 <strong>{resetPasswordUser?.email}</strong> 生成新密码：</p>
            <Card>
              <Text copyable strong>{tempPassword}</Text>
            </Card>
            <p style={{ marginTop: 16, color: '#ff4d4f' }}>
              请立即将此密码安全地传达给用户，此密码只显示一次！
            </p>
          </div>
        ) : (
          <p>您确定要为用户 <strong>{resetPasswordUser?.email}</strong> 重置密码吗？重置后将生成一个新的随机密码。</p>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement; 