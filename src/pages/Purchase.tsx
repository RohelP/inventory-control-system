import React from 'react';
import { Card, Typography, Row, Col, Statistic, Button, Space, Empty } from 'antd';
import {
  ShoppingOutlined,
  DollarOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Purchase: React.FC = () => {
  // Mock data - would be replaced with real data from Redux store
  const purchaseStats = {
    totalOrders: 25,
    pendingOrders: 8,
    approvedOrders: 15,
    deliveredOrders: 2,
    totalValue: 45670.50
  };

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Purchase Management</Title>
            <Text type="secondary">Manage purchase orders, supplier relationships, and procurement processes</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Total POs" 
              value={purchaseStats.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Pending" 
              value={purchaseStats.pendingOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Approved" 
              value={purchaseStats.approvedOrders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Delivered" 
              value={purchaseStats.deliveredOrders}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Total Value" 
              value={purchaseStats.totalValue}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Content */}
      <Card>
        <Empty
          image={<ShoppingOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>Purchase Management Module</Title>
              <Text type="secondary">
                This module will help you create and manage purchase orders, track supplier deliveries,
                manage inventory replenishment, and maintain supplier relationships.
              </Text>
              <br /><br />
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>
                  Create Purchase Order
                </Button>
                <Button icon={<TruckOutlined />}>
                  Track Deliveries
                </Button>
              </Space>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default Purchase;