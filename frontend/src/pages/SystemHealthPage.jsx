import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Tag, Table, Button, Typography, Space,
  Alert, Spin, Tooltip, Steps, Collapse, Select, Badge,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  DatabaseOutlined, CloudServerOutlined, HddOutlined,
  SyncOutlined, SafetyOutlined, ReloadOutlined,
  ClockCircleOutlined, FileProtectOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, ThunderboltOutlined, HeartOutlined,
} from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// ── Status config ─────────────────────────────────────────────────────

const STATUS_CFG = {
  ONLINE:         { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', label: 'Online',         icon: <CheckCircleOutlined /> },
  HEALTHY:        { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', label: 'Healthy',        icon: <CheckCircleOutlined /> },
  SUCCESS:        { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', label: 'Success',        icon: <CheckCircleOutlined /> },
  WARNING:        { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', label: 'Warning',        icon: <WarningOutlined /> },
  DEGRADED:       { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', label: 'Degraded',       icon: <WarningOutlined /> },
  NOT_CONFIGURED: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Not Configured', icon: <InfoCircleOutlined /> },
  NO_BACKUPS:     { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'No Backups',     icon: <InfoCircleOutlined /> },
  UNKNOWN:        { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Unknown',        icon: <ExclamationCircleOutlined /> },
  FAILED:         { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Failed',         icon: <CloseCircleOutlined /> },
  OFFLINE:        { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Offline',        icon: <CloseCircleOutlined /> },
  CRITICAL:       { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Critical',       icon: <CloseCircleOutlined /> },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.UNKNOWN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Metric Card ───────────────────────────────────────────────────────

const MetricCard = ({ title, icon, status, value, sub, loading }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.UNKNOWN;
  return (
    <Card
      size="small"
      style={{ borderRadius: 14, height: '100%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      bodyStyle={{ padding: '18px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {title}
        </Text>
        <span style={{ fontSize: 18, color: cfg.color, opacity: 0.8 }}>{icon}</span>
      </div>
      {loading ? (
        <Spin size="small" />
      ) : (
        <>
          <StatusBadge status={status} />
          {value != null && (
            <div style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{value}</Text>
            </div>
          )}
          {sub && (
            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block', lineHeight: 1.5 }}>
              {sub}
            </Text>
          )}
        </>
      )}
    </Card>
  );
};

// ── Disk Ring ─────────────────────────────────────────────────────────

const DiskRing = ({ pct, color }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={112} height={112} style={{ display: 'block' }}>
      <circle cx={56} cy={56} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={56} cy={56} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 56 56)"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x={56} y={52} textAnchor="middle" fontSize={16} fontWeight={800} fill={color}>{pct}%</text>
      <text x={56} y={68} textAnchor="middle" fontSize={10} fontWeight={600} fill="#94a3b8">Used</text>
    </svg>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────

const SystemHealthPage = () => {
  const [health, setHealth]   = useState(null);
  const [failover, setFailover] = useState(null);
  const [backups, setBackups]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get('/api/system-health/');
      setHealth(res.data);
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
  }, []);

  const fetchFailover = useCallback(async () => {
    try { const res = await api.get('/api/system-health/failover-checklist'); setFailover(res.data); }
    catch (err) { console.error(err); }
  }, []);

  const fetchBackups = useCallback(async () => {
    try { const res = await api.get('/api/system-health/backups'); setBackups(res.data); }
    catch (err) { console.error(err); }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchFailover(), fetchBackups()]);
    setRefreshing(false);
  }, [fetchHealth, fetchFailover, fetchBackups]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchFailover(), fetchBackups()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchFailover, fetchBackups]);

  // ── Disk ──
  const diskPct  = health?.disk?.usage_percent ?? 0;
  const diskCfg  = STATUS_CFG[health?.disk?.status] || STATUS_CFG.UNKNOWN;

  // ── Backup columns ──
  const backupColumns = [
    {
      title: 'Filename', dataIndex: 'filename', key: 'filename', ellipsis: true,
      render: v => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Type', dataIndex: 'backup_type', key: 'backup_type', width: 90,
      render: v => {
        const c = v === 'daily' ? 'blue' : v === 'weekly' ? 'purple' : 'gold';
        return <Tag color={c} style={{ fontSize: 11 }}>{v}</Tag>;
      },
    },
    {
      title: 'Size', dataIndex: 'size_mb', key: 'size_mb', width: 90,
      render: v => <Text style={{ fontSize: 12 }}>{v} MB</Text>,
    },
    {
      title: 'Created', dataIndex: 'created', key: 'created', width: 170,
      render: v => (
        <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
          <Text style={{ fontSize: 12 }}>{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
  ];

  // ── Failover step status → antd Steps status ──
  const stepStatus = s =>
    s === 'DONE' ? 'finish' : s === 'FAILED' ? 'error' : s === 'IN_PROGRESS' ? 'process' : 'wait';

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: -0.3 }}>
            <HeartOutlined style={{ color: '#ef4444', marginRight: 8 }} />
            System Health
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Server role:&nbsp;
            <Tag color="blue" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
              {health?.server_role || '—'}
            </Tag>
            {lastRefresh && (
              <>
                <ClockCircleOutlined style={{ marginLeft: 8, marginRight: 4, color: '#94a3b8' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Updated {dayjs(lastRefresh).fromNow()}
                </Text>
              </>
            )}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={refreshAll}
          loading={refreshing}
          style={{ fontWeight: 600 }}
        >
          Refresh
        </Button>
      </div>

      {/* ── Warning alerts ───────────────────────────────────────── */}
      {health?.warnings?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {health.warnings.map((w, i) => (
            <Alert key={i} message={w} type="warning" showIcon closable
              style={{ marginBottom: 8, borderRadius: 10, fontWeight: 500 }} />
          ))}
        </div>
      )}

      {/* ── Spinner on first load ────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#94a3b8' }}>Loading system health…</div>
        </div>
      ) : (
        <>
          {/* ── Row 1: 4 status cards ──────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                title="Application" icon={<ThunderboltOutlined />}
                status={health?.application?.status}
                sub={health?.application?.detail}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                title="Database" icon={<DatabaseOutlined />}
                status={health?.database?.status}
                sub={health?.database?.detail}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                title="Replication" icon={<SyncOutlined />}
                status={health?.replication?.status}
                value={health?.replication?.delay_seconds != null
                  ? `${health.replication.delay_seconds.toFixed(1)}s lag`
                  : null}
                sub={health?.replication?.detail}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricCard
                title="Backup" icon={<SafetyOutlined />}
                status={health?.backup?.status}
                sub={health?.backup?.last_backup_time
                  ? `Last: ${dayjs(health.backup.last_backup_time).format('MMM D, HH:mm')} · ${health.backup.total_backups} file(s)`
                  : health?.backup?.detail}
              />
            </Col>
          </Row>

          {/* ── Row 2: Disk + Server ───────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* Disk */}
            <Col xs={24} sm={14} lg={10}>
              <Card
                size="small"
                style={{ borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', height: '100%' }}
                bodyStyle={{ padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    <HddOutlined style={{ marginRight: 5 }} />Disk Usage
                  </Text>
                  <StatusBadge status={health?.disk?.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                  <DiskRing pct={diskPct} color={diskCfg.color} />
                  <div style={{ flex: 1 }}>
                    {[
                      { label: 'Total',  value: `${health?.disk?.total_gb ?? 0} GB`, color: '#64748b' },
                      { label: 'Used',   value: `${health?.disk?.used_gb  ?? 0} GB`, color: diskCfg.color },
                      { label: 'Free',   value: `${health?.disk?.free_gb  ?? 0} GB`, color: '#10b981' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{r.label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Col>

            {/* Server */}
            <Col xs={24} sm={10} lg={6}>
              <MetricCard
                title="Server" icon={<CloudServerOutlined />}
                status={health?.server?.status}
                sub={health?.server?.detail}
              />
            </Col>

            {/* Retention policy */}
            <Col xs={24} lg={8}>
              <Card
                size="small"
                style={{ borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', height: '100%' }}
                bodyStyle={{ padding: '18px 20px' }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 14 }}>
                  <FileProtectOutlined style={{ marginRight: 5 }} />Backup Retention Policy
                </Text>
                {[
                  { label: 'Daily',   value: backups?.retention?.daily   ?? '—', color: '#3b82f6' },
                  { label: 'Weekly',  value: backups?.retention?.weekly  ?? '—', color: '#7c3aed' },
                  { label: 'Monthly', value: backups?.retention?.monthly ?? '—', color: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 8, marginBottom: 6,
                    background: 'var(--surface-alt)',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{r.label}</Text>
                    <Tag color={r.label === 'Daily' ? 'blue' : r.label === 'Weekly' ? 'purple' : 'gold'}
                      style={{ margin: 0, fontWeight: 700 }}>
                      Keep {r.value}
                    </Tag>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>

          {/* ── Row 3: Backup History table ────────────────────── */}
          <Card
            size="small"
            style={{ borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}
            title={
              <Space>
                <FileProtectOutlined style={{ color: '#0ea5e9' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Backup History</span>
                {backups?.backups?.length > 0 && (
                  <Tag color="blue" style={{ fontSize: 11 }}>{backups.backups.length} files</Tag>
                )}
              </Space>
            }
          >
            <Table
              dataSource={backups?.backups || []}
              rowKey="filename"
              columns={backupColumns}
              size="small"
              pagination={{ pageSize: 8, size: 'small' }}
              locale={{ emptyText: (
                <div style={{ padding: '24px 0', color: '#94a3b8' }}>
                  <SafetyOutlined style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                  No backup files found. Run the backup script to create one.
                </div>
              )}}
            />
          </Card>

          {/* ── Row 4: Failover Checklist ──────────────────────── */}
          <Card
            size="small"
            style={{ borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Manual Failover Checklist</span>
                {failover?.ready && <Tag color="success">Ready</Tag>}
              </Space>
            }
          >
            <Alert
              type="warning"
              showIcon
              message="Manual / Controlled Failover Only"
              description="Automatic failover is NOT enabled. Follow each step carefully and confirm each action before proceeding. Never promote while the old primary may still be running (split-brain risk)."
              style={{ borderRadius: 10, marginBottom: 20, fontSize: 13 }}
            />
            <Steps
              direction="vertical"
              size="small"
              style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}
              items={(failover?.steps || []).map(s => ({
                title: (
                  <Text style={{ fontSize: 13, fontWeight: 600 }}>
                    Step {s.step}: {s.action}
                  </Text>
                ),
                description: s.detail
                  ? <Text type="secondary" style={{ fontSize: 12 }}>{s.detail}</Text>
                  : null,
                status: stepStatus(s.status),
              }))}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default SystemHealthPage;
