import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Row, 
  Col, 
  Tag, 
  Tooltip, 
  Modal, 
  Form, 
  InputNumber,
  Typography,
  Statistic,
  DatePicker,
  Steps
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { loadOrders, createOrder, updateOrderStatus, setFilters } from '../store/slices/orderSlice';
import { SalesOrder, OrderStatus } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Step } = Steps;

const Orders: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { filteredOrders, loading, filters } = useSelector((state: RootState) => state.orders);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(loadOrders());
  }, [dispatch]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'processing': return 'blue';
      case 'shipped': return 'purple';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />;
      case 'processing': return <SearchOutlined />;
      case 'shipped': return <TruckOutlined />;
      case 'delivered': return <CheckCircleOutlined />;
      case 'cancelled': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await dispatch(updateOrderStatus({ orderId, status: newStatus })).unwrap();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleSearch = (value: string) => {
    dispatch(setFilters({ search: value }));
  };

  const handleStatusFilter = (status: string) => {
    dispatch(setFilters({ status: status as OrderStatus | 'all' }));
  };

  const handleDateRangeFilter = (dates: any) => {
    if (dates && dates.length === 2) {
      dispatch(setFilters({ 
        dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] 
      }));
    } else {
      dispatch(setFilters({ dateRange: undefined }));
    }
  };

  const viewOrderDetails = (order: SalesOrder) => {
    setViewingOrder(order);
  };

  const getOrderProgress = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const columns: ColumnsType<SalesOrder> = [
    {
      title: 'Order Number',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 150,
      fixed: 'left',
      render: (orderNumber) => <Text strong>{orderNumber}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: OrderStatus) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 120,
      sorter: (a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime(),
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Delivery Date',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      width: 120,
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (amount) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 200,
      render: (_, record) => {
        const progress = getOrderProgress(record.status);
        if (progress === -1) {
          return <Text type="danger">Cancelled</Text>;
        }
        
        return (
          <Steps
            size="small"
            current={progress}
            items={[
              { title: 'Pending' },
              { title: 'Processing' },
              { title: 'Shipped' },
              { title: 'Delivered' }
            ]}
          />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => viewOrderDetails(record)}
            />
          </Tooltip>
          <Select
            size="small"
            value={record.status}
            onChange={(value) => handleStatusUpdate(record.id, value)}
            style={{ width: 100 }}
          >
            <Option value="pending">Pending</Option>
            <Option value="processing">Processing</Option>
            <Option value="shipped">Shipped</Option>
            <Option value="delivered">Delivered</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </Space>
      ),
    },
  ];

  const statusCounts = {
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    processing: filteredOrders.filter(o => o.status === 'processing').length,
    shipped: filteredOrders.filter(o => o.status === 'shipped').length,
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = filteredOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Sales Orders</Title>
            <Text type="secondary">Manage customer orders and track order fulfillment</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            New Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Total Orders" 
              value={filteredOrders.length}
              prefix={<SearchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Pending" 
              value={statusCounts.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Processing" 
              value={statusCounts.processing}
              prefix={<SearchOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Shipped" 
              value={statusCounts.shipped}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Delivered" 
              value={statusCounts.delivered}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Total Revenue" 
              value={totalRevenue}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Search
              placeholder="Search orders..."
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status || 'all'}
              onChange={handleStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeFilter}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} md={6}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<ReloadOutlined />} onClick={() => dispatch(loadOrders())}>
                Refresh
              </Button>
              <Button icon={<ExportOutlined />}>
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="custom-table">
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300, y: 600 }}
          pagination={{
            total: filteredOrders.length,
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} orders`,
          }}
        />
      </Card>

      {/* Order Details Modal */}
      <Modal
        title={viewingOrder ? `Order ${viewingOrder.order_number}` : 'Order Details'}
        open={!!viewingOrder}
        onCancel={() => setViewingOrder(null)}
        footer={[
          <Button key="close" onClick={() => setViewingOrder(null)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {viewingOrder && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card size="small" title="Customer Information">
                  <p><strong>Name:</strong> {viewingOrder.customer_name}</p>
                  <p><strong>Email:</strong> {viewingOrder.customer_email || 'N/A'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Order Information">
                  <p><strong>Order Date:</strong> {dayjs(viewingOrder.order_date).format('MMMM DD, YYYY')}</p>
                  <p><strong>Delivery Date:</strong> {viewingOrder.delivery_date ? dayjs(viewingOrder.delivery_date).format('MMMM DD, YYYY') : 'Not set'}</p>
                  <p><strong>Total Amount:</strong> ${viewingOrder.total_amount.toFixed(2)}</p>
                </Card>
              </Col>
            </Row>
            
            <Card size="small" title="Order Status">
              <Steps
                current={getOrderProgress(viewingOrder.status)}
                items={[
                  { title: 'Order Placed', description: 'Order received and pending' },
                  { title: 'Processing', description: 'Order is being processed' },
                  { title: 'Shipped', description: 'Order has been shipped' },
                  { title: 'Delivered', description: 'Order delivered successfully' }
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* New Order Modal */}
      <Modal
        title="Create New Order"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              const orderData = {
                ...values,
                order_date: values.order_date.format('YYYY-MM-DD'),
                delivery_date: values.delivery_date?.format('YYYY-MM-DD'),
                items: [] // Would be populated with order items
              };
              await dispatch(createOrder(orderData)).unwrap();
              setIsModalVisible(false);
              form.resetFields();
            } catch (error) {
              console.error('Failed to create order:', error);
            }
          }}
        >
          <Form.Item
            name="order_number"
            label="Order Number"
            rules={[{ required: true, message: 'Please enter order number' }]}
          >
            <Input placeholder="e.g., ORD-001" />
          </Form.Item>

          <Form.Item
            name="customer_name"
            label="Customer Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input placeholder="Customer name" />
          </Form.Item>

          <Form.Item
            name="customer_email"
            label="Customer Email"
            rules={[{ type: 'email', message: 'Please enter valid email' }]}
          >
            <Input placeholder="customer@example.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="order_date"
                label="Order Date"
                rules={[{ required: true, message: 'Please select order date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="delivery_date"
                label="Delivery Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">Pending</Option>
                  <Option value="processing">Processing</Option>
                  <Option value="shipped">Shipped</Option>
                  <Option value="delivered">Delivered</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="total_amount"
                label="Total Amount"
                rules={[{ required: true, message: 'Please enter total amount' }]}
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
                setIsModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Order
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;