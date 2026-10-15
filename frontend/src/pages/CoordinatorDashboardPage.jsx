import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, DatePicker, Select, Card, Steps, message, Result,
  Typography, Divider, TimePicker, Table, Tag, Spin, Alert, Space
} from 'antd';
import {
  UserOutlined, ApartmentOutlined, SafetyCertificateOutlined,
  PlusOutlined, MinusCircleOutlined, FormOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, GlobalOutlined, LockOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../features/authStore';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

// ── Status tag helper ──────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending_approval: 'blue',
  under_review: 'orange',
  approved: 'green',
  rejected: 'red',
  issued: 'cyan',
  checked_in: 'purple',
  checked_out: 'default',
  draft: 'default',
  cancelled: 'default',
};
const STATUS_LABEL = {
  pending_approval: 'SCR Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  issued: 'Pass Issued',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  draft: 'Draft',
  cancelled: 'Cancelled',
};

// ── Options exactly mirroring VisitorRequestPage ──────────────────────────────
const VISIT_DURATIONS = [
  '1 Hour',
  '2 Hours',
  '3 Hours',
  '4 Hours (Half Day)',
  '6 Hours',
  '8 Hours (Full Day)',
  'Full Day',
  '1 Day',
  '2 Days',
  '3 Days',
  '1 Week',
  'More than 1 Week',
];

const VISIT_PURPOSES = [
  'Business Meeting', 'Official Visit', 'Site Visit', 'Vessel Operations',
  'Cargo Operations', 'Project Work', 'Maintenance Work', 'Equipment Inspection',
  'Safety Inspection', 'Security Inspection', 'Training Program',
  'VIP Visit', 'Departmental Guest', 'Emergency Response', 'Audit', 'Other',
];

const VISITOR_CATEGORIES = [
  'Internal Visitor (CWIT Staff)', 'Port User Visitor', 'Contractor/Vendor',
  'Government Official', 'VIP/Official Visitor', 'Business Visitor',
  'Department Visitor', 'Educational Visit', 'General External Visitor', 'Other',
];

const VISIT_AREAS = [
  'Onboard Vessel', 'Wharf Area / Quay Side', 'Yard Area', 'Gate Complex',
  'Container Inspection Area', 'Empty Container Yard', 'Reefer Monitoring Area',
  'POB', 'Pass Office & Security Building', 'Wharf Building', 'OHS Building',
  'DG Station', 'Workshop / Maintenance Facility',
];

// ── My Requests table columns ──────────────────────────────────────────────────
const REQUEST_COLUMNS = [
  { title: 'Request ID', dataIndex: 'request_id', key: 'request_id', width: 170 },
  { title: 'Visitor', dataIndex: 'visitor_name', key: 'visitor_name' },
  { title: 'Purpose', dataIndex: 'visitor_purpose', key: 'visitor_purpose', ellipsis: true },
  {
    title: 'Entry Date',
    dataIndex: 'requested_date',
    key: 'requested_date',
    render: (v) => v ? dayjs(v).format('DD MMM YYYY HH:mm') : '-',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s) => (
      <Tag color={STATUS_COLOR[s] || 'default'}>
        {STATUS_LABEL[s] || s}
      </Tag>
    ),
  },
];

// ── Main Coordinator Dashboard Component ───────────────────────────────────────
const CoordinatorDashboardPage = () => {
  const { user } = useAuthStore();
  const [coordInfo, setCoordInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState(null);

  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqPage, setReqPage] = useState(1);
  const [reqTotal, setReqTotal] = useState(0);

  // Fetch coordinator identity info from backend
  useEffect(() => {
    (async () => {
      setInfoLoading(true);
      try {
        const res = await api.get('/api/users/coordinator-info');
        setCoordInfo(res.data);
        form.setFieldsValue({
          requester_name: res.data.coordinator_name || user?.full_name,
          line_department: res.data.department_name,
        });
      } catch (err) {
        setInfoError(err.response?.data?.detail || 'Could not load coordinator profile.');
      } finally {
        setInfoLoading(false);
      }
    })();
  }, [user, form]);

  // Keep form values synchronized if coordInfo changes
  useEffect(() => {
    if (coordInfo) {
      form.setFieldsValue({
        requester_name: coordInfo.coordinator_name || user?.full_name,
        line_department: coordInfo.department_name,
      });
    }
  }, [coordInfo, user, form]);

  // Fetch my requests
  const fetchRequests = async (page = 1) => {
    setReqLoading(true);
    try {
      const res = await api.get('/api/internal-visitor-requests/my-requests', {
        params: { page, page_size: 10 },
      });
      setRequests(res.data.items || []);
      setReqTotal(res.data.total || 0);
      setReqPage(page);
    } catch {
      // non-critical — don't block the form
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, []);

  // ── Step Navigation ──────────────────────────────────────────────────────────
  const next = async () => {
    try {
      // Validate fields specifically for the active step
      if (current === 0) {
        await form.validateFields(['requester_name', 'line_department']);
      } else if (current === 1) {
        await form.validateFields([
          'visitor_purpose',
          'visitor_category',
          'visit_area',
          'visit_date',
          'visit_duration',
          'expected_time_in',
          'expected_time_out',
        ]);
      } else if (current === 2) {
        await form.validateFields(['visitors']);
      }
      const stepValues = form.getFieldsValue();
      setFormValues(prev => ({ ...prev, ...stepValues }));
      setCurrent(c => Math.min(c + 1, steps.length - 1));
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const prev = () => {
    const stepValues = form.getFieldsValue();
    setFormValues(prev => ({ ...prev, ...stepValues }));
    setCurrent(c => Math.max(c - 1, 0));
  };

  // ── Form Submission ──────────────────────────────────────────────────────────
  const onFinish = async () => {
    setLoading(true);
    try {
      const currentStepValues = form.getFieldsValue();
      const values = { ...formValues, ...currentStepValues };

      const durationStr = values.visit_duration || '';
      const entryDay = values.visit_date ? dayjs(values.visit_date) : dayjs();
      const inTime = values.expected_time_in ? dayjs(values.expected_time_in) : null;
      const outTime = values.expected_time_out ? dayjs(values.expected_time_out) : null;

      const entryDateTime = entryDay
        .hour(inTime ? inTime.hour() : 8)
        .minute(inTime ? inTime.minute() : 0)
        .second(0);

      // Calculate exit date & time with duration days added
      let exitDateTime = entryDay
        .hour(outTime ? outTime.hour() : 17)
        .minute(outTime ? outTime.minute() : 0)
        .second(0);

      let durationMinutes = 480;

      if (durationStr) {
        if (durationStr.includes('3 Day') || durationStr === '3 Days') {
          exitDateTime = exitDateTime.add(3, 'day');
          durationMinutes = 4320;
        } else if (durationStr.includes('2 Day') || durationStr === '2 Days') {
          exitDateTime = exitDateTime.add(2, 'day');
          durationMinutes = 2880;
        } else if (durationStr.includes('1 Day') || durationStr === '1 Day') {
          exitDateTime = exitDateTime.add(1, 'day');
          durationMinutes = 1440;
        } else if (durationStr.includes('1 Week') || durationStr === '1 Week') {
          exitDateTime = exitDateTime.add(7, 'day');
          durationMinutes = 10080;
        } else if (durationStr.includes('More than 1 Week')) {
          exitDateTime = exitDateTime.add(14, 'day');
          durationMinutes = 20160;
        } else if (durationStr.includes('Hour')) {
          const match = durationStr.match(/(\d+)\s*Hour/i);
          if (match) {
            const h = parseInt(match[1], 10);
            exitDateTime = entryDateTime.add(h, 'hour');
            durationMinutes = h * 60;
          }
        }
      } else if (inTime && outTime) {
        durationMinutes = Math.max(15, outTime.diff(inTime, 'minute'));
      }
      durationMinutes = Math.min(43200, Math.max(15, durationMinutes));

      const payload = {
        // Visitor (primary from visitor 1)
        visitor_name: values.visitors?.[0]?.name || '',
        visitor_nic: values.visitors?.[0]?.nic_passport || null,
        visitor_phone: values.visitors?.[0]?.contact_no || null,
        visitor_organization: values.visitors?.[0]?.company || null,
        visitor_purpose: values.visitor_purpose,
        visitor_category: values.visitor_category || null,
        // Visit details
        requested_date: values.visit_date ? entryDateTime.format('YYYY-MM-DDTHH:mm:ss') : null,
        requested_end_date: values.visit_date ? exitDateTime.format('YYYY-MM-DDTHH:mm:ss') : null,
        expected_duration_minutes: durationMinutes,
        host_name: values.host_name || null,
        additional_notes: values.visit_duration ? `Duration of Visit: ${values.visit_duration}` : null,
        // Access
        requested_zones: values.visit_area || [],
        vehicle_number: values.vehicles?.[0]?.vehicle_no || null,
        // Multi-visitor / vehicle lists
        visitors: values.visitors || [],
        vehicles: (values.vehicles || []).filter(v => v?.vehicle_no),
      };

      const response = await api.post('/api/internal-visitor-requests/submit', payload);
      setSubmitted(response.data);
      message.success('Internal visitor request submitted successfully!');
      fetchRequests(1);
    } catch (error) {
      console.error('Submission failed:', error);
      let errorMsg = 'Failed to submit request';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map(e => {
            const loc = e.loc ? e.loc.join('.') : 'field';
            return `${loc}: ${e.msg}`;
          }).join(', ');
        }
      }
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    form.resetFields();
    form.setFieldsValue({
      requester_name: coordInfo?.coordinator_name || user?.full_name,
      line_department: coordInfo?.department_name,
    });
    setCurrent(0);
    setFormValues({});
  };

  // ── Form Steps: Exact 4-step structure matching VisitorRequestPage ───────────
  const steps = [
    {
      title: 'Requester',
      content: (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Title level={4} style={{ color: '#1a3c6e', margin: 0 }}>Your Information</Title>
            <Tag color="purple" icon={<LockOutlined />}>Coordinator Identity Auto-Filled</Tag>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            As the designated Department Coordinator, your name and department are automatically verified and locked.
          </Paragraph>

          <Form.Item
            name="requester_name"
            label="Requester's Name"
            rules={[{ required: true, message: "Please enter your name." }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#0ea5e9' }} />}
              suffix={<LockOutlined style={{ color: '#94a3b8' }} />}
              disabled
              style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 600 }}
              placeholder={infoLoading ? "Loading coordinator name..." : "Coordinator Name"}
            />
          </Form.Item>

          <Form.Item
            name="line_department"
            label="Line Department"
            rules={[{ required: true, message: 'Please select a line department.' }]}
          >
            <Input
              prefix={<ApartmentOutlined style={{ color: '#0ea5e9' }} />}
              suffix={<LockOutlined style={{ color: '#94a3b8' }} />}
              disabled
              style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 600 }}
              placeholder={infoLoading ? "Loading assigned department..." : "Department Name"}
            />
          </Form.Item>

          {coordInfo?.represented_hod_name && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12
            }}>
              <SafetyCertificateOutlined style={{ color: '#16a34a', fontSize: 16 }} />
              <Text style={{ color: '#166534', fontSize: 13 }}>
                Representing Head of Department (HOD): <strong>{coordInfo.represented_hod_name}</strong>
              </Text>
            </div>
          )}
        </>
      ),
    },
    {
      title: 'Visit Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 16 }}>Visit Details</Title>
          <Form.Item name="visitor_purpose" label="Visit Purpose" rules={[{ required: true, message: 'Please select a purpose' }]}>
            <Select placeholder="Select Purpose">
              {VISIT_PURPOSES.map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visitor_category" label="Visitor Category" rules={[{ required: true, message: 'Please select a category' }]}>
            <Select placeholder="Select Category">
              {VISITOR_CATEGORIES.map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visit_area" label="Visit Area" rules={[{ required: true, message: 'Please select at least one visit area' }]}>
            <Select mode="multiple" placeholder="Select Areas">
              {VISIT_AREAS.map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visit_date" label="Visit Date" rules={[{ required: true, message: 'Please select the visit date' }]}>
            <DatePicker
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              disabledDate={(current) => current && (current < dayjs().startOf('day') || current > dayjs().add(30, 'day').endOf('day'))}
            />
          </Form.Item>
          <Form.Item
            name="visit_duration"
            label="Duration of the Visit"
            rules={[{ required: true, message: 'Please select duration of the visit.' }]}
          >
            <Select
              placeholder="Select duration of the visit"
              suffixIcon={<ClockCircleOutlined />}
              showSearch
              allowClear
            >
              {VISIT_DURATIONS.map(d => (
                <Select.Option key={d} value={d}>{d}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="expected_time_in" label="Expected Time In" rules={[{ required: true, message: 'Please select expected time in' }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
          </Form.Item>
          <Form.Item name="expected_time_out" label="Expected Time Out" rules={[{ required: true, message: 'Please select expected time out' }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
          </Form.Item>
          <Form.Item name="host_name" label="Host Name / Line Dept Representative">
            <Input placeholder="Name of the person you are meeting" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visitors',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 4 }}>Visitor Details</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Add visitors for this request (no limit).</Text>
          <Form.List name="visitors">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    title={`Visitor S.N ${index + 1}`}
                    extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} /> : null}
                    style={{ marginBottom: 16, borderRadius: 8, borderColor: '#e2e8f0' }}
                  >
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Missing visitor name' }]} style={{ marginBottom: 12 }}>
                      <Input placeholder="Visitor Name" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'nic_passport']} rules={[{ required: true, message: 'Missing NIC / Passport No.' }]} style={{ marginBottom: 12 }}>
                      <Input placeholder="NIC / Passport No." />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'company']} style={{ marginBottom: 12 }}>
                      <Input placeholder="Company / Organization" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'contact_no']} style={{ marginBottom: 12 }}>
                      <Input placeholder="Contact No." />
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Visitor
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </>
      ),
    },
    {
      title: 'Vehicles',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 4 }}>Vehicle Details</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>Add vehicles for this request (optional, no limit).</Paragraph>
          <Form.List name="vehicles">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    title={`Vehicle S.N ${index + 1}`}
                    extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} /> : null}
                    style={{ marginBottom: 16, borderRadius: 8, borderColor: '#e2e8f0' }}
                  >
                    <Form.Item {...restField} name={[name, 'vehicle_no']} style={{ marginBottom: 0 }}>
                      <Input placeholder="Vehicle No." />
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Vehicle
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </>
      ),
    }
  ];

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 40 }}>

      {/* ── Coordinator Profile Card ── */}
      {infoLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin tip="Loading coordinator profile..." /></div>
      ) : infoError ? (
        <Alert type="error" message={infoError} style={{ marginBottom: 24, borderRadius: 8 }} />
      ) : coordInfo && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(56,189,248,0.04) 100%)',
            border: '1px solid rgba(14,165,233,0.2)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #1a3c6e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(14,165,233,0.3)',
            }}>
              <UserOutlined style={{ fontSize: 22, color: '#fff' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Coordinator</Text>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{coordInfo.coordinator_name}</div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Department</Text>
              <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
                <ApartmentOutlined style={{ color: '#0ea5e9' }} />
                {coordInfo.department_name || <Text type="secondary">Not assigned</Text>}
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Representing HOD</Text>
              <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
                <SafetyCertificateOutlined style={{ color: '#10b981' }} />
                {coordInfo.represented_hod_name || <Text type="secondary">Not assigned</Text>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Internal Visitor Request Form (Exact Mirror of VisitorRequestPage) ── */}
      <Card
        className="visitor-card"
        style={{
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
          borderRadius: 12,
          marginBottom: 32,
        }}
      >
        {/* Header matching VisitorRequestPage */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a3c6e, #0ea5e9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 4px 14px 0 rgba(26, 60, 110, 0.4)'
          }}>
            <GlobalOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={2} style={{ color: '#1a3c6e', marginBottom: 4 }}>Internal Visitor Request</Title>
          <Text type="secondary">Submit your internal department visitor pass request</Text>
        </div>

        {submitted ? (
          <Result
            status="success"
            title="Visitor Pass Request Submitted!"
            subTitle={
              <>
                <div>Your Request ID is: <strong>{submitted.request_id}</strong>. Please save this for your records.</div>
                <div style={{ marginTop: 10 }}>
                  <Tag color="blue" icon={<ClockCircleOutlined />}>Directly Forwarded to SCR Review (No HOD approval needed)</Tag>
                </div>
                {coordInfo?.department_name && (
                  <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
                    <ApartmentOutlined style={{ marginRight: 6 }} />
                    Department: {coordInfo.department_name} • Requester: {coordInfo.coordinator_name}
                  </div>
                )}
              </>
            }
            extra={[
              <Button type="primary" key="home" onClick={resetForm} icon={<PlusOutlined />}>
                Submit Another Request
              </Button>,
            ]}
          />
        ) : (
          <div style={{ marginTop: 20 }}>
            <Steps current={current} style={{ marginBottom: '35px' }} size="small">
              {steps.map((item) => (
                <Step key={item.title} title={item.title} />
              ))}
            </Steps>

            <Form
              form={form}
              layout="vertical"
              preserve={true}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault();
                }
              }}
              initialValues={{
                requester_name: coordInfo?.coordinator_name || user?.full_name,
                line_department: coordInfo?.department_name,
                visitors: [{}],
                vehicles: [{}],
              }}
            >
              <div className="steps-content">{steps[current].content}</div>

              <Divider />

              <div className="steps-action" style={{ display: 'flex', justifyContent: 'space-between' }}>
                {current > 0 ? (
                  <Button
                    key="btn-prev"
                    htmlType="button"
                    onClick={() => prev()}
                  >
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                {current < steps.length - 1 ? (
                  <Button
                    key="btn-next"
                    type="primary"
                    htmlType="button"
                    onClick={() => next()}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    key="btn-submit"
                    type="primary"
                    htmlType="button"
                    loading={loading}
                    icon={<CheckCircleOutlined />}
                    onClick={onFinish}
                  >
                    Submit Request
                  </Button>
                )}
              </div>
            </Form>
          </div>
        )}
      </Card>

      {/* ── My Recent Requests ── */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a3c6e' }}>
            <ClockCircleOutlined style={{ color: '#0ea5e9' }} />
            My Recent Requests
          </span>
        }
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchRequests(reqPage)}>
            Refresh
          </Button>
        }
        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
      >
        <Table
          dataSource={requests}
          columns={REQUEST_COLUMNS}
          rowKey="request_id"
          loading={reqLoading}
          size="small"
          pagination={{
            current: reqPage,
            total: reqTotal,
            pageSize: 10,
            onChange: fetchRequests,
            showSizeChanger: false,
          }}
          locale={{ emptyText: 'No requests submitted yet.' }}
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
};

export default CoordinatorDashboardPage;
