import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Form, Input, Select, Switch, Button, Typography, 
  Divider, List, Tag, message, Spin, Radio, Slider, Tooltip, Space,
  Alert, Badge, Avatar
} from 'antd';
import { 
  UserOutlined, BankOutlined, DollarOutlined, 
  ApiOutlined, BellOutlined, SettingOutlined, 
  SecurityScanOutlined, SyncOutlined, LockOutlined,
  GlobalOutlined, TranslationOutlined, EyeOutlined,
  FileProtectOutlined, TableOutlined, QuestionCircleOutlined,
  AreaChartOutlined, PieChartOutlined, LineChartOutlined,
  BarChartOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { authService } from '../../services/api';
import './style.css';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

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

// 模拟的系统设置数据
const mockPreferences = {
  language: 'zh_CN',
  theme: 'light',
  timeZone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  notifications: {
    email: true,
    browser: true,
    mobile: false,
  },
  dashboard: {
    autoRefresh: true,
    refreshInterval: 5, // 分钟
    defaultView: 'summary',
  },
  dataVisualization: {
    chartTheme: 'default',
    showTooltips: true,
    animateCharts: true,
  }
};

// 模拟的账单数据
const mockBillingData = {
  plan: 'professional', // free, professional, enterprise
  planName: '专业版',
  nextBilling: '2023-12-31',
  usageStats: {
    fileSizeQuota: 500, // MB
    fileSizeUsed: 125,  // MB
    analysisQuota: 50,  // 次/月
    analysisUsed: 12,   // 次/月
  },
  invoices: [
    { id: 'INV-2023-11', date: '2023-11-01', amount: '¥99.00', status: 'paid' },
    { id: 'INV-2023-10', date: '2023-10-01', amount: '¥99.00', status: 'paid' },
    { id: 'INV-2023-09', date: '2023-09-01', amount: '¥99.00', status: 'paid' },
  ]
};

// 模拟的集成数据
const mockIntegrations = [
  { 
    id: 'slack', 
    name: 'Slack', 
    description: '将分析报告和告警发送到Slack频道',
    icon: '🔔',
    connected: false 
  },
  { 
    id: 'jira', 
    name: 'Jira', 
    description: '直接从分析报告创建Jira工单',
    icon: '🎫',
    connected: false 
  },
  { 
    id: 'grafana', 
    name: 'Grafana', 
    description: '将网络指标导出到Grafana仪表盘',
    icon: '📊',
    connected: true 
  },
  { 
    id: 'prometheus', 
    name: 'Prometheus', 
    description: '将分析指标发送到Prometheus监控系统',
    icon: '📈',
    connected: false 
  },
  { 
    id: 'teams', 
    name: 'Microsoft Teams', 
    description: '在Teams中接收通知和共享报告',
    icon: '💬',
    connected: false 
  }
];

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userData = await authService.getUserInfo();
        setUser(userData);
        
        // 设置表单初始值
        preferencesForm.setFieldsValue(mockPreferences);
      } catch (err) {
        console.error('获取用户信息失败:', err);
        message.error('获取用户信息失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [form, preferencesForm]);

  const handleUpdatePreferences = async (values: any) => {
    try {
      setUpdating(true);
      console.log('更新偏好设置:', values);
      
      // 模拟API响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('偏好设置更新成功');
    } catch (err) {
      console.error('更新设置失败:', err);
      message.error('更新设置失败，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  const handleConnectIntegration = async (integrationId: string) => {
    try {
      console.log(`连接集成: ${integrationId}`);
      message.success(`已发起${integrationId}集成授权，请在新窗口完成授权`);
      // 这里会打开OAuth授权窗口，但在本演示中我们只是显示消息
    } catch (err) {
      console.error('连接集成失败:', err);
      message.error('连接集成失败，请稍后重试');
    }
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    try {
      console.log(`断开集成: ${integrationId}`);
      message.success(`已断开${integrationId}集成`);
    } catch (err) {
      console.error('断开集成失败:', err);
      message.error('断开集成失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 账单使用情况进度计算
  const fileUsagePercent = (mockBillingData.usageStats.fileSizeUsed / mockBillingData.usageStats.fileSizeQuota) * 100;
  const analysisUsagePercent = (mockBillingData.usageStats.analysisUsed / mockBillingData.usageStats.analysisQuota) * 100;

  return (
    <div className="settings-container">
      <Title level={2}>系统设置</Title>
      <Paragraph>管理您的账户、订阅、偏好设置和集成</Paragraph>
      
      <Tabs
        defaultActiveKey="account"
        className="settings-tabs"
        items={[
          {
            key: 'account',
            label: (
              <span>
                <UserOutlined />
                账户和设置
              </span>
            ),
            children: (
              <Card className="tab-card">
                <Title level={4}>账户信息</Title>
                <div className="account-info">
                  <div className="account-avatar">
                    <Avatar size={80} icon={<UserOutlined />} />
                    <Button type="link">更换头像</Button>
                  </div>
                  <div className="account-details">
                    <Form layout="vertical">
                      <Form.Item label="用户 ID">
                        <Input value={user?.id} disabled className="read-only-input" />
                      </Form.Item>
                      <Form.Item label="电子邮箱">
                        <Input value={user?.email} disabled className="read-only-input" />
                      </Form.Item>
                      <Form.Item label="用户角色">
                        <Input 
                          value={user?.role === 'admin' ? '管理员' : user?.role === 'analyst' ? '分析师' : '普通用户'} 
                          disabled 
                          className="read-only-input" 
                        />
                      </Form.Item>
                      <Form.Item label="创建时间">
                        <Input value={user?.created_at || '未知'} disabled className="read-only-input" />
                      </Form.Item>
                      <Form.Item label="最后登录">
                        <Input value={user?.last_login || '未知'} disabled className="read-only-input" />
                      </Form.Item>
                    </Form>
                  </div>
                </div>

                <Divider />

                <Title level={4}>安全设置</Title>
                <List
                  itemLayout="horizontal"
                  dataSource={[
                    {
                      title: '密码',
                      description: '上次更新: 30天前',
                      icon: <LockOutlined />,
                      action: <Button type="link" href="/profile?tab=password">修改</Button>
                    },
                    {
                      title: '两步验证',
                      description: '提高账户安全性',
                      icon: <SecurityScanOutlined />,
                      action: <Button type="primary" ghost>启用</Button>
                    },
                    {
                      title: '登录设备',
                      description: '查看您的登录设备记录',
                      icon: <GlobalOutlined />,
                      action: <Button type="link">查看</Button>
                    }
                  ]}
                  renderItem={item => (
                    <List.Item actions={[item.action]}>
                      <List.Item.Meta
                        avatar={item.icon}
                        title={item.title}
                        description={item.description}
                      />
                    </List.Item>
                  )}
                />

                <Divider />

                <Title level={4}>API 访问</Title>
                <Alert
                  message="API 密钥"
                  description="API 密钥允许第三方应用程序访问您的数据。请谨慎管理您的 API 密钥。"
                  type="info"
                  showIcon
                  className="mb-4"
                />
                <Button type="primary" icon={<ApiOutlined />}>生成 API 密钥</Button>
              </Card>
            ),
          },
          {
            key: 'billing',
            label: (
              <span>
                <DollarOutlined />
                账单和使用情况
              </span>
            ),
            children: (
              <Card className="tab-card">
                <div className="billing-header">
                  <div>
                    <Title level={4}>当前订阅</Title>
                    <Tag color="blue" className="plan-tag">{mockBillingData.planName}</Tag>
                    <Text>下次续费日期: {mockBillingData.nextBilling}</Text>
                  </div>
                  <Button type="primary">升级套餐</Button>
                </div>

                <Divider />

                <Title level={4}>使用情况</Title>
                <div className="usage-stats">
                  <Card className="usage-card">
                    <div className="usage-title">
                      <Text>文件存储</Text>
                      <Tooltip title="您可以上传的文件大小总量">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </div>
                    <div className="usage-value">
                      <Text>{mockBillingData.usageStats.fileSizeUsed} MB / {mockBillingData.usageStats.fileSizeQuota} MB</Text>
                    </div>
                    <div className="usage-progress">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${fileUsagePercent}%`, 
                          backgroundColor: fileUsagePercent > 90 ? '#ff4d4f' : '#1890ff' 
                        }}
                      ></div>
                    </div>
                  </Card>
                  
                  <Card className="usage-card">
                    <div className="usage-title">
                      <Text>分析次数</Text>
                      <Tooltip title="本月可用的分析次数">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </div>
                    <div className="usage-value">
                      <Text>{mockBillingData.usageStats.analysisUsed} / {mockBillingData.usageStats.analysisQuota} 次</Text>
                    </div>
                    <div className="usage-progress">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${analysisUsagePercent}%`,
                          backgroundColor: analysisUsagePercent > 90 ? '#ff4d4f' : '#1890ff' 
                        }}
                      ></div>
                    </div>
                  </Card>
                </div>

                <Divider />

                <Title level={4}>付款方式</Title>
                <div className="payment-methods">
                  <Card className="payment-card">
                    <div className="payment-header">
                      <BankOutlined className="payment-icon" />
                      <div>
                        <div className="payment-title">支付宝</div>
                        <div className="payment-subtitle">默认支付方式</div>
                      </div>
                    </div>
                    <div className="payment-actions">
                      <Button type="link">编辑</Button>
                      <Button type="link">删除</Button>
                    </div>
                  </Card>
                  <Button type="dashed" className="add-payment-btn">+ 添加支付方式</Button>
                </div>

                <Divider />

                <Title level={4}>账单历史</Title>
                <Table 
                  columns={[
                    { title: '账单号', dataIndex: 'id', key: 'id' },
                    { title: '日期', dataIndex: 'date', key: 'date' },
                    { title: '金额', dataIndex: 'amount', key: 'amount' },
                    { 
                      title: '状态', 
                      dataIndex: 'status', 
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'paid' ? 'green' : 'red'}>
                          {status === 'paid' ? '已支付' : '未支付'}
                        </Tag>
                      )
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: () => <Button type="link">下载</Button>
                    }
                  ]} 
                  dataSource={mockBillingData.invoices}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'preferences',
            label: (
              <span>
                <SettingOutlined />
                偏好设置
              </span>
            ),
            children: (
              <Card className="tab-card">
                <Form
                  form={preferencesForm}
                  layout="vertical"
                  onFinish={handleUpdatePreferences}
                  initialValues={mockPreferences}
                >
                  <Title level={4}>界面设置</Title>
                  <div className="preferences-section">
                    <Form.Item name="language" label="语言">
                      <Select>
                        <Option value="zh_CN">简体中文</Option>
                        <Option value="en_US">English (US)</Option>
                        <Option value="ja_JP">日本語</Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item name="theme" label="主题">
                      <Radio.Group>
                        <Radio.Button value="light">浅色</Radio.Button>
                        <Radio.Button value="dark">深色</Radio.Button>
                        <Radio.Button value="system">跟随系统</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    
                    <Form.Item name="timeZone" label="时区">
                      <Select showSearch>
                        <Option value="Asia/Shanghai">中国标准时间 (UTC+8)</Option>
                        <Option value="America/Los_Angeles">太平洋时间 (UTC-8)</Option>
                        <Option value="America/New_York">东部时间 (UTC-5)</Option>
                        <Option value="Europe/London">格林威治标准时间 (UTC+0)</Option>
                        <Option value="Europe/Paris">中欧时间 (UTC+1)</Option>
                      </Select>
                    </Form.Item>
                  </div>

                  <Divider />

                  <Title level={4}>日期和时间格式</Title>
                  <div className="preferences-section">
                    <Form.Item name="dateFormat" label="日期格式">
                      <Radio.Group>
                        <Radio value="YYYY-MM-DD">2023-11-28</Radio>
                        <Radio value="MM/DD/YYYY">11/28/2023</Radio>
                        <Radio value="DD/MM/YYYY">28/11/2023</Radio>
                      </Radio.Group>
                    </Form.Item>
                    
                    <Form.Item name="timeFormat" label="时间格式">
                      <Radio.Group>
                        <Radio value="24h">24小时 (14:30)</Radio>
                        <Radio value="12h">12小时 (2:30 PM)</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </div>

                  <Divider />

                  <Title level={4}>通知设置</Title>
                  <div className="preferences-section">
                    <Form.Item name={['notifications', 'email']} valuePropName="checked" label="电子邮件通知">
                      <Switch />
                    </Form.Item>
                    
                    <Form.Item name={['notifications', 'browser']} valuePropName="checked" label="浏览器通知">
                      <Switch />
                    </Form.Item>
                    
                    <Form.Item name={['notifications', 'mobile']} valuePropName="checked" label="移动应用通知">
                      <Switch />
                    </Form.Item>
                  </div>

                  <Divider />

                  <Title level={4}>仪表盘设置</Title>
                  <div className="preferences-section">
                    <Form.Item name={['dashboard', 'autoRefresh']} valuePropName="checked" label="自动刷新仪表盘">
                      <Switch />
                    </Form.Item>
                    
                    <Form.Item name={['dashboard', 'refreshInterval']} label="刷新间隔 (分钟)">
                      <Slider min={1} max={60} marks={{ 1: '1分钟', 30: '30分钟', 60: '60分钟' }} />
                    </Form.Item>
                    
                    <Form.Item name={['dashboard', 'defaultView']} label="默认视图">
                      <Radio.Group>
                        <Radio.Button value="summary">概览</Radio.Button>
                        <Radio.Button value="performance">性能</Radio.Button>
                        <Radio.Button value="security">安全</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </div>

                  <Divider />
                  
                  <Title level={4}>数据可视化设置</Title>
                  <div className="preferences-section">
                    <Form.Item name={['dataVisualization', 'chartTheme']} label="图表主题">
                      <Radio.Group>
                        <Radio.Button value="default">默认</Radio.Button>
                        <Radio.Button value="dark">暗黑</Radio.Button>
                        <Radio.Button value="colorful">多彩</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    
                    <Form.Item name={['dataVisualization', 'showTooltips']} valuePropName="checked" label="显示图表提示">
                      <Switch />
                    </Form.Item>
                    
                    <Form.Item name={['dataVisualization', 'animateCharts']} valuePropName="checked" label="图表动画">
                      <Switch />
                    </Form.Item>
                  </div>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={updating}>
                      保存设置
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'integrations',
            label: (
              <span>
                <ApiOutlined />
                集成
              </span>
            ),
            children: (
              <Card className="tab-card">
                <Title level={4}>可用集成</Title>
                <Paragraph>连接NetInsight与您使用的其他工具和服务</Paragraph>
                
                <div className="integrations-list">
                  {mockIntegrations.map(integration => (
                    <Card key={integration.id} className="integration-card">
                      <div className="integration-header">
                        <div className="integration-icon">
                          {integration.icon}
                        </div>
                        <div className="integration-info">
                          <div className="integration-title">
                            {integration.name}
                            {integration.connected && 
                              <Badge 
                                status="success" 
                                text="已连接" 
                                className="integration-status"
                              />
                            }
                          </div>
                          <div className="integration-description">
                            {integration.description}
                          </div>
                        </div>
                      </div>
                      <div className="integration-actions">
                        {integration.connected ? (
                          <Button 
                            danger 
                            onClick={() => handleDisconnectIntegration(integration.id)}
                          >
                            断开连接
                          </Button>
                        ) : (
                          <Button 
                            type="primary" 
                            onClick={() => handleConnectIntegration(integration.id)}
                          >
                            连接
                          </Button>
                        )}
                        <Button type="link">配置</Button>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <Divider />
                
                <Title level={4}>API访问</Title>
                <Paragraph>
                  使用API密钥将NetInsight集成到您的自定义应用程序中
                  <Tooltip title="API密钥允许其他应用访问您的NetInsight账户数据。请谨慎保管，不要分享给他人。">
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </Paragraph>
                
                <Space className="api-actions">
                  <Button type="primary" icon={<ApiOutlined />}>
                    生成新的API密钥
                  </Button>
                  <Button type="link" icon={<FileProtectOutlined />}>
                    查看API文档
                  </Button>
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

// 添加一个Table组件用于显示账单历史
const Table = ({ columns, dataSource, pagination }: any) => {
  return (
    <div className="custom-table">
      <div className="table-header">
        <div className="table-row">
          {columns.map((column: any) => (
            <div key={column.key} className="table-cell table-header-cell">
              {column.title}
            </div>
          ))}
        </div>
      </div>
      <div className="table-body">
        {dataSource.map((item: any, index: number) => (
          <div key={index} className="table-row">
            {columns.map((column: any) => (
              <div key={column.key} className="table-cell">
                {column.render ? column.render(item[column.dataIndex], item) : item[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings; 