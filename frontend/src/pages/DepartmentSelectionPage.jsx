import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';

const DEPARTMENTS = [
  // Column 1
  { id: 'operations', name: 'Operations', col: 1 },
  { id: 'hr_admin', name: 'HR and Admin', col: 1 },
  { id: 'techno_commercial', name: 'Techno Commercial', col: 1 },
  { id: 'it', name: 'IT', col: 1 },
  { id: 'project', name: 'Project', col: 1 },
  
  // Column 2
  { id: 'business_development', name: 'Business Development', col: 2 },
  { id: 'engineering', name: 'Engineering', col: 2 },
  { id: 'finance', name: 'Finance', col: 2 },
  { id: 'hse', name: 'HSE', col: 2 },
  { id: 'esg', name: 'ESG', col: 2 },

  // Centered Bottom
  { id: 'security', name: 'Security', col: 'center' },
];

const PortLogo = () => (
  <div className="logo-section">
    <div className="logo-halo">
      <img
        src="/cwit-logo-removebg-preview.png"
        alt="CWIT Logo"
        className="logo"
        onError={(e) => {
          e.currentTarget.src = '/cwit-portal-logo.png';
        }}
      />
    </div>
  </div>
);

const DepartmentSelectionPage = () => {
  const navigate = useNavigate();

  const handleSelectDepartment = (deptName) => {
    navigate('/login', { state: { department: deptName } });
  };

  const handleKeyDown = (e, deptName) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectDepartment(deptName);
    }
  };

  return (
    <div className="spatial-env">
      {/* Background Layer */}
      <div className="spatial-background" />

      {/* Main Department Filter Card */}
      <div className="dept-card-spatial">
        
        {/* Back Link */}
        <button
          type="button"
          className="dept-back-btn"
          onClick={() => navigate('/')}
          aria-label="Back to Portal"
        >
          <ArrowLeftOutlined style={{ fontSize: 13 }} />
          <span>Back</span>
        </button>

        {/* Top Centered Logo */}
        <PortLogo />

        {/* Title & Subtitle from filtering dept.png */}
        <h1 className="dept-title">
          Visitor Management System
        </h1>
        <p className="dept-subtitle">
          Managing Visitors, Protecting CWIT
        </p>

        {/* Department Buttons Grid */}
        <div className="dept-grid">
          {/* Column 1 */}
          <div className="dept-column">
            {DEPARTMENTS.filter((d) => d.col === 1).map((dept) => (
              <button
                key={dept.id}
                type="button"
                className="dept-btn"
                onClick={() => handleSelectDepartment(dept.name)}
                onKeyDown={(e) => handleKeyDown(e, dept.name)}
                aria-label={`Select ${dept.name} Department`}
              >
                <span>{dept.name}</span>
                <ArrowRightOutlined className="dept-btn-arrow" />
              </button>
            ))}
          </div>

          {/* Column 2 */}
          <div className="dept-column">
            {DEPARTMENTS.filter((d) => d.col === 2).map((dept) => (
              <button
                key={dept.id}
                type="button"
                className="dept-btn"
                onClick={() => handleSelectDepartment(dept.name)}
                onKeyDown={(e) => handleKeyDown(e, dept.name)}
                aria-label={`Select ${dept.name} Department`}
              >
                <span>{dept.name}</span>
                <ArrowRightOutlined className="dept-btn-arrow" />
              </button>
            ))}
          </div>
        </div>

        {/* Centered Bottom Row: Security */}
        <div className="dept-bottom-row">
          {DEPARTMENTS.filter((d) => d.col === 'center').map((dept) => (
            <button
              key={dept.id}
              type="button"
              className="dept-btn dept-btn-center"
              onClick={() => handleSelectDepartment(dept.name)}
              onKeyDown={(e) => handleKeyDown(e, dept.name)}
              aria-label={`Select ${dept.name} Department`}
            >
              <span>{dept.name}</span>
              <ArrowRightOutlined className="dept-btn-arrow" />
            </button>
          ))}
        </div>

      </div>

      {/* Embedded Stylesheet matching spatial theme & filtering dept.png */}
      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.85);
          --glass-blur: 32px;
          --glass-border: rgba(255, 255, 255, 0.90);
          --spatial-shadow: 0 32px 64px rgba(20, 60, 100, 0.22), inset 0 2px 2px rgba(255, 255, 255, 1);
          
          /* Department Button Colors (from filtering dept.png) */
          --dept-btn-bg: #dbeafe;
          --dept-btn-bg-hover: #bfdbfe;
          --dept-btn-border: #1e293b;
          --dept-btn-text: #0f172a;
          
          --radius-card: 28px;
          --radius-btn: 10px;
        }

        /* Environment */
        .spatial-env {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          padding: 32px 16px;
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .spatial-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: url('/background.png') center/cover no-repeat;
        }

        /* Card */
        .dept-card-spatial {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 680px;
          padding: 40px 44px 44px;
          text-align: center;
          
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
          border: 1.5px solid var(--glass-border);
          border-radius: var(--radius-card);
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

        /* Back Button */
        .dept-back-btn {
          position: absolute;
          top: 24px;
          left: 28px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(226, 232, 240, 0.85);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
        }

        .dept-back-btn:hover {
          background: #ffffff;
          color: #0a509b;
          transform: translateX(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        /* Logo */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-halo {
          width: 240px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .logo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(15, 23, 42, 0.08));
        }

        /* Titles (from filtering dept.png) */
        .dept-title {
          margin: 0 0 8px;
          color: #0a509b;
          font-weight: 800;
          font-size: 27px;
          line-height: 1.25;
          letter-spacing: -0.4px;
        }

        .dept-subtitle {
          margin: 0 0 28px;
          color: #d32020;
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.4;
          letter-spacing: 0.2px;
        }

        /* Department Grid */
        .dept-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 20px;
          width: 100%;
          margin-bottom: 16px;
        }

        .dept-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Department Button (styled matching filtering dept.png) */
        .dept-btn {
          width: 100%;
          min-height: 48px;
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
          color: var(--dept-btn-text);
          border: 1.5px solid var(--dept-btn-border);
          border-radius: var(--radius-btn);
          padding: 10px 18px;
          font-size: 0.96rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
          outline: none;
          box-sizing: border-box;
        }

        .dept-btn:hover {
          background: linear-gradient(135deg, #bae6fd 0%, #93c5fd 100%);
          border-color: #0369a1;
          color: #0c4a6e;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25);
        }

        .dept-btn:active {
          transform: scale(0.98);
          box-shadow: 0 2px 6px rgba(14, 165, 233, 0.15);
        }

        .dept-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.4), 0 4px 12px rgba(14, 165, 233, 0.2);
          border-color: #0284c7;
        }

        .dept-btn-arrow {
          position: absolute;
          right: 14px;
          font-size: 13px;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.2s ease;
          color: #0369a1;
        }

        .dept-btn:hover .dept-btn-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* Bottom Centered Row */
        .dept-bottom-row {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 2px;
        }

        .dept-btn-center {
          width: 50%;
          min-width: 220px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .dept-card-spatial {
            padding: 32px 20px 36px;
            border-radius: 24px;
          }

          .dept-back-btn {
            top: 18px;
            left: 18px;
            padding: 4px 10px;
            font-size: 0.78rem;
          }

          .dept-title {
            font-size: 22px;
          }

          .dept-subtitle {
            font-size: 13px;
            margin-bottom: 22px;
          }

          .dept-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }

          .dept-column {
            gap: 12px;
          }

          .dept-btn-center {
            width: 100%;
          }

          .dept-btn {
            min-height: 46px;
            font-size: 0.92rem;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .dept-card-spatial {
            animation: none;
          }
          .dept-btn,
          .dept-back-btn,
          .dept-btn-arrow {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DepartmentSelectionPage;
