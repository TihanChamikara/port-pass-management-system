import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOutlined } from '@ant-design/icons';

const PortLogo = () => (
  <div className="logo-section">
    <div className="logo-halo">
      <img
        src="/cwit-logo-removebg-preview.png"
        alt="CWIT Logo"
        className="logo"
      />
    </div>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="spatial-env">
      {/* Background Layer */}
      <div className="spatial-background" />

      {/* Main Card (Styled like Login Page) */}
      <div className="login-card-spatial">
        <PortLogo />

        <h1 className="portal-title">
          Welcome to the Visitor Management Portal
        </h1>
        <p className="portal-subtitle">
          Managing Visitors, Protecting CWIT
        </p>

        <div className="portal-actions">
          <button
            type="button"
            className="portal-btn"
            onClick={() => navigate('/department-selection')}
          >
            <span>Internal Requester</span>
            <ArrowRightOutlined className="portal-arrow" />
          </button>

          <button
            type="button"
            className="portal-btn"
            onClick={() => navigate('/external-auth')}
          >
            <span>External Requester</span>
            <ArrowRightOutlined className="portal-arrow" />
          </button>
        </div>
      </div>

      {/* Styles matching Login Page */}
      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.82);
          --glass-blur: 32px;
          --glass-border: rgba(255, 255, 255, 0.90);
          --spatial-shadow: 0 32px 64px rgba(20, 60, 100, 0.22), inset 0 2px 2px rgba(255, 255, 255, 1);
          --btn-height: 56px;
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
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .spatial-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: url('/background.png') center/cover no-repeat;
        }

        /* Card (Direct match to Login Page) */
        .login-card-spatial {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          padding: 44px 40px 48px;
          text-align: center;
          
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 28px;
          box-shadow: var(--spatial-shadow);
          
          animation: cardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          box-sizing: border-box;
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Logo */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-halo {
          width: 600px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .logo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(15, 23, 42, 0.08));
        }

        /* Title & Subtitle */
        .portal-title {
          margin: 0 0 8px;
          color: #0a509b;
          font-weight: 800;
          font-size: 24px;
          line-height: 1.25;
          letter-spacing: -0.4px;
        }

        .portal-subtitle {
          margin: 0 0 32px;
          color: #d32020;
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.4;
          letter-spacing: 0.2px;
        }

        /* Actions Stack */
        .portal-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Purple Portal Button styled to Login aesthetic */
        .portal-btn {
          width: 100%;
          height: var(--btn-height);
          border-radius: var(--radius-full);
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #702082 0%, #581867 100%);
          border: none;
          box-shadow: 0 8px 24px rgba(112, 32, 130, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          padding: 0 28px;
          box-sizing: border-box;
        }

        .portal-btn:hover {
          background: linear-gradient(135deg, #842699 0%, #681c79 100%);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(112, 32, 130, 0.45);
        }

        .portal-btn:active {
          transform: scale(0.98);
          box-shadow: 0 4px 14px rgba(112, 32, 130, 0.25);
        }

        .portal-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(112, 32, 130, 0.4), 0 8px 24px rgba(112, 32, 130, 0.35);
        }

        .portal-arrow {
          position: absolute;
          right: 24px;
          font-size: 14px;
          transition: transform 0.22s ease;
          opacity: 0.9;
        }

        .portal-btn:hover .portal-arrow {
          transform: translateX(4px);
          opacity: 1;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .login-card-spatial {
            padding: 36px 24px 40px;
            border-radius: 24px;
          }

          .portal-title {
            font-size: 20px;
          }

          .portal-subtitle {
            font-size: 13.5px;
            margin-bottom: 26px;
          }

          .portal-btn {
            height: 52px;
            font-size: 0.98rem;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .login-card-spatial {
            animation: none;
          }
          .portal-btn,
          .portal-arrow {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
