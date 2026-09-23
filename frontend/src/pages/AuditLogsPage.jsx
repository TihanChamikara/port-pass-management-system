import React, { useEffect, useState } from 'react';
import {
  Table, Typography, Tag, Space, Button, Input, Select,
  Alert, Row, Col, Tooltip,
} from 'antd';
import { ReloadOutlined, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ACTION_COLORS = {
  CREATE:   'green',
  UPDATE:   'blue',
  DELETE:   'red',
  CHECKOUT: 'orange',
  LOGIN:    'purple',
};

const AuditLogsPage = () => {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);
  const [pageSize]            = useState(50);
  const [filters, setFilters] = useState({ action_type: '', entity_type: '' });
  const [searchText, setSearchText] = useState('');

  const fetchLogs = async (currentPage = page, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (currentFilters.action_type) params.action_type = currentFilters.action_type;
      if (currentFilters.entity_type) params.entity_type = currentFilters.entity_type;
      const response = await api.get('/api/audit-logs', { params });
      const data = response.data;
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
      setError('Failed to load audit logs. You may not have permission to view this page.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  const handleActionFilter = (val) => {
    const newFilters = { ...filters, action_type: val || '' };
    setFilters(newFilters);
    setPage(1);
    fetchLogs(1, newFilters);
  };

  const handleEntitySearch = (val) => {
    const newFilters = { ...filters, entity_type: val };
    setFilters(newFilters);
    setPage(1);
    fetchLogs(1, newFilters);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 175,
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      defaultSortOrder: 'descend',
      render: d => d
        ? <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{dayjs(d).format('YYYY-MM-DD HH:mm:ss')}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 150,
      render: action => (
        <Tag 
          color={ACTION_COLORS[action] || 'default'}
          style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}
        >
          {action || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 180,
      ellipsis: true,
      render: val => val 
        ? <Text style={{ maxWidth: '100%' }} ellipsis={{ tooltip: val }}>{val}</Text> 
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 90,
      align: 'center',
      render: val => val != null
        ? <Tag style={{ fontFamily: 'monospace' }}>#{val}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 90,
      align: 'center',
      render: val => val != null
        ? <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>#{val}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: d => {
        if (!d) return <Text type="secondary">—</Text>;
        const text = typeof d === 'object' ? JSON.stringify(d) : String(d);
        return (
          <Tooltip title={text} placement="topLeft" overlayStyle={{ maxWidth: 420 }}>
            <Text style={{ fontSize: 12, fontFamily: 'monospace', cursor: 'help' }} ellipsis>
              {text}
            </Text>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div className="page-enter">
      {/* Premium Administration Header */}
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
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
            fontSize: 20, color: '#fff',
          }}>🔍</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9' }}>
              System Audit Trail
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
              Complete history of all system actions — <strong style={{ color: '#94a3b8' }}>{total.toLocaleString()}</strong> entries total
            </p>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(page, filters)} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={24} sm={10} md={8} lg={6}>
          <Select
            placeholder="Filter by action"
            allowClear
            style={{ width: '100%' }}
            onChange={handleActionFilter}
            suffixIcon={<SearchOutlined />}
          >
            {Object.keys(ACTION_COLORS).map(a => (
              <Select.Option key={a} value={a}>
                <Tag color={ACTION_COLORS[a]}>{a}</Tag>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={14} md={10} lg={8}>
          <Input
            placeholder="Search by entity type (e.g. pass, user)"
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={() => handleEntitySearch(searchText)}
            onClear={() => handleEntitySearch('')}
          />
        </Col>
        <Col xs={24} sm={6} md={4}>
          <Button onClick={() => handleEntitySearch(searchText)} style={{ width: '100%' }}>
            Apply
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert
          message="Permission Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1000 }}
        size="middle"
        locale={{
          emptyText: error
            ? 'Failed to load logs.'
            : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No audit entries found</div>
                <div className="empty-state-desc">Try adjusting your filters or refresh the page.</div>
              </div>
            ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => { setPage(p); fetchLogs(p, filters); },
          showTotal: (t) => `${t.toLocaleString()} entries`,
          showSizeChanger: false,
          size: 'default',
        }}
      />
    </div>
  );
};

export default AuditLogsPage;
