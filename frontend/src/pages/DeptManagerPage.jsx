import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Tag, Modal, Input, message,
  Typography, Descriptions, Divider, Row, Col, Statistic, Alert, Badge,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, EyeOutlined,
  ClockCircleOutlined, ReloadOutlined, ApartmentOutlined, UserOutlined,
} from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';
import { useAuthStore } from '../features/authStore';

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

const DeptManagerPage = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approveComment, setApproveComment] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/visitor-requests/for-dept-manager');
      setRequests(res.data.items || []);
    } catch {
      message.error('Failed to load requests. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${selectedRequest.id}/dept-approve`, {
        comments: approveComment || 'Approved by Department Manager',
      });
      message.success('Request approved and forwarded to Operations.');
      setDetailModal(false);
      setApproveComment('');
      fetchRequests();
    } catch (err) {
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${selectedRequest.id}/dept-reject`, {
        comments: rejectReason,
      });
      message.success('Request rejected.');
      setRejectModal(false);
      setDetailModal(false);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'request_id',
      key: 'request_id',
      width: 160,
      render: (id) => <Text strong style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: 12 }}>{id}</Text>,
    },
    {
      title: 'Visitor',
      dataIndex: 'visitor_name',
      key: 'visitor_name',
      width: 160,
      ellipsis: true,
      render: (name) => (
        <Space size={6}>
          <UserOutlined style={{ color: '#7c3aed' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Requester',
      dataIndex: 'requester_name',
      key: 'requester_name',
      width: 160,
      ellipsis: true,
      render: (name) => <Text>{name}</Text>,
    },
    {
      title: 'Organization',
      dataIndex: 'visitor_organization',
      key: 'visitor_organization',
      ellipsis: true,
      render: (org) => org || <Text type="secondary">—</Text>,
    },
    {
      title: 'Purpose',
      dataIndex: 'visitor_purpose',
      key: 'visitor_purpose',
      ellipsis: true,
      render: (text) => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
    },
    {
      title: 'Visit Date',
      dataIndex: 'requested_date',
      key: 'requested_date',
      width: 155,
      render: (d) => d ? <Text style={{ fontSize: 13 }}>{dayjs(d).format('DD MMM YYYY, HH:mm')}</Text> : '—',
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 130,
      render: (d) => d ? <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).format('DD MMM, HH:mm')}</Text> : '—',
    },
    {
      title: 'Actions',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRequest(record); setDetailModal(true); }}>View</Button>
          <Button size="small" type="primary" icon={<CheckOutlined />} style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => { setSelectedRequest(record); setDetailModal(true); }}>Approve</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setSelectedRequest(record); setRejectModal(true); }}>Reject</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-enter">
      {/* Premium Department Manager Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 20,
        padding: '18px 24px',
        background: 'linear-gradient(135deg, #0b1329 0%, #0f1e36 100%)',
        borderRadius: 14, boxShadow: '0 4px 20px rgba(11,21,41,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
          }}>
            <ApartmentOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9' }}>
              Department Approval Queue
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
              Review visitor requests addressed to your department — <strong style={{ color: '#94a3b8' }}>{requests.length}</strong> pending
            </p>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>Refresh</Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending Queue', value: requests.length, color: '#7c3aed' },
          { label: 'My Department', value: user?.department_id ? 'Linked' : 'All Depts', color: '#0369a1', isText: true },
        ].map(({ label, value, color, isText }) => (
          <Col xs={24} sm={8} key={label}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 22px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>}
                value={isText ? value : undefined}
                formatter={isText ? () => <span style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</span> : undefined}
                {...(!isText && { value, valueStyle: { color, fontWeight: 800, fontSize: 28, lineHeight: 1.2 } })}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey="id"
        locale={{ emptyText: (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No pending requests</div>
            <div className="empty-state-desc">You're all caught up — no requests in your queue.</div>
          </div>
        )}}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 15, showTotal: (t) => `${t} request${t !== 1 ? 's' : ''}`, showSizeChanger: false }}
        size="middle"
      />

      {/* Detail + Approve Modal */}
      <Modal
        title={<><ApartmentOutlined style={{ color: '#7c3aed', marginRight: 8 }} />Request Details — Department Review</>}
        open={detailModal}
        onCancel={() => { setDetailModal(false); setApproveComment(''); }}
        width={820}
        footer={[
          <Button key="close" onClick={() => { setDetailModal(false); setApproveComment(''); }}>Close</Button>,
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => setRejectModal(true)}>Reject</Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} loading={actionLoading}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            onClick={handleApprove}>
            Approve &amp; Forward to Ops
          </Button>,
        ]}
        styles={{ body: { padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {selectedRequest && (
          <>
            {/* Identity section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
              }}>
                Requester &amp; Visitor Identity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {[
                  { label: 'Requester Name', value: selectedRequest.requester_name || '—' },
                  { label: 'Visitor Category', value: selectedRequest.visitor_category || '—' },
                  { label: 'Visitor Name', value: <Text strong>{selectedRequest.visitor_name || '—'}</Text> },
                  { label: 'NIC / Passport', value: <Text code>{selectedRequest.visitor_nic || '—'}</Text> },
                  { label: 'Organization', value: selectedRequest.visitor_organization || '—' },
                  { label: 'Contact Phone', value: selectedRequest.visitor_phone || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                    <div style={{ fontSize: 13.5, color: '#0f172a', wordBreak: 'break-word' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visit details section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
              }}>
                Visit &amp; Access Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 10 }}>
                {[
                  { label: 'Scheduled Entry', value: selectedRequest.requested_date ? dayjs(selectedRequest.requested_date).format('DD MMM YYYY, HH:mm') : '—' },
                  { label: 'Scheduled Exit', value: selectedRequest.requested_end_date ? dayjs(selectedRequest.requested_end_date).format('DD MMM YYYY, HH:mm') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                    <div style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Zones full-width */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Zones to Access</div>
                <Space wrap size={6}>
                  {parseZones(selectedRequest.requested_zones).map(z => (
                    <Tag key={z} color="geekblue">{ZONE_LABELS[z] || z}</Tag>
                  ))}
                </Space>
              </div>
              {/* Purpose full-width */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: selectedRequest.additional_notes ? 10 : 0 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Purpose of Visit</div>
                <div style={{ fontSize: 13.5, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{selectedRequest.visitor_purpose || '—'}</div>
              </div>
              {selectedRequest.additional_notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Additional Notes</div>
                  <div style={{ fontSize: 13.5, color: '#78350f', whiteSpace: 'pre-wrap' }}>{selectedRequest.additional_notes}</div>
                </div>
              )}
            </div>

            <Divider orientation="left" style={{ fontSize: 13, color: '#7c3aed' }}>Approval Comments (Optional)</Divider>
            <Input.TextArea
              rows={3}
              placeholder="Add comments for the Operations Officer (optional)…"
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
              maxLength={500}
              showCount
              style={{ resize: 'none' }}
            />
          </>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={<><CloseOutlined style={{ color: '#ef4444', marginRight: 8 }} />Rejection Reason</>}
        open={rejectModal}
        onOk={handleReject}
        onCancel={() => { setRejectModal(false); setRejectReason(''); }}
        confirmLoading={actionLoading}
        okText="Confirm Rejection"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        width={500}
      >
        <Alert type="warning" message="This will reject the request and notify the requester." style={{ marginBottom: 16, borderRadius: 8 }} showIcon />
        <Input.TextArea
          rows={4}
          placeholder="Please provide a clear reason for rejection (required)…"
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          maxLength={500}
          showCount
          style={{ resize: 'none' }}
        />
      </Modal>
    </div>
  );
};

export default DeptManagerPage;
