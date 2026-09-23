import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Steps, message, Result, Typography, Divider, TimePicker } from 'antd';
import { UserOutlined, GlobalOutlined, ApartmentOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const VISITOR_PURPOSES = [
  'Business Meeting',
  'Official Visit',
  'Site Visit',
  'Vessel Operations',
  'Cargo Operations',
  'Project Work',
  'Maintenance Work',
  'Equipment Inspection',
  'Safety Inspection',
  'Security Inspection',
  'Training Program',
  'VIP Visit',
  'Departmental Guest',
  'Emergency Response',
  'Audit',
  'Other',
];

const VISITOR_CATEGORIES = [
  'Internal Visitor (CWIT Staff)',
  'Port User Visitor (Port Agents, Port-related Organizations)',
  'Contractor/Vendor (Project/Maintenance Workers)',
  'Government Official (Customs/Navy/Police/MEPA/CEA/Health Services/Labour Department/SLPA)',
  'VIP/Official Visitor',
  'Business Visitor',
  'Department Visitor',
  'Educational Visit',
  'General External Visitor',
  'Other',
];

const VISIT_AREAS = [
  'Onboard Vessel',
  'Wharf Area / Quay Side',
  'Yard Area',
  'Gate Complex',
  'Container Inspection Area',
  'Empty Container Yard',
  'Reefer Monitoring Area',
  'POB',
  'Pass Office & Security Building',
  'Wharf Building',
  'OHS Building',
  'DG Station',
  'Workshop / Maintenance Facility',
];

const DEPARTMENTS = [
  'CEO',
  'Finance',
  'Operations/DM',
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

const ExternalVisitorRequestPage = () => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});

  const next = async () => {
    try {
      let fieldsToValidate = [];
      if (current === 0) {
        fieldsToValidate = [
          'requester_name',
          'requester_company',
          'host_department',
          'visitor_purpose',
          'visitor_category',
          'visit_area',
          'visit_date',
          'expected_time_in',
          'expected_time_out',
        ];
      }
      if (current === 1) fieldsToValidate = ['visitors'];

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

  const handleFormFinish = () => {
    if (current === steps.length - 1) {
      onFinish();
    } else {
      next();
    }
  };

  const onFinish = async () => {
    setLoading(true);
    try {
      await form.validateFields();
      const currentStepValues = form.getFieldsValue();
      const values = { ...formValues, ...currentStepValues };

      let durationMinutes = 480;
      if (values.expected_time_in && values.expected_time_out) {
        durationMinutes = Math.max(15, values.expected_time_out.diff(values.expected_time_in, 'minute'));
      }

      const payload = {
        requester_name: values.requester_name,
        requester_email: values.requester_email || 'external-request@cwit.lk',
        requester_phone: values.requester_phone,
        request_source: 'external',
        visitor: {
          name: values.visitors?.[0]?.name || values.requester_name,
          email: null,
          phone: values.visitors?.[0]?.contact_no || null,
          nic_passport: values.visitors?.[0]?.nic_passport || null,
          organization: values.visitors?.[0]?.company || values.requester_company || null,
        },
        visit: {
          purpose: values.visitor_purpose,
          building_department: values.host_department || null,
          host_employee_name: null,
          host_employee_id: null,
          entry_time: values.visit_date
            ? dayjs(values.visit_date).format('YYYY-MM-DD') + 'T' + (values.expected_time_in ? values.expected_time_in.format('HH:mm:ss') : '08:00:00')
            : null,
          exit_time: values.visit_date
            ? dayjs(values.visit_date).format('YYYY-MM-DD') + 'T' + (values.expected_time_out ? values.expected_time_out.format('HH:mm:ss') : '17:00:00')
            : null,
          duration_minutes: durationMinutes,
        },
        access: {
          requested_zones: values.visit_area || [],
          vehicle_number: values.vehicles?.[0]?.vehicle_no || null,
          carrying_equipment: false,
          equipment_description: null,
        },
        department_id: null,
        department_name: values.host_department || null,
        additional_notes: null,
        visitor_category: values.visitor_category || null,
        visitors: values.visitors || [],
        vehicles: values.vehicles?.filter(v => v?.vehicle_no) || [],
      };

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
                  Routed to Host Department: {submitted.department_name}
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
      title: 'Request Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 20 }}>Step 1: Request Details</Title>

          <Form.Item name="requester_name" label="Requester's Name" rules={[{ required: true, message: "Please enter the requester's name." }]}>
            <Input prefix={<UserOutlined />} placeholder="Full name of the requester" />
          </Form.Item>

          <Form.Item name="requester_company" label="Organization / Company" rules={[{ required: true, message: 'Please enter your organization or company name.' }]}>
            <Input prefix={<ApartmentOutlined />} placeholder="Your company or organization name" />
          </Form.Item>

          <Form.Item
            name="host_department"
            label="Line Department"
            rules={[{ required: true, message: 'Please select the line department.' }]}
          >
            <Select
              placeholder="Select the line department"
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

          <Form.Item name="visitor_purpose" label="Visit Purpose" rules={[{ required: true, message: 'Please select the visit purpose.' }]}>
            <Select placeholder="Select visit purpose">
              {VISITOR_PURPOSES.map(p => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="visitor_category" label="Visitor Category" rules={[{ required: true, message: 'Please select the visitor category.' }]}>
            <Select placeholder="Select visitor category">
              {VISITOR_CATEGORIES.map(c => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="visit_area" label="Visit Area" rules={[{ required: true, message: 'Please select the visit area.' }]}>
            <Select mode="multiple" placeholder="Select areas">
              {VISIT_AREAS.map(a => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="visit_date" label="Visit Date" rules={[{ required: true, message: 'Please select the visit date.' }]}>
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && (current < dayjs().startOf('day') || current > dayjs().add(30, 'day').endOf('day'))}
            />
          </Form.Item>

          <Form.Item name="expected_time_in" label="Expected Time In" rules={[{ required: true, message: 'Please select the expected time in.' }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="expected_time_out" label="Expected Time Out" rules={[{ required: true, message: 'Please select the expected time out.' }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Visitor Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 5 }}>Step 2: Visitor Details</Title>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>Add up to 4 visitors for this request.</Paragraph>

          <Form.List name="visitors">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} size="small" title={`Visitor S.N ${index + 1}`} extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /> : null} style={{ marginBottom: 16 }}>
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Missing visitor name' }]}>
                      <Input placeholder="Visitor Name" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'nic_passport']} rules={[{ required: true, message: 'Missing NIC / Passport No.' }]}>
                      <Input placeholder="NIC / Passport No." />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'company']}>
                      <Input placeholder="Company / Organization" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'contact_no']}>
                      <Input placeholder="Contact No." />
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} disabled={fields.length >= 4}>
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
      title: 'Vehicle Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 5 }}>Step 3: Vehicle Details</Title>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>Add up to 4 vehicles for this request. (Optional)</Paragraph>

          <Form.List name="vehicles">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} size="small" title={`Vehicle S.N ${index + 1}`} extra={fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /> : null} style={{ marginBottom: 16 }}>
                    <Form.Item {...restField} name={[name, 'vehicle_no']}>
                      <Input placeholder="Vehicle No." />
                    </Form.Item>
                  </Card>
                ))}
                {fields.length < 4 && (
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Vehicle
                    </Button>
                  </Form.Item>
                )}
              </>
            )}
          </Form.List>
        </>
      ),
    },
  ];

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
          <Title level={2} style={{ color: '#1a3c6e', marginBottom: 4 }}>External Visitor Request</Title>
          <Text type="secondary">Submit your application to request access to the Port Facility</Text>
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
            onFinish={handleFormFinish}
            preserve={true}
            initialValues={{ visitors: [{}], vehicles: [{}] }}
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
                <div />
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
      </Card>
    </div>
  );
};

export default ExternalVisitorRequestPage;
