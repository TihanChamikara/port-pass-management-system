import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Select, Card, Steps, message, Result, Typography, Divider, TimePicker, Tag } from 'antd';
import { UserOutlined, GlobalOutlined, ApartmentOutlined, MinusCircleOutlined, PlusOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../api/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const VISIT_DURATIONS = [
  '1 Hour',
  '2 Hours',
  '3 Hours',
  '4 Hours',
  '6 Hours',
  '12 Hours',
  '1 Day',
  '2 Days',
  '3 Days',
  '1 Week',
  '2 Weeks',
  'More than 2 Weeks',
  'More than 1 Month',
];

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
  const [submittedValues, setSubmittedValues] = useState(null);
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
          'visit_duration',
          'expected_time_in',
          'expected_time_out',
        ];
      }
      if (current === 1) fieldsToValidate = ['visitors'];

      await form.validateFields(fieldsToValidate);
      const stepValues = form.getFieldsValue();
      setFormValues(prev => ({ ...prev, ...stepValues }));
      setCurrent(c => Math.min(c + 1, steps.length - 1));
    } catch (error) {
      console.error('Step validation failed:', error);
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
      await form.validateFields();
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
          entry_time: values.visit_date ? entryDateTime.format('YYYY-MM-DDTHH:mm:ss') : null,
          exit_time: values.visit_date ? exitDateTime.format('YYYY-MM-DDTHH:mm:ss') : null,
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
        additional_notes: values.visit_duration ? `Duration of Visit: ${values.visit_duration}` : null,
        visitor_category: values.visitor_category || null,
        visitors: values.visitors || [],
        vehicles: values.vehicles?.filter(v => v?.vehicle_no) || [],
      };

      const response = await api.post('/api/visitor-requests/submit', payload);
      setSubmitted(response.data);
      setSubmittedValues({
        ...values,
        entryDateTime,
        exitDateTime,
        durationMinutes,
        durationStr,
      });
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
    const durationStr = submittedValues?.visit_duration || '';
    const displayDuration = durationStr || `${Math.round((submittedValues?.expected_time_out && submittedValues?.expected_time_in ? Math.max(15, submittedValues.expected_time_out.diff(submittedValues.expected_time_in, 'minute')) : 480) / 60)} Hours`;

    let calculatedExitTime = submittedValues?.exitDateTime;
    if (!calculatedExitTime && submittedValues?.visit_date) {
      const entryDay = dayjs(submittedValues.visit_date);
      const outTime = submittedValues.expected_time_out ? dayjs(submittedValues.expected_time_out) : null;
      calculatedExitTime = entryDay.hour(outTime ? outTime.hour() : 17).minute(outTime ? outTime.minute() : 0);
      if (durationStr.includes('3 Day') || durationStr === '3 Days') {
        calculatedExitTime = calculatedExitTime.add(3, 'day');
      } else if (durationStr.includes('2 Day') || durationStr === '2 Days') {
        calculatedExitTime = calculatedExitTime.add(2, 'day');
      } else if (durationStr.includes('1 Day') || durationStr === '1 Day') {
        calculatedExitTime = calculatedExitTime.add(1, 'day');
      } else if (durationStr.includes('1 Week') || durationStr === '1 Week') {
        calculatedExitTime = calculatedExitTime.add(7, 'day');
      } else if (durationStr.includes('More than 1 Week')) {
        calculatedExitTime = calculatedExitTime.add(14, 'day');
      }
    }
    const isMultiDay = durationStr.includes('Day') || durationStr.includes('Week');

    return (
      <div className="visitor-page">
        <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: 40 }}>
          <Card className="visitor-card" style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)', borderRadius: 14 }}>
            <Result
              status="success"
              title="Visitor Pass Request Submitted!"
              subTitle={
                <span>
                  Your Request ID is: <strong style={{ color: '#0ea5e9', fontSize: 16 }}>{submitted.request_id}</strong>. Please save this for your records.
                </span>
              }
              extra={[
                <Button type="primary" key="home" icon={<PlusOutlined />} onClick={() => { setSubmitted(null); setSubmittedValues(null); form.resetFields(); setCurrent(0); setFormValues({}); }}>
                  Submit Another Request
                </Button>,
              ]}
            />

            {/* Request Details Pending Security Approval Card */}
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#1a3c6e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GlobalOutlined style={{ color: '#0ea5e9' }} />
                    Request Details
                  </span>
                  <Tag color="orange" style={{ fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 4 }}>
                    Pending Security Approval
                  </Tag>
                </div>
              }
              style={{ marginTop: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fafbfc' }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              {isMultiDay && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <ClockCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                  <span>
                    <strong>Multi-Day Visit Authorized:</strong> You selected <strong>{durationStr}</strong>. Your exit time is extended with those 3 days added, valid until <strong>{calculatedExitTime ? calculatedExitTime.format('DD MMMM YYYY, HH:mm') : '—'}</strong>.
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px 20px', marginBottom: 16 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Requester Name</Text>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{submittedValues?.requester_name || submitted.requester_name || '—'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Organization / Company</Text>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{submittedValues?.requester_company || '—'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Line Department</Text>
                  <Tag color="blue" style={{ marginTop: 2, fontWeight: 600 }}>{submitted.department_name || submittedValues?.host_department || '—'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Visit Purpose</Text>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{submittedValues?.visitor_purpose || submitted.visitor_purpose || '—'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Visitor Category</Text>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{submittedValues?.visitor_category || '—'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Visit Date (Entry)</Text>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                    {submittedValues?.visit_date ? dayjs(submittedValues.visit_date).format('DD MMMM YYYY') : '—'}
                  </Text>
                </div>
                <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', color: '#166534', fontWeight: 700 }}>
                    Duration of the Visit
                  </Text>
                  <Text strong style={{ fontSize: 14, color: '#15803d' }}>
                    {displayDuration}
                  </Text>
                </div>
                <div style={{ background: isMultiDay ? '#eff6ff' : 'transparent', padding: isMultiDay ? '8px 12px' : 0, borderRadius: isMultiDay ? 8 : 0, border: isMultiDay ? '1px solid #bfdbfe' : 'none' }}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600, color: isMultiDay ? '#1d4ed8' : undefined }}>
                    {isMultiDay ? 'Scheduled Exit (Calculated)' : 'Scheduled Exit'}
                  </Text>
                  <Text strong style={{ fontSize: 14, color: isMultiDay ? '#1e40af' : '#0f172a' }}>
                    {calculatedExitTime ? calculatedExitTime.format('DD MMMM YYYY, HH:mm') : '—'}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Daily Time Window</Text>
                  <Text style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                    {(submittedValues?.expected_time_in ? dayjs(submittedValues.expected_time_in).format('HH:mm') : '08:00')} – {(submittedValues?.expected_time_out ? dayjs(submittedValues.expected_time_out).format('HH:mm') : '17:00')}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', fontWeight: 600 }}>Access Areas</Text>
                  <div style={{ marginTop: 2 }}>
                    {(submittedValues?.visit_area || []).map(a => (
                      <Tag key={a} color="geekblue" style={{ marginBottom: 4 }}>{a}</Tag>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visitors Summary */}
              {submittedValues?.visitors?.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 10 }}>
                  <Text strong style={{ fontSize: 13, color: '#1a3c6e', display: 'block', marginBottom: 8 }}>
                    Registered Visitors ({submittedValues.visitors.length})
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {submittedValues.visitors.map((v, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        <strong>{v.name || `Visitor ${i + 1}`}</strong>
                        {v.nic_passport && <div style={{ color: '#64748b' }}>NIC: {v.nic_passport}</div>}
                        {v.company && <div style={{ color: '#64748b' }}>Company: {v.company}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles Summary */}
              {submittedValues?.vehicles?.filter(v => v?.vehicle_no)?.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 10 }}>
                  <Text strong style={{ fontSize: 13, color: '#1a3c6e', display: 'block', marginBottom: 8 }}>
                    Registered Vehicles ({submittedValues.vehicles.filter(v => v?.vehicle_no).length})
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {submittedValues.vehicles.filter(v => v?.vehicle_no).map((v, i) => (
                      <Tag key={i} color="purple" style={{ fontSize: 13, padding: '4px 10px' }}>
                        🚗 {v.vehicle_no}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
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
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>Add visitors for this request (no limit).</Paragraph>

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
      title: 'Vehicle Details',
      content: (
        <>
          <Title level={4} style={{ color: '#1a3c6e', marginBottom: 5 }}>Step 3: Vehicle Details</Title>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>Add vehicles for this request (optional, no limit).</Paragraph>

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
            preserve={true}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            initialValues={{ visitors: [{}], vehicles: [{}] }}
          >
            <div className="steps-content" style={{ minHeight: '300px' }}>
              {steps[current].content}
            </div>

            <Divider />

            <div className="steps-action" style={{ display: 'flex', justifyContent: 'space-between' }}>
              {current > 0 ? (
                <Button key="btn-prev" htmlType="button" onClick={() => prev()}>
                  Previous Step
                </Button>
              ) : (
                <div />
              )}

              {current < steps.length - 1 ? (
                <Button key="btn-next" type="primary" htmlType="button" onClick={() => next()}>
                  Next Step
                </Button>
              ) : (
                <Button key="btn-submit" type="primary" htmlType="button" onClick={onFinish} loading={loading}>
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
