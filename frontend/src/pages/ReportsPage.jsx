import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Table, Spin, Button,
  Alert, Empty, Statistic, Select, DatePicker, Space, Tag,
} from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  DownloadOutlined, ReloadOutlined, BarChartOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  TeamOutlined, IdcardOutlined,
} from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PIE_COLORS = ['#0284c7', '#059669', '#f59e0b', '#7c3aed', '#dc2626', '#0ea5e9'];

const STATUS_COLORS = {
  pending_department_approval: '#f59e0b',
  pending_approval: '#f97316',
  under_review: '#0ea5e9',
  approved: '#059669',
  rejected: '#dc2626',
  issued: '#7c3aed',
  checked_in: '#10b981',
  checked_out: '#64748b',
};

const STATUS_LABELS = {
  pending_department_approval: 'Pending Dept.',
  pending_approval: 'Pending Ops.',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  issued: 'Issued',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
};

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 13,
};

const StatCard = ({ title, value, color, icon, suffix }) => (
  <Card size="small" style={{ borderRadius: 12, height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <Text style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
          {value}{suffix && <span style={{ fontSize: 14, marginLeft: 4 }}>{suffix}</span>}
        </Text>
      </div>
      <div style={{ fontSize: 28, color, opacity: 0.2 }}>{icon}</div>
    </div>
  </Card>
);

const ReportsPage = () => {
  const [requests, setRequests]   = useState([]);
  const [passes, setPasses]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Only call visitor-requests/all — derive everything from it
      const reqRes = await api.get('/api/visitor-requests/all', { params: { page: 1, page_size: 100 } });
      setRequests(reqRes.data?.items || []);
      setPasses([]); // zone data derived from requests below
    } catch (err) {
      console.error(err);
      setError(`Failed to load report data: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filter by date range ──────────────────────────────────────────────────
  const [from, to] = dateRange || [null, null];
  const filtered = requests.filter(r => {
    if (!from || !to) return true;
    const d = dayjs(r.created_at);
    return d.isAfter(from.startOf('day').subtract(1, 'ms')) && d.isBefore(to.endOf('day'));
  });

  // ── Summary Stats ─────────────────────────────────────────────────────────
  const total        = filtered.length;
  const approved     = filtered.filter(r => ['approved','issued','checked_in','checked_out'].includes(r.status)).length;
  const rejected     = filtered.filter(r => r.status === 'rejected').length;
  const pending      = filtered.filter(r => ['pending_department_approval','pending_approval','under_review'].includes(r.status)).length;
  const vipCount     = filtered.filter(r => r.visitor_type === 'vip').length;
  const checkedOut   = filtered.filter(r => r.status === 'checked_out').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // ── Daily Trend (last 14 days within range) ───────────────────────────────
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const day = dayjs().subtract(i, 'day');
    const dayStr = day.format('MMM DD');
    const count = filtered.filter(r => dayjs(r.created_at).format('MMM DD') === dayStr).length;
    const approvedCount = filtered.filter(r =>
      dayjs(r.created_at).format('MMM DD') === dayStr &&
      ['approved','issued','checked_in','checked_out'].includes(r.status)
    ).length;
    last14.push({ date: dayStr, Submitted: count, Approved: approvedCount });
  }

  // ── Status Distribution (Pie) ─────────────────────────────────────────────
  const statusGroups = {};
  filtered.forEach(r => {
    const label = STATUS_LABELS[r.status] || r.status;
    statusGroups[label] = (statusGroups[label] || 0) + 1;
  });
  const statusPieData = Object.entries(statusGroups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Department breakdown ──────────────────────────────────────────────────
  const deptGroups = {};
  filtered.forEach(r => {
    const dept = r.department_name || 'No Department';
    deptGroups[dept] = (deptGroups[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptGroups)
    .map(([dept, count]) => ({ dept: dept.length > 20 ? dept.slice(0, 18) + '…' : dept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Zone distribution from visitor requests ───────────────────────────────
  const zoneCounts = {};
  filtered.forEach(r => {
    const zones = Array.isArray(r.requested_zones) ? r.requested_zones
      : (typeof r.requested_zones === 'string' ? (() => { try { return JSON.parse(r.requested_zones); } catch { return []; } })() : []);
    zones.forEach(z => { zoneCounts[z] = (zoneCounts[z] || 0) + 1; });
  });
  const zoneLabels = { zone_1: 'Zone 1 – Office', zone_2: 'Zone 2 – Warehouse', zone_3: 'Zone 3 – Loading Bay', zone_4: 'Zone 4 – Restricted' };
  const zoneData = Object.entries(zoneCounts).map(([z, count]) => ({ zone: zoneLabels[z] || z, count }));

  // ── Recent requests table ─────────────────────────────────────────────────
  const recentColumns = [
    {
      title: 'Request ID',
      dataIndex: 'request_id',
      width: 160,
      render: id => <Text code style={{ fontSize: 11 }}>{id}</Text>,
    },
    {
      title: 'Visitor',
      dataIndex: 'visitor_name',
      ellipsis: true,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      ellipsis: true,
      render: d => d ? <Tag color="blue">{d}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 160,
      render: s => (
        <Tag color={
          s === 'approved' || s === 'issued' ? 'green' :
          s === 'rejected' ? 'red' :
          s === 'checked_out' ? 'default' :
          s === 'checked_in' ? 'cyan' : 'orange'
        }>
          {STATUS_LABELS[s] || s}
        </Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      width: 150,
      render: d => d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '—',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spin size="large" tip="Loading analytics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Title level={3} className="section-title">Analytics & Reports</Title>
        </div>
        <Alert
          message="Failed to Load Reports"
          description={error}
          type="error"
          showIcon
          style={{ borderRadius: 10 }}
          action={<Button icon={<ReloadOutlined />} onClick={fetchData} size="small">Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <Title level={3} className="section-title">
            <BarChartOutlined style={{ marginRight: 10, color: '#0ea5e9' }} />
            Analytics & Reports
          </Title>
          <p className="section-subtitle">Visitor request trends, approval rates, and zone usage.</p>
        </div>
        <div className="page-header-actions">
          <Space>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              allowClear={false}
              format="DD MMM YYYY"
              style={{ borderRadius: 8 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
          </Space>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Requests',   value: total,        color: '#0284c7', icon: <ClockCircleOutlined /> },
          { title: 'Approved',         value: approved,     color: '#059669', icon: <CheckCircleOutlined /> },
          { title: 'Rejected',         value: rejected,     color: '#dc2626', icon: <CloseCircleOutlined /> },
          { title: 'Pending Review',   value: pending,      color: '#f59e0b', icon: <ClockCircleOutlined /> },
          { title: 'Completed Visits', value: checkedOut,   color: '#64748b', icon: <TeamOutlined /> },
          { title: 'Approval Rate',    value: approvalRate, color: '#7c3aed', icon: <IdcardOutlined />, suffix: '%' },
        ].map(s => (
          <Col xs={12} sm={8} xl={4} key={s.title}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {/* Daily Trend */}
        <Col xs={24} xl={16}>
          <Card
            title={<span style={{ fontWeight: 700, fontSize: 14 }}>
              <BarChartOutlined style={{ marginRight: 8, color: '#0ea5e9' }} />
              14-Day Request Trend
            </span>}
            style={{ borderRadius: 12 }}
          >
            <div style={{ height: 280 }}>
              {last14.every(d => d.Submitted === 0) ? (
                <Empty description="No requests in the last 14 days" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last14} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Submitted" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Approved" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>

        {/* Status Pie */}
        <Col xs={24} xl={8}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 14 }}>Request Status Breakdown</span>} style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ height: 280 }}>
              {statusPieData.length === 0 ? (
                <Empty description="No data" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} paddingAngle={3}>
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {/* Department Bar */}
        <Col xs={24} xl={16}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 14 }}>Requests by Department</span>} style={{ borderRadius: 12 }}>
            <div style={{ height: 260 }}>
              {deptData.length === 0 ? (
                <Empty description="No department data" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={95} />
                    <RechartTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#7c3aed" name="Requests" radius={[0, 6, 6, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>

        {/* Zone Usage */}
        <Col xs={24} xl={8}>
          <Card title={<span style={{ fontWeight: 700, fontSize: 14 }}>Zone Pass Usage</span>} style={{ borderRadius: 12 }}>
            <div style={{ height: 260 }}>
              {zoneData.length === 0 ? (
                <Empty description="No zone pass data yet" style={{ paddingTop: 60 }} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={zoneData} dataKey="count" nameKey="zone" cx="50%" cy="45%" outerRadius={85} paddingAngle={3}>
                      {zoneData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Requests Table */}
      <Card
        title={<span style={{ fontWeight: 700, fontSize: 14 }}>All Requests — {filtered.length} records</span>}
        style={{ borderRadius: 12 }}
      >
        {filtered.length === 0 ? (
          <Empty description="No requests in selected date range." />
        ) : (
          <Table
            dataSource={filtered}
            columns={recentColumns}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: t => `${t} records`, showSizeChanger: false }}
            size="middle"
            scroll={{ x: 700 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ReportsPage;
