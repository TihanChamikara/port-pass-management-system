import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Steps, message, Result, Typography, Divider, Tabs, Space, Tag, Descriptions, Spin } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, EnvironmentOutlined, QuestionCircleOutlined, SearchOutlined, ClockCircleOutlined, GlobalOutlined, ApartmentOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import dayjs from 'dayjs';
import { useAuthStore } from '../features/authStore';
import GroupPassPage from './GroupPassPage';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const VisitorRequestPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('new');
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [form] = Form.useForm();
  const [trackForm] = Form.useForm();
  const [formValues, setFormValues] = useState({});

  // Department state
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Load departments dynamically from the API
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const response = await api.get('/api/departments');
        setDepartments(response.data || []);
      } catch (error) {
        console.error('Failed to load departments:', error);
        message.warning('Could not load department list. Please refresh the page.');
      } finally {
        setDepartmentsLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const next = async () => {
    try {
      const stepValues = form.getFieldsValue();
      setFormValues(prev => ({ ...prev, ...stepValues }));
      await form.validateFields();
      setCurrent(current + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const prev = () => {
    const stepValues = form.getFieldsValue();
    setFormValues(prev => ({ ...prev, ...stepValues }));
    setCurrent(current - 1);
  };

  const onFinish = async () => {
    setLoading(true);
    try {
      // Merge current step values with previously saved values
      const currentStepValues = form.getFieldsValue();
      const values = { ...formValues, ...currentStepValues };
      console.log('All form values:', values);

      // Resolve department details from selected department_id
      const selectedDept = departments.find(d => d.id === values.department_to_visit);

      // Calculate visit duration in minutes and format local date strings
      const entryTime = values.visit_dates[0];
      const exitTime = values.visit_dates[1];
      const durationMinutes = Math.max(15, Math.round(exitTime.diff(entryTime, 'minute')));

      const payload = {
        requester_name: values.requester_name,
        requester_email: values.requester_email,
        requester_phone: values.requester_phone || null,
        visitor: {
          name: values.visitor_name,
          email: values.visitor_email || null,
          phone: values.visitor_phone || null,
          nic_passport: values.visitor_nic || null,
          organization: values.visitor_organization || null,
        },
        visit: {
          purpose: values.visitor_purpose,
          building_department: selectedDept ? selectedDept.name : (values.building_department || null),
          entry_time: entryTime.format('YYYY-MM-DDTHH:mm:ss'),
          exit_time: exitTime.format('YYYY-MM-DDTHH:mm:ss'),
          duration_minutes: durationMinutes,
        },
        access: {
          requested_zones: values.requested_zones,
          vehicle_number: values.vehicle_number || null,
          carrying_equipment: values.carrying_equipment || false,
        },
        department_id: selectedDept ? selectedDept.id : null,
        department_name: selectedDept ? selectedDept.name : null,
        additional_notes: values.additional_notes || null,
      };

      console.log('Submitting payload:', JSON.stringify(payload));
      const response = await api.post('/api/visitor-requests/submit', payload);
      setSubmitted(response.data);
      message.success('Request submitted successfully!');
    } catch (error) {
      console.error('Submission failed:', error);
      let errorMsg = 'Failed to submit request';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (detail.message) {
          const validationErrors = detail.errors || [];
          if (validationErrors.length > 0) {
            errorMsg = validationErrors.map(e => e.message).join(', ');
          } else {
            errorMsg = detail.message;
          }
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

  const onTrack = async (values) => {
    setTrackingLoading(true);
    try {
      const response = await api.post('/api/visitor-requests/track', values);
      setTrackingInfo(response.data);
    } catch (error) {
      message.error('Request not found or email mismatch');
      setTrackingInfo(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_department_approval: 'gold',
      pending_approval: 'orange',
      under_review: 'processing',
      approved: 'green',
      issued: 'blue',
      checked_in: 'green',
      checked_out: 'default',
      rejected: 'red',
      expired: 'volcano'
    };
    return colors[status] || 'blue';
  };

  const getApprovalStageLabel = (stage) => {
    const labels = {
      initial_submission: 'Initial Submission',
      department_approval: 'Pending Department Approval',
      operations_validation: 'Pending Security Approval',
      pass_generation: 'Pass Generation',
      access_verification: 'Access Verification',
    };
    return labels[stage] || stage;
  };

  if (submitted) {
    return (
      <div className="visitor-page">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card className="visitor-card">
            <Result
              status="success"
              title="Visitor Pass Request Submitted!"
              subTitle={`Your Request ID is: ${submitted.request_id}. Please keep this for tracking.`}
              extra={[
                <Button type="primary" key="home" onClick={() => setSubmitted(null)}>
                  Submit Another Request
                </Button>,
                <Button key="track" onClick={() => { setSubmitted(null); setActiveTab('track'); }}>
                  Track Request
                </Button>
              ]}
            />
            {submitted.department_name && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Tag color="gold" icon={<ApartmentOutlined />} style={{ fontSize: 13, padding: '4px 12px' }}>
                  Routed to: {submitted.department_name}
                </Tag>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: 'Requester',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e' }}>Your Information</Title>
          <Form.Item name="requester_name" label="Your Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="requester_email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="john@company.com" />
          </Form.Item>
          <Form.Item name="requester_phone" label="Phone Number">
            <Input prefix={<PhoneOutlined />} placeholder="+94 77 123 4567" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visitor',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e' }}>Visitor Details</Title>
          <Form.Item name="visitor_name" label="Visitor Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Jane Smith" />
          </Form.Item>
          <Form.Item name="visitor_nic" label="NIC / Passport" rules={[{ required: true }]}>
            <Input prefix={<IdcardOutlined />} placeholder="199012345678" />
          </Form.Item>
          <Form.Item name="visitor_phone" label="Visitor Phone">
            <Input prefix={<PhoneOutlined />} placeholder="+94 71 987 6543" />
          </Form.Item>
          <Form.Item name="visitor_organization" label="Company / Organization">
            <Input placeholder="Acme Corp" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visit Info',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e' }}>Visit Details</Title>
          <Form.Item name="visitor_purpose" label="Purpose of Visit" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Maintenance, Meeting, etc." rows={3} />
          </Form.Item>

          {/* ── Department to Visit (new required field) ── */}
          <Form.Item
            name="department_to_visit"
            label="Department to Visit"
            rules={[{ required: true, message: 'Please select a department to visit.' }]}
          >
            <Select
              placeholder="Select the department you are visiting"
              loading={departmentsLoading}
              notFoundContent={departmentsLoading ? <Spin size="small" /> : 'No departments found'}
              suffixIcon={<ApartmentOutlined />}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="visit_dates" label="Date & Time" rules={[{ required: true }]}>
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => current && (current < dayjs().startOf('day') || current > dayjs().add(30, 'day').endOf('day'))}
            />
          </Form.Item>
          <Form.Item name="requested_zones" label="Zones to Access" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select Zones">
              <Select.Option value="zone_1">Zone 1 (Office)</Select.Option>
              <Select.Option value="zone_2">Zone 2 (Warehouse)</Select.Option>
              <Select.Option value="zone_3">Zone 3 (Loading Bay)</Select.Option>
              <Select.Option value="zone_4">Zone 4 (Restricted)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="vehicle_number" label="Vehicle Number (If any)">
            <Input placeholder="WP ABC-1234" />
          </Form.Item>
        </>
      ),
    },
  ];

  const trackContent = (
    <div style={{ padding: '20px 0' }}>
      <Title level={4} style={{ color: '#1a3c6e' }}>Track Your Request</Title>
      <Form
        form={trackForm}
        layout="vertical"
        onFinish={onTrack}
      >
        <Form.Item name="request_id" label="Request ID" rules={[{ required: true }]}>
          <Input prefix={<SearchOutlined />} placeholder="REQ-XXXXXX" />
        </Form.Item>
        <Form.Item name="requester_email" label="Your Email" rules={[{ required: true, type: 'email' }]}>
          <Input prefix={<MailOutlined />} placeholder="The email used during submission" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={trackingLoading} block icon={<SearchOutlined />}>
          Track Status
        </Button>
      </Form>

      {trackingInfo && (
        <Card style={{ marginTop: 24, borderLeft: '4px solid #1a3c6e' }}>
          {/* Status badge */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag color={getStatusColor(trackingInfo.status)} style={{ fontSize: '14px', padding: '4px 16px' }}>
              {trackingInfo.status_display.toUpperCase()}
            </Tag>
          </div>

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Visitor">{trackingInfo.visitor_name}</Descriptions.Item>

            {/* Department row — shown when a department was selected */}
            {trackingInfo.department_name && (
              <Descriptions.Item label="Department">
                <Tag icon={<ApartmentOutlined />} color="blue">
                  {trackingInfo.department_name}
                </Tag>
              </Descriptions.Item>
            )}

            {/* Current Approval Stage */}
            <Descriptions.Item label="Current Approval Stage">
              {getApprovalStageLabel(trackingInfo.current_stage)}
            </Descriptions.Item>

            {/* Current Status (human-readable detail) */}
            <Descriptions.Item label="Current Status">
              {trackingInfo.status_display}
            </Descriptions.Item>

            <Descriptions.Item label="Destination">
              {trackingInfo.requested_zones.join(', ').toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Entry">
              {dayjs(trackingInfo.requested_date).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Exit">
              {dayjs(trackingInfo.requested_end_date).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>

            {/* Rejection details */}
            {trackingInfo.status === 'rejected' && (
              <>
                {trackingInfo.rejected_by && (
                  <Descriptions.Item label="Rejected By" labelStyle={{ color: 'red' }}>
                    <Text type="danger">{trackingInfo.rejected_by}</Text>
                  </Descriptions.Item>
                )}
                {trackingInfo.rejection_reason && (
                  <Descriptions.Item label="Rejection Comments" labelStyle={{ color: 'red' }}>
                    <Text type="danger">{trackingInfo.rejection_reason}</Text>
                  </Descriptions.Item>
                )}
                {trackingInfo.rejected_at && (
                  <Descriptions.Item label="Rejected On" labelStyle={{ color: 'red' }}>
                    <Text type="danger">
                      {dayjs(trackingInfo.rejected_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Descriptions.Item>
                )}
              </>
            )}
          </Descriptions>

          {trackingInfo.status === 'issued' && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text strong style={{ color: '#059669' }}>Pass Issued! Present your NIC at the gate.</Text>
            </div>
          )}

          {/* Pending department approval — show routing info */}
          {trackingInfo.status === 'pending_department_approval' && trackingInfo.department_name && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
              <Text>
                <ApartmentOutlined style={{ marginRight: 8, color: '#faad14' }} />
                Your request has been routed to the <strong>{trackingInfo.department_name}</strong> department manager for approval.
              </Text>
            </div>
          )}

          {/* After department approval — pending security */}
          {trackingInfo.status === 'pending_approval' && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
              <Text>
                <CheckCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Department approval received. Awaiting Security / Operations verification.
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );

  const canIssueGroupPass = isAuthenticated && ['admin', 'pass_officer'].includes(user?.role);

  const groupPassContent = (
    <div style={{ padding: '10px 0' }}>
      {canIssueGroupPass ? (
        <GroupPassPage embedded={true} />
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Card style={{ maxWidth: 500, margin: '0 auto', border: '1px dashed #d9d9d9', borderRadius: 8, background: 'transparent' }}>
            <div style={{ marginBottom: 16 }}>
              <LockOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
            </div>
            <Title level={4} style={{ color: '#1a3c6e', marginBottom: 12 }}>Access Restricted</Title>
            <Paragraph style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Issuing group passes is restricted to authorized Pass Officers and Administrators.
              Please sign in to access this feature.
            </Paragraph>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => navigate('/login')}
              style={{ height: 44, padding: '0 32px', fontWeight: 600 }}
            >
              Sign In as Officer
            </Button>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="visitor-page">
      <Card className="visitor-card" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a3c6e, #0ea5e9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <GlobalOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={2} style={{ color: '#1a3c6e', marginBottom: 4 }}>Port Pass Request Portal</Title>
          <Text type="secondary">Enterprise Visitor Management System</Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'new',
              label: <span><IdcardOutlined /> New Request</span>,
              children: (
                <div style={{ marginTop: 20 }}>
                  <Steps current={current} style={{ marginBottom: '40px' }}>
                    {steps.map((item) => (
                      <Step key={item.title} title={item.title} />
                    ))}
                  </Steps>

                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    preserve={true}
                    initialValues={{ requested_zones: ['zone_1'] }}
                  >
                    <div className="steps-content">{steps[current].content}</div>

                    <Divider />

                    <div className="steps-action" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {current > 0 && (
                        <Button onClick={() => prev()}>
                           Previous
                        </Button>
                      )}
                      <div></div>
                      {current < steps.length - 1 && (
                        <Button type="primary" onClick={() => next()}>
                          Next Step
                        </Button>
                      )}
                      {current === steps.length - 1 && (
                        <Button type="primary" htmlType="submit" loading={loading}>
                          Submit Request
                        </Button>
                      )}
                    </div>
                  </Form>
                </div>
              )
            },
            {
              key: 'track',
              label: <span><ClockCircleOutlined /> Track Request</span>,
              children: trackContent
            },
            {
              key: 'group-pass',
              label: <span><TeamOutlined /> Group Pass Issue</span>,
              children: groupPassContent
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default VisitorRequestPage;
