import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import './style.css';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 检查是否已登录，如果是则重定向到仪表盘
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 表单验证
    if (!email || !password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度不能少于6个字符');
      return;
    }

    try {
      setLoading(true);
      await authService.register({ email, password, name });
      // 注册成功后自动登录
      await authService.login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('注册错误:', err);
      setError(err.response?.data?.message || '注册失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-banner">
        <h1>NetInsight</h1>
        <p>网络检测分析平台 - 让复杂网络数据变得简单易懂</p>
        <img src="/assets/network_graphic.svg" alt="Network Analysis" width="200" />
      </div>
      <div className="register-form">
        <h2>创建账号</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">邮箱 *</label>
            <input
              type="email"
              id="email"
              placeholder="请输入邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              type="text"
              id="name"
              placeholder="请输入您的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码 *</label>
            <input
              type="password"
              id="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码 *</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div className="register-footer">
          <p>已有账号? <a href="/login">立即登录</a></p>
        </div>
      </div>
    </div>
  );
};

export default Register; 