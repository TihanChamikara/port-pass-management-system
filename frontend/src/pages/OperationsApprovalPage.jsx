import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space, Empty, Spin, Input, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

/**
 * Operations Officer Page: Approve/reject visitor pass requests
 * Workflow stage: pending_operations_review → operations_approved OR operations_rejected
 */
export default function OperationsApprovalPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comments, setComments] = useState('');
  const pageSize = 20;

  useEffect(() => {
    loadPendingRequests();
  }, [page]);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/visitor-requests/pending?page=${page}&page_size=${pageSize}`);
      setRequests(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load requests:', error);
      const status = error.response?.status;
      if (status === 403) {
        message.error('Insufficient permissions — please sign in as an Operations Officer');
        navigate('/login');
      } else if (status === 401) {
        message.error('Authentication required — please sign in');
        navigate('/login');
      } else {
        message.error('Failed to load requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await apiClient.post(`/visitor-requests/${requestId}/approve`, {
        comments: comments,
        zones_override: null,
      });
      message.success('Request approved!');
      setSelectedRequest(null);
      setComments('');
      loadPendingRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
      message.error('Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await apiClient.post(`/visitor-requests/${requestId}/reject`, {
        comments: comments,
      });
      message.success('Request rejected');
      setSelectedRequest(null);
      setComments('');
      loadPendingRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
      message.error('Failed to reject request');
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
      title: 'Purpose',
      dataIndex: 'visitor_purpose',
      key: 'visitor_purpose',
      width: 200,
    },
    {
      title: 'Requested Zones',
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
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              setSelectedRequest(record);
              setComments('');
            }}
          >
            Approve
          </Button>
          <Button 
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setSelectedRequest(record);
              setComments('');
            }}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && requests.length === 0) {
    return <Spin />;
  }

  if (requests.length === 0 && !loading) {
    return <Empty description="No pending requests" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>Visitor Request Approvals</h1>
      <p>Role: Operations Officer - Review and approve/reject visitor pass requests</p>

      {selectedRequest && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: '#f0f2f5',
          borderRadius: '4px',
          border: '1px solid #d9d9d9',
        }}>
          <h3>Review Request: {selectedRequest.request_id}</h3>
          <div style={{ marginBottom: '16px' }}>
            <p><strong>Visitor:</strong> {selectedRequest.visitor_name}</p>
            <p><strong>Purpose:</strong> {selectedRequest.visitor_purpose}</p>
            <p><strong>Email:</strong> {selectedRequest.visitor_email}</p>
            <p><strong>Requested Date:</strong> {new Date(selectedRequest.requested_date).toLocaleDateString()}</p>
          </div>
          <Input.TextArea
            placeholder="Add comments (optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            style={{ marginBottom: '16px' }}
          />
          <Space>
            <Button 
              type="primary" 
              onClick={() => handleApprove(selectedRequest.id)}
            >
              ✓ Approve
            </Button>
            <Button 
              danger
              onClick={() => handleReject(selectedRequest.id)}
            >
              ✗ Reject
            </Button>
            <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
          </Space>
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
