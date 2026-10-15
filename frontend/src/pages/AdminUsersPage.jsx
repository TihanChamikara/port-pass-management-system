/**
 * AdminUsersPage.jsx
 * Admin-only page for creating and managing user accounts,
 * including Department Coordinator assignment with department & HOD.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, message,
  Space, Tooltip, Typography, Divider, Alert, Spin, Badge, Popconfirm
} from 'antd';
import {
  PlusOutlined, EditOutlined, UserOutlined, ApartmentOutlined,
  LockOutlined, CheckCircleOutlined, StopOutlined, ReloadOutlined,
  TeamOutlined
} from '@ant-design/icons';
import api from '../api/api';
import { useAuthStore } from '../features/authStore';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = [
  { value: 'admin',                  label: 'Administrator' },
  { value: 'operations_officer',     label: 'Operations Officer' },
  { value: 'pass_officer',           label: 'Pass Officer' },
  { value: 'security_gate_officer',  label: 'Security Gate Officer' },
  { value: 'department_manager',     label: 'Department Manager' },
  { value: 'department_coordinator', label: 'Department Coordinator' },
];

const ROLE_COLOR = {
  admin:                  'red',
  operations_officer:     'gold',
  pass_officer:           'blue',
  security_gate_officer:  'green',
  department_manager:     'purple',
  department_coordinator: 'orange',
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminUsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [hodUsers, setHodUsers] = useState([]);  // potential HODs (department_manager or admin)
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [createRole, setCreateRole] = useState(null);

  // Coordinator assignment modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignForm] = Form.useForm();

  const fetchUsers = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/api/users', { params: { page: pg, page_size: 20 } });
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(pg);
    } catch (err) {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/api/departments');
      setDepartments(res.data?.departments || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchHodCandidates = useCallback(async () => {
    try {
      const res = await api.get('/api/users', { params: { page: 1, page_size: 100 } });
      const candidates = (res.data.items || []).filter(u =>
        ['department_manager', 'admin'].includes(u.role) && u.is_active
      );
      setHodUsers(candidates);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
    fetchDepartments();
    fetchHodCandidates();
  }, []);

  // ── Create User ──────────────────────────────────────────────────────────────
  const handleCreate = async (values) => {
    setCreateLoading(true);
    try {
      await api.post('/api/users', {
        username: values.username,
        full_name: values.full_name,
        password: values.password,
        role: values.role,
        department_id: values.department_id || null,
        represented_hod_id: values.represented_hod_id || null,
      });
      message.success(`User "${values.username}" created successfully`);
      setCreateOpen(false);
      createForm.resetFields();
      setCreateRole(null);
      fetchUsers(1);
    } catch (err) {
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Toggle Active ────────────────────────────────────────────────────────────
  const toggleActive = async (targetUser) => {
    try {
      const newStatus = !targetUser.is_active;
      await api.patch(
        `/api/users/${targetUser.id}/status`,
        { is_active: newStatus },
        { params: { is_active: newStatus } }
      );
      message.success(`User "${targetUser.username}" ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers(page);
    } catch (err) {
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to update user status');
    }
  };

  // ── Coordinator Assignment ────────────────────────────────────────────────────
  const openAssign = (user) => {
    setAssignUser(user);
    assignForm.setFieldsValue({
      department_id: user.department_id || undefined,
      represented_hod_id: user.represented_hod_id || undefined,
    });
    setAssignOpen(true);
  };

  const handleAssign = async (values) => {
    setAssignLoading(true);
    try {
      await api.patch(`/api/users/${assignUser.id}/coordinator-assignment`, {
        department_id: values.department_id,
        represented_hod_id: values.represented_hod_id || null,
      });
      message.success('Coordinator assignment updated');
      setAssignOpen(false);
      fetchUsers(page);
    } catch (err) {
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Failed to update assignment');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Table Columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: 'Full Name',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (r) => (
        <Tag color={ROLE_COLOR[r] || 'default'}>
          {ROLES.find(x => x.value === r)?.label || r}
        </Tag>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department_id',
      key: 'department_id',
      render: (deptId) => {
        if (!deptId) return <Text type="secondary">—</Text>;
        const dept = departments.find(d => d.id === deptId);
        return dept ? <Tag icon={<ApartmentOutlined />}>{dept.name}</Tag> : `Dept #${deptId}`;
      },
    },
    {
      title: 'Represented HOD',
      dataIndex: 'represented_hod_id',
      key: 'represented_hod_id',
      render: (hodId) => {
        if (!hodId) return <Text type="secondary">—</Text>;
        const hod = hodUsers.find(u => u.id === hodId) || users.find(u => u.id === hodId);
        return hod ? <Tag color="purple">{hod.full_name}</Tag> : `User #${hodId}`;
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v) => v ? (
        <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag>
      ) : (
        <Tag color="error" icon={<StopOutlined />}>Deactivated</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id;
        return (
          <Space>
            {record.role === 'department_coordinator' && (
              <Tooltip title="Assign Department & HOD">
                <Button
                  size="small"
                  icon={<ApartmentOutlined />}
                  onClick={() => openAssign(record)}
                >
                  Assign
                </Button>
              </Tooltip>
            )}
            {record.is_active ? (
              <Popconfirm
                title="Deactivate User Account"
                description={`Are you sure you want to deactivate "${record.username}"? The user will immediately be logged out and cannot sign in until reactivated.`}
                onConfirm={() => toggleActive(record)}
                okText="Yes, Deactivate"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                disabled={isSelf}
              >
                <Tooltip title={isSelf ? "You cannot deactivate your own administrator account" : "Temporarily deactivate this account"}>
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    disabled={isSelf}
                  >
                    Deactivate
                  </Button>
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="Activate User Account"
                description={`Reactivate "${record.username}"? The user will be able to sign in and use the system again.`}
                onConfirm={() => toggleActive(record)}
                okText="Yes, Activate"
                cancelText="Cancel"
              >
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<CheckCircleOutlined />}
                >
                  Activate
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: '#0ea5e9' }} />
            User Management
          </span>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(page)}>Refresh</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { createForm.resetFields(); setCreateRole(null); setCreateOpen(true); }}
            >
              Create User
            </Button>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Alert
          type="info"
          showIcon
          message="Department Coordinators"
          description='After creating a Coordinator account, click "Assign" to link them to a Department and a Represented HOD. One active coordinator per department is enforced.'
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: fetchUsers,
            showTotal: (t) => `${t} users total`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* ── Create User Modal ── */}
      <Modal
        title={<span><PlusOutlined /> Create New User</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); setCreateRole(null); }}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="e.g. Nimal Perera" />
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }, { min: 3 }]}>
            <Input prefix={<UserOutlined />} placeholder="e.g. it.coordinator" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8 }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Minimum 8 characters" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              placeholder="Select role"
              onChange={(v) => { setCreateRole(v); createForm.setFieldsValue({ department_id: undefined, represented_hod_id: undefined }); }}
            >
              {ROLES.map(r => <Option key={r.value} value={r.value}>{r.label}</Option>)}
            </Select>
          </Form.Item>

          {/* Coordinator-specific fields */}
          {createRole === 'department_coordinator' && (
            <>
              <Divider orientation="left" style={{ fontSize: 13 }}>Coordinator Assignment</Divider>
              <Alert
                type="warning"
                showIcon
                message="These fields are required for a Department Coordinator."
                style={{ marginBottom: 12 }}
              />
              <Form.Item name="department_id" label="Department" rules={[{ required: true, message: 'Please assign a department' }]}>
                <Select placeholder="Select department" loading={departments.length === 0}>
                  {departments.map(d => (
                    <Option key={d.id} value={d.id}>{d.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="represented_hod_id" label="Represented HOD (Head of Department)">
                <Select placeholder="Select HOD (optional at creation)" allowClear>
                  {hodUsers.map(u => (
                    <Option key={u.id} value={u.id}>{u.full_name} ({u.username})</Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setCreateOpen(false); createForm.resetFields(); setCreateRole(null); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading} icon={<PlusOutlined />}>
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Coordinator Assignment Modal ── */}
      <Modal
        title={
          <span>
            <ApartmentOutlined /> Coordinator Assignment
            {assignUser && <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>— {assignUser.full_name}</Text>}
          </span>
        }
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssign}
          style={{ marginTop: 16 }}
        >
          <Alert
            type="info"
            showIcon
            message="Only one active coordinator is allowed per department."
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="department_id" label="Department" rules={[{ required: true, message: 'Please select a department' }]}>
            <Select placeholder="Select department">
              {departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="represented_hod_id" label="Represented HOD">
            <Select placeholder="Select HOD" allowClear>
              {hodUsers.map(u => <Option key={u.id} value={u.id}>{u.full_name} ({u.username})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={assignLoading} icon={<CheckCircleOutlined />}>
                Save Assignment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
