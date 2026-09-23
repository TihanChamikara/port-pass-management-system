import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Tag, Modal, Input, message,
  Typography, Descriptions, Divider, Row, Col, Statistic, Alert, Select, Tabs,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, EyeOutlined,
  ClockCircleOutlined, ReloadOutlined, TeamOutlined, UserOutlined, SolutionOutlined,
} from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const parseZones = (zones) => {
  if (!zones) return [];
  if (Array.isArray(zones)) return zones;
  try { return JSON.parse(zones); } catch { return []; }
};

const STATUS_COLORS = {
  pending_department_approval: 'gold',
  pending_approval:            'orange',
  under_review:                'processing',
  approved:                    'green',
  rejected:                    'red',
};

const STATUS_LABELS = {
  pending_department_approval: 'Pending Dept. Approval',
  pending_approval:            'Pending Security Approval',
  under_review:                'Under Review',
  approved:                    'Approved',
  rejected:                    'Rejected',
};

const ZONE_LABELS = {
  zone_1: 'Zone 1 (Office)',
  zone_2: 'Zone 2 (Warehouse)',
  zone_3: 'Zone 3 (Loading Bay)',
  zone_4: 'Zone 4 (Restricted)',
};

const OpsApprovalPage = () => {
  const [viewType, setViewType]                       = useState('pending');
  const [requests, setRequests]                       = useState([]);
  const [loading, setLoading]                         = useState(true);
  const [selectedRequest, setSelectedRequest]         = useState(null);
  const [modalVisible, setModalVisible]               = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason]         = useState('');
  const [actionLoading, setActionLoading]             = useState(false);
  const [visitorType, setVisitorType]                 = useState('normal');
  const [vipLmvAccess, setVipLmvAccess]               = useState(null);

  const [activeSubTab, setActiveSubTab]               = useState('individual'); // 'individual' or 'group'
  const [groupRequests, setGroupRequests]             = useState([]);
  const [groupLoading, setGroupLoading]               = useState(false);
  const [selectedGroup, setSelectedGroup]             = useState(null);
  const [groupModalVisible, setGroupModalVisible]     = useState(false);
  const [groupRejectionModalVisible, setGroupRejectionModalVisible] = useState(false);
  const [groupRejectionReason, setGroupRejectionReason] = useState('');

  const fetchRequests = async (type = viewType) => {
    setLoading(true);
    try {
      const endpoint = type === 'pending' ? '/api/visitor-requests/pending' : '/api/visitor-requests/all';
      const response = await api.get(endpoint);
      setRequests(response.data.items || []);
    } catch {
      message.error('Failed to fetch requests. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupRequests = async (type = viewType) => {
    setGroupLoading(true);
    try {
      const params = {
        status: type === 'pending' ? 'pending_approval' : undefined
      };
      const response = await api.get('/api/pass-groups', { params });
      setGroupRequests(response.data.items || []);
    } catch {
      message.error('Failed to fetch group requests.');
    } finally {
      setGroupLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchGroupRequests();
  }, []);

  /* ── Actions ── */
  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${id}/approve`, { comments: 'Approved by Operations Officer' });
      message.success('Request approved successfully.');
      setModalVisible(false);
      fetchRequests();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      message.warning('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/visitor-requests/${selectedRequest.id}/reject`, { comments: rejectionReason });
      message.success('Request rejected.');
      setRejectionModalVisible(false);
      setModalVisible(false);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveGroup = async (id) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/pass-groups/${id}/approve`);
      message.success('Group pass approved successfully and passes activated.');
      setGroupModalVisible(false);
      fetchGroupRequests();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to approve group pass.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectGroup = async () => {
    if (!groupRejectionReason.trim()) {
      message.warning('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/api/pass-groups/${selectedGroup.id}/reject`);
      message.success('Group pass rejected and pending passes deleted.');
      setGroupRejectionModalVisible(false);
      setGroupModalVisible(false);
      setGroupRejectionReason('');
      fetchGroupRequests();
    } catch (error) {
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to reject group pass.');
    } finally {
      setActionLoading(false);
    }
  };

  const openGroupDetail = async (record) => {
    setGroupLoading(true);
    try {
      const response = await api.get(`/api/pass-groups/${record.id}`);
      setSelectedGroup(response.data);
      setGroupModalVisible(true);
    } catch {
      message.error('Failed to fetch group pass details.');
    } finally {
      setGroupLoading(false);
    }
  };

  const openDetail = (record) => {
    setSelectedRequest(record);
    setVisitorType(record.visitor_type || 'normal');
    setVipLmvAccess(record.vip_lmv_access || null);
    setModalVisible(true);
  };

  const handleSetVisitorType = async (type, lmvAccess = null) => {
    try {
      let url = `/api/visitor-requests/${selectedRequest?.id}/visitor-type?visitor_type=${type}`;
      let finalLmv = lmvAccess;
      if (type === 'vip') {
        finalLmv = lmvAccess || vipLmvAccess || 'lmv1';
        url += `&vip_lmv_access=${finalLmv}`;
        setVipLmvAccess(finalLmv);
      } else {
        setVipLmvAccess(null);
      }
      await api.patch(url);
      message.success(`Visitor classified as ${type.toUpperCase()}${type === 'vip' ? ` (${finalLmv.toUpperCase()})` : ''}`);
      setVisitorType(type);
      
      // Update selectedRequest and requests list in place
      if (selectedRequest) {
        selectedRequest.visitor_type = type;
        selectedRequest.vip_lmv_access = type === 'vip' ? finalLmv : null;
      }
      setRequests(prev => prev.map(r => r.id === selectedRequest?.id ? { ...r, visitor_type: type, vip_lmv_access: type === 'vip' ? finalLmv : null } : r));
    } catch {
      message.error('Failed to set visitor type.');
    }
  };

  /* ── Table Columns ── */
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'request_id',
      key: 'request_id',
      width: 160,
      render: (id) => (
        <Text strong style={{ color: '#0369a1', fontFamily: 'monospace', fontSize: 12 }}>{id}</Text>
      ),
    },
    {
      title: 'Visitor',
      dataIndex: 'visitor_name',
      key: 'visitor_name',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Requester',
      dataIndex: 'requester_name',
      key: 'requester_name',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      width: 170,
      ellipsis: true,
      render: (d) => d
        ? <Tag color="blue" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Entry Time',
      dataIndex: 'requested_date',
      key: 'requested_date',
      width: 155,
      render: (date) => date
        ? <Text style={{ fontSize: 13 }}>{dayjs(date).format('DD MMM YYYY, HH:mm')}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Purpose',
      dataIndex: 'visitor_purpose',
      key: 'visitor_purpose',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 200, display: 'block' }}>{text}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isPendingSecurity = record.status === 'pending_approval';
        return (
          <Space size={6}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetail(record)}
            >
              View
            </Button>
            {isPendingSecurity && (
              <>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openDetail(record)}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => { setSelectedRequest(record); setRejectionModalVisible(true); }}
                >
                  Reject
                </Button>
              </>
            )}
          </Space>
        );
      }
    },
  ];
  const groupColumns = [
    {
      title: 'Group ID',
      dataIndex: 'group_id',
      key: 'group_id',
      width: 160,
      render: (id) => (
        <Text strong style={{ color: '#0369a1', fontFamily: 'monospace', fontSize: 12 }}>{id}</Text>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Requested By (Supervisor)',
      dataIndex: 'requested_by',
      key: 'requested_by',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Pass Type',
      dataIndex: 'pass_type',
      key: 'pass_type',
      width: 120,
      render: (type) => (
        <Tag style={{ textTransform: 'capitalize' }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Visitors Count',
      dataIndex: 'num_visitors',
      key: 'num_visitors',
      width: 120,
      render: (count) => <Tag color="blue">{count} Visitor(s)</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => {
        const colors = {
          draft: 'default',
          pending_approval: 'orange',
          issued: 'green',
          completed: 'blue',
          rejected: 'red',
        };
        const labels = {
          draft: 'Draft',
          pending_approval: 'Pending Approval',
          issued: 'Issued (Active)',
          completed: 'Completed',
          rejected: 'Rejected',
        };
        return (
          <Tag color={colors[status] || 'default'}>
            {labels[status] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isPending = record.status === 'pending_approval';
        return (
          <Space size={6}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openGroupDetail(record)}
            >
              View Group
            </Button>
            {isPending && (
              <>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openGroupDetail(record)}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => { setSelectedGroup(record); setGroupRejectionModalVisible(true); }}
                >
                  Reject
                </Button>
              </>
            )}
          </Space>
        );
      }
    },
  ];

  /* ── Summary Counts ── */
  const pendingCount  = requests.filter(r => r.status === 'pending_department_approval').length;
  const securityCount = requests.filter(r => r.status === 'pending_approval').length;
  const totalCount    = requests.length;

  const pendingGroupsCount = groupRequests.filter(g => g.status === 'pending_approval').length;
  const totalGroupsCount   = groupRequests.length;

  return (
    <div className="page-enter">
      {/* Premium page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #0b1329 0%, #0f1e36 100%)',
        borderRadius: 14,
        boxShadow: '0 4px 20px rgba(11,21,41,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 46, height: 46,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
          }}>
            <CheckOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>
              Visitor Pass Approvals
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
              Review and process visitor requests — {viewType === 'pending' ? 'Pending queue' : 'Full history'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Live summary pills */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Dept. Review', count: pendingCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
              { label: 'Security Review', count: securityCount, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
              { label: 'Total Loaded', count: totalCount, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border: `1px solid ${s.color}30`,
                borderRadius: 8, padding: '5px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <Space>
            <Select
              value={viewType}
              onChange={(value) => {
                setViewType(value);
                fetchRequests(value);
                fetchGroupRequests(value);
              }}
              style={{ width: 185 }}
              options={[
                { label: 'Pending Approvals', value: 'pending' },
                { label: 'All Request History', value: 'all' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { fetchRequests(viewType); fetchGroupRequests(viewType); }} loading={loading || groupLoading}>
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      {/* Summary row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Queue',            value: totalCount + totalGroupsCount,    color: '#0369a1'  },
          { label: 'Dept. Pending',          value: pendingCount,  color: '#d97706'  },
          { label: 'Security Pending',       value: securityCount + pendingGroupsCount, color: '#7c3aed'  },
        ].map(({ label, value, color }) => (
          <Col xs={24} sm={8} key={label}>
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '18px 22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
            }}>
              <Statistic
                title={<Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>}
                value={value}
                valueStyle={{ color, fontWeight: 800, fontSize: 28, lineHeight: 1.2 }}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Tables using Tabs */}
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          {
            key: 'individual',
            label: <span><UserOutlined /> Individual Requests ({requests.filter(r => r.status === 'pending_approval').length})</span>,
            children: (
              <Table
                columns={columns}
                dataSource={requests}
                loading={loading}
                rowKey="id"
                locale={{ emptyText: (
                  <div style={{ padding: '40px 0', color: '#94a3b8' }}>
                    <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                    No pending requests at this time.
                  </div>
                )}}
                scroll={{ x: 1000 }}
                pagination={{
                  pageSize: 15,
                  showTotal: (t) => `${t} request${t !== 1 ? 's' : ''}`,
                  showSizeChanger: false,
                }}
                size="middle"
              />
            )
          },
          {
            key: 'group',
            label: <span><TeamOutlined /> Group Requests ({groupRequests.filter(g => g.status === 'pending_approval').length})</span>,
            children: (
              <Table
                columns={groupColumns}
                dataSource={groupRequests}
                loading={groupLoading}
                rowKey="id"
                locale={{ emptyText: (
                  <div style={{ padding: '40px 0', color: '#94a3b8' }}>
                    <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                    No pending group requests at this time.
                  </div>
                )}}
                scroll={{ x: 1000 }}
                pagination={{
                  pageSize: 15,
                  showTotal: (t) => `${t} group request${t !== 1 ? 's' : ''}`,
                  showSizeChanger: false,
                }}
                size="middle"
              />
            )
          }
        ]}
      />

      {/* ── Detail Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EyeOutlined style={{ color: '#0ea5e9' }} />
            <span>Request Details</span>
            {selectedRequest && (
              <Tag color={STATUS_COLORS[selectedRequest.status] || 'default'} style={{ marginLeft: 4 }}>
                {STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
              </Tag>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={820}
        footer={
          selectedRequest?.status === 'pending_approval'
            ? [
                <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>,
                <Button
                  key="reject"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setRejectionModalVisible(true)}
                >
                  Reject
                </Button>,
                <Button
                  key="approve"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(selectedRequest?.id)}
                  loading={actionLoading}
                >
                  Approve Request
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setModalVisible(false)}>Close</Button>
              ]
        }
        styles={{ body: { padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' } }}
      >
        {selectedRequest && (
          <>
            {/* ── Visitor Identity Section ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: '#64748b',
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
              }}>
                Requester &amp; Visitor Identity
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px 24px',
              }}>
                {[
                  { label: 'Requester Name', value: selectedRequest.requester_name || '—' },
                  { label: 'Visitor Category', value: selectedRequest.visitor_category || '—' },
                  { label: 'Visitor Name', value: <Text strong>{selectedRequest.visitor_name || '—'}</Text> },
                  { label: 'NIC / Passport', value: <Text code>{selectedRequest.visitor_nic || '—'}</Text> },
                  { label: 'Organization', value: selectedRequest.visitor_organization || '—' },
                  { label: 'Department', value: selectedRequest.department_name
                    ? <Tag color="blue">{selectedRequest.department_name}</Tag>
                    : <Text type="secondary">—</Text> },
                  { label: 'Request Source', value: selectedRequest.request_source === 'internal'
                    ? <Tag color="cyan">Internal</Tag>
                    : selectedRequest.request_source === 'external'
                    ? <Tag color="orange">External</Tag>
                    : <Tag>{selectedRequest.request_source || '—'}</Tag> },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
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

            {/* ── Visit Details Section ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: '#64748b',
                borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12,
              }}>
                Visit &amp; Access Details
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px 24px',
                marginBottom: 10,
              }}>
                {[
                  { label: 'Scheduled Entry', value: selectedRequest.requested_date
                    ? dayjs(selectedRequest.requested_date).format('DD MMM YYYY, HH:mm')
                    : '—' },
                  { label: 'Scheduled Exit', value: selectedRequest.requested_end_date
                    ? dayjs(selectedRequest.requested_end_date).format('DD MMM YYYY, HH:mm')
                    : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Zones — full width */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '10px 14px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Zones to Access
                </div>
                <Space wrap size={6}>
                  {parseZones(selectedRequest.requested_zones).map(z => (
                    <Tag key={z} color="geekblue">{ZONE_LABELS[z] || z}</Tag>
                  ))}
                </Space>
              </div>

              {/* Purpose — full width */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '10px 14px', marginBottom: selectedRequest.additional_notes ? 10 : 0,
              }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Purpose of Visit
                </div>
                <div style={{ fontSize: 13.5, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                  {selectedRequest.visitor_purpose || '—'}
                </div>
              </div>

              {/* Additional notes — conditional full width */}
              {selectedRequest.additional_notes && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 8,
                  padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Additional Notes
                  </div>
                  <div style={{ fontSize: 13.5, color: '#78350f', whiteSpace: 'pre-wrap' }}>
                    {selectedRequest.additional_notes}
                  </div>
                </div>
              )}
            </div>

            {selectedRequest.dept_comments && (
              <Alert
                message={
                  <span>
                    <strong>Department Manager Review Comments:</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{selectedRequest.dept_comments}</div>
                  </span>
                }
                type={selectedRequest.status === 'rejected' ? 'error' : 'info'}
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            )}

            {selectedRequest.status === 'rejected' && (selectedRequest.rejection_reason || selectedRequest.operations_comments) && (selectedRequest.rejection_reason !== selectedRequest.dept_comments) && (
              <Alert
                message={
                  <span>
                    <strong>Rejection Reason (Security / Operations):</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{selectedRequest.rejection_reason || selectedRequest.operations_comments}</div>
                  </span>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            )}

            <Divider orientation="left" style={{ fontSize: 13 }}>Visitor Classification</Divider>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap size={16}>
                <Space>
                  <Text strong>Visitor Type:</Text>
                  <Select
                    value={visitorType}
                    onChange={(v) => handleSetVisitorType(v, v === 'vip' ? 'lmv1' : null)}
                    style={{ width: 140 }}
                    options={[
                      { label: '👤 Normal', value: 'normal' },
                      { label: '⭐ VIP', value: 'vip' },
                    ]}
                  />
                </Space>

                {visitorType === 'vip' && (
                  <Space>
                    <Text strong>LMV Gate Access:</Text>
                    <Select
                      value={vipLmvAccess || 'lmv1'}
                      onChange={(v) => handleSetVisitorType('vip', v)}
                      style={{ width: 180 }}
                      options={[
                        { label: '🚗 LMV1', value: 'lmv1' },
                        { label: '🚗 LMV2', value: 'lmv2' },
                        { label: '🚗 Both (LMV1 & LMV2)', value: 'both' },
                      ]}
                    />
                  </Space>
                )}
              </Space>
            </Space>
          </>
        )}
      </Modal>

      {/* ── Rejection Reason Modal ── */}
      <Modal
        title={<><CloseOutlined style={{ color: '#ef4444', marginRight: 8 }} />Rejection Reason</>}
        open={rejectionModalVisible}
        onOk={handleReject}
        onCancel={() => { setRejectionModalVisible(false); setRejectionReason(''); }}
        confirmLoading={actionLoading}
        okText="Confirm Rejection"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        width={500}
      >
        <Alert
          type="warning"
          message="This action will reject the visitor request and notify the requester."
          style={{ marginBottom: 16, borderRadius: 8 }}
          showIcon
        />
        <Input.TextArea
          rows={4}
          placeholder="Please provide a clear reason for rejection (required)…"
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          maxLength={500}
          showCount
          style={{ resize: 'none' }}
        />
      </Modal>

      {/* ── Group Detail Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TeamOutlined style={{ color: '#0ea5e9' }} />
            <span>Group Request Details</span>
            {selectedGroup && (
              <Tag color={selectedGroup.status === 'pending_approval' ? 'orange' : selectedGroup.status === 'issued' ? 'green' : 'default'} style={{ marginLeft: 4 }}>
                {selectedGroup.status}
              </Tag>
            )}
          </div>
        }
        open={groupModalVisible}
        onCancel={() => setGroupModalVisible(false)}
        width={820}
        footer={
          selectedGroup?.status === 'pending_approval'
            ? [
                <Button key="close" onClick={() => setGroupModalVisible(false)}>Close</Button>,
                <Button
                  key="reject"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setGroupRejectionModalVisible(true)}
                >
                  Reject Group
                </Button>,
                <Button
                  key="approve"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleApproveGroup(selectedGroup?.id)}
                  loading={actionLoading}
                >
                  Approve Group
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setGroupModalVisible(false)}>Close</Button>
              ]
        }
        styles={{ body: { padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' } }}
      >
        {selectedGroup && (
          <>
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Group ID">{selectedGroup.group_id}</Descriptions.Item>
              <Descriptions.Item label="Company Name">{selectedGroup.company_name}</Descriptions.Item>
              <Descriptions.Item label="Supervisor / Requester">{selectedGroup.requested_by}</Descriptions.Item>
              <Descriptions.Item label="Pass Type">{selectedGroup.pass_type}</Descriptions.Item>
              <Descriptions.Item label="Zone">{selectedGroup.zone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Visitors Count">{selectedGroup.num_visitors} Visitor(s)</Descriptions.Item>
              {selectedGroup.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {selectedGroup.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left" style={{ fontSize: 13, marginBottom: 12 }}>Visitor List</Divider>
            <Table
              size="small"
              rowKey="id"
              dataSource={selectedGroup.passes || []}
              pagination={false}
              columns={[
                {
                  title: 'Pass No',
                  dataIndex: 'pass_no',
                  key: 'pass_no',
                  render: (val) => <Text style={{ fontFamily: 'monospace' }}>{val}</Text>
                },
                {
                  title: 'Visitor Name',
                  dataIndex: 'visitor_name',
                  key: 'visitor_name',
                },
                {
                  title: 'NIC / Passport',
                  dataIndex: 'nic_number',
                  key: 'nic_number',
                },
                {
                  title: 'Contact',
                  dataIndex: 'contact_number',
                  key: 'contact_number',
                }
              ]}
            />
          </>
        )}
      </Modal>

      {/* ── Group Rejection Modal ── */}
      <Modal
        title={<><CloseOutlined style={{ color: '#ef4444', marginRight: 8 }} />Reject Group Pass Request</>}
        open={groupRejectionModalVisible}
        onOk={handleRejectGroup}
        onCancel={() => { setGroupRejectionModalVisible(false); setGroupRejectionReason(''); }}
        confirmLoading={actionLoading}
        okText="Confirm Rejection"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        width={500}
      >
        <Alert
          type="warning"
          message="This action will reject the entire group pass request and delete all pending passes."
          style={{ marginBottom: 16, borderRadius: 8 }}
          showIcon
        />
        <Input.TextArea
          rows={4}
          placeholder="Please provide a clear reason for rejection (required)…"
          value={groupRejectionReason}
          onChange={e => setGroupRejectionReason(e.target.value)}
          maxLength={500}
          showCount
          style={{ resize: 'none' }}
        />
      </Modal>
    </div>
  );
};

export default OpsApprovalPage;
