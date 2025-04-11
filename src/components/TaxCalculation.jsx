import React, { useState, useEffect } from 'react';
import { 
  Form, 
  DatePicker, 
  InputNumber, 
  Select, 
  Button, 
  Table, 
  message, 
  Card, 
  Row, 
  Col,
  Typography,
  Popconfirm,
  Spin,
  Alert,
  Tabs,
  Statistic
} from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

// API base URL
const API_URL = 'https://tax-calculator-backend-skph.onrender.com/api/tax';

// Create a custom axios instance that doesn't log errors to console
const silentAxios = axios.create();

// Override the console error for axios
const originalConsoleError = console.error;
console.error = function(message, ...args) {
  if (typeof message === 'string' && 
      (message.includes('https://tax-calculator-backend-skph.onrender.com/api/tax') || 
       message.startsWith('Error calculating tax'))) {
    // Suppress these specific errors
    return;
  }
  originalConsoleError.apply(console, [message, ...args]);
};

const TaxCalculationPage = () => {
  const [form] = Form.useForm();
  const [taxRecords, setTaxRecords] = useState([]);
  const [aggregatedRecords, setAggregatedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('1');

  // Fetch all tax records when component mounts
  useEffect(() => {
    fetchTaxRecords();
    
    // Restore original console.error when component unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Function to fetch all tax records
  const fetchTaxRecords = async () => {
    setFetchLoading(true);
    setErrorMessage('');
    try {
      const response = await silentAxios.get(API_URL);
      if (response.data.success) {
        // Transform dates for display
        const formattedRecords = response.data.data.map(record => ({
          ...record,
          key: record._id,
          fromDate: dayjs(record.fromDate).format('YYYY-MM-DD'),
          toDate: dayjs(record.toDate).format('YYYY-MM-DD'),
          fromValue: Number(record.fromValue).toFixed(2),
          toValue: Number(record.toValue).toFixed(2),
          taxRate: Number(record.taxRate).toFixed(2),
          taxAmount: Number(record.taxAmount).toFixed(2)
        }));
        
        setTaxRecords(formattedRecords);
        
        // Aggregate records by date
        aggregateRecordsByDate(formattedRecords);
      }
    } catch (error) {
      setErrorMessage('Failed to fetch tax records. Please try again later.');
    } finally {
      setFetchLoading(false);
    }
  };

  // Function to aggregate records by date
  const aggregateRecordsByDate = (records) => {
    // Create a map to store aggregated data by date
    const dateMap = new Map();
    
    records.forEach(record => {
      // Use fromDate as the key for aggregation
      const dateKey = record.fromDate;
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          totalTaxAmount: 0,
          totalFromValue: 0,
          totalToValue: 0,
          records: [],
          taxTypes: {
            CGST: 0,
            SGST: 0,
            IGST: 0
          }
        });
      }
      
      const dateData = dateMap.get(dateKey);
      dateData.totalTaxAmount += Number(record.taxAmount);
      dateData.totalFromValue += Number(record.fromValue);
      dateData.totalToValue += Number(record.toValue);
      dateData.records.push(record);
      
      // Aggregate by tax type
      if (record.taxType) {
        dateData.taxTypes[record.taxType] += Number(record.taxAmount);
      }
    });
    
    // Convert map to array and sort by date
    const aggregated = Array.from(dateMap.values())
      .map(item => ({
        ...item,
        key: item.date,
        totalTaxAmount: item.totalTaxAmount.toFixed(2),
        totalFromValue: item.totalFromValue.toFixed(2),
        totalToValue: item.totalToValue.toFixed(2),
        taxTypes: {
          CGST: item.taxTypes.CGST.toFixed(2),
          SGST: item.taxTypes.SGST.toFixed(2),
          IGST: item.taxTypes.IGST.toFixed(2)
        },
        recordCount: item.records.length
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setAggregatedRecords(aggregated);
  };

  const calculateTax = async (values) => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Format the data for the API
      const payload = {
        fromDate: values.dateRange[0].format('YYYY-MM-DD'),
        toDate: values.dateRange[1].format('YYYY-MM-DD'),
        fromValue: values.fromValue,
        toValue: values.toValue,
        taxType: values.taxType,
        taxRate: values.taxRate
      };
      
      // Send the data to the API without logging errors
      const response = await silentAxios.post(API_URL, payload).catch(error => {
        // Catch the error here to prevent it from being logged
        throw error;
      });
      
      if (response && response.data.success) {
        messageApi.success('Tax calculation added successfully!');
        form.resetFields();
        fetchTaxRecords(); // Refresh the list
      }
    } catch (error) {
      let errorMsg = 'Failed to calculate tax. Please try again.';
      
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMsg = 'Invalid data submitted. Please check your inputs.';
        }
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setErrorMessage('');
    try {
      const response = await silentAxios.delete(`${API_URL}/${id}`);
      if (response.data.success) {
        messageApi.success('Tax calculation deleted successfully!');
        fetchTaxRecords(); // Refresh the list
      }
    } catch (error) {
      setErrorMessage('Failed to delete tax calculation. Please try again.');
    }
  };

  // Function to handle switching to individual records tab
  const switchToIndividualTab = () => {
    setActiveTab('1');
  };

  const detailColumns = [
    {
      title: 'From Date',
      dataIndex: 'fromDate',
      key: 'fromDate',
    },
    {
      title: 'To Date',
      dataIndex: 'toDate',
      key: 'toDate',
    },
    {
      title: 'From Value',
      dataIndex: 'fromValue',
      key: 'fromValue',
    },
    {
      title: 'To Value',
      dataIndex: 'toValue',
      key: 'toValue',
    },
    {
      title: 'Tax Type',
      dataIndex: 'taxType',
      key: 'taxType',
    },
    {
      title: 'Tax Rate (%)',
      dataIndex: 'taxRate',
      key: 'taxRate',
    },
    {
      title: 'Tax Amount',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this tax calculation?"
          description="Are you sure you want to delete this tax calculation?"
          onConfirm={() => handleDelete(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger type="link">Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const aggregatedColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Number of Records',
      dataIndex: 'recordCount',
      key: 'recordCount',
    },
    {
      title: 'Total From Value',
      dataIndex: 'totalFromValue',
      key: 'totalFromValue',
    },
    {
      title: 'Total To Value',
      dataIndex: 'totalToValue',
      key: 'totalToValue',
    },
    {
      title: 'CGST Amount',
      dataIndex: ['taxTypes', 'CGST'],
      key: 'cgstAmount',
    },
    {
      title: 'SGST Amount',
      dataIndex: ['taxTypes', 'SGST'],
      key: 'sgstAmount',
    },
    {
      title: 'IGST Amount',
      dataIndex: ['taxTypes', 'IGST'],
      key: 'igstAmount',
    },
    {
      title: 'Total Tax Amount',
      dataIndex: 'totalTaxAmount',
      key: 'totalTaxAmount',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Details',
      key: 'details',
      render: (_, record) => (
        // Fix: Use a link that doesn't get hidden by aria-hidden
        <a 
          onClick={(e) => {
            e.preventDefault();
            switchToIndividualTab();
            // Could add filtering by date here if needed
          }}
        >
          View Details
        </a>
      ),
    },
  ];

  // Expandable row configuration for aggregated view
  const expandedRowRender = (record) => {
    return (
      <Card title={`Details for ${record.date}`}>
        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col span={8}>
            <Statistic title="CGST Amount" value={record.taxTypes.CGST} prefix="₹" />
          </Col>
          <Col span={8}>
            <Statistic title="SGST Amount" value={record.taxTypes.SGST} prefix="₹" />
          </Col>
          <Col span={8}>
            <Statistic title="IGST Amount" value={record.taxTypes.IGST} prefix="₹" />
          </Col>
        </Row>
        <Table 
          columns={detailColumns.filter(col => col.key !== 'actions')} 
          dataSource={record.records} 
          pagination={false}
          rowKey="_id"
        />
      </Card>
    );
  };

  // Define tab items for the new Tabs API
  const tabItems = [
    {
      key: '1',
      label: 'Individual Records',
      children: fetchLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={detailColumns}
          dataSource={taxRecords}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )
    },
    {
      key: '2',
      label: 'Aggregated by Date',
      children: fetchLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={aggregatedColumns}
          dataSource={aggregatedRecords}
          rowKey="date"
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender,
            expandRowByClick: true
          }}
          scroll={{ x: 'max-content' }}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {contextHolder}
      <Title level={2}>Tax Calculation</Title>
      {errorMessage && (
        <Alert
          message="Error"
          description={errorMessage}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMessage('')}
          style={{ marginBottom: '20px' }}
        />
      )}
      
      <Card style={{ marginBottom: '20px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={calculateTax}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="dateRange"
                label="Date Range"
                rules={[{ required: true, message: 'Please select date range!' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="fromValue"
                label="From Value"
                rules={[
                  { required: true, message: 'Please enter from value!' },
                  { type: 'number', message: 'Must be a number!' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.01}
                  precision={2}
                  placeholder="From Value"
                />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="toValue"
                label="To Value"
                rules={[
                  { required: true, message: 'Please enter to value!' },
                  { type: 'number', message: 'Must be a number!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || !getFieldValue('fromValue')) {
                        return Promise.resolve();
                      }
                      if (value <= getFieldValue('fromValue')) {
                        return Promise.reject(new Error('To value must be greater than From value!'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.01}
                  precision={2}
                  placeholder="To Value"
                />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="taxType"
                label="Tax Type"
                rules={[{ required: true, message: 'Please select tax type!' }]}
              >
                <Select placeholder="Select tax type">
                  <Option value="CGST">CGST</Option>
                  <Option value="SGST">SGST</Option>
                  <Option value="IGST">IGST</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item
                name="taxRate"
                label="Tax Rate (%)"
                rules={[
                  { required: true, message: 'Please enter tax rate!' },
                  { type: 'number', min: 0, max: 100, message: 'Tax rate must be between 0 and 100!' }
                ]}
                initialValue={18}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="Enter tax rate"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Calculate Tax
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <Card>
        {/* Updated Tabs component using items prop instead of TabPane */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          destroyInactiveTabPane={true} // This helps with accessibility by removing hidden content
        />
      </Card>
      
      {/* Summary Statistics Card */}
      <Card title="GST Summary" style={{ marginTop: '20px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Records"
              value={taxRecords.length}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total CGST"
              value={
                taxRecords
                  .filter(record => record.taxType === 'CGST')
                  .reduce((sum, record) => sum + Number(record.taxAmount), 0)
                  .toFixed(2)
              }
              prefix="₹"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total SGST"
              value={
                taxRecords
                  .filter(record => record.taxType === 'SGST')
                  .reduce((sum, record) => sum + Number(record.taxAmount), 0)
                  .toFixed(2)
              }
              prefix="₹"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total IGST"
              value={
                taxRecords
                  .filter(record => record.taxType === 'IGST')
                  .reduce((sum, record) => sum + Number(record.taxAmount), 0)
                  .toFixed(2)
              }
              prefix="₹"
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: '20px' }}>
          <Col span={24}>
            <Statistic
              title="Total Tax Amount"
              value={
                taxRecords
                  .reduce((sum, record) => sum + Number(record.taxAmount), 0)
                  .toFixed(2)
              }
              prefix="₹"
              valueStyle={{ color: '#3f8600', fontSize: '24px' }}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TaxCalculationPage;
