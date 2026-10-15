import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Steps, message, Result, Typography, Divider, TimePicker } from 'antd';
import { UserOutlined, GlobalOutlined, ApartmentOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const DEPARTMENTS = [
  'CEO',
  'Finance',
  'Operations',
  'IT',
  'Business Development',
  'HSE',
  'HR and Admin',
  'Project',
  'Engineering',
  'ESG',
  'Techno Commercial',
  'Security',
];

const VisitorRequestPage = () => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});

  const next = async () => {
    try {
      if (current === 0) {
        await form.validateFields(['requester_name', 'line_department']);
      } else if (current === 1) {
        await form.validateFields([
          'visitor_purpose',
          'visitor_category',
          'visit_area',
          'visit_date',
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

  const onFinish = async () => {
    setLoading(true);
    try {
      const currentStepValues = form.getFieldsValue();
      const values = { ...formValues, ...currentStepValues };

      let durationMinutes = 480;
      if (values.expected_time_in && values.expected_time_out) {
        durationMinutes = Math.max(15, values.expected_time_out.diff(values.expected_time_in, 'minute'));
      }

      const payload = {
        requester_name: values.requester_name,
        requester_email: values.requester_email || 'internal-request@cwit.lk', // Fallback for backend validation
        requester_phone: values.requester_phone,
        request_source: 'internal',
        visitor: {
          name: values.visitors?.[0]?.name || '',
          email: null,
          phone: values.visitors?.[0]?.contact_no || null,
          nic_passport: values.visitors?.[0]?.nic_passport || null,
          organization: values.visitors?.[0]?.company || null,
        },
        visit: {
          purpose: values.visitor_purpose,
          building_department: values.line_department || null,
          host_employee_name: values.host_name || null,
          host_employee_id: null,
          entry_time: values.visit_date ? dayjs(values.visit_date).format('YYYY-MM-DD') + 'T' + (values.expected_time_in ? values.expected_time_in.format('HH:mm:ss') : '08:00:00') : null,
          exit_time: values.visit_date ? dayjs(values.visit_date).format('YYYY-MM-DD') + 'T' + (values.expected_time_out ? values.expected_time_out.format('HH:mm:ss') : '17:00:00') : null,
          duration_minutes: durationMinutes,
        },
        access: {
          requested_zones: values.visit_area || [],
          vehicle_number: values.vehicles?.[0]?.vehicle_no || null,
          carrying_equipment: false,
        },
        department_id: null,
        department_name: values.line_department || null,
        additional_notes: null,
        visitor_category: values.visitor_category || null,
        visitors: values.visitors || [],
        vehicles: values.vehicles?.filter(v => v?.vehicle_no) || [],
      };

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

  if (submitted) {
    return (
      <div className="visitor-page">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card className="visitor-card">
            <Result
              status="success"
              title="Visitor Pass Request Submitted!"
              subTitle={`Your Request ID is: ${submitted.request_id}. Please save this for your records.`}
              extra={[
                <Button type="primary" key="home" onClick={() => { setSubmitted(null); form.resetFields(); setCurrent(0); setFormValues({}); }}>
                  Submit Another Request
                </Button>,
              ]}
            />
            {submitted.department_name && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, padding: '4px 12px', fontSize: 13 }}>
                  <ApartmentOutlined style={{ marginRight: 6 }} />
                  Routed to: {submitted.department_name}
                </span>
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
          <Form.Item name="requester_name" label="Requester's Name" rules={[{ required: true, message: "Please enter your name." }]}>
            <Input prefix={<UserOutlined />} placeholder="Your full name" />
          </Form.Item>
          <Form.Item
            name="line_department"
            label="Line Department"
            rules={[{ required: true, message: 'Please select a line department.' }]}
          >
            <Select
              placeholder="Select a line department"
              suffixIcon={<ApartmentOutlined />}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {DEPARTMENTS.map(dept => (
                <Select.Option key={dept} value={dept}>
                  {dept}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visit Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e' }}>Visit Details</Title>
          <Form.Item name="visitor_purpose" label="Visit Purpose" rules={[{ required: true }]}>
            <Select placeholder="Select Purpose">
              {["Business Meeting", "Official Visit", "Site Visit", "Vessel Operations", "Cargo Operations", "Project Work", "Maintenance Work", "Equipment Inspection", "Safety Inspection", "Security Inspection", "Training Program", "VIP Visit", "Departmental Guest", "Emergency Response", "Audit", "Other"].map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visitor_category" label="Visitor Category" rules={[{ required: true }]}>
            <Select placeholder="Select Category">
              {["Internal Visitor (CWIT Staff)", "Port User Visitor", "Contractor/Vendor", "Government Official", "VIP/Official Visitor", "Business Visitor", "Department Visitor", "Educational Visit", "General External Visitor", "Other"].map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visit_area" label="Visit Area" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select Areas">
              {["Onboard Vessel", "Wharf Area / Quay Side", "Yard Area", "Gate Complex", "Container Inspection Area", "Empty Container Yard", "Reefer Monitoring Area", "POB", "Pass Office & Security Building", "Wharf Building", "OHS Building", "DG Station", "Workshop / Maintenance Facility"].map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="visit_date" label="Visit Date" rules={[{ required: true }]}>
            <DatePicker
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              disabledDate={(current) => current && (current < dayjs().startOf('day') || current > dayjs().add(30, 'day').endOf('day'))}
            />
          </Form.Item>
          <Form.Item name="expected_time_in" label="Expected Time In" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expected_time_out" label="Expected Time Out" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
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
          <Title level={4} style={{ color: '#1a3c6e' }}>Visitor Details</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Add visitors for this request (no limit).</Text>
          <Form.List name="visitors">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} size="small" title={`Visitor S.N ${index + 1}`} extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} /> : null} style={{ marginBottom: 16 }}>
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Missing visitor name' }]} style={{ marginBottom: 12 }}>
                      <Input placeholder="Visitor Name" />
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
          <Title level={4} style={{ color: '#1a3c6e' }}>Vehicle Details</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>Add vehicles for this request (optional, no limit).</Paragraph>
          <Form.List name="vehicles">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} size="small" title={`Vehicle S.N ${index + 1}`} extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} /> : null} style={{ marginBottom: 16 }}>
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
    <div className="visitor-page">
      <Card className="visitor-card" style={{ maxWidth: '820px', margin: '0 auto', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)', borderRadius: 12 }}>
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
          <Text type="secondary">Submit your visitor pass request</Text>
        </div>

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
            initialValues={{ visitors: [{}], vehicles: [{}] }}
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
                  onClick={onFinish}
                >
                  Submit Request
                </Button>
              )}
            </div>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default VisitorRequestPage;
