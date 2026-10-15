import { useState } from 'react';
import { Layout, Tooltip, Drawer, Badge } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BarChartOutlined,
  AuditOutlined,
  ApartmentOutlined,
  LogoutOutlined,
  MenuOutlined,
  BulbOutlined,
  BulbFilled,
  BellOutlined,
  FileProtectOutlined,
  SecurityScanOutlined,
  HeartOutlined,
  FormOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/authStore';
import { useThemeStore } from '../features/themeStore';


const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard', roles: ['admin', 'operations_officer', 'pass_officer', 'security_gate_officer', 'department_manager'] }
    ]
  },
  {
    label: 'COORDINATOR',
    items: [
      { key: '/coordinator-dashboard', icon: <FormOutlined />, label: 'Submit Request', roles: ['department_coordinator'] },
    ]
  },
  {
    label: 'WORKFLOW',
    items: [
      { key: '/dept-approvals', icon: <ApartmentOutlined />, label: 'Dept. Approvals', roles: ['admin', 'department_manager'] },
      { key: '/approve-requests', icon: <CheckCircleOutlined />, label: 'Approve Requests', roles: ['admin', 'operations_officer'] },
      { key: '/issue-passes', icon: <IdcardOutlined />, label: 'Issue Passes', roles: ['admin', 'pass_officer', 'operations_officer'] },
      { key: '/passes', icon: <FileProtectOutlined />, label: 'Pass Management', roles: ['admin', 'pass_officer', 'operations_officer'] },
    ]
  },
  {
    label: 'SECURITY',
    items: [
      { key: '/gate-control', icon: <SafetyCertificateOutlined />, label: 'Gate Control', roles: ['admin', 'security_gate_officer'] },
      { key: '/group-passes', icon: <TeamOutlined />, label: 'Group Passes', roles: ['admin', 'department_manager'] },
    ]
  },
  {
    label: 'INSIGHTS',
    items: [
      { key: '/reports', icon: <BarChartOutlined />, label: 'Analytics', roles: ['admin'] },
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { key: '/users', icon: <TeamOutlined />, label: 'User Management', roles: ['admin'] },
      { key: '/audit-logs', icon: <AuditOutlined />, label: 'Audit Trail', roles: ['admin'] },
      { key: '/system-health', icon: <HeartOutlined />, label: 'System Health', roles: ['admin'] },
    ]
  },
];

const PAGE_LABELS = {
  '/dashboard': 'Dashboard',
  '/coordinator-dashboard': 'Coordinator Dashboard',
  '/users': 'User Management',
  '/approve-requests': 'Approve Requests',
  '/dept-approvals': 'Department Approvals',
  '/issue-passes': 'Issue Passes',
  '/passes': 'Pass Management',
  '/gate-control': 'Gate Control',
  '/group-passes': 'Group Passes',
  '/reports': 'Analytics',
  '/audit-logs': 'Audit Trail',
  '/system-health': 'System Health',
};

const ROLE_CONFIG = {
  admin:                { label: 'Administrator',      color: '#38bdf8' },
  operations_officer:   { label: 'Operations Officer', color: '#fbbf24' },
  pass_officer:         { label: 'Pass Officer',       color: '#60a5fa' },
  security_gate_officer:{ label: 'Gate Officer',       color: '#34d399' },
  department_manager:   { label: 'Dept. Manager',      color: '#a78bfa' },
  department_coordinator: { label: 'Dept. Coordinator', color: '#f97316' },
};

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username?.[0] || 'U').toUpperCase();

  const roleInfo = ROLE_CONFIG[user?.role] || { label: user?.role || 'User', color: '#94a3b8' };

  const handleLogout = () => { logout(); navigate('/login'); };
  const currentLabel = PAGE_LABELS[location.pathname] || 'Dashboard';

  const SidebarContent = ({ isMobile = false }) => (
    <div
      className={`pro-sidebar${collapsed && !isMobile ? ' collapsed' : ''}`}
      style={isMobile ? { width: '100%', minWidth: '100%', height: '100%' } : {}}
    >
      {/* Brand */}
      <div className="sidebar-brand" onClick={() => !isMobile && setCollapsed(c => !c)}>
        <div className="sidebar-brand-icon">
          <SecurityScanOutlined />
        </div>
        <span className="sidebar-brand-name">PORT PASS PRO</span>
      </div>

      {/* Navigation Groups */}
      <div className="sidebar-nav">
        {NAV_GROUPS.map((group, idx) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(user?.role));
          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-group" key={idx}>
              <div className="nav-group-label">{group.label}</div>
              {visibleItems.map(item => {
                const isActive = location.pathname === item.key;
                const navContent = (
                  <div
                    key={item.key}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    onClick={() => { navigate(item.key); if (isMobile) setDrawerOpen(false); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') { navigate(item.key); if (isMobile) setDrawerOpen(false); } }}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span className="nav-item-label">{item.label}</span>
                  </div>
                );

                return collapsed && !isMobile ? (
                  <Tooltip placement="right" title={item.label} key={item.key}>
                    {navContent}
                  </Tooltip>
                ) : navContent;
              })}
            </div>
          );
        })}
      </div>

      {/* User Area */}
      <div className="sidebar-user-area">
        <div className="sidebar-user-avatar-circle">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.full_name || user?.username || 'Officer'}</div>
          <div className="sidebar-user-role" style={{ color: roleInfo.color }}>{roleInfo.label}</div>
        </div>
        <Tooltip title="Sign Out">
          <button className="sidebar-sign-out-btn" onClick={handleLogout} aria-label="Sign out">
            <LogoutOutlined />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--app-bg)' }}>
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar" style={{ flexShrink: 0 }}>
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        width={260}
        styles={{ body: { padding: 0, background: 'transparent' } }}
        closable={false}
      >
        <SidebarContent isMobile={true} />
      </Drawer>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header className="pro-header">
          <div className="header-actions">
            <button
              className="header-icon-btn mobile-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuOutlined />
            </button>
            <h4 className="header-page-title">{currentLabel}</h4>
          </div>

          <div className="header-actions">
            <Tooltip title="System Operational">
              <div className="header-status-dot" />
            </Tooltip>

            <Badge count={0} size="small">
              <button className="header-icon-btn" aria-label="Notifications">
                <BellOutlined />
              </button>
            </Badge>

            <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <button className="header-icon-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
                {darkMode ? <BulbFilled style={{ color: '#fbbf24' }} /> : <BulbOutlined />}
              </button>
            </Tooltip>

            <Tooltip title={`Signed in as ${user?.full_name || user?.username}`}>
              <div className="header-avatar">{initials}</div>
            </Tooltip>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content-area" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;