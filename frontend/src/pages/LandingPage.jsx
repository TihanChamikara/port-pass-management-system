import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SafetyCertificateOutlined, IdcardOutlined, GlobalOutlined, ArrowRightOutlined, LockOutlined } from '@ant-design/icons';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-env">

      {/* ── Background ── */}
      <div className="landing-bg" />
      <div className="landing-bg-overlay" />

      {/* ── Subtle Security Grid ── */}
      <div className="landing-grid-pattern" />

      {/* ── Header ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-header-left">
            <img
              src="/cwit-logo-removebg-preview.png"
              alt="CWIT Logo"
              className="landing-header-logo"
            />
            <div className="landing-header-divider" />
            <span className="landing-header-title">Visitor Management Portal</span>
          </div>
          <div className="landing-header-right">
            <LockOutlined className="landing-header-shield" />
            <span className="landing-header-badge">Authorized Access</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="landing-main">

        {/* Hero Section */}
        <div className="landing-hero">
          <h1 className="landing-hero-title">
            Welcome to the Visitor Management Portal
          </h1>
          <p className="landing-hero-tagline">
            Managing Visitors, Protecting CWIT
          </p>
          <p className="landing-hero-desc">
            Secure visitor request and access management for Colombo West International Terminal.
            Submit, track, and manage visitor passes through our controlled authorization system.
          </p>
        </div>

        {/* Requester Selection */}
        <div className="landing-selector-label">Select Your Access Type</div>
        <div className="landing-cards-row">

          {/* Internal Requester Card */}
          <div
            className="landing-card"
            onClick={() => navigate('/login')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/login')}
          >
            <div className="landing-card-icon-wrap landing-card-icon-internal">
              <IdcardOutlined className="landing-card-icon" />
            </div>
            <div className="landing-card-label">CWIT Employee</div>
            <h2 className="landing-card-title">Internal Requester</h2>
            <p className="landing-card-desc">
              For CWIT employees and authorized department users.
            </p>
            <div className="landing-card-action">
              Continue <ArrowRightOutlined className="landing-card-arrow" />
            </div>
            <div className="landing-card-glow" />
          </div>

          {/* External Requester Card */}
          <div
            className="landing-card"
            onClick={() => navigate('/external-visitor-request')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/external-visitor-request')}
          >
            <div className="landing-card-icon-wrap landing-card-icon-external">
              <GlobalOutlined className="landing-card-icon" />
            </div>
            <div className="landing-card-label">External Visitor / Organization</div>
            <h2 className="landing-card-title">External Requester</h2>
            <p className="landing-card-desc">
              For external companies, organizations and visitors.
            </p>
            <div className="landing-card-action">
              Continue <ArrowRightOutlined className="landing-card-arrow" />
            </div>
            <div className="landing-card-glow" />
          </div>

        </div>

        {/* Security Micro-Content */}
        <div className="landing-trust-bar">
          <SafetyCertificateOutlined className="landing-trust-icon" />
          <span>Secure Access</span>
          <span className="landing-trust-dot">•</span>
          <span>Controlled Authorization</span>
          <span className="landing-trust-dot">•</span>
          <span>Visitor Management</span>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>© CWIT — Visitor Management System</span>
        <span className="landing-footer-sep">|</span>
        <span>Authorized Access Only</span>
      </footer>

      {/* ── Styles ── */}
      <style>{`

        /* ================================================
           CSS VARIABLES — LANDING PAGE
           ================================================ */
        :root {
          --lp-navy:          #0a0f1e;
          --lp-navy-mid:      #0d1529;
          --lp-blue:          #0ea5e9;
          --lp-blue-glow:     rgba(14, 165, 233, 0.15);
          --lp-blue-border:   rgba(14, 165, 233, 0.3);
          --lp-cyan:          #22d3ee;
          --lp-white:         #f0f6ff;
          --lp-white-soft:    rgba(240, 246, 255, 0.7);
          --lp-gray:          rgba(148, 163, 184, 0.8);
          --lp-glass-bg:      rgba(15, 23, 42, 0.55);
          --lp-glass-border:  rgba(255, 255, 255, 0.08);
          --lp-glass-blur:    24px;
          --lp-radius:        20px;
          --lp-transition:    all 0.32s cubic-bezier(0.4, 0, 0.2, 1);
        }


        /* ================================================
           ENVIRONMENT
           ================================================ */
        .landing-env {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
          background: var(--lp-navy);
        }


        /* ================================================
           BACKGROUND LAYERS
           ================================================ */
        .landing-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: url('/background.png') center/cover no-repeat;
          filter: brightness(0.3) saturate(0.8);
        }

        .landing-bg-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(180deg,
              rgba(10, 15, 30, 0.85) 0%,
              rgba(10, 15, 30, 0.55) 40%,
              rgba(10, 15, 30, 0.70) 70%,
              rgba(10, 15, 30, 0.92) 100%
            );
        }

        .landing-grid-pattern {
          position: fixed;
          inset: 0;
          z-index: 2;
          background-image:
            linear-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }


        /* ================================================
           HEADER
           ================================================ */
        .landing-header {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 80px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(252, 252, 252, 0.98);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);

    display: flex;
    align-items: center;
}

        .landing-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .landing-header-logo {
         position: absolute;
         left: 100px;
         top: 50%;
         transform: translateY(-50%);
         width: 140px;
         height: auto;
}

        .landing-header-divider {
          width: 1px;
          height: 28px;
          background: rgba(255, 255, 255, 0.12);
        }

        .landing-header-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--lp-white);
          letter-spacing: 0.3px;
        }

        .landing-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
        }

        .landing-header-shield {
          font-size: 14px;
          color: var(--lp-blue);
        }

        .landing-header-badge {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--lp-gray);
          letter-spacing: 0.5px;
        }


        /* ================================================
           MAIN CONTENT
           ================================================ */
        .landing-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px 32px;
          max-width: 960px;
          margin: 0 auto;
          width: 100%;
        }


        /* ================================================
           HERO
           ================================================ */
        .landing-hero {
          text-align: center;
          margin-bottom: 48px;
          animation: heroEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes heroEnter {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .landing-hero-title {
          margin: 0 0 12px;
          font-size: 2.4rem;
          font-weight: 700;
          color: var(--lp-white);
          line-height: 1.2;
          letter-spacing: -0.5px;
        }

        .landing-hero-tagline {
          margin: 0 0 20px;
          font-size: 1.15rem;
          font-weight: 500;
          color: var(--lp-blue);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .landing-hero-desc {
          margin: 0 auto;
          max-width: 560px;
          font-size: 0.95rem;
          color: var(--lp-gray);
          line-height: 1.65;
        }


        /* ================================================
           SELECTOR LABEL
           ================================================ */
        .landing-selector-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.6);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: heroEnter 0.7s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }


        /* ================================================
           REQUESTER CARDS
           ================================================ */
        .landing-cards-row {
          display: flex;
          gap: 28px;
          width: 100%;
          animation: heroEnter 0.7s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .landing-card {
          position: relative;
          flex: 1;
          padding: 40px 32px 36px;
          text-align: center;
          cursor: pointer;
          outline: none;

          background: var(--lp-glass-bg);
          backdrop-filter: blur(var(--lp-glass-blur)) saturate(140%);
          -webkit-backdrop-filter: blur(var(--lp-glass-blur)) saturate(140%);
          border: 1px solid var(--lp-glass-border);
          border-radius: var(--lp-radius);

          transition: var(--lp-transition);
          overflow: hidden;
        }

        .landing-card:hover {
          transform: translateY(-6px);
          border-color: var(--lp-blue-border);
          box-shadow:
            0 24px 48px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(14, 165, 233, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .landing-card:focus-visible {
          border-color: var(--lp-blue);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3);
        }

        .landing-card:hover .landing-card-glow {
          opacity: 1;
        }

        .landing-card:hover .landing-card-arrow {
          transform: translateX(4px);
        }

        .landing-card:hover .landing-card-icon-wrap {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(14, 165, 233, 0.25);
        }

        /* Glow Effect */
        .landing-card-glow {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.4s ease;
          background: radial-gradient(
            ellipse at 50% 0%,
            rgba(14, 165, 233, 0.08) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* Icon */
        .landing-card-icon-wrap {
          position: relative;
          z-index: 2;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          transition: var(--lp-transition);
        }

        .landing-card-icon-internal {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(14, 165, 233, 0.05));
          border: 1px solid rgba(14, 165, 233, 0.2);
        }

        .landing-card-icon-external {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(34, 211, 238, 0.05));
          border: 1px solid rgba(34, 211, 238, 0.2);
        }

        .landing-card-icon {
          font-size: 28px;
          color: var(--lp-blue);
        }

        .landing-card-icon-external .landing-card-icon {
          color: var(--lp-cyan);
        }

        /* Text */
        .landing-card-label {
          position: relative;
          z-index: 2;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--lp-blue);
          margin-bottom: 8px;
        }

        .landing-card-icon-external ~ .landing-card-label {
          color: var(--lp-cyan);
        }

        .landing-card-title {
          position: relative;
          z-index: 2;
          margin: 0 0 10px;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--lp-white);
          line-height: 1.3;
        }

        .landing-card-desc {
          position: relative;
          z-index: 2;
          margin: 0 0 24px;
          font-size: 0.88rem;
          color: var(--lp-gray);
          line-height: 1.5;
        }

        /* Action Button */
        .landing-card-action {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 28px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--lp-white);
          background: rgba(14, 165, 233, 0.12);
          border: 1px solid rgba(14, 165, 233, 0.25);
          border-radius: 999px;
          transition: var(--lp-transition);
        }

        .landing-card:hover .landing-card-action {
          background: rgba(14, 165, 233, 0.2);
          border-color: rgba(14, 165, 233, 0.4);
        }

        .landing-card-arrow {
          font-size: 12px;
          transition: transform 0.3s ease;
        }


        /* ================================================
           TRUST BAR
           ================================================ */
        .landing-trust-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 48px;
          font-size: 0.78rem;
          font-weight: 500;
          color: rgba(148, 163, 184, 0.5);
          letter-spacing: 0.5px;
          animation: heroEnter 0.7s 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .landing-trust-icon {
          font-size: 14px;
          color: rgba(14, 165, 233, 0.5);
        }

        .landing-trust-dot {
          font-size: 6px;
          opacity: 0.4;
        }


        /* ================================================
           FOOTER
           ================================================ */
        .landing-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 20px 24px;
          font-size: 0.75rem;
          color: rgba(148, 163, 184, 0.4);
          letter-spacing: 0.3px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .landing-footer-sep {
          margin: 0 10px;
          opacity: 0.4;
        }


        /* ================================================
           RESPONSIVE
           ================================================ */

        /* Tablet */
        @media (max-width: 768px) {
          .landing-header-inner {
            padding: 14px 20px;
          }
          .landing-header-right {
            display: none;
          }
          .landing-hero-title {
            font-size: 1.9rem;
          }
          .landing-cards-row {
            gap: 20px;
          }
          .landing-card {
            padding: 32px 24px 28px;
          }
          .landing-card-title {
            font-size: 1.05rem;
          }
        }

        /* Mobile */
        @media (max-width: 600px) {
          .landing-main {
            padding: 32px 16px 24px;
          }
          .landing-hero {
            margin-bottom: 36px;
          }
          .landing-hero-title {
            font-size: 1.6rem;
          }
          .landing-hero-tagline {
            font-size: 0.95rem;
          }
          .landing-hero-desc {
            font-size: 0.88rem;
          }
          .landing-cards-row {
            flex-direction: column;
            gap: 16px;
          }
          .landing-card {
            padding: 28px 20px 24px;
          }
          .landing-selector-label {
            font-size: 0.7rem;
          }
          .landing-trust-bar {
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 32px;
          }
        }


        /* ================================================
           REDUCED MOTION
           ================================================ */
        @media (prefers-reduced-motion: reduce) {
          .landing-hero,
          .landing-cards-row,
          .landing-selector-label,
          .landing-trust-bar {
            animation: none;
          }
          .landing-card {
            transition: none;
          }
        }

      `}</style>
    </div>
  );
};

export default LandingPage;
