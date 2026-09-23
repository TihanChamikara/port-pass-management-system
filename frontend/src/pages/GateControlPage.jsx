import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Input, Button, Typography, message,
  Tag, Spin, Alert, Row, Col, Tooltip, Card, Space,
} from 'antd';
import {
  ScanOutlined, LoginOutlined, LogoutOutlined,
  SafetyCertificateOutlined, CheckCircleOutlined,
  CloseCircleOutlined, RollbackOutlined, WarningOutlined
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
  issued:      { label: 'Pass Issued – Ready for Entry', color: 'blue',    canCheckIn: true  },
  checked_in:  { label: 'Checked In – Currently On Site', color: 'green',  canCheckOut: true },
  checked_out: { label: 'Checked Out',                    color: 'default'                    },
  approved:    { label: 'Approved – Awaiting Pass',       color: 'orange'                     },
};

const GateControlPage = () => {
  const [searchId, setSearchId]           = useState('');
  const [request, setRequest]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notFound, setNotFound]           = useState(false);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('searchId');
    if (idParam) {
      setSearchId(idParam);
      const loadRequest = async () => {
        setLoading(true); setNotFound(false); setRequest(null);
        try {
          const numericId = parseInt(idParam, 10);
          if (isNaN(numericId)) { message.error('Please enter a valid numeric Request ID.'); setNotFound(true); return; }
          const response = await api.get(`/api/visitor-requests/${numericId}/full`);
          setRequest(response.data);
        } catch (error) {
          if (error.response?.status === 404) setNotFound(true);
          else message.error('Failed to fetch request. Please try again.');
          setRequest(null);
        } finally { setLoading(false); }
      };
      loadRequest();
    }
  }, [location.search]);

  const handleSearch = async () => {
    const trimmedId = searchId.trim();
    if (!trimmedId) return;
    setLoading(true); setNotFound(false); setRequest(null);
    try {
      const numericId = parseInt(trimmedId, 10);
      if (isNaN(numericId)) { message.error('Please enter a valid numeric Request ID.'); setNotFound(true); return; }
      const response = await api.get(`/api/visitor-requests/${numericId}/full`);
      setRequest(response.data);
    } catch (error) {
      if (error.response?.status === 404) setNotFound(true);
      else message.error('Failed to fetch request. Please try again.');
      setRequest(null);
    } finally { setLoading(false); }
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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
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
    } finally { setActionLoading(false); }
  };

  const statusConfig = request
    ? (STATUS_CONFIG[request.status] || { label: request.status?.toUpperCase(), color: 'default' })
    : null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }} className="page-enter">
      <Title level={3} style={{ marginBottom: 24 }}>
        <SafetyCertificateOutlined style={{ marginRight: 10 }} />
        Gate Control Panel
      </Title>

      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Enter the numeric database ID of the visitor request, then click <strong>Check Request</strong>.
        </Text>
        <Row gutter={16}>
          <Col flex={1}>
            <Input
              size="large"
              placeholder="Enter numeric Request ID (e.g. 42)"
              prefix={<ScanOutlined style={{ color: '#1890ff' }} />}
              value={searchId}
              onChange={e => { setSearchId(e.target.value); setNotFound(false); }}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col>
            <Button type="primary" size="large" icon={<ScanOutlined />} onClick={handleSearch} loading={loading}>
              Check Request
            </Button>
          </Col>
        </Row>

        {/* Status legend */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Tag color="blue">Pass Issued – ready for check-in</Tag>
          <Tag color="green">Checked In – on site</Tag>
          <Tag color="default">Checked Out</Tag>
          <Tag color="orange">Approved – pass not yet issued</Tag>
        </div>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {notFound && !loading && (
        <Alert
          message="Request Not Found"
          description="No visitor request was found with this ID. Please double-check the number and try again."
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {request && !loading && (
        <Card
          title={
            <Space>
              <SafetyCertificateOutlined />
              <span>Visitor Request Details</span>
              <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            </Space>
          }
          style={{ borderRadius: 8 }}
        >
          {/* VIP Alert */}
          {request.visitor_type === 'vip' && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 24, borderRadius: 8 }}
              message={
                <span>
                  <strong>⭐ VIP Visitor – Please provide priority assistance.</strong>
                  &nbsp; Route vehicle via:{' '}
                  <Tag color="gold" style={{ fontSize: '14px', fontWeight: 700, marginLeft: 8 }}>
                    {request.vip_lmv_access === 'both'
                      ? 'LMV1 & LMV2 (Both)'
                      : (request.vip_lmv_access || 'LMV1').toUpperCase()}
                  </Tag>
                </span>
              }
            />
          )}

          {/* Visitor Identity */}
          <Title level={5} style={{ marginBottom: 16 }}>Visitor Personal Profile</Title>
          <Row gutter={[16, 12]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Requester Name</Text>
              <Text strong>{request.requester_name || '—'}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Visitor Full Name</Text>
              <Text strong>
                {request.visitor_type === 'vip' && '⭐ '}
                {request.visitor_name || '—'}
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>NIC / Passport</Text>
              <Text strong>{request.visitor_nic || '—'}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Organization</Text>
              <Text>{request.visitor_organization || '—'}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Vehicle Number</Text>
              {request.vehicle_number
                ? <Tag color="cyan">{request.vehicle_number}</Tag>
                : <Text type="secondary">None</Text>}
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Contact Phone</Text>
              <Text>{request.visitor_phone || '—'}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Contact Email</Text>
              <Text>{request.visitor_email || '—'}</Text>
            </Col>
            {request.visitor_type === 'vip' && (
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>LMV Access</Text>
                <Tag color="gold">
                  {request.vip_lmv_access === 'both'
                    ? 'LMV1 & LMV2 (Both)'
                    : (request.vip_lmv_access || 'LMV1').toUpperCase()}
                </Tag>
              </Col>
            )}
          </Row>

          {/* Visit Details */}
          <Title level={5} style={{ marginBottom: 16 }}>Visit & Access Details</Title>
          <Row gutter={[16, 12]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Request ID</Text>
              <Text code>{request.request_id}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Zones Requested</Text>
              <Space wrap>
                {parseZones(request.requested_zones).map(z => (
                  <Tag key={z} color="geekblue">{ZONE_LABELS[z] || z}</Tag>
                ))}
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Requested Entry</Text>
              <Text>{request.requested_date ? dayjs(request.requested_date).format('DD MMM YYYY, HH:mm') : '—'}</Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Requested Exit</Text>
              <Text>{request.requested_end_date ? dayjs(request.requested_end_date).format('DD MMM YYYY, HH:mm') : '—'}</Text>
            </Col>
            {request.checked_in_at && (
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Actual Check-In</Text>
                <Text style={{ color: '#52c41a' }}>
                  <CheckCircleOutlined /> {dayjs(request.checked_in_at).format('DD MMM YYYY, HH:mm')}
                </Text>
              </Col>
            )}
            {request.checked_out_at && (
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Actual Check-Out</Text>
                <Text type="danger">
                  <CloseCircleOutlined /> {dayjs(request.checked_out_at).format('DD MMM YYYY, HH:mm')}
                </Text>
              </Col>
            )}
          </Row>

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
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Check In Visitor
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
                >
                  Check Out Visitor
                </Button>
              </Col>
            )}
            {request.status === 'checked_out' && (
              <Col xs={24}>
                <Alert type="info" message="Visitor has already completed their visit." showIcon />
              </Col>
            )}
            {request.status === 'checked_out' && !request.pass_returned && (
              <Col xs={24} sm={12}>
                <Button
                  size="large"
                  block
                  icon={<RollbackOutlined />}
                  onClick={handleReturnPass}
                  loading={actionLoading}
                >
                  Record Pass Return
                </Button>
              </Col>
            )}
            {request.pass_returned && (
              <Col xs={24}>
                <Alert type="success" message="Physical pass has been returned and recorded." showIcon />
              </Col>
            )}
            {request.status === 'approved' && (
              <Col xs={24}>
                <Alert
                  type="warning"
                  message="A pass has not been issued yet for this request. The visitor cannot check in until a pass is issued."
                  showIcon
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