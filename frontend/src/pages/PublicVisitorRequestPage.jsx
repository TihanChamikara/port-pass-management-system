import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, TimePicker, Card, message, Select, Steps, Result, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import './PublicRequestPortal.css';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Public Requester Page: Submit visitor pass requests (NO AUTH REQUIRED)
 * With 10 departments and complete visitor information
 */
export default function PublicVisitorRequestPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [step, setStep] = useState(0);

  // Company departments
  const departments = [
    'HR & Admin',
    'Commercial & Marketing',
    'IT',
    'Engineering',
    'Operations',
    'Security',
    'Project Team',
    'HSE Department',
    'Techno Commercial',
    'Finance'
  ];

  // Areas/Zones (customize based on your facility)
  const areas = [
    'Main Building - Ground Floor',
    'Main Building - First Floor',
    'Main Building - Second Floor',
    'Warehouse',
    'Production Area',
    'R&D Lab',
    'Data Center',
    'Security Control Room',
    'Maintenance Workshop',
    'Cafeteria',
    'Conference Hall',
    'Training Center'
  ];

  // Helper function to validate fields for current step
  const validateAndProceed = async (fieldsToValidate) => {
    try {
      await form.validateFields(fieldsToValidate);
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  };

  const handleNextStep = async (nextStep, fieldsToValidate) => {
    const isValid = await validateAndProceed(fieldsToValidate);
    if (isValid) {
      setStep(nextStep);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('===== FORM SUBMISSION DEBUG =====');
      
      // Get all form values
      const allFormValues = form.getFieldsValue(true);
      console.log('All form fields:', allFormValues);
      
      // Format date and time
      const visitDate = values.visitDate;
      const startTime = values.startTime;
      const endTime = values.endTime;
      
      if (!visitDate || !startTime || !endTime) {
        throw new Error('Please select visit date and time');
      }
      
      // Combine date and time for entry and exit
      const entryDateTime = dayjs(visitDate)
        .hour(startTime.hour())
        .minute(startTime.minute())
        .second(0);
      
      const exitDateTime = dayjs(visitDate)
        .hour(endTime.hour())
        .minute(endTime.minute())
        .second(0);
      
      // Calculate duration in minutes
      const durationMinutes = Math.max(15, Math.round(exitDateTime.diff(entryDateTime, 'minutes')));
      
      const payload = {
        // Requester information (person submitting the request)
        requester_name: allFormValues.requesterName || '',
        requester_email: allFormValues.requesterEmail || '',
        requester_phone: allFormValues.requesterPhone || '',
        
        // Visitor information
        visitor: {
          name: allFormValues.visitorName || '',
          nic_passport: allFormValues.visitorNicPassport || '',
          organization: allFormValues.visitorOrganization || '',
          email: allFormValues.visitorEmail || undefined,
          phone: allFormValues.visitorPhone || undefined,
          photo_url: undefined,
        },
        
        // Visit information
        visit: {
          purpose: allFormValues.purposeOfVisit || '',
          area_of_visit: allFormValues.areaOfVisit || '',
          host_department: allFormValues.hostDepartment || '',
          contact_person: allFormValues.contactPerson || '',
          entry_time: entryDateTime.toISOString(),
          exit_time: exitDateTime.toISOString(),
          duration_minutes: durationMinutes,
          building_department: undefined,
          host_employee_id: undefined,
          host_employee_name: undefined,
        },
        
        // Access information
        access: {
          requested_zones: allFormValues.areaOfVisit ? [allFormValues.areaOfVisit.replace(/\s+/g, '_').toLowerCase()] : ['zone_1'],
          vehicle_number: allFormValues.vehicleNumber || undefined,
          carrying_equipment: allFormValues.carryingEquipment || false,
          equipment_description: allFormValues.equipmentDescription || undefined,
        },
      };

      console.log('Final payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiClient.post('/visitor-requests/submit', payload);
      setRequestId(response.data.request_id);
      setSubmitted(true);
      setStep(1);
      message.success('Request submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      console.error('Full error response:', error.response?.data);

      // Extract meaningful error message
      let errorMsg = error.message || 'Unknown error';
      const detail = error.response?.data?.detail;
      if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map(d => {
            if (typeof d === 'string') return d;
            if (d?.msg) return d.msg;
            return JSON.stringify(d);
          }).join('; ');
        } else if (detail.message) {
          errorMsg = detail.message;
        } else {
          errorMsg = JSON.stringify(detail);
        }
      }

      message.error(`Failed to submit request: ${String(errorMsg)}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="portal-success-card">
        <Result
          status="success"
          title="Request Submitted Successfully!"
          subTitle={`Your request ID: ${requestId}`}
          extra={[
            <p key="1">
              Please save your request ID for future reference. You can use it to track the status of your request.
            </p>,
            <div key="2" className="portal-next-steps">
              <strong>What's next?</strong>
              <ol>
                <li>Your request will be reviewed by the {form.getFieldValue('hostDepartment') || 'relevant'} department</li>
                <li>If approved, a Pass Officer will generate your QR pass</li>
                <li>You'll receive a notification with your pass details</li>
                <li>Present your ID and QR code at the gate for check-in</li>
              </ol>
            </div>,
            <Button 
              type="primary" 
              key="submit"
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                form.resetFields();
              }}
            >
              Submit Another Request
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="portal-container">
      <Card className="portal-card">
        <h1>Visitor Pass Request</h1>
        <p>Please fill out all required information for your visitor pass request.</p>

        <Steps
          current={step}
          items={[
            { title: 'Requester Info', description: 'Your details' },
            { title: 'Visitor Details', description: 'Who is visiting' },
            { title: 'Visit Information', description: 'When and where' },
            { title: 'Submit', description: 'Review and submit' },
          ]}
          style={{ marginBottom: '32px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={true}
        >
          {/* Step 0: Requester Information */}
          {step === 0 && (
            <>
              <Form.Item
                label="Your Full Name"
                name="requesterName"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input placeholder="Enter your full name" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Your Email Address"
                name="requesterEmail"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input placeholder="your@email.com" type="email" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Your Phone Number"
                name="requesterPhone"
                rules={[{ required: true, message: 'Please enter your phone number' }]}
              >
                <Input placeholder="+1234567890" size="large" />
              </Form.Item>
              
              <Button type="primary" onClick={() => handleNextStep(1, ['requesterName', 'requesterEmail', 'requesterPhone'])} size="large" block>
                Next: Visitor Details
              </Button>
            </>
          )}

          {/* Step 1: Visitor Details */}
          {step === 1 && (
            <>
              <Form.Item
                label="Visitor Full Name"
                name="visitorName"
                rules={[{ required: true, message: 'Please enter visitor name' }]}
              >
                <Input placeholder="Enter visitor's full name" size="large" />
              </Form.Item>
              
              <Form.Item
                label="NIC / Passport Number"
                name="visitorNicPassport"
                rules={[{ required: true, message: 'Please enter visitor NIC or Passport number' }]}
                tooltip="National ID Card or Passport number for security verification"
              >
                <Input placeholder="e.g., 12345-6789012-3 or PA1234567" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Organization / Company"
                name="visitorOrganization"
                rules={[{ required: true, message: 'Please enter organization name' }]}
              >
                <Input placeholder="Enter visitor's company name" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Visitor Email (Optional)"
                name="visitorEmail"
                rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
              >
                <Input placeholder="visitor@email.com" type="email" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Visitor Phone (Optional)"
                name="visitorPhone"
              >
                <Input placeholder="Visitor's contact number" size="large" />
              </Form.Item>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={() => setStep(0)} size="large">
                  Back
                </Button>
                <Button type="primary" onClick={() => handleNextStep(2, ['visitorName', 'visitorNicPassport', 'visitorOrganization'])} size="large" style={{ flex: 1 }}>
                  Next: Visit Details
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Visit Information */}
          {step === 2 && (
            <>
              <Form.Item
                label="Purpose of Visit"
                name="purposeOfVisit"
                rules={[{ required: true, message: 'Please enter purpose of visit' }]}
              >
                <TextArea 
                  placeholder="e.g., Business meeting, Technical support, Delivery, Interview, Maintenance" 
                  rows={3} 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item
                label="Area of Visit"
                name="areaOfVisit"
                rules={[{ required: true, message: 'Please select area of visit' }]}
              >
                <Select placeholder="Select area to visit" size="large">
                  {areas.map(area => (
                    <Option key={area} value={area}>{area}</Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label="Host Department"
                name="hostDepartment"
                rules={[{ required: true, message: 'Please select host department' }]}
              >
                <Select placeholder="Select department you are visiting" size="large">
                  {departments.map(dept => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label="Contact Person"
                name="contactPerson"
                rules={[{ required: true, message: 'Please enter contact person name' }]}
                tooltip="Person you are meeting in the organization"
              >
                <Input placeholder="Name of the person you are meeting" size="large" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Visit Date"
                    name="visitDate"
                    rules={[{ required: true, message: 'Please select visit date' }]}
                  >
                    <DatePicker 
                      format="YYYY-MM-DD"
                      style={{ width: '100%' }}
                      size="large"
                      disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                      placeholder="Select date"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Start Time"
                    name="startTime"
                    rules={[{ required: true, message: 'Please select start time' }]}
                  >
                    <TimePicker 
                      format="HH:mm"
                      style={{ width: '100%' }}
                      size="large"
                      minuteStep={15}
                      placeholder="Start time"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="End Time"
                    name="endTime"
                    rules={[
                      { required: true, message: 'Please select end time' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const startTime = getFieldValue('startTime');
                          if (!startTime || !value) {
                            return Promise.resolve();
                          }
                          if (value.isAfter(startTime)) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('End time must be after start time'));
                        },
                      }),
                    ]}
                  >
                    <TimePicker 
                      format="HH:mm"
                      style={{ width: '100%' }}
                      size="large"
                      minuteStep={15}
                      placeholder="End time"
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item
                label="Vehicle Number (Optional)"
                name="vehicleNumber"
                tooltip="If visitor is arriving by vehicle"
              >
                <Input placeholder="e.g., ABC-1234" size="large" />
              </Form.Item>
              
              <Form.Item
                label="Carrying Equipment?"
                name="carryingEquipment"
                valuePropName="checked"
              >
                <Checkbox>Visitor will be carrying equipment/tools</Checkbox>
              </Form.Item>
              
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.carryingEquipment !== currentValues.carryingEquipment}
              >
                {({ getFieldValue }) => 
                  getFieldValue('carryingEquipment') && (
                    <Form.Item
                      label="Equipment Description"
                      name="equipmentDescription"
                      rules={[{ required: true, message: 'Please describe the equipment' }]}
                    >
                      <TextArea rows={2} placeholder="Describe the equipment being carried" size="large" />
                    </Form.Item>
                  )
                }
              </Form.Item>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={() => setStep(1)} size="large">
                  Back
                </Button>
                <Button type="primary" onClick={() => handleNextStep(3, ['purposeOfVisit', 'areaOfVisit', 'hostDepartment', 'contactPerson', 'visitDate', 'startTime', 'endTime'])} size="large" style={{ flex: 1 }}>
                  Review & Submit
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <>
              <Card style={{ background: '#fafafa', marginBottom: '24px' }}>
                <h3>Review Your Request</h3>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <p><strong>Requester Name:</strong> {form.getFieldValue('requesterName')}</p>
                    <p><strong>Requester Email:</strong> {form.getFieldValue('requesterEmail')}</p>
                    <p><strong>Requester Phone:</strong> {form.getFieldValue('requesterPhone')}</p>
                  </Col>
                  <Col span={12}>
                    <p><strong>Visitor Name:</strong> {form.getFieldValue('visitorName')}</p>
                    <p><strong>NIC/Passport:</strong> {form.getFieldValue('visitorNicPassport')}</p>
                    <p><strong>Organization:</strong> {form.getFieldValue('visitorOrganization')}</p>
                  </Col>
                </Row>
                <hr />
                <p><strong>Purpose:</strong> {form.getFieldValue('purposeOfVisit')}</p>
                <p><strong>Area of Visit:</strong> {form.getFieldValue('areaOfVisit')}</p>
                <p><strong>Host Department:</strong> {form.getFieldValue('hostDepartment')}</p>
                <p><strong>Contact Person:</strong> {form.getFieldValue('contactPerson')}</p>
                <p><strong>Visit Date:</strong> {form.getFieldValue('visitDate')?.format('YYYY-MM-DD')}</p>
                <p><strong>Visit Time:</strong> {form.getFieldValue('startTime')?.format('HH:mm')} - {form.getFieldValue('endTime')?.format('HH:mm')}</p>
                {form.getFieldValue('vehicleNumber') && <p><strong>Vehicle:</strong> {form.getFieldValue('vehicleNumber')}</p>}
                {form.getFieldValue('carryingEquipment') && <p><strong>Equipment:</strong> {form.getFieldValue('equipmentDescription')}</p>}
              </Card>
              
              <Form.Item
                name="agreement"
                valuePropName="checked"
                rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('Please agree to the terms and conditions')) }]}
              >
                <Checkbox>
                  I confirm that all information provided is accurate. I understand that false information may result in denial of entry.
                </Checkbox>
              </Form.Item>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={() => setStep(2)} size="large">
                  Back
                </Button>
                <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ flex: 1 }}>
                  Submit Request
                </Button>
              </div>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
}