import React, { useState } from 'react';
import axios from 'axios';

const TestUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('准备上传文件:', file.name);
      
      // 获取验证令牌 - 这里假设你已经登录并保存了令牌
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('未登录，请先登录');
        setLoading(false);
        return;
      }
      
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('analysis_type', 'comprehensive');
      
      // 直接发送请求
      const response = await axios.post(
        'http://localhost:5000/api/files/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('上传成功:', response.data);
      setResult(response.data);
    } catch (err: any) {
      console.error('上传失败:', err);
      setError(err.response?.data?.error || '上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>文件上传测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept=".har,.pcap,.pcapng" 
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !file || loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '上传中...' : '开始上传'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#ff4d4f', margin: 0 }}>{error}</p>
        </div>
      )}
      
      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>上传成功</h3>
          <pre style={{ 
            backgroundColor: '#f8f8f8', 
            padding: '10px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestUpload; 