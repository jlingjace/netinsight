import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Avatar,
  Dropdown,
  DatePicker,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { userService } from '../services/userService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  // 筛选和搜索
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();

  // 角色选项
  const roleOptions = [
    { value: 'admin', label: '系统管理员', color: 'red' },
    { value: 'analyst', label: '网络分析师', color: 'blue' },
    { value: 'viewer', label: '查看者', color: 'green' },
    { value: 'guest', label: '访客', color: 'default' }
  ];

  // 获取角色显示信息
  const getRoleInfo = (role) => {
    return roleOptions.find(option => option.value === role) || 
           { value: role, label: '未知角色', color: 'default' };
  };

  // 加载数据
  useEffect(() => {
    loadUsers();
    loadStats();
  }, [pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchText || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      
      const response = await userService.getUsers(params);
      setUsers(response.users);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await userService.getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            style={{ backgroundColor: record.is_active ? '#1890ff' : '#d9d9d9' }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.full_name || record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleInfo = getRoleInfo(role);
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
      filters: roleOptions.map(role => ({ text: role.label, value: role.value })),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (department) => department || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Badge 
          status={isActive ? 'success' : 'default'} 
          text={isActive ? '活跃' : '禁用'} 
        />
      ),
      filters: [
        { text: '活跃', value: true },
        { text: '禁用', value: false },
      ],
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date) => date ? new Date(date).toLocaleString() : '从未登录',
      sorter: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString(),
      sorter: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: '查看详情',
                onClick: () => handleViewUser(record)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑用户',
                onClick: () => handleEditUser(record)
              },
              {
                key: 'toggle',
                icon: record.is_active ? <LockOutlined /> : <UnlockOutlined />,
                label: record.is_active ? '禁用用户' : '启用用户',
                onClick: () => handleToggleStatus(record)
              },
              {
                key: 'reset',
                icon: <LockOutlined />,
                label: '重置密码',
                onClick: () => handleResetPassword(record)
              },
              {
                type: 'divider'
              },
              {
                key: 'logs',
                icon: <HistoryOutlined />,
                label: '操作日志',
                onClick: () => handleViewLogs(record)
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除用户',
                danger: true,
                onClick: () => handleDeleteUser(record)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // 处理操作
  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      fullName: user.full_name,
      isActive: user.is_active
    });
    setIsModalVisible(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsDetailVisible(true);
  };

  const handleDeleteUser = (user) => {
    Modal.confirm({
      title: '确认删除用户',
      content: `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await userService.deleteUser(user.id);
          message.success('用户删除成功');
          loadUsers();
          loadStats();
        } catch (error) {
          message.error('删除用户失败');
        }
      }
    });
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.toggleUserStatus(user.id);
      message.success(`用户已${user.is_active ? '禁用' : '启用'}`);
      loadUsers();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResetPassword = (user) => {
    Modal.confirm({
      title: '重置用户密码',
      content: (
        <div>
          <p>确定要重置用户 "{user.username}" 的密码吗？</p>
          <p style={{ color: '#ff4d4f' }}>新密码将设置为：123456</p>
          <p>建议用户首次登录后立即修改密码。</p>
        </div>
      ),
      okText: '重置',
      cancelText: '取消',
      onOk: async () => {
        try {
          await userService.resetPassword(user.id, '123456');
          message.success('密码重置成功，新密码：123456');
        } catch (error) {
          message.error('重置密码失败');
        }
      }
    });
  };

  const handleViewLogs = (user) => {
    // TODO: 实现用户日志查看
    message.info('用户日志功能开发中...');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户
        await userService.updateUser(editingUser.id, {
          username: values.username,
          email: values.email,
          role: values.role,
          fullName: values.fullName,
          department: values.department,
          phone: values.phone,
          isActive: values.isActive
        });
        message.success('用户更新成功');
      } else {
        // 创建用户
        await userService.createUser({
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
          fullName: values.fullName,
          department: values.department,
          phone: values.phone,
          isActive: values.isActive
        });
        message.success('用户创建成功');
      }
      
      setIsModalVisible(false);
      loadUsers();
      loadStats();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">
              用户管理
            </Title>
            <Text className="page-description">
              管理系统用户和权限设置
            </Text>
          </div>
          <Space>
            <Button icon={<ImportOutlined />}>
              导入用户
            </Button>
            <Button icon={<ExportOutlined />}>
              导出用户
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              创建用户
            </Button>
          </Space>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="总用户数"
              value={stats.totalUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="活跃用户"
              value={stats.activeUsers || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="本月新增"
              value={stats.recentRegistrations || 0}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="最近登录"
              value={stats.recentLogins || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <Card title="用户列表" className="dashboard-card">
        {/* 筛选工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Search
                placeholder="搜索用户名、邮箱或姓名"
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="角色筛选"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                style={{ width: '100%' }}
              >
                <Option value="all">全部角色</Option>
                {roleOptions.map(role => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                style={{ width: '100%' }}
              >
                <Option value="all">全部状态</Option>
                <Option value="active">活跃</Option>
                <Option value="inactive">禁用</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadUsers}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 用户表格 */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'analyst',
            isActive: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' }
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  {roleOptions.map(role => (
                    <Option key={role.value} value={role.value}>
                      <Tag color={role.color}>{role.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="fullName"
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="部门"
                name="department"
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="电话"
            name="phone"
          >
            <Input placeholder="请输入电话号码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        placement="right"
        onClose={() => setIsDetailVisible(false)}
        open={isDetailVisible}
        width={500}
      >
        {selectedUser && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar 
                size={80} 
                icon={<UserOutlined />}
                style={{ backgroundColor: selectedUser.is_active ? '#1890ff' : '#d9d9d9' }}
              />
              <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                {selectedUser.full_name || selectedUser.username}
              </Title>
              <Text type="secondary">{selectedUser.email}</Text>
            </div>

            <Card size="small" title="基本信息">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>用户名：</Text>
                </Col>
                <Col span={16}>
                  <Text>{selectedUser.username}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>角色：</Text>
                </Col>
                <Col span={16}>
                  <Tag color={getRoleInfo(selectedUser.role).color}>
                    {getRoleInfo(selectedUser.role).label}
                  </Tag>
                </Col>
                
                <Col span={8}>
                  <Text strong>状态：</Text>
                </Col>
                <Col span={16}>
                  <Badge 
                    status={selectedUser.is_active ? 'success' : 'default'} 
                    text={selectedUser.is_active ? '活跃' : '禁用'} 
                  />
                </Col>
                
                <Col span={8}>
                  <Text strong>部门：</Text>
                </Col>
                <Col span={16}>
                  <Text>{selectedUser.department || '-'}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>电话：</Text>
                </Col>
                <Col span={16}>
                  <Text>{selectedUser.phone || '-'}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>创建时间：</Text>
                </Col>
                <Col span={16}>
                  <Text>{new Date(selectedUser.created_at).toLocaleString()}</Text>
                </Col>
                
                <Col span={8}>
                  <Text strong>最后登录：</Text>
                </Col>
                <Col span={16}>
                  <Text>
                    {selectedUser.last_login_at 
                      ? new Date(selectedUser.last_login_at).toLocaleString()
                      : '从未登录'
                    }
                  </Text>
                </Col>
              </Row>
            </Card>

            <div style={{ marginTop: 16 }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setIsDetailVisible(false);
                    handleEditUser(selectedUser);
                  }}
                >
                  编辑用户
                </Button>
                <Button 
                  icon={selectedUser.is_active ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={() => {
                    setIsDetailVisible(false);
                    handleToggleStatus(selectedUser);
                  }}
                >
                  {selectedUser.is_active ? '禁用用户' : '启用用户'}
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default UserManagement; 