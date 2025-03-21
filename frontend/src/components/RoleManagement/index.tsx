import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Checkbox, Card, Tabs, message, Popconfirm, Tag, Row, Col, Typography, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, KeyOutlined } from '@ant-design/icons';
import { Role, Permission, roleService, permissionService } from '../../services/api';
import './styles.css';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const RoleManagement: React.FC = () => {
  // 状态
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行请求数据
      const [rolesData, permissionsData, categoriesData] = await Promise.all([
        roleService.getAllRoles(),
        permissionService.getAllPermissions(),
        permissionService.getPermissionCategories()
      ]);
      
      setRoles(rolesData);
      setPermissions(permissionsData);
      setPermissionCategories(categoriesData);
    } catch (error) {
      message.error('加载角色和权限数据失败');
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开新建/编辑角色对话框
  const showRoleModal = (role?: Role) => {
    setCurrentRole(role || null);
    
    if (role) {
      // 编辑模式，设置表单初始值
      form.setFieldsValue({
        name: role.name,
        description: role.description,
        permissions: role.permissions?.map(p => p.id) || []
      });
    } else {
      // 新建模式，重置表单
      form.resetFields();
    }
    
    setModalVisible(true);
  };

  // 保存角色
  const handleSaveRole = async (values: any) => {
    const { name, description, permissions } = values;
    const roleData = {
      name,
      description,
      permission_ids: permissions
    };

    setLoading(true);
    try {
      if (currentRole) {
        // 更新角色
        await roleService.updateRole(currentRole.id, roleData);
        message.success('角色更新成功');
      } else {
        // 创建角色
        await roleService.createRole(roleData);
        message.success('角色创建成功');
      }
      
      setModalVisible(false);
      fetchData(); // 重新加载数据
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存角色失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除角色
  const handleDeleteRole = async (role: Role) => {
    setLoading(true);
    try {
      await roleService.deleteRole(role.id);
      message.success('角色删除成功');
      fetchData(); // 重新加载数据
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除角色失败');
    } finally {
      setLoading(false);
    }
  };

  // 按分类组织权限
  const getPermissionsByCategory = () => {
    const groupedPermissions: { [key: string]: Permission[] } = {};
    
    permissions.forEach(permission => {
      const category = permission.category || '其他';
      if (!groupedPermissions[category]) {
        groupedPermissions[category] = [];
      }
      groupedPermissions[category].push(permission);
    });
    
    return groupedPermissions;
  };

  // 角色表格列配置
  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '权限数量',
      key: 'permissions_count',
      render: (text: string, record: Role) => (
        <span>{record.permissions?.length || 0}</span>
      ),
    },
    {
      title: '系统角色',
      key: 'is_system',
      render: (text: string, record: Role) => (
        record.is_system ? <Tag color="blue">是</Tag> : <Tag color="green">否</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: Role) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showRoleModal(record)}
          >
            编辑
          </Button>
          {!record.is_system && (
            <Popconfirm
              title="确定要删除该角色吗？"
              onConfirm={() => handleDeleteRole(record)}
              okText="确定"
              cancelText="取消"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="role-management">
      <Card className="role-management-card">
        <div className="role-management-header">
          <Title level={4}>角色权限管理</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => showRoleModal()}
          >
            新建角色
          </Button>
        </div>
        
        <Divider />
        
        <Table 
          columns={columns} 
          dataSource={roles} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 角色编辑对话框 */}
      <Modal
        title={currentRole ? `编辑角色: ${currentRole.name}` : '新建角色'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveRole}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" disabled={currentRole?.is_system} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="角色描述"
          >
            <Input.TextArea placeholder="请输入角色描述" />
          </Form.Item>
          
          <Form.Item
            name="permissions"
            label="权限配置"
          >
            <div className="permissions-container">
              {Object.entries(getPermissionsByCategory()).map(([category, perms]) => (
                <div key={category} className="permission-category">
                  <div className="category-header">
                    <Text strong>{category}</Text>
                  </div>
                  <div className="permission-list">
                    <Checkbox.Group>
                      <Row>
                        {perms.map(permission => (
                          <Col span={8} key={permission.id}>
                            <Checkbox value={permission.id}>
                              {permission.name}
                              <div className="permission-description">
                                <Text type="secondary">{permission.description}</Text>
                              </div>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </div>
                </div>
              ))}
            </div>
          </Form.Item>
          
          <Form.Item className="form-actions">
            <Button type="default" onClick={() => setModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement; 