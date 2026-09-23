import React, { useState } from 'react';
import { Form, Input, Button, Table, Card, Select, Space, Typography, Steps, message, Divider, Result } from 'antd';
import { TeamOutlined, UserAddOutlined, SolutionOutlined } from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

// Zone options matching backend Zone enum
const ZONE_OPTIONS = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];

// Pass type options matching backend PassType enum
const PASS_TYPE_OPTIONS = [
  { value: 'blue', label: 'Blue (Zone 1)' },
  { value: 'red', label: 'Red (Zone 2)' },
  { value: 'orange', label: 'Orange (Zone 3)' },
  { value: 'green', label: 'Green (Zone 4)' },
  { value: 'purple', label: 'Purple (All Zones)' },
];

const GroupPassPage = ({ embedded = false }) => {
  const [current, setCurrent] = useState(0);
  const [visitors, setVisitors] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [createdGroupId, setCreatedGroupId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [visitorForm] = Form.useForm();

  const handleGroupInfoSubmit = (values) => {
    setGroupInfo(values);
    setCurrent(1);
  };

  const addVisitor = (values) => {
    setVisitors([...visitors, { ...values, key: Date.now() }]);
    visitorForm.resetFields();
    message.success(`${values.name} added to group`);
  };

  const removeVisitor = (key) => {
    setVisitors(visitors.filter(v => v.key !== key));
  };

  const handleFinalSubmit = async () => {
    if (visitors.length === 0) {
      message.warning('Please add at least one visitor');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Create group
      const groupResponse = await api.post('/api/pass-groups', {
        company_name: groupInfo.company_name,
        requested_by: groupInfo.requested_by,
        pass_type: groupInfo.pass_type,
        zone: groupInfo.zone || null,
        num_visitors: visitors.length,
        notes: groupInfo.notes || null,
      });

      const groupId = groupResponse.data.id;
      setCreatedGroupId(groupId);

      // Step 2: Add visitors — backend expects { visitors: [...] }
      await api.post(`/api/pass-groups/${groupId}/visitors`, {
        visitors: visitors.map(v => ({
          visitor_name: v.name,
          nic_number: v.nic,
          contact_number: v.phone || '0712345678',
        }))
      });

      message.success('Group pass created successfully');
      setCurrent(2);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const msgs = detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(', ');
        message.error(`Validation error: ${msgs}`);
      } else {
        message.error(typeof detail === 'string' ? detail : 'Failed to create group pass. Please check all fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  const visitorColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'NIC/Passport', dataIndex: 'nic', key: 'nic' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v || '-' },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => <Button type="link" danger onClick={() => removeVisitor(record.key)}>Remove</Button>
    },
  ];

  const handleReset = () => {
    setVisitors([]);
    setGroupInfo(null);
    setCreatedGroupId(null);
    setCurrent(0);
    form.resetFields();
    visitorForm.resetFields();
  };

  return (
    <div className="fade-in" style={embedded ? {} : { maxWidth: 1000, margin: '0 auto' }}>
      {!embedded && <Title level={3} className="section-title">Issue Group Pass</Title>}
      <Steps current={current} style={{ marginBottom: 40 }}>
        <Step title="Group Info" icon={<TeamOutlined />} />
        <Step title="Add Visitors" icon={<UserAddOutlined />} />
        <Step title="Confirmation" icon={<SolutionOutlined />} />
      </Steps>

      {current === 0 && (
        <Card title={<span style={{ color: '#1a3c6e', fontWeight: 600 }}>Step 1: Company & Access Info</span>}>
          <Form form={form} layout="vertical" onFinish={handleGroupInfoSubmit}>
            <Form.Item name="company_name" label="Company Name" rules={[{ required: true, min: 2 }]}>
              <Input placeholder="Acme Construction Ltd." />
            </Form.Item>
            <Form.Item name="requested_by" label="Responsible Person (Supervisor)" rules={[{ required: true, min: 2 }]}>
              <Input placeholder="Site Supervisor Name" />
            </Form.Item>
            <Form.Item name="pass_type" label="Pass Type" rules={[{ required: true }]}>
              <Select placeholder="Select pass type">
                {PASS_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.pass_type !== curr.pass_type}
            >

              {/* getFieldValue }) =>
                getFieldValue('pass_type') !== 'purple' ? (
                  <Form.Item name="zone" label="Designated Zone" rules={[{ required: true }]}>
                    <Select placeholder="Select zone">
                      {ZONE_OPTIONS.map(z => <Option key={z} value={z}>{z}</Option>)}
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item name="zone" label="Designated Zone">
                    <Input value="All Zones" disabled placeholder="Purple pass covers all zones" />
                  </Form.Item>
                )
              }*/}
              
            </Form.Item>
            <Form.Item name="notes" label="Additional Notes">
              <Input.TextArea rows={3} placeholder="Any special instructions..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">Next: Add Visitors →</Button>
          </Form>
        </Card>
      )}

      {current === 1 && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card title={<span style={{ color: '#1a3c6e', fontWeight: 600 }}>Step 2: Add Visitor Details</span>}>
            <Form form={visitorForm} layout="vertical" onFinish={addVisitor} style={{ marginBottom: 20 }}>
              <Space style={{ width: '100%', alignItems: 'flex-start' }} wrap>
                <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Name required' }]} style={{ flex: 1, minWidth: 200 }}>
                  <Input placeholder="Visitor full name" />
                </Form.Item>
                <Form.Item name="nic" label="NIC / Passport" rules={[{ required: true, message: 'NIC required' }]} style={{ flex: 1, minWidth: 180 }}>
                  <Input placeholder="123456789V or 200012345678" />
                </Form.Item>
                <Form.Item name="phone" label="Phone (optional)" style={{ flex: 1, minWidth: 160 }}>
                  <Input placeholder="0712345678" />
                </Form.Item>
                <Form.Item label=" " style={{ marginTop: 0 }}>
                  <Button type="dashed" htmlType="submit" icon={<UserAddOutlined />}>Add to List</Button>
                </Form.Item>
              </Space>
            </Form>

            {visitors.length > 0 && (
              <Table
                columns={visitorColumns}
                dataSource={visitors}
                pagination={false}
                size="small"
                style={{ marginBottom: 16 }}
              />
            )}

            {visitors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999', background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
                No visitors added yet. Use the form above to add visitors.
              </div>
            )}

            <Divider />
            <div style={{ display: 'flex', gap: 16 }}>
              <Button onClick={() => setCurrent(0)} block>← Back</Button>
              <Button
                type="primary"
                onClick={handleFinalSubmit}
                block
                loading={loading}
                disabled={visitors.length === 0}
              >
                Create Group Pass ({visitors.length} Visitor{visitors.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </Card>
        </Space>
      )}

      {current === 2 && (
        <Result
          status="success"
          title="Group Pass Issued Successfully!"
          subTitle={`Group ID: ${createdGroupId ? `GRP-${createdGroupId}` : 'N/A'} — All ${visitors.length} visitor(s) have been registered. They can now proceed to the designated zone.`}
          extra={[
            <Button type="primary" key="new" onClick={handleReset}>
              Issue Another Group Pass
            </Button>,
          ]}
        />
      )}
    </div>
  );
};

export default GroupPassPage;
