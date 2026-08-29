import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    const result = await login(values.username, values.password);
    if (result.success) {
      message.success('Login successful!');
      navigate('/dashboard');
    } else {
      message.error(result.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* ── Left Panel: Port Security Branding & Visual ── */}
      <div style={{
        flex: '0 0 48%',
        background: 'linear-gradient(160deg, #060d1f 0%, #0b1329 50%, #0f1e36 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background port silhouette */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'none' }}>
          <svg viewBox="0 0 600 400" style={{ width: '100%', opacity: 0.07 }} preserveAspectRatio="xMidYMax meet">
            {/* Containers */}
            <rect x="40" y="200" width="120" height="80" fill="#fff" rx="3"/>
            <rect x="170" y="170" width="120" height="110" fill="#fff" rx="3"/>
            <rect x="300" y="190" width="120" height="90" fill="#fff" rx="3"/>
            <rect x="430" y="160" width="120" height="120" fill="#fff" rx="3"/>
            {/* Crane tower */}
            <rect x="270" y="40" width="10" height="160" fill="#fff"/>
            <rect x="200" y="40" width="80" height="8" fill="#fff"/>
            <line x1="275" y1="40" x2="200" y2="100" stroke="#fff" strokeWidth="3"/>
            <line x1="275" y1="40" x2="340" y2="100" stroke="#fff" strokeWidth="3"/>
            {/* Ground */}
            <rect x="0" y="280" width="600" height="20" fill="#fff" opacity="0.5"/>
            {/* Water */}
            <rect x="0" y="300" width="600" height="100" fill="#fff" opacity="0.2"/>
          </svg>
        </div>

        {/* Branding */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(14,165,233,0.45)',
          }}>
            <SecurityScanOutlined style={{ fontSize: 34, color: '#fff' }} />
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            color: '#f1f5f9',
            margin: '0 0 8px',
            letterSpacing: '1.5px',
            fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
          }}>
            PORT PASS PRO
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: '0 0 4px' }}>
            Enterprise Command Center
          </p>
          <p style={{ color: '#334155', fontSize: '0.85rem', margin: 0 }}>
            Port Security & Visitor Operations Platform
          </p>
        </div>

        {/* CSS 3D Port Gate Visualization */}
        <div style={{ position: 'relative', zIndex: 1, perspective: '800px' }}>
          <svg
            viewBox="0 0 260 200"
            style={{
              width: 260,
              transform: 'rotateY(-12deg) rotateX(6deg)',
              filter: 'drop-shadow(0 20px 40px rgba(14,165,233,0.3))',
              transition: 'transform 0.4s ease',
            }}
          >
            {/* Gate posts */}
            <rect x="20" y="40" width="18" height="130" fill="#1e3a5f" rx="3"/>
            <rect x="220" y="40" width="18" height="130" fill="#1e3a5f" rx="3"/>
            {/* Crossbeam - accent blue */}
            <rect x="14" y="28" width="230" height="18" fill="#0ea5e9" rx="4"/>
            {/* Gate arm - left */}
            <rect x="38" y="46" width="90" height="11" fill="#0284c7" rx="3" opacity="0.9"/>
            {/* Gate arm - right */}
            <rect x="130" y="46" width="90" height="11" fill="#0284c7" rx="3" opacity="0.9"/>
            {/* Status lights */}
            <circle cx="29" cy="22" r="5" fill="#10b981"/>
            <circle cx="229" cy="22" r="5" fill="#10b981"/>
            <circle cx="29" cy="22" r="8" fill="#10b981" opacity="0.25"/>
            <circle cx="229" cy="22" r="8" fill="#10b981" opacity="0.25"/>
            {/* Road markings */}
            <rect x="0" y="168" width="258" height="24" fill="#1e293b" rx="3"/>
            <rect x="105" y="173" width="50" height="6" fill="#f59e0b" rx="2" opacity="0.7"/>
            {/* Security booth */}
            <rect x="188" y="90" width="44" height="70" fill="#1e3a5f" rx="4"/>
            <rect x="195" y="100" width="14" height="10" fill="#7dd3fc" opacity="0.7" rx="1"/>
            <rect x="213" y="100" width="14" height="10" fill="#7dd3fc" opacity="0.7" rx="1"/>
            <rect x="200" y="130" width="14" height="30" fill="#0f172a" rx="2"/>
            {/* Visitor vehicle */}
            <rect x="58" y="134" width="78" height="30" fill="#334155" rx="7"/>
            <rect x="68" y="116" width="58" height="22" fill="#475569" rx="5"/>
            <rect x="72" y="119" width="22" height="12" fill="#7dd3fc" rx="2" opacity="0.5"/>
            <rect x="98" y="119" width="22" height="12" fill="#7dd3fc" rx="2" opacity="0.5"/>
            <circle cx="78" cy="168" r="9" fill="#1e293b"/>
            <circle cx="78" cy="168" r="4.5" fill="#475569"/>
            <circle cx="118" cy="168" r="9" fill="#1e293b"/>
            <circle cx="118" cy="168" r="4.5" fill="#475569"/>
            {/* Floating ID badge */}
            <g transform="translate(10, 60) rotate(-10)">
              <rect x="0" y="0" width="48" height="32" fill="#0ea5e9" rx="5" opacity="0.95"/>
              <rect x="4" y="4" width="14" height="14" fill="white" rx="2" opacity="0.9"/>
              <rect x="22" y="6" width="22" height="3" fill="white" rx="1" opacity="0.7"/>
              <rect x="22" y="12" width="16" height="2.5" fill="white" rx="1" opacity="0.5"/>
              <rect x="4" y="22" width="40" height="2.5" fill="white" rx="1" opacity="0.4"/>
              <rect x="4" y="27" width="28" height="2" fill="white" rx="1" opacity="0.3"/>
            </g>
          </svg>
        </div>

        {/* Feature pills */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Multi-User', 'Role-Based Access', 'Real-Time Gate Control', 'Audit Logs'].map(tag => (
            <span key={tag} style={{
              background: 'rgba(14,165,233,0.1)',
              border: '1px solid rgba(14,165,233,0.2)',
              color: '#7dd3fc',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--surface-1, #ffffff)',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 8px',
              letterSpacing: '-0.3px',
              fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
            }}>
              Officer Login
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
              Sign in to access the Port Pass Command Center
            </p>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="on"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Username</span>}
              rules={[{ required: true, message: 'Please enter your username.' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Enter your username"
                autoComplete="username"
                style={{ borderRadius: 8, height: 44 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password.' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ borderRadius: 8, height: 44 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 8, marginBottom: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 46,
                  borderRadius: 8,
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(14,165,233,0.4)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </Button>
            </Form.Item>
          </Form>

          {/* Visitor Portal Links */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: 24,
            textAlign: 'center',
          }}>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: 14 }}>
              Not an officer? Submit a visitor request
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <Link
                to="/visitor-request"
                style={{
                  color: '#0ea5e9',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  padding: '6px 16px',
                  border: '1px solid rgba(14,165,233,0.3)',
                  borderRadius: 8,
                  transition: 'all 0.18s',
                }}
              >
                Internal Request
              </Link>
              <Link
                to="/external-visitor-request"
                style={{
                  color: '#0ea5e9',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  padding: '6px 16px',
                  border: '1px solid rgba(14,165,233,0.3)',
                  borderRadius: 8,
                  transition: 'all 0.18s',
                }}
              >
                External Portal
              </Link>
            </div>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '0.75rem', textAlign: 'center', marginTop: 32 }}>
            Port Pass Pro — Enterprise Security Platform
          </p>
        </div>
      </div>

      {/* Responsive: hide left panel on small screens */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
