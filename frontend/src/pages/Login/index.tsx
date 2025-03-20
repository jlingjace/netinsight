import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import './style.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    try {
      setLoading(true);
      await authService.login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-banner">
        <h1>NetInsight</h1>
        <p>网络检测分析平台 - 让复杂网络数据变得简单易懂</p>
        <img src="/assets/network_graphic.svg" alt="Network Analysis" width="200" />
      </div>
      <div className="login-form">
        <h2>欢迎登录</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
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
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="login-footer">
          <a href="/forgot-password">忘记密码?</a>
          <a href="/register">注册账号</a>
        </div>
      </div>
    </div>
  );
};

export default Login; 