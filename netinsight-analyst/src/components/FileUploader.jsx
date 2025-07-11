import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Space, Progress, Tag, Modal } from 'antd';
import { UploadOutlined, PlayCircleOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fileService } from '../services/fileService';

const FileUploader = ({ onParse }) => {
  const [fileList, setFileList] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fileService.getFiles();
      setFiles(response.files || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    // 验证文件类型
    if (!fileService.validateFileType(file)) {
      message.error('只支持 .pcap、.pcapng 和 .har 文件');
      return Upload.LIST_IGNORE;
    }

    // 验证文件大小
    if (!fileService.validateFileSize(file)) {
      message.error('文件大小不能超过100MB');
      return Upload.LIST_IGNORE;
    }

    return false; // 阻止自动上传
  };

  const handleUpload = async ({ fileList }) => {
    if (fileList.length === 0) return;

    try {
      setLoading(true);
      setUploadProgress(0);

      const files = fileList.map(item => item.originFileObj);
      const response = await fileService.uploadFiles(files, (progress) => {
        setUploadProgress(progress);
      });

      message.success(`成功上传 ${response.files?.length || 0} 个文件`);
      setFileList([]);
      setUploadProgress(0);
      
      // 刷新文件列表
      await fetchFiles();
    } catch (error) {
      console.error('文件上传失败:', error);
      setUploadProgress(0);
      
      // 显示详细的错误信息
      if (error.response?.data?.message) {
        message.error('上传失败: ' + error.response.data.message);
      } else if (error.message) {
        message.error('上传失败: ' + error.message);
      } else {
        message.error('文件上传失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async (file) => {
    try {
      setLoading(true);
      
      // 使用http客户端调用分析API
      const { http, tokenManager } = await import('../utils/httpClient');
      
      // 检查是否有token
      const token = tokenManager.getToken();
      console.log('Token存在:', !!token);
      console.log('正在启动分析，文件ID:', file.id);
      console.log('API URL:', `/analysis/start/${file.id}`);
      
      const response = await http.post(`/analysis/start/${file.id}`);

      if (response.data) {
        message.success('分析任务已启动');
        await fetchFiles();
      }
    } catch (error) {
      console.error('启动分析失败:', error);
      console.error('错误详情:', error.response);
      console.error('错误状态:', error.response?.status);
      console.error('错误数据:', error.response?.data);
      
      if (error.response?.status === 404) {
        message.error('分析服务不可用，请检查后端服务状态');
      } else if (error.response?.status === 401) {
        message.error('认证失败，请重新登录');
      } else {
        message.error('启动分析失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewResult = (file) => {
    navigate(`/results/${file.id}`);
  };

  const handleDeleteFile = async (file) => {
    // 添加确认对话框
    Modal.confirm({
      title: '确认删除文件',
      content: `确定要删除文件 "${file.original_name}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await fileService.deleteFile(file.id);
          message.success('文件删除成功');
          await fetchFiles();
        } catch (error) {
          console.error('删除文件失败:', error);
          if (error.response?.status === 404) {
            message.error('文件不存在或已被删除');
          } else if (error.response?.status === 403) {
            message.error('没有权限删除此文件');
          } else {
            message.error('删除文件失败: ' + (error.response?.data?.message || error.message));
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDownloadFile = async (file) => {
    try {
      await fileService.downloadFile(file.id, file.original_name);
    } catch (error) {
      console.error('下载文件失败:', error);
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文件');
      return;
    }
    
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await fileService.deleteFiles(selectedRowKeys);
          message.success(`成功删除 ${selectedRowKeys.length} 个文件`);
          setSelectedRowKeys([]);
          await fetchFiles();
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败: ' + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record) => ({
      disabled: loading,
    }),
  };

  const columns = [
    { 
      title: '文件名', 
      dataIndex: 'original_name', 
      key: 'original_name',
      ellipsis: true,
    },
    { 
      title: '文件类型', 
      dataIndex: 'file_type', 
      key: 'file_type',
      render: (type) => type?.toUpperCase() || '-'
    },
    { 
      title: '文件大小', 
      dataIndex: 'file_size', 
      key: 'file_size',
      render: (size) => fileService.formatFileSize(size)
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const statusInfo = fileService.getFileStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    { 
      title: '上传时间', 
      dataIndex: 'uploaded_at', 
      key: 'uploaded_at', 
      render: (time) => {
        if (!time) return '-';
        try {
          return new Date(time).toLocaleString('zh-CN');
        } catch (error) {
          return time;
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 300, // 设置固定宽度确保所有按钮都能显示
      render: (_, file) => (
        <Space size="small" wrap>
          <Button
            icon={<PlayCircleOutlined />}
            disabled={file.status !== 'uploaded' || loading}
            onClick={() => handleStartAnalysis(file)}
            size="small"
            type="primary"
          >
            开始分析
          </Button>
          {file.status === 'completed' && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewResult(file)}
              size="small"
              type="link"
            >
              查看结果
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadFile(file)}
            size="small"
            type="link"
          >
            下载
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteFile(file)}
            size="small"
            danger
            type="link"
            title="删除文件"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Upload
          multiple
          beforeUpload={beforeUpload}
          fileList={fileList}
          onChange={handleUpload}
          accept=".pcap,.pcapng,.har"
          disabled={loading}
        >
          <Button 
            icon={<UploadOutlined />} 
            loading={loading}
            size="large"
          >
            选择文件上传
          </Button>
        </Upload>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress 
            percent={uploadProgress} 
            status="active"
            format={(percent) => `上传中 ${percent}%`}
          />
        )}
        
        <div style={{ fontSize: 12, color: '#666' }}>
          支持 .pcap、.pcapng、.har 格式文件，单个文件最大100MB
          <br />
          • .pcap/.pcapng: 网络数据包文件，用于网络流量分析
          <br />
          • .har: HTTP Archive文件，用于Web请求分析
        </div>
      </Space>

      {/* 文件操作工具栏 */}
      {files.length > 0 && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Space>
            <Button
              icon={<DeleteOutlined />}
              danger
              disabled={selectedRowKeys.length === 0 || loading}
              onClick={handleBatchDelete}
            >
              批量删除 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
            </Button>
            <span style={{ color: '#666', fontSize: 12 }}>
              {selectedRowKeys.length > 0 
                ? `已选择 ${selectedRowKeys.length} 个文件` 
                : '请选择要操作的文件'}
            </span>
          </Space>
        </div>
      )}
      
      <Table
        style={{ marginTop: 24 }}
        columns={columns}
        dataSource={files}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        scroll={{ x: 1200 }} // 添加水平滚动，确保在小屏幕上能看到所有列
        pagination={{
          total: files.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个文件`,
        }}
      />
    </div>
  );
};

export default FileUploader; 