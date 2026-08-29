import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Input, Button, Card, Space, Typography, message,
  Tag, Descriptions, Divider, Spin, Alert, Row, Col,
} from 'antd';
import {
  ScanOutlined, LoginOutlined, LogoutOutlined,
  SearchOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, CloseCircleOutlined, RollbackOutlined,
} from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const parseZones = (zones) => {
  if (!zones) return [];
  if (Array.isArray(zones)) return zones;
  try { return JSON.parse(zones); } catch { return []; }
};

const ZONE_LABELS = {
  zone_1: 'Zone 1 – Office',
  zone_2: 'Zone 2 – Warehouse',
  zone_3: 'Zone 3 – Loading Bay',
  zone_4: 'Zone 4 – Restricted',
};

const STATUS_CONFIG = {
  issued:      { label: 'READY FOR ENTRY', color: 'blue',    canCheckIn: true  },
  checked_in:  { label: 'ON SITE',         color: 'green',   canCheckOut: true },
  checked_out: { label: 'EXITED',          color: 'default'                    },
  approved:    { label: 'AWAITING PASS',   color: 'orange'                     },
};

const GateControlPage = () => {
  const [searchId, setSearchId]         = useState('');
  const [request, setRequest]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notFound, setNotFound]         = useState(false);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('searchId');
    if (idParam) {
      setSearchId(idParam);
      const loadRequest = async () => {
        setLoading(true);
        setNotFound(false);
        setRequest(null);
        try {
          const numericId = parseInt(idParam, 10);
          if (isNaN(numericId)) {
            message.error('Please enter a valid numeric Request ID.');
            setNotFound(true);
            return;
          }
          const response = await api.get(`/api/visitor-requests/${numericId}/full`);
          setRequest(response.data);
        } catch (error) {
          if (error.response?.status === 404) {
            setNotFound(true);
          } else {
            message.error('Failed to fetch request. Please try again.');
          }
          setRequest(null);
        } finally {
          setLoading(false);
        }
      };
      loadRequest();
    }
  }, [location.search]);

  const handleSearch = async () => {
    const trimmedId = searchId.trim();
    if (!trimmedId) return;
    setLoading(true);
    setNotFound(false);
    setRequest(null);
    try {
      const numericId = parseInt(trimmedId, 10);
      if (isNaN(numericId)) {
        message.error('Please enter a valid numeric Request ID.');
        setNotFound(true);
        return;
      }
      const response = await api.get(`/api/visitor-requests/${numericId}/full`);
      setRequest(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        message.error('Failed to fetch request. Please try again.');
      }
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${request.id}/check-in`, { check_in_notes: 'Gate entry confirmed' });
      message.success('Visitor checked in successfully.');
      handleSearch();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Check-in failed. Visitor may not be eligible for entry.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${request.id}/check-out`, { check_out_notes: 'Gate exit confirmed' });
      message.success('Visitor checked out successfully.');
      handleSearch();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnPass = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${request.id}/return-pass`);
      message.success('Pass recorded as returned.');
      handleSearch();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to record pass return.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig = request
    ? (STATUS_CONFIG[request.status] || { label: request.status?.toUpperCase(), color: 'default' })
    : null;

  return (
    <div className="page-enter">
      {/* Security Gate Status Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1329 0%, #0f1e36 100%)',
        borderRadius: 14,
        padding: '20px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 4px 20px rgba(11,21,41,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(14,165,233,0.4)',
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.2px' }}>
              Security Gate Control
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Verify visitor access — check-in and check-out management
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 8, padding: '6px 14px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} className="status-active" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.5px' }}>GATE OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'CLEARED', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'Ready for check-in' },
          { label: 'ON SITE', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', desc: 'Currently inside' },
          { label: 'REVIEW', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Awaiting pass' },
          { label: 'EXITED', color: '#64748b', bg: 'rgba(100,116,139,0.1)', desc: 'Visit completed' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: s.bg, border: `1px solid ${s.color}30`,
            borderRadius: 8, padding: '5px 12px',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{s.label}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>— {s.desc}</span>
          </div>
        ))}
      </div>

      {/* Search Card */}
      <Card className="gate-search-card" style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
            Visitor Request Lookup
          </span>
        </div>
        <Row gutter={12} align="middle">
          <Col flex={1}>
            <Input
              size="large"
              placeholder="Enter numeric Request ID (e.g. 42)"
              prefix={<ScanOutlined style={{ color: '#0ea5e9' }} />}
              value={searchId}
              onChange={e => { setSearchId(e.target.value); setNotFound(false); }}
              onPressEnter={handleSearch}
              style={{ borderRadius: 8, fontSize: '1rem' }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              style={{ borderRadius: 8, height: 40, fontWeight: 700 }}
            >
              Verify Access
            </Button>
          </Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 10, display: 'block' }}>
          Enter the numeric database ID of the visitor request, then click Verify Access.
        </Text>
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Verifying request…</div>
        </div>
      )}

      {/* Not Found */}
      {notFound && !loading && (
        <Alert
          message="Request Not Found"
          description="No visitor request found with this ID. Please verify the ID and try again."
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 10 }}
        />
      )}

      {/* Result Card */}
      {request && !loading && (
        <Card
          className="gate-result-card"
          title={
            <span style={{ color: '#0369a1', fontWeight: 700 }}>
              <SafetyCertificateOutlined style={{ marginRight: 8 }} />
              Visitor Verification Result
            </span>
          }
        >
          {/* Visitor Identity Banner */}
          <div style={{
            textAlign: 'center',
            padding: '20px 16px',
            background: request.visitor_type === 'vip'
              ? 'linear-gradient(135deg, #fefce8, #fef9c3)'
              : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            borderRadius: 10,
            marginBottom: 20,
            border: request.visitor_type === 'vip'
              ? '1px solid #fef08a'
              : '1px solid #e2e8f0',
            boxShadow: request.visitor_type === 'vip'
              ? '0 4px 12px rgba(234, 179, 8, 0.15)'
              : 'none',
          }}>
            <Tag color={statusConfig.color} style={{ fontSize: 13, padding: '4px 16px', marginBottom: 12 }}>
              {statusConfig.label}
            </Tag>
            <Title level={3} style={{ margin: '8px 0 4px', color: '#0f172a', fontWeight: 800 }}>
              {request.visitor_type === 'vip' && <span style={{ marginRight: 8 }}>⭐</span>}
              {request.visitor_name}
              {request.visitor_type === 'vip' && <span style={{ marginLeft: 8 }}>⭐</span>}
            </Title>
            <Text type="secondary" style={{ fontSize: 14, fontWeight: request.visitor_type === 'vip' ? 600 : 400, color: request.visitor_type === 'vip' ? '#854d0e' : '#64748b' }}>
              {request.visitor_type === 'vip' ? '👑 VIP GUEST • ' : ''}
              {request.visitor_organization || 'No Organisation Listed'}
            </Text>
          </div>

          {/* VIP LMV Routing Banner */}
          {request.visitor_type === 'vip' && (
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👑</span>
                  <strong style={{ fontSize: '15px', color: '#854d0e' }}>VIP ROUTING ASSIGNED</strong>
                </div>
              }
              description={
                <div style={{ marginTop: 6, color: '#854d0e', fontSize: 14 }}>
                  <div style={{ marginBottom: 4 }}>
                    Route vehicle through: <Tag color="gold" style={{ fontSize: '14px', fontWeight: 'bold', padding: '2px 8px' }}>
                      {request.vip_lmv_access === 'both' ? 'LMV1 & LMV2 (Both)' : (request.vip_lmv_access || 'LMV1').toUpperCase()}
                    </Tag>
                  </div>
                  <div>
                    Please accord standard VIP protocol and verify vehicle details.
                  </div>
                </div>
              }
              type="warning"
              showIcon={false}
              style={{
                marginBottom: 20,
                background: 'linear-gradient(135deg, #fef9c3, #fef08a)',
                border: '1px solid #fef08a',
                borderRadius: 10,
              }}
            />
          )}

          {/* ── Visitor Personal Profile ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.8px', color: '#64748b',
              borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
            }}>
              Visitor Personal Profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
              {[
                { label: 'Full Name', value: <Text strong>{request.visitor_name}</Text> },
                { label: 'NIC / Passport', value: <Text strong style={{ color: '#0369a1' }}>{request.visitor_nic || '—'}</Text> },
                { label: 'Organization / Company', value: request.visitor_organization || '—' },
                { label: 'Vehicle Registration', value: request.vehicle_number
                  ? <Tag color="cyan" style={{ fontSize: 13, fontWeight: 'bold' }}>🚗 {request.vehicle_number}</Tag>
                  : <Text type="secondary">No vehicle registered</Text> },
                { label: 'Contact Phone', value: request.visitor_phone || '—' },
                { label: 'Contact Email', value: request.visitor_email || '—' },
                { label: 'Classification', value: request.visitor_type === 'vip'
                  ? <Tag color="gold" style={{ fontWeight: 'bold' }}>⭐ VIP</Tag>
                  : <Tag color="blue">👤 Normal</Tag> },
                ...(request.visitor_type === 'vip' ? [{
                  label: 'LMV Gate Access',
                  value: <Tag color="warning" style={{ fontWeight: 'bold' }}>
                    {request.vip_lmv_access === 'both' ? 'LMV1 & LMV2 (Both)' : (request.vip_lmv_access || 'LMV1').toUpperCase()}
                  </Tag>
                }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13.5, color: '#0f172a', wordBreak: 'break-word' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Visit & Access Details ── */}
          <div style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.8px', color: '#64748b',
              borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
            }}>
              Visit &amp; Access Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 10 }}>
              {[
                { label: 'Request ID', value: <Text code>{request.request_id}</Text> },
                { label: 'Zones to Access', value: (
                  <Space wrap size={4}>
                    {parseZones(request.requested_zones).map(z => (
                      <Tag key={z} color="geekblue">{ZONE_LABELS[z] || z}</Tag>
                    ))}
                  </Space>
                )},
                { label: 'Scheduled Entry', value: request.requested_date ? dayjs(request.requested_date).format('DD MMM YYYY, HH:mm') : '—' },
                { label: 'Scheduled Exit', value: request.requested_end_date ? dayjs(request.requested_end_date).format('DD MMM YYYY, HH:mm') : '—' },
                ...(request.checked_in_at ? [{ label: 'Actual Check-In', value: (
                  <Text style={{ color: '#059669' }}>
                    <CheckCircleOutlined style={{ marginRight: 6 }} />
                    {dayjs(request.checked_in_at).format('DD MMM YYYY, HH:mm')}
                  </Text>
                )}] : []),
                ...(request.checked_out_at ? [{ label: 'Actual Check-Out', value: (
                  <Text style={{ color: '#dc2626' }}>
                    <CloseCircleOutlined style={{ marginRight: 6 }} />
                    {dayjs(request.checked_out_at).format('DD MMM YYYY, HH:mm')}
                  </Text>
                )}] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13.5, color: '#0f172a', wordBreak: 'break-word' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Divider style={{ margin: '20px 0' }} />

          {/* Action Buttons */}
          <Row gutter={[12, 12]}>
            {statusConfig.canCheckIn && (
              <Col xs={24} sm={12}>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<LoginOutlined />}
                  onClick={handleCheckIn}
                  loading={actionLoading}
                  style={{ background: 'linear-gradient(135deg,#059669,#34d399)', border: 'none', height: 48 }}
                >
                  Confirm Entry (Check-In)
                </Button>
              </Col>
            )}
            {statusConfig.canCheckOut && (
              <Col xs={24} sm={12}>
                <Button
                  type="primary"
                  danger
                  size="large"
                  block
                  icon={<LogoutOutlined />}
                  onClick={handleCheckOut}
                  loading={actionLoading}
                  style={{ height: 48 }}
                >
                  Confirm Exit (Check-Out)
                </Button>
              </Col>
            )}
            {request.status === 'checked_out' && (
              <Col xs={24}>
                <Alert
                  type="info"
                  message="Visitor has already completed their visit and exited the site."
                  showIcon
                  style={{ borderRadius: 8 }}
                />
              </Col>
            )}
            {request.status === 'checked_out' && !request.pass_returned && (
              <Col xs={24} sm={12}>
                <Button
                  type="default"
                  size="large"
                  block
                  icon={<RollbackOutlined />}
                  onClick={handleReturnPass}
                  loading={actionLoading}
                  style={{ borderColor: '#7c3aed', color: '#7c3aed', height: 48 }}
                >
                  Record Pass Return
                </Button>
              </Col>
            )}
            {request.pass_returned && (
              <Col xs={24}>
                <Alert type="success" message="Physical pass has been returned and recorded." showIcon style={{ borderRadius: 8 }} />
              </Col>
            )}
            {request.status === 'approved' && (
              <Col xs={24}>
                <Alert
                  type="warning"
                  message="A pass has not been issued yet for this request. The visitor cannot check in."
                  showIcon
                  style={{ borderRadius: 8 }}
                />
              </Col>
            )}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default GateControlPage;
