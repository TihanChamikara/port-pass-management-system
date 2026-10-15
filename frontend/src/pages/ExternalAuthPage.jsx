import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined, GlobalOutlined, IdcardOutlined, BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/authStore';
import api from '../api/api';

/* ── Logo Component ── */
const PortLogo = () => (
  <div className="logo-section">
    <div className="logo-halo">
      <img src="/cwit-logo-removebg-preview.png" alt="CWIT Logo" className="logo" />
    </div>
  </div>
);

const ExternalAuthPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, fetchMe } = useAuthStore();
  const [activeTab, setActiveTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [signInForm] = Form.useForm();
  const [signUpForm] = Form.useForm();

  // Redirect if already authenticated as external user
  useEffect(() => {
    if (isAuthenticated && user?.role === 'public_requester') {
      navigate('/external-visitor-request', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSignInFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/api/external-auth/login', { email: values.email, password: values.password });
      const { access_token } = res.data;
      localStorage.setItem('token', access_token);
      useAuthStore.setState({ token: access_token });
      await fetchMe();
      message.success('Sign in successful!');
      navigate('/external-visitor-request', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.detail || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSignUpFinish = async (values) => {
    setLoading(true);
    try {
      await api.post('/api/external-auth/signup', {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        company: values.company,
      });
      message.success('Account created successfully! Please sign in.');
      signUpForm.resetFields();
      signInForm.setFieldsValue({ email: values.email });
      setActiveTab('signin');
    } catch (err) {
      message.error(err.response?.data?.detail || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spatial-env">
      
      {/* Background Layer */}
      <div className="spatial-background" />

      {/* Surrounding UI */}
      <div className="spatial-tag-tl">
        <div className="spatial-tag-bar" />
        <p><strong>Safer Access.<br/>Smarter Operations.</strong></p>
      </div>
      
      <div className="spatial-tag-bl">
        <SafetyCertificateOutlined style={{ fontSize: 16 }} />
        <span><strong>Secure • Reliable • Trusted</strong></span>
      </div>
      
      <div className="spatial-tag-br">
        <div className="spatial-tag-bar" style={{ marginLeft: 'auto' }} />
        <p style={{ textAlign: 'right' }}><strong>Building a safer tomorrow,<br/>together.</strong></p>
      </div>

      {/* Login Card Layer */}
      <div className="login-card-spatial">
        <PortLogo />
        
        <h1 className="login-title">External Access</h1>
        <p className="login-subtitle">Sign in or create an account</p>

        <div className="auth-tabs">
          <div 
            className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </div>
          <div 
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </div>
        </div>

        {activeTab === 'signin' ? (
          <Form
            form={signInForm}
            name="signin"
            onFinish={onSignInFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
            className="login-form"
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please enter your email.' }, { type: 'email', message: 'Please enter a valid email.' }]}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="Email Address"
                autoComplete="email"
                className="spatial-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password.' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Password"
                autoComplete="current-password"
                className="spatial-input"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={!loading ? <ArrowRightOutlined /> : null}
                className="spatial-btn"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form
            form={signUpForm}
            name="signup"
            onFinish={onSignUpFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
            className="login-form signup-form"
          >
            <Form.Item
              name="full_name"
              rules={[{ required: true, message: 'Please enter your full name.' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<IdcardOutlined className="input-icon" />}
                placeholder="Full Name"
                className="spatial-input small-input"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please enter your email.' }, { type: 'email', message: 'Please enter a valid email.' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="Email Address"
                autoComplete="email"
                className="spatial-input small-input"
              />
            </Form.Item>

            <Form.Item
              name="company"
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<BankOutlined className="input-icon" />}
                placeholder="Company / Organization (Optional)"
                className="spatial-input small-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password.' }, { min: 6, message: 'Password must be at least 6 characters.' }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Create Password"
                autoComplete="new-password"
                className="spatial-input small-input"
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The passwords do not match.'));
                  },
                }),
              ]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Confirm Password"
                autoComplete="new-password"
                className="spatial-input small-input"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={!loading ? <ArrowRightOutlined /> : null}
                className="spatial-btn"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Form.Item>
          </Form>
        )}

        <div className="login-divider" style={{ marginTop: activeTab === 'signup' ? 20 : 28 }}>
          <span className="login-divider-line" />
          <span className="login-divider-text">OR</span>
          <span className="login-divider-line" />
        </div>

        <Link to="/" className="visitor-link">
          Back to Home
        </Link>
      </div>

      {/* CSS Stylesheet embedded for perfect modularity */}
      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.75);
          --glass-blur: 32px;
          --glass-border: rgba(255, 255, 255, 0.85);
          --spatial-shadow: 0 32px 64px rgba(20, 60, 100, 0.22), inset 0 2px 2px rgba(255, 255, 255, 1);
          
          --primary-blue: #2563eb;
          --primary-blue-hover: #1d4ed8;
          --primary-blue-light: #3b82f6;
          
          --text-dark: #0f172a;
          --text-muted: #64748b;
          
          --input-height: 60px;
          --btn-height: 60px;
          --radius-full: 999px;
        }

        /* Environment */
        .spatial-env {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 24px 16px;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .spatial-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: url('/background.png') center/cover no-repeat;
        }

        /* Card */
        .login-card-spatial {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 48px 44px;
          text-align: center;
          
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 28px;
          box-shadow: var(--spatial-shadow);
          
          animation: cardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Logo */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-halo {
          width: 220px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .logo {
          width: 350px;
          max-width: 120%;
          height: auto;
          object-fit: contain;
        }

        /* Typography */
        .login-title {
          margin: 0;
          color: #0a509b;
          font-weight: 700;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          margin-top: 8px;
          margin-bottom: 24px;
          color: #5F7895;
          font-size: 15px;
          font-weight: 400;
        }

        /* Tabs */
        .auth-tabs {
          display: flex;
          background: rgba(241, 245, 249, 0.8);
          border-radius: var(--radius-full);
          padding: 4px;
          margin-bottom: 24px;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .auth-tab {
          flex: 1;
          padding: 10px 0;
          border-radius: var(--radius-full);
          font-size: 0.95rem;
          font-weight: 600;
          color: #5F7895;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auth-tab.active {
          background: #fff;
          color: #0a509b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Form */
        .login-form {
          width: 100%;
        }

        /* Inputs */
        .spatial-input.ant-input,
        .spatial-input.ant-input-affix-wrapper {
          height: var(--input-height) !important;
          border-radius: var(--radius-full) !important;
          background: rgba(241, 245, 249, 0.8) !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.02) !important;
          padding: 0 20px !important;
          font-size: 1rem !important;
          transition: all 0.2s ease !important;
          color: #183B5D !important;
        }

        .spatial-input.small-input.ant-input,
        .spatial-input.small-input.ant-input-affix-wrapper {
          height: 50px !important;
          padding: 0 16px !important;
        }

        .spatial-input.ant-input-affix-wrapper input.ant-input {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          height: 100% !important;
          padding-left: 0 !important;
          color: #183B5D !important;
        }

        .spatial-input.ant-input:focus,
        .spatial-input.ant-input-affix-wrapper-focused {
          background: rgba(255, 255, 255, 1) !important;
          border-color: var(--primary-blue-light) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.02) !important;
        }

        .input-icon {
          color: #315D89 !important;
          font-size: 1.15rem !important;
          margin-right: 12px !important;
        }

        .spatial-input ::placeholder {
          color: #7188A0 !important;
        }

        .spatial-input .ant-input-suffix .anticon {
          color: var(--text-muted) !important;
        }

        /* Button */
        .spatial-btn.ant-btn {
          height: var(--btn-height) !important;
          border-radius: var(--radius-full) !important;
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          background: linear-gradient(135deg, #3D8EF7, #315FE5) !important;
          border: none !important;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35) !important;
          color: #FFFFFF !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          transition: all 0.2s ease !important;
        }

        .spatial-btn.ant-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #60a5fa 0%, var(--primary-blue-hover) 100%) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.45) !important;
        }

        .spatial-btn.ant-btn:active:not(:disabled) {
          transform: scale(0.98) !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
        }

        /* Divider */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 28px 0 20px;
        }
        
        .login-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(15, 23, 42, 0.12);
        }
        
        .login-divider-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.4);
          letter-spacing: 1.5px;
        }

        /* Visitor Link */
        .visitor-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1769E8;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .visitor-link:hover {
          background: rgba(37, 99, 235, 0.08);
          text-decoration: none;
        }

        /* Surrounding Tags */
        .spatial-tag-tl {
          position: absolute;
          top: 48px;
          left: 60px;
          z-index: 5;
        }
        
        .spatial-tag-tr {
          position: absolute;
          top: 36px;
          right: 48px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-full);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
        
        .spatial-theme-divider {
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
        }

        .spatial-tag-bl {
          position: absolute;
          bottom: 48px;
          left: 60px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-weight: 500;
          font-size: 0.95rem;
        }
        
        .spatial-tag-br {
          position: absolute;
          bottom: 48px;
          right: 60px;
          z-index: 5;
        }

        .spatial-tag-bar {
          width: 32px;
          height: 2px;
          background: var(--primary-blue);
          border-radius: 2px;
          margin-bottom: 12px;
        }

        .spatial-tag-tl p, .spatial-tag-br p {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(15, 23, 42, 0.65);
          line-height: 1.5;
        }

        /* Form Error Message */
        .login-card-spatial .ant-form-item-explain-error {
          text-align: left;
          font-size: 0.85rem;
          color: #ef4444;
          margin-top: 6px;
          padding-left: 20px;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .spatial-tag-tl, .spatial-tag-br, .spatial-tag-bl, .spatial-tag-tr {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .login-card-spatial {
            padding: 40px 24px;
            max-width: 90%;
            border-radius: 24px;
          }
          
          .login-title {
            font-size: 1.8rem;
          }
          
          .spatial-input.ant-input,
          .spatial-input.ant-input-affix-wrapper,
          .spatial-btn.ant-btn {
            height: 52px !important;
          }
          .spatial-input.small-input.ant-input,
          .spatial-input.small-input.ant-input-affix-wrapper {
            height: 48px !important;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .login-card-spatial {
            animation: none;
          }
          .login-logo-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ExternalAuthPage;
