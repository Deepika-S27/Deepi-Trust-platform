import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Navigate based on role
    const role = result.data.role;
    if (role === 'admin') navigate('/admin');
    else if (role === 'agent') navigate('/agent');
    else if (role === 'center') navigate('/center');
    else navigate('/donor');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container">
        {/* Left Panel */}
        <div className="auth-left">
          <div className="auth-left-content">
            <div className="auth-brand">
              <Heart size={36} fill="#f5c518" strokeWidth={0} />
              <h1>DEEPI<span> TRUST</span></h1>
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to access your dashboard and make a difference in someone's life today.</p>
            
            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon">🍲</div>
                <div>
                  <strong>12,500+ Meals</strong>
                  <span>Delivered to communities</span>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">🤖</div>
                <div>
                  <strong>AI Quality Check</strong>
                  <span>Every donation verified</span>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">📍</div>
                <div>
                  <strong>GPS Tracking</strong>
                  <span>Real-time delivery tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-right">
          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            <h2>Sign In</h2>
            <p className="auth-subtitle">Enter your credentials to continue</p>

            {error && (
              <div className="auth-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email / Username</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-control auth-input"
                  placeholder="Enter email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                  name="login-email-field"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  name="login-pass-field"
                />
                <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block auth-submit" disabled={loading}>
              {loading ? (
                <><div className="auth-spinner" /> Signing In...</>
              ) : (
                <><LogIn size={18} /> Sign In</>
              )}
            </button>

            <p className="auth-switch">
              Don't have an account? <Link to="/signup">Create Account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
