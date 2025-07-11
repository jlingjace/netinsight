import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Table, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Avatar,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ShareAltOutlined,
  MoreOutlined,
  ProjectOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ProjectManagement = () => {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: '网络安全审计项目',
      description: '对企业网络进行全面的安全审计分析',
      status: 'active',
      progress: 65,
      filesCount: 24,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      members: ['张三', '李四', '王五'],
      tags: ['安全', '审计', '企业网络']
    },
    {
      id: 2,
      name: '流量异常检测',
      description: '分析网络流量模式，识别异常行为',
      status: 'planning',
      progress: 15,
      filesCount: 8,
      startDate: '2024-02-01',
      endDate: '2024-04-30',
      members: ['赵六', '钱七'],
      tags: ['异常检测', '流量分析']
    },
    {
      id: 3,
      name: '性能优化分析',
      description: '网络性能瓶颈分析和优化建议',
      status: 'completed',
      progress: 100,
      filesCount: 156,
      startDate: '2023-10-01',
      endDate: '2023-12-31',
      members: ['孙八', '周九', '吴十'],
      tags: ['性能', '优化', '网络']
    }
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form] = Form.useForm();

  // 状态配置
  const statusConfig = {
    planning: { color: 'default', text: '计划中' },
    active: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
    paused: { color: 'warning', text: '暂停' },
    cancelled: { color: 'error', text: '已取消' }
  };

  // 表格列定义
  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status] || statusConfig.planning;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => (
        <div style={{ width: 120 }}>
          <Progress 
            percent={progress} 
            size="small" 
            format={(percent) => `${percent}%`}
          />
        </div>
      ),
    },
    {
      title: '文件数量',
      dataIndex: 'filesCount',
      key: 'filesCount',
      render: (count) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FileTextOutlined />
          <Text>{count}</Text>
        </div>
      ),
    },
    {
      title: '团队成员',
      dataIndex: 'members',
      key: 'members',
      render: (members) => (
        <Avatar.Group maxCount={3} size="small">
          {members.map((member, index) => (
            <Tooltip key={index} title={member}>
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                {member.charAt(0)}
              </Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      ),
    },
    {
      title: '时间范围',
      key: 'dateRange',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12 }}>
            <CalendarOutlined /> {record.startDate} 至 {record.endDate}
          </div>
        </div>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <Space>
          {tags.map(tag => (
            <Tag key={tag} size="small">{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: '查看详情',
                onClick: () => handleViewProject(record.id)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑项目',
                onClick: () => handleEditProject(record)
              },
              {
                key: 'share',
                icon: <ShareAltOutlined />,
                label: '分享项目',
                onClick: () => handleShareProject(record.id)
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除项目',
                danger: true,
                onClick: () => handleDeleteProject(record.id)
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

  // 处理项目操作
  const handleViewProject = (projectId) => {
    console.log('查看项目:', projectId);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    setIsModalVisible(true);
  };

  const handleShareProject = (projectId) => {
    console.log('分享项目:', projectId);
  };

  const handleDeleteProject = (projectId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个项目吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    });
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingProject) {
        // 编辑项目
        setProjects(prev => prev.map(p => 
          p.id === editingProject.id ? { ...p, ...values } : p
        ));
      } else {
        // 创建新项目
        const newProject = {
          id: Date.now(),
          ...values,
          progress: 0,
          filesCount: 0,
          members: [],
          tags: values.tags || []
        };
        setProjects(prev => [...prev, newProject]);
      }
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 统计数据
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length
  };

  return (
    <div className="page-container fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">
              项目管理
            </Title>
            <Text className="page-description">
              管理和跟踪分析项目进度
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateProject}
          >
            创建项目
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="总项目数"
              value={stats.total}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="进行中"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="dashboard-card">
            <Statistic
              title="计划中"
              value={stats.planning}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 项目列表 */}
      <Card title="项目列表" className="dashboard-card">
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建/编辑项目模态框 */}
      <Modal
        title={editingProject ? '编辑项目' : '创建项目'}
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
            status: 'planning'
          }}
        >
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            label="项目描述"
            name="description"
            rules={[{ required: true, message: '请输入项目描述' }]}
          >
            <Input.TextArea 
              placeholder="请输入项目描述" 
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目状态"
                name="status"
                rules={[{ required: true, message: '请选择项目状态' }]}
              >
                <Select placeholder="请选择项目状态">
                  <Option value="planning">计划中</Option>
                  <Option value="active">进行中</Option>
                  <Option value="paused">暂停</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="项目进度"
                name="progress"
              >
                <Input 
                  type="number" 
                  min={0} 
                  max={100} 
                  placeholder="0-100"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始日期"
                name="startDate"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束日期"
                name="endDate"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="项目标签"
            name="tags"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="添加项目标签"
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManagement; 