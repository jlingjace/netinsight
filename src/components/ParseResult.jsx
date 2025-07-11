import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Statistic, Row, Col, Table, Button, Spin, message, Alert, Collapse } from 'antd';
import { ArrowLeftOutlined, BugOutlined } from '@ant-design/icons';
import { getRecordById, getParseResult } from '../db/idb';

const { Panel } = Collapse;

const ParseResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fileRecord, setFileRecord] = useState(null);
  const [parseResult, setParseResult] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      console.log('加载数据，ID:', id);
      const record = await getRecordById(id);
      const result = await getParseResult(id);
      
      console.log('文件记录:', record);
      console.log('解析结果:', result);
      
      if (!record) {
        message.error('未找到文件记录');
        navigate('/');
        return;
      }
      
      if (!result) {
        message.error('未找到解析结果');
        navigate('/');
        return;
      }
      
      setFileRecord(record);
      setParseResult(result);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const protocolColumns = [
    { title: '协议类型', dataIndex: 'protocol', key: 'protocol' },
    { title: '包数量', dataIndex: 'count', key: 'count' },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (val) => `${val}%` },
  ];

  const getProtocolData = () => {
    if (!parseResult?.protocols) return [];
    
    const total = parseResult.packetCount || 1; // 避免除零
    return Object.entries(parseResult.protocols).map(([protocol, count]) => ({
      protocol,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(2) : '0.00',
    }));
  };

  const hasError = parseResult?.error || parseResult?.packetCount === 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <h2>解析结果 - {fileRecord?.name}</h2>

      {/* 错误提示 */}
      {hasError && (
        <Alert
          message="解析遇到问题"
          description={parseResult?.error || "未能解析到有效的数据包"}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 基础统计 */}
      <Card title="基础统计" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="总包数量" 
              value={parseResult?.packetCount || 0} 
              valueStyle={{ color: parseResult?.packetCount > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="协议类型数量" 
              value={Object.keys(parseResult?.protocols || {}).length} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="文件大小" 
              value={parseResult?.fileSize || 0} 
              suffix="字节"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="解析时间" 
              value={parseResult?.timestamp ? new Date(parseResult.timestamp).toLocaleString() : '未知'} 
            />
          </Col>
        </Row>
      </Card>

      {/* 协议统计 */}
      <Card title="协议统计" style={{ marginBottom: 16 }}>
        {getProtocolData().length > 0 ? (
          <Table
            columns={protocolColumns}
            dataSource={getProtocolData()}
            rowKey="protocol"
            pagination={false}
            size="small"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>没有检测到协议数据</p>
            <p>可能原因：</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>文件格式不正确</li>
              <li>文件损坏或为空</li>
              <li>解析器不支持该pcap文件版本</li>
            </ul>
          </div>
        )}
      </Card>

      {/* 文件信息 */}
      <Card title="文件信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <p><strong>文件名:</strong> {fileRecord?.name}</p>
            <p><strong>文件大小:</strong> {parseResult?.fileSize ? `${parseResult.fileSize} 字节` : '未知'}</p>
            <p><strong>上传时间:</strong> {new Date(fileRecord?.createdAt).toLocaleString()}</p>
          </Col>
          <Col span={12}>
            <p><strong>解析状态:</strong> {fileRecord?.status === 'done' ? '已完成' : fileRecord?.status}</p>
            {parseResult?.timestamp && (
              <p><strong>解析时间:</strong> {new Date(parseResult.timestamp).toLocaleString()}</p>
            )}
            {parseResult?.error && (
              <p><strong>错误信息:</strong> <span style={{ color: '#cf1322' }}>{parseResult.error}</span></p>
            )}
          </Col>
        </Row>
      </Card>
      
      {/* 调试信息 */}
      <Card title="调试信息" style={{ marginBottom: 16 }}>
        <Collapse>
          <Panel header="解析步骤" key="1">
            {parseResult?.debugInfo?.parseSteps ? (
              <ol>
                {parseResult.debugInfo.parseSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            ) : (
              <p>无调试信息</p>
            )}
          </Panel>
          
          <Panel header="文件头部信息" key="2">
            {parseResult?.debugInfo?.headerBytes ? (
              <div>
                <p><strong>文件头部字节:</strong></p>
                <code style={{ background: '#f5f5f5', padding: '10px', display: 'block' }}>
                  {parseResult.debugInfo.headerBytes.join(' ')}
                </code>
              </div>
            ) : (
              <p>无文件头部信息</p>
            )}
          </Panel>
          
          <Panel header="完整调试数据" key="3">
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
              {JSON.stringify({ 
                fileRecord: {
                  name: fileRecord?.name,
                  status: fileRecord?.status,
                  createdAt: fileRecord?.createdAt
                }, 
                parseResult 
              }, null, 2)}
            </pre>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default ParseResult; 