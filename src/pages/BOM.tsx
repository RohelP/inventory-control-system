import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  Select,
  message,
  Tooltip,
  Tag,
  Progress
} from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  CalculatorOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { importBOMFromExcel, calculateBOMCost, addBOM, addComponentToBOM } from '../store/slices/bomSlice';
import { BOMData, BOMComponent } from '../types';
import type { ColumnsType } from 'antd/es/table';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;

const BOM: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bomData, loading, costAnalysis } = useSelector((state: RootState) => state.bom);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOMData | null>(null);
  const [isComponentModalVisible, setIsComponentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [componentForm] = Form.useForm();

  useEffect(() => {
    // Load initial BOM data if needed
  }, [dispatch]);

  const handleImportBOM = async () => {
    try {
      await dispatch(importBOMFromExcel()).unwrap();
      message.success('BOM data imported successfully');
    } catch (error) {
      message.error('Failed to import BOM data');
    }
  };

  const handleCalculateCost = async (bom: BOMData) => {
    try {
      await dispatch(calculateBOMCost(bom)).unwrap();
      setSelectedBOM(bom);
      message.success('BOM cost calculated successfully');
    } catch (error) {
      message.error('Failed to calculate BOM cost');
    }
  };

  const handleAddBOM = async (values: any) => {
    try {
      const newBOM: BOMData = {
        productName: values.productName,
        components: [],
        totalBOMCost: 0
      };
      dispatch(addBOM(newBOM));
      setIsModalVisible(false);
      form.resetFields();
      message.success('BOM created successfully');
    } catch (error) {
      message.error('Failed to create BOM');
    }
  };

  const handleAddComponent = async (values: any) => {
    if (!selectedBOM) return;

    try {
      const component: BOMComponent = {
        name: values.name,
        quantity: values.quantity,
        unit: values.unit,
        costPerUnit: values.costPerUnit,
        totalCost: values.quantity * values.costPerUnit
      };

      dispatch(addComponentToBOM({ 
        productName: selectedBOM.productName, 
        component 
      }));

      setIsComponentModalVisible(false);
      componentForm.resetFields();
      message.success('Component added successfully');
    } catch (error) {
      message.error('Failed to add component');
    }
  };

  const bomColumns: ColumnsType<BOMData> = [
    {
      title: 'Product Name',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: 'Components',
      dataIndex: 'components',
      key: 'components',
      width: 120,
      align: 'center',
      render: (components) => (
        <Tag color="blue">{components.length} items</Tag>
      ),
    },
    {
      title: 'Total BOM Cost',
      dataIndex: 'totalBOMCost',
      key: 'totalBOMCost',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.totalBOMCost - b.totalBOMCost,
      render: (cost) => <Text strong>${cost.toFixed(2)}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Components">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => setSelectedBOM(record)}
            />
          </Tooltip>
          <Tooltip title="Calculate Cost">
            <Button 
              type="text" 
              icon={<CalculatorOutlined />} 
              onClick={() => handleCalculateCost(record)}
            />
          </Tooltip>
          <Tooltip title="Add Component">
            <Button 
              type="text" 
              icon={<PlusOutlined />} 
              onClick={() => {
                setSelectedBOM(record);
                setIsComponentModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const componentColumns: ColumnsType<BOMComponent> = [
    {
      title: 'Component Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: 'Cost/Unit',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      width: 120,
      align: 'right',
      render: (cost) => `$${cost.toFixed(2)}`,
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right',
      render: (cost) => <Text strong>${cost.toFixed(2)}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record, index) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const totalBOMValue = bomData.reduce((sum, bom) => sum + bom.totalBOMCost, 0);
  const totalComponents = bomData.reduce((sum, bom) => sum + bom.components.length, 0);
  const avgBOMCost = bomData.length > 0 ? totalBOMValue / bomData.length : 0;

  // Chart data for cost analysis
  const chartData = bomData.map(bom => ({
    name: bom.productName.length > 20 ? bom.productName.substring(0, 20) + '...' : bom.productName,
    cost: bom.totalBOMCost,
    components: bom.components.length
  }));

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Bill of Materials (BOM)</Title>
            <Text type="secondary">Manage product BOMs and calculate manufacturing costs</Text>
          </div>
          <Space>
            <Button 
              icon={<ImportOutlined />}
              onClick={handleImportBOM}
            >
              Import from Excel
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              New BOM
            </Button>
          </Space>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total BOMs" 
              value={bomData.length}
              prefix={<FileExcelOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total Components" 
              value={totalComponents}
              prefix={<PlusOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total BOM Value" 
              value={totalBOMValue}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Average BOM Cost" 
              value={avgBOMCost}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* BOM List */}
        <Col xs={24} lg={selectedBOM ? 12 : 24}>
          <Card 
            title="Bill of Materials" 
            className="custom-table"
            extra={
              <Button 
                icon={<FileExcelOutlined />} 
                onClick={handleImportBOM}
                loading={loading}
              >
                Import BOM
              </Button>
            }
          >
            <Table
              columns={bomColumns}
              dataSource={bomData}
              rowKey="productName"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} BOMs`,
              }}
              onRow={(record) => ({
                onClick: () => setSelectedBOM(record),
                style: { cursor: 'pointer' }
              })}
              rowClassName={(record) => 
                selectedBOM?.productName === record.productName ? 'ant-table-row-selected' : ''
              }
            />
          </Card>
        </Col>

        {/* BOM Details */}
        {selectedBOM && (
          <Col xs={24} lg={12}>
            <Card 
              title={`Components - ${selectedBOM.productName}`}
              extra={
                <Space>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={() => setIsComponentModalVisible(true)}
                  >
                    Add Component
                  </Button>
                  <Button 
                    icon={<CalculatorOutlined />}
                    onClick={() => handleCalculateCost(selectedBOM)}
                  >
                    Calculate Cost
                  </Button>
                </Space>
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Text strong>Total BOM Cost: </Text>
                <Text style={{ fontSize: '18px', color: '#1890ff' }}>
                  ${selectedBOM.totalBOMCost.toFixed(2)}
                </Text>
              </div>
              
              <Table
                columns={componentColumns}
                dataSource={selectedBOM.components}
                rowKey="name"
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Cost Analysis Charts */}
      {bomData.length > 0 && (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="BOM Cost Distribution" className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="cost"
                    data={chartData.slice(0, 7)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                  >
                    {chartData.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="BOM Cost Comparison" className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Legend />
                  <Bar dataKey="cost" fill="#1890ff" name="Cost ($)" />
                  <Bar dataKey="components" fill="#52c41a" name="Components" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      {/* New BOM Modal */}
      <Modal
        title="Create New BOM"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddBOM}
        >
          <Form.Item
            name="productName"
            label="Product Name"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input placeholder="e.g., Fire Damper Assembly" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create BOM
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Component Modal */}
      <Modal
        title={`Add Component to ${selectedBOM?.productName}`}
        open={isComponentModalVisible}
        onCancel={() => {
          setIsComponentModalVisible(false);
          componentForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={componentForm}
          layout="vertical"
          onFinish={handleAddComponent}
        >
          <Form.Item
            name="name"
            label="Component Name"
            rules={[{ required: true, message: 'Please enter component name' }]}
          >
            <Input placeholder="e.g., Steel Frame" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  placeholder="1"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please select unit' }]}
              >
                <Select placeholder="Select unit">
                  <Option value="pcs">Pieces</Option>
                  <Option value="kg">Kilograms</Option>
                  <Option value="m">Meters</Option>
                  <Option value="m2">Square Meters</Option>
                  <Option value="l">Liters</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="costPerUnit"
                label="Cost per Unit"
                rules={[{ required: true, message: 'Please enter cost per unit' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsComponentModalVisible(false);
                componentForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Component
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BOM;