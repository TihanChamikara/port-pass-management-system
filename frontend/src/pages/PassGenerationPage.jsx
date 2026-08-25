import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Empty, Spin, Alert, Typography, message } from 'antd';
import { PrinterOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useAuthStore } from '../features/auth/authStore';

/**
 * Pass Officer Page: Generate QR passes for approved visitor requests
 * Workflow stage: operations_approved → pass_issued
 */
export default function PassGenerationPage() {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [generatedQR, setGeneratedQR] = useState(null);
  const pageSize = 20;

  useEffect(() => {
    const allowedRoles = ['admin', 'pass_officer'];
    if (user && !allowedRoles.includes(user.role)) {
      setRequests([]);
      setTotal(0);
      setLoadError('Pass generation is available to Pass Officers and Admin only. Please sign in with the correct account.');
      setLoading(false);
      return;
    }

    loadApprovedRequests();
  }, [page, user]);

  const loadApprovedRequests = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/visitor-requests/for-pass-generation?page=${page}&page_size=${pageSize}`);
      setRequests(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      const backendDetail = error.response?.data?.detail;
      const status = error.response?.status;
      const detailText = typeof backendDetail === 'string'
        ? backendDetail
        : backendDetail?.message || backendDetail?.detail || backendDetail?.errors?.[0]?.message;
      const nextMessage = detailText || error.message || 'Failed to load approved requests';
      setLoadError(nextMessage);
      message.error(status === 403 ? 'You do not have permission to load pass-generation requests.' : nextMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePass = async (requestId) => {
    try {
      // TODO: Integrate with pass generation service to create actual pass record
      // For now, generate mock QR data
      const qrData = {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        visitor: selectedRequest?.visitor_name,
      };
      
      setGeneratedQR(JSON.stringify(qrData));
      message.success('QR code generated!');
    } catch (error) {
      message.error('Failed to generate pass');
    }
  };

  const handleMarkIssued = async (requestId, passRecordId) => {
    try {
      await apiClient.post(`/visitor-requests/${requestId}/mark-pass-issued?pass_record_id=${passRecordId}`);
      message.success('Pass marked as issued!');
      setSelectedRequest(null);
      setGeneratedQR(null);
      loadApprovedRequests();
    } catch (error) {
      message.error('Failed to mark pass issued');
    }
  };

  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'request_id',
      key: 'request_id',
      width: 150,
    },
    {
      title: 'Visitor Name',
      dataIndex: 'visitor_name',
      key: 'visitor_name',
    },
    {
      title: 'Organization',
      dataIndex: 'visitor_organization',
      key: 'visitor_organization',
    },
    {
      title: 'Zones',
      dataIndex: 'requested_zones',
      key: 'requested_zones',
      render: (text) => {
        try {
          const zones = JSON.parse(text);
          return zones.map(z => <Tag key={z}>{z}</Tag>);
        } catch {
          return text;
        }
      },
    },
    {
      title: 'Visit Date',
      dataIndex: 'requested_date',
      key: 'requested_date',
      render: (text) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary"
            onClick={() => {
              setSelectedRequest(record);
              setGeneratedQR(null);
            }}
          >
            Generate Pass
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && requests.length === 0) {
    return <Spin />;
  }

  if (loadError && requests.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          type={loadError.toLowerCase().includes('permission') ? 'warning' : 'error'}
          showIcon
          message="Pass Generation"
          description={loadError}
        />
      </div>
    );
  }

  if (requests.length === 0 && !loading) {
    return <Empty description="No approved requests pending pass generation" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>Pass Generation</h1>
      <Typography.Paragraph type="secondary">
        Role: Pass Officer - Generate QR passes for approved visitor requests
      </Typography.Paragraph>

      {selectedRequest && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: '#f0f2f5',
          borderRadius: '4px',
          border: '1px solid #d9d9d9',
        }}>
          <h3>Generate Pass: {selectedRequest.request_id}</h3>
          <div style={{ marginBottom: '16px' }}>
            <p><strong>Visitor:</strong> {selectedRequest.visitor_name}</p>
            <p><strong>Visitor Email:</strong> {selectedRequest.visitor_email}</p>
            <p><strong>Purpose:</strong> {selectedRequest.visitor_purpose}</p>
            <p><strong>Expected Duration:</strong> {selectedRequest.expected_duration_minutes} minutes</p>
          </div>

          {!generatedQR ? (
            <Button 
              type="primary" 
              size="large"
              onClick={() => handleGeneratePass(selectedRequest.id)}
            >
              Generate QR Code
            </Button>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <h4>QR Code Generated</h4>
              <div style={{ 
                padding: '16px', 
                background: '#fff', 
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                display: 'inline-block',
              }}>
                <div style={{
                  width: '200px',
                  height: '200px',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#999'
                }}>
                  [QR Code Placeholder]
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Space>
                  <Button 
                    icon={<PrinterOutlined />}
                  >
                    Print Badge
                  </Button>
                  <Button 
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleMarkIssued(selectedRequest.id, 1)} // TODO: Get actual pass_record_id
                  >
                    Mark Pass Issued
                  </Button>
                  <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      )}

      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
        }}
        rowKey="id"
      />
    </div>
  );
}
