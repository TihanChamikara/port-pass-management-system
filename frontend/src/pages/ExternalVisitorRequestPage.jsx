import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Steps, message, Result, Typography, Divider, Tabs, Space, Tag, Descriptions, Spin, Switch } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, EnvironmentOutlined, QuestionCircleOutlined, SearchOutlined, ClockCircleOutlined, GlobalOutlined, ApartmentOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, CarOutlined, ToolOutlined } from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const ExternalVisitorRequestPage = () => {
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
      // Validate current step fields before going to the next step
      const fieldsToValidate = current === 0 
        ? ['visitor_name', 'visitor_nic', 'visitor_email', 'visitor_phone']
        : [];
      
      await form.validateFields(fieldsToValidate);
      const stepValues = form.getFieldsValue();
      setFormValues(prev => ({ ...prev, ...stepValues }));
      setCurrent(current + 1);
    } catch (error) {
      console.error('Step validation failed:', error);
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
      // Validate all fields
      await form.validateFields();
      const currentStepValues = form.getFieldsValue();
      const values = { ...formValues, ...currentStepValues };

      // Resolve department details from selected department_to_visit
      const selectedDept = departments.find(d => d.id === values.department_to_visit);

      // Calculate visit duration in minutes
      const entryTime = values.visit_dates[0];
      const exitTime = values.visit_dates[1];
      const durationMinutes = dayjs(exitTime).diff(dayjs(entryTime), 'minute');

      if (durationMinutes > 1440) {
        message.error('Visit duration cannot exceed 24 hours (1440 minutes).');
        setLoading(false);
        return;
      }
      if (durationMinutes < 15) {
        message.error('Visit duration must be at least 15 minutes.');
        setLoading(false);
        return;
      }

      // Format payload according to PublicVisitorRequestCreate schema
      const payload = {
        requester_name: values.visitor_name, // External visitors are their own requester
        requester_email: values.visitor_email,
        requester_phone: values.visitor_phone || null,
        visitor: {
          name: values.visitor_name,
          email: values.visitor_email,
          phone: values.visitor_phone || null,
          nic_passport: values.visitor_nic,
          organization: values.visitor_organization || null,
        },
        visit: {
          purpose: values.visitor_purpose,
          building_department: selectedDept ? selectedDept.name : null,
          host_employee_name: values.contact_person,
          host_employee_id: null, // Public user doesn't know DB IDs
          entry_time: entryTime.format('YYYY-MM-DDTHH:mm:ss'),
          exit_time: exitTime.format('YYYY-MM-DDTHH:mm:ss'),
          duration_minutes: durationMinutes,
        },
        access: {
          requested_zones: values.requested_zones,
          vehicle_number: values.vehicle_number || null,
          carrying_equipment: values.carrying_equipment || false,
          equipment_description: values.carrying_equipment ? (values.equipment_description || null) : null,
        },
        department_id: selectedDept ? selectedDept.id : null,
        department_name: selectedDept ? selectedDept.name : null,
        additional_notes: values.additional_notes || null,
      };

      console.log('Submitting external visitor payload:', JSON.stringify(payload));
      const response = await api.post('/api/visitor-requests/submit', payload);
      setSubmitted(response.data);
      message.success('Your pass request has been submitted successfully!');
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
              subTitle={`Your Request ID is: ${submitted.request_id}. Please use this along with your email to track the approval status.`}
              extra={[
                <Button type="primary" key="home" onClick={() => { setSubmitted(null); form.resetFields(); setCurrent(0); }}>
                  Submit Another Request
                </Button>,
                <Button key="track" onClick={() => { setSubmitted(null); setActiveTab('track'); }}>
                  Track Request Status
                </Button>
              ]}
            />
            {submitted.department_name && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Tag color="gold" icon={<ApartmentOutlined />} style={{ fontSize: 13, padding: '4px 12px' }}>
                  Routed to Host Department: {submitted.department_name}
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
      title: 'Visitor Information',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 20 }}>Step 1: Your Personal Details</Title>
          <Form.Item name="visitor_name" label="Visitor Name" rules={[{ required: true, message: 'Please enter your full name.' }]}>
            <Input prefix={<UserOutlined />} placeholder="Jane Smith" />
          </Form.Item>
          <Form.Item name="visitor_nic" label="NIC / Passport Number" rules={[{ required: true, message: 'Please enter your NIC or Passport number.' }]}>
            <Input prefix={<IdcardOutlined />} placeholder="e.g. 199012345678 or N1234567" />
          </Form.Item>
          <Form.Item name="visitor_email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter a valid email address for tracking.' }]}>
            <Input prefix={<MailOutlined />} placeholder="jane.smith@example.com" />
          </Form.Item>
          <Form.Item name="visitor_phone" label="Phone Number" rules={[{ required: true, message: 'Please enter your mobile or phone number.' }]}>
            <Input prefix={<PhoneOutlined />} placeholder="e.g. +94 77 123 4567" />
          </Form.Item>
          <Form.Item name="visitor_organization" label="Company / Organization Name">
            <Input prefix={<ApartmentOutlined />} placeholder="Acme Corp (If applicable)" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visit & Access Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 20 }}>Step 2: Destination & Host Details</Title>
          
          <Form.Item
            name="department_to_visit"
            label="Host Department"
            rules={[{ required: true, message: 'Please select the host department you want to visit.' }]}
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

          <Form.Item 
            name="contact_person" 
            label="Contact Person (Host Employee)" 
            rules={[{ required: true, message: 'Please enter the name of the person you are visiting.' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter name of the host employee you are meeting" />
          </Form.Item>

          <Form.Item name="visitor_purpose" label="Purpose of Visit" rules={[{ required: true, message: 'Please state the purpose of your visit.' }]}>
            <Input.TextArea placeholder="Describe the reason for your visit (e.g., Annual audit, technical maintenance, sales meeting)" rows={3} />
          </Form.Item>

          <Form.Item name="visit_dates" label="Scheduled Visit Date & Time" rules={[{ required: true, message: 'Please select entry and exit date & time.' }]}>
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => current && (current < dayjs().startOf('day') || current > dayjs().add(30, 'day').endOf('day'))}
            />
          </Form.Item>

          <Form.Item name="requested_zones" label="Required Zones (Areas of Visit)" rules={[{ required: true, message: 'Please select at least one zone.' }]}>
            <Select mode="multiple" placeholder="Select zones you need access to">
              <Select.Option value="zone_1">Zone 1 (Office Building)</Select.Option>
              <Select.Option value="zone_2">Zone 2 (Warehouse & Cargo)</Select.Option>
              <Select.Option value="zone_3">Zone 3 (Loading Bay)</Select.Option>
              <Select.Option value="zone_4">Zone 4 (Restricted Area)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="vehicle_number" label="Vehicle Number (If entering with vehicle)">
            <Input prefix={<CarOutlined />} placeholder="e.g. WP ABC-1234" />
          </Form.Item>

          <Form.Item name="carrying_equipment" label="Are you bringing any technical equipment?" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          {/* Conditional field for equipment description */}
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.carrying_equipment !== currentValues.carrying_equipment}>
            {({ getFieldValue }) => 
              getFieldValue('carrying_equipment') ? (
                <Form.Item 
                  name="equipment_description" 
                  label="Equipment Description" 
                  rules={[{ required: true, message: 'Please specify the equipment you are bringing.' }]}
                >
                  <Input.TextArea prefix={<ToolOutlined />} placeholder="Specify serial numbers and types (e.g. Dell Laptop S/N 12345)" rows={2} />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="additional_notes" label="Additional Notes / Remarks">
            <Input.TextArea placeholder="Any other information you want to convey to security" rows={2} />
          </Form.Item>
        </>
      ),
    },
  ];

  const trackContent = (
    <div style={{ padding: '20px 0' }}>
      <Title level={4} style={{ color: '#1a3c6e' }}>Track Your Request Status</Title>
      <Paragraph type="secondary">
        Enter the Request ID from your submission confirmation and the email address you provided.
      </Paragraph>
      <Form
        form={trackForm}
        layout="vertical"
        onFinish={onTrack}
      >
        <Form.Item name="request_id" label="Request ID" rules={[{ required: true, message: 'Please input your Request ID.' }]}>
          <Input prefix={<SearchOutlined />} placeholder="REQ-YYYYMMDD-XXXX" />
        </Form.Item>
        <Form.Item name="requester_email" label="Your Email Address" rules={[{ required: true, type: 'email', message: 'Please input your email address.' }]}>
          <Input prefix={<MailOutlined />} placeholder="The email used during submission" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={trackingLoading} block icon={<SearchOutlined />}>
          Track Status
        </Button>
      </Form>

      {trackingInfo && (
        <Card style={{ marginTop: 24, borderLeft: '4px solid #1a3c6e', borderRadius: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>CURRENT STATUS</Text>
            <Tag color={getStatusColor(trackingInfo.status)} style={{ fontSize: '15px', padding: '6px 20px', borderRadius: 4 }}>
              {trackingInfo.status_display.toUpperCase()}
            </Tag>
          </div>

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Request ID">{trackingInfo.request_id}</Descriptions.Item>
            <Descriptions.Item label="Visitor">{trackingInfo.visitor_name}</Descriptions.Item>

            {trackingInfo.department_name && (
              <Descriptions.Item label="Host Department">
                <Tag icon={<ApartmentOutlined />} color="blue">
                  {trackingInfo.department_name}
                </Tag>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Approval Stage">
              {getApprovalStageLabel(trackingInfo.current_stage)}
            </Descriptions.Item>

            <Descriptions.Item label="Destination Areas">
              {trackingInfo.requested_zones.map(z => z.replace('_', ' ').toUpperCase()).join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Start">
              {dayjs(trackingInfo.requested_date).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled End">
              {dayjs(trackingInfo.requested_end_date).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>

            {/* Rejection comments */}
            {trackingInfo.status === 'rejected' && (
              <>
                {trackingInfo.rejection_reason && (
                  <Descriptions.Item label="Rejection Reason" labelStyle={{ color: 'red' }}>
                    <Text type="danger" strong>{trackingInfo.rejection_reason}</Text>
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

            {/* Operations comments */}
            {trackingInfo.operations_comments && (
              <Descriptions.Item label="Security Feedback">
                {trackingInfo.operations_comments}
              </Descriptions.Item>
            )}
          </Descriptions>

          {trackingInfo.status === 'issued' && (
            <div style={{ marginTop: 16, textAlign: 'center', padding: '10px', background: '#ecfdf5', borderRadius: 6 }}>
              <Text strong style={{ color: '#047857' }}>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                Pass Approved & Issued! Please present your original NIC/Passport at the security gate to collect your physical pass.
              </Text>
            </div>
          )}

          {trackingInfo.status === 'pending_department_approval' && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
              <Text>
                <ApartmentOutlined style={{ marginRight: 8, color: '#faad14' }} />
                Awaiting approval from the host department manager (<strong>{trackingInfo.department_name}</strong>).
              </Text>
            </div>
          )}

          {trackingInfo.status === 'pending_approval' && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
              <Text>
                <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Department manager has approved. Currently awaiting Security Operations verification.
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );

  return (
    <div className="visitor-page">
      <Card className="visitor-card" style={{ maxWidth: '820px', margin: '0 auto', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.4)'
          }}>
            <GlobalOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={2} style={{ color: '#1a3c6e', marginBottom: 4 }}>External Visitor Pass Request</Title>
          <Text type="secondary">Submit your application to request access to the Port Facility</Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'new',
              label: <span><IdcardOutlined /> New Request Form</span>,
              children: (
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
                    initialValues={{ carrying_equipment: false, requested_zones: ['zone_1'] }}
                  >
                    <div className="steps-content" style={{ minHeight: '300px' }}>
                      {steps[current].content}
                    </div>

                    <Divider />

                    <div className="steps-action" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {current > 0 ? (
                        <Button onClick={() => prev()}>
                          Previous Step
                        </Button>
                      ) : (
                        <div /> // Spacer to keep next/submit aligned right
                      )}
                      
                      {current < steps.length - 1 ? (
                        <Button type="primary" onClick={() => next()}>
                          Next Step
                        </Button>
                      ) : (
                        <Button type="primary" onClick={onFinish} loading={loading}>
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
              label: <span><ClockCircleOutlined /> Track Your Pass</span>,
              children: trackContent
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default ExternalVisitorRequestPage;
