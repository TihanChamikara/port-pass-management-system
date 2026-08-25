import React, { useState, useCallback } from 'react';
import {
  Form, Input, Button, DatePicker, Checkbox, Select, message, Card, Steps,
  Row, Col, Space, Alert, Divider, Upload, InputNumber, Tag, Spin
} from 'antd';
import { UploadOutlined, CheckCircleOutlined, ExclamationOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import './PublicRequestPortal.css';

/**
 * ENTERPRISE PUBLIC REQUEST PORTAL
 * 
 * Multi-step form for public visitor pass requests.
 * Features:
 * - Real-time validation
 * - Comprehensive visitor information collection
 * - Access requirement specification
 * - File uploads
 * - Request tracking
 */
export default function PublicRequestPortal() {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [serverNow, setServerNow] = useState(null);

  // Form validation step dependencies
  const STEPS = [
    { title: 'Requester Info', description: 'Your contact details' },
    { title: 'Visitor Info', description: 'Visitor identification' },
    { title: 'Visit Details', description: 'Purpose & timing' },
    { title: 'Access Requirements', description: 'Zones & equipment' },
    { title: 'Additional Info', description: 'Files & notes' },
    { title: 'Review', description: 'Confirm submission' },
  ];

  const VALID_ZONES = [
    { label: 'Zone 1', value: 'zone_1' },
    { label: 'Zone 2', value: 'zone_2' },
    { label: 'Zone 3', value: 'zone_3' },
    { label: 'Cargo Area', value: 'cargo' },
    { label: 'Office Building', value: 'office' },
  ];

  const VISIT_PURPOSES = [
    'Delivery',
    'Maintenance',
    'Meeting',
    'Consultation',
    'Training',
    'Inspection',
    'Audit',
    'Other',
  ];

  // Validate and proceed to next step
  const validateAndProceed = async (fieldsToValidate) => {
    try {
      await form.validateFields(fieldsToValidate);
      return true;
    } catch (error) {
      message.error('Please fix validation errors before proceeding');
      return false;
    }
  };

  const handleNextStep = async (nextStep, fieldsToValidate) => {
    const isValid = await validateAndProceed(fieldsToValidate);
    if (isValid) {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateRequest = async () => {
    try {
      const formValues = form.getFieldsValue();

      // Prepare payload
      const payload = {
        requester_name: formValues.requesterName,
        requester_email: formValues.requesterEmail,
        requester_phone: formValues.requesterPhone || undefined,
        visitor: {
          name: formValues.visitorName,
          email: formValues.visitorEmail || undefined,
          phone: formValues.visitorPhone || undefined,
          nic_passport: formValues.visitorNic || undefined,
          organization: formValues.visitorOrganization || undefined,
          photo_url: undefined,
        },
        visit: {
          purpose: formValues.visitPurpose,
          building_department: formValues.buildingDepartment || undefined,
          host_employee_id: formValues.hostEmployeeId || undefined,
          host_employee_name: formValues.hostEmployeeName || undefined,
          entry_time: formValues.entryTime?.toISOString(),
          exit_time: formValues.exitTime?.toISOString(),
          duration_minutes: Math.round((formValues.exitTime - formValues.entryTime) / 60000),
        },
        access: {
          requested_zones: formValues.requestedZones || [],
          vehicle_number: formValues.vehicleNumber || undefined,
          carrying_equipment: formValues.carryingEquipment || false,
          equipment_description: formValues.equipmentDescription || undefined,
        },
        additional_notes: formValues.additionalNotes || undefined,
        supporting_docs_urls: uploadedFiles.map(f => f.url),
      };

      // Validate on backend
      const response = await apiClient.post('/visitor-requests/validate', payload);
      
      if (response.data.is_valid) {
        setValidationErrors([]);
        return true;
      } else {
        setValidationErrors(response.data.errors);
        message.error('Validation failed. Please review the errors below.');
        return false;
      }
    } catch (error) {
      message.error('Validation error: ' + (error.response?.data?.detail || error.message));
      return false;
    }
  };

  // Fetch server time on mount to avoid client/server clock skew
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await apiClient.get('/time');
        if (mounted && resp.data?.server_time) {
          setServerNow(dayjs(resp.data.server_time));
        }
      } catch (e) {
        // ignore - fall back to client time
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formValues = form.getFieldsValue();

      const payload = {
        requester_name: formValues.requesterName,
        requester_email: formValues.requesterEmail,
        requester_phone: formValues.requesterPhone || undefined,
        visitor: {
          name: formValues.visitorName,
          email: formValues.visitorEmail || undefined,
          phone: formValues.visitorPhone || undefined,
          nic_passport: formValues.visitorNic || undefined,
          organization: formValues.visitorOrganization || undefined,
          photo_url: undefined,
        },
        visit: {
          purpose: formValues.visitPurpose,
          building_department: formValues.buildingDepartment || undefined,
          host_employee_id: formValues.hostEmployeeId || undefined,
          host_employee_name: formValues.hostEmployeeName || undefined,
          entry_time: formValues.entryTime?.toISOString(),
          exit_time: formValues.exitTime?.toISOString(),
          duration_minutes: Math.round((formValues.exitTime - formValues.entryTime) / 60000),
        },
        access: {
          requested_zones: formValues.requestedZones || [],
          vehicle_number: formValues.vehicleNumber || undefined,
          carrying_equipment: formValues.carryingEquipment || false,
          equipment_description: formValues.equipmentDescription || undefined,
        },
        additional_notes: formValues.additionalNotes || undefined,
        supporting_docs_urls: uploadedFiles.map(f => f.url),
      };

      const response = await apiClient.post('/visitor-requests/submit', payload);
      
      setRequestId(response.data.request_id);
      setSubmitted(true);
      message.success('Request submitted successfully!');
    } catch (error) {
      const errorDetail = error.response?.data?.detail || error.message;
      
      // Handle validation errors
      if (error.response?.data?.detail?.errors) {
        setValidationErrors(error.response.data.detail.errors);
      }
      
      message.error(`Submission failed: ${errorDetail}`);
    } finally {
      setLoading(false);
    }
  };

  // Render success screen
  if (submitted && requestId) {
    return (
      <div className="portal-container">
        <Card className="portal-success-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '20px' }} />
            <h1>Request Submitted Successfully!</h1>
            <p style={{ fontSize: '16px', marginTop: '20px' }}>
              Your visitor pass request has been submitted for approval.
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Request ID: <strong>{requestId}</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Expected timeframe: 24-48 hours for approval
            </p>
            
            <Divider />
            
            <h3>What's Next?</h3>
            <ol style={{ textAlign: 'left', maxWidth: '400px', margin: '20px auto' }}>
              <li>Your request will be reviewed by our operations team</li>
              <li>You'll receive an email update when it's approved</li>
              <li>A pass will be generated and ready for your visitor</li>
              <li>Your visitor can use the QR code at the gate</li>
            </ol>

            <Divider />

            <h3>Track Your Request</h3>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Visit the tracking page and enter your Request ID and email to check status anytime.
            </p>
            
            <Space style={{ marginTop: '30px' }}>
              <Button type="primary" size="large" onClick={() => window.location.reload()}>
                Submit Another Request
              </Button>
              <Button type="default" size="large" href="/visitor-request/track">
                Track This Request
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <Card className="portal-card">
        <h1>Public Visitor Pass Request Portal</h1>
        <p className="portal-subtitle">
          Submit a visitor pass request without login. Track your request status at any time.
        </p>

        <Divider />

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ marginBottom: 0 }}>
                {validationErrors.map((error, idx) => (
                  <li key={idx}>
                    <strong>{error.field || error.error_type}:</strong> {error.message}
                  </li>
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const now = serverNow || dayjs();
                        if (value.isBefore(now.add(minAdvanceHours, 'hour'))) {
                          return Promise.reject(new Error(`Entry time must be at least ${minAdvanceHours} hour(s) in the future`));
                        }
                        return Promise.resolve();
                      }
                    }

        {/* Step Indicator */}
        <Steps current={currentStep} items={STEPS} style={{ marginBottom: '30px' }} />

        <Spin spinning={loading}>
          <Form form={form} layout="vertical" autoComplete="off">
            {/* ========== STEP 0: REQUESTER INFORMATION ========== */}
            {currentStep === 0 && (
              <div className="step-content">
                <h2>Your Contact Information</h2>
                <p>Please provide your contact details. This is how we'll communicate with you about your request.</p>

                <Form.Item
                  label="Full Name"
                  name="requesterName"
                  rules={[
                    { required: true, message: 'Full name is required' },
                    { min: 2, message: 'Name must be at least 2 characters' },
                  ]}
                >
                  <Input placeholder="John Doe" />
                </Form.Item>

                <Form.Item
                  label="Email Address"
                  name="requesterEmail"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Invalid email format' },
                  ]}
                >
                  <Input placeholder="john@example.com" />
                </Form.Item>

                <Form.Item
                  label="Phone Number (Optional)"
                  name="requesterPhone"
                  rules={[
                    { pattern: /^[+]?[\d\s\-\(\)]{7,15}$/, message: 'Invalid phone number' },
                  ]}
                >
                  <Input placeholder="+1 (555) 123-4567" />
                </Form.Item>

                <Space style={{ marginTop: '30px' }}>
                  <Button type="primary" size="large" onClick={() => handleNextStep(1, ['requesterName', 'requesterEmail', 'requesterPhone'])}>
                    Next
                  </Button>
                </Space>
              </div>
            )}

            {/* ========== STEP 1: VISITOR INFORMATION ========== */}
            {currentStep === 1 && (
              <div className="step-content">
                <h2>Visitor Information</h2>
                <p>Provide details about the visitor who will be entering the premises.</p>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Full Name"
                      name="visitorName"
                      rules={[
                        { required: true, message: 'Visitor name is required' },
                        { min: 2, message: 'Name must be at least 2 characters' },
                      ]}
                    >
                      <Input placeholder="Jane Smith" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Email (Optional)"
                      name="visitorEmail"
                      rules={[
                        { type: 'email', message: 'Invalid email format' },
                      ]}
                    >
                      <Input placeholder="jane@example.com" />
                    </Form.Item>
                  </Col>
                </Row>

                {serverNow && (
                  <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                    Server time: {serverNow.format('YYYY-MM-DD HH:mm')} (UTC). Requests must be submitted at least 1 hour ahead.
                  </div>
                )}

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Phone Number (Optional)"
                      name="visitorPhone"
                      rules={[
                        { pattern: /^[+]?[\d\s\-\(\)]{7,15}$/, message: 'Invalid phone number' },
                      ]}
                    >
                      <Input placeholder="+1 (555) 987-6543" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Organization (Optional)"
                      name="visitorOrganization"
                    >
                      <Input placeholder="Acme Corp" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="NIC / Passport (Optional)"
                      name="visitorNic"
                      rules={[
                        {
                          pattern: /^(\d{9}[V|X]?|[A-Z]{2}\d{6,9})$/,
                          message: 'Invalid NIC or Passport format'
                        },
                      ]}
                    >
                      <Input placeholder="123456789V or AA123456" />
                    </Form.Item>
                  </Col>
                </Row>

                <Space style={{ marginTop: '30px' }}>
                  <Button onClick={handlePrevStep}>Previous</Button>
                  <Button type="primary" size="large" onClick={() => handleNextStep(2, ['visitorName', 'visitorEmail', 'visitorPhone'])}>
                    Next
                  </Button>
                </Space>
              </div>
            )}

            {/* ========== STEP 2: VISIT DETAILS ========== */}
            {currentStep === 2 && (
              <div className="step-content">
                <h2>Visit Details</h2>
                <p>Provide information about the visit purpose and timing.</p>

                <Form.Item
                  label="Purpose of Visit"
                  name="visitPurpose"
                  rules={[
                    { required: true, message: 'Visit purpose is required' },
                    { min: 5, message: 'Please provide more details (at least 5 characters)' },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Describe the reason for the visit, what will be done, etc."
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Building / Department"
                      name="buildingDepartment"
                    >
                      <Input placeholder="e.g., Building A, Finance Department" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Host Employee Name (who they're meeting)"
                      name="hostEmployeeName"
                    >
                      <Input placeholder="John Smith" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Entry Date & Time"
                      name="entryTime"
                      rules={[
                        { required: true, message: 'Entry time is required' },
                        {
                          validator: (_, value) => {
                            if (!value) return Promise.resolve();
                            const minAdvanceHours = 1; // must match backend MIN_REQUEST_ADVANCE_HOURS
                                if (value.isBefore(dayjs().add(minAdvanceHours, 'hour'))) {
                                  return Promise.reject(new Error(`Entry time must be at least ${minAdvanceHours} hour(s) in the future`));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Exit Date & Time"
                      name="exitTime"
                      rules={[
                        { required: true, message: 'Exit time is required' },
                        {
                          validator: (_, value) => {
                            const entry = form.getFieldValue('entryTime');
                            if (!value) return Promise.resolve();
                            if (entry && !value.isAfter(entry)) {
                              return Promise.reject(new Error('Exit time must be after entry time'));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Space style={{ marginTop: '30px' }}>
                  <Button onClick={handlePrevStep}>Previous</Button>
                  <Button type="primary" size="large" onClick={() => handleNextStep(3, ['visitPurpose', 'entryTime', 'exitTime'])}>
                    Next
                  </Button>
                </Space>
              </div>
            )}

            {/* ========== STEP 3: ACCESS REQUIREMENTS ========== */}
            {currentStep === 3 && (
              <div className="step-content">
                <h2>Access Requirements</h2>
                <p>Specify which zones the visitor needs access to and whether they're bringing equipment.</p>

                <Form.Item
                  label="Required Zones"
                  name="requestedZones"
                  rules={[
                    { required: true, message: 'At least one zone must be selected' },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select zones..."
                    options={VALID_ZONES}
                  />
                </Form.Item>

                <Form.Item
                  label="Vehicle Registration Number (if applicable)"
                  name="vehicleNumber"
                >
                  <Input placeholder="e.g., ABC-1234" />
                </Form.Item>

                <Form.Item
                  name="carryingEquipment"
                  valuePropName="checked"
                >
                  <Checkbox>Visitor is bringing equipment</Checkbox>
                </Form.Item>

                <Form.Item
                  label="Equipment Description"
                  name="equipmentDescription"
                  noStyle
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Describe any equipment or tools being brought..."
                  />
                </Form.Item>

                <Space style={{ marginTop: '30px' }}>
                  <Button onClick={handlePrevStep}>Previous</Button>
                  <Button type="primary" size="large" onClick={() => handleNextStep(4, ['requestedZones'])}>
                    Next
                  </Button>
                </Space>
              </div>
            )}

            {/* ========== STEP 4: ADDITIONAL INFORMATION ========== */}
            {currentStep === 4 && (
              <div className="step-content">
                <h2>Additional Information</h2>
                <p>Upload supporting documents and add any special instructions.</p>

                <Form.Item
                  label="Supporting Documents (Optional)"
                  name="supportingDocs"
                >
                  <Upload
                    maxCount={5}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    beforeUpload={() => false}
                    onChange={(info) => {
                      // In production, upload to S3/CDN and store URLs
                      const files = info.fileList.map(f => ({
                        name: f.name,
                        url: '#', // Would be actual URL after upload
                      }));
                      setUploadedFiles(files);
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Upload Files</Button>
                  </Upload>
                </Form.Item>

                <Form.Item
                  label="Additional Notes (Optional)"
                  name="additionalNotes"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Any special instructions or information..."
                  />
                </Form.Item>

                <Space style={{ marginTop: '30px' }}>
                  <Button onClick={handlePrevStep}>Previous</Button>
                  <Button type="primary" size="large" onClick={() => handleNextStep(5, [])}>
                    Review Request
                  </Button>
                </Space>
              </div>
            )}

            {/* ========== STEP 5: REVIEW & SUBMIT ========== */}
            {currentStep === 5 && (
              <div className="step-content">
                <h2>Review Your Request</h2>
                <p>Please review all information before submitting. You cannot edit after submission.</p>

                <Card style={{ marginBottom: '20px' }}>
                  <h3>Requester Information</h3>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <p><strong>Name:</strong> {form.getFieldValue('requesterName')}</p>
                    </Col>
                    <Col xs={24} sm={12}>
                      <p><strong>Email:</strong> {form.getFieldValue('requesterEmail')}</p>
                    </Col>
                  </Row>
                  <p><strong>Phone:</strong> {form.getFieldValue('requesterPhone') || 'Not provided'}</p>
                </Card>

                <Card style={{ marginBottom: '20px' }}>
                  <h3>Visitor Information</h3>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <p><strong>Name:</strong> {form.getFieldValue('visitorName')}</p>
                    </Col>
                    <Col xs={24} sm={12}>
                      <p><strong>Organization:</strong> {form.getFieldValue('visitorOrganization') || 'Not provided'}</p>
                    </Col>
                  </Row>
                </Card>

                <Card style={{ marginBottom: '20px' }}>
                  <h3>Visit Details</h3>
                  <p><strong>Purpose:</strong> {form.getFieldValue('visitPurpose')}</p>
                  <p><strong>Entry:</strong> {form.getFieldValue('entryTime')?.format('YYYY-MM-DD HH:mm')}</p>
                  <p><strong>Exit:</strong> {form.getFieldValue('exitTime')?.format('YYYY-MM-DD HH:mm')}</p>
                </Card>

                <Card style={{ marginBottom: '20px' }}>
                  <h3>Access Requirements</h3>
                  <p>
                    <strong>Zones:</strong> {
                      form.getFieldValue('requestedZones')?.map((z) => {
                        const zone = VALID_ZONES.find(v => v.value === z);
                        return <Tag key={z}>{zone?.label}</Tag>;
                      })
                    }
                  </p>
                  {form.getFieldValue('carryingEquipment') && (
                    <p><strong>Equipment:</strong> {form.getFieldValue('equipmentDescription') || 'Yes'}</p>
                  )}
                </Card>

                <Alert
                  message="By submitting this request, you confirm that all information is accurate and complete."
                  type="info"
                  showIcon
                  style={{ marginBottom: '20px' }}
                />

                <Space style={{ marginTop: '30px' }}>
                  <Button onClick={handlePrevStep}>Previous</Button>
                  <Button type="primary" size="large" loading={loading} onClick={handleSubmit}>
                    Submit Request
                  </Button>
                </Space>
              </div>
            )}
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
