import React from 'react';
import { Card, Typography, Row, Col, Statistic, Button, Space, Empty } from 'antd';
import {
  BuildOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Production: React.FC = () => {
  // Mock data - would be replaced with real data from Redux store
  const productionStats = {
    totalOrders: 42,
    scheduled: 15,
    inProgress: 8,
    completed: 18,
    cancelled: 1,
    efficiency: 87.5
  };

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Production Management</Title>
            <Text type="secondary">Schedule and track manufacturing processes, monitor production efficiency</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            New Production Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Total Orders" 
              value={productionStats.totalOrders}
              prefix={<BuildOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Scheduled" 
              value={productionStats.scheduled}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="In Progress" 
              value={productionStats.inProgress}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Completed" 
              value={productionStats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Cancelled" 
              value={productionStats.cancelled}
              prefix={<PauseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Efficiency" 
              value={productionStats.efficiency}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Content */}
      <Card>
        <Empty
          image={<BuildOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>Production Management Module</Title>
              <Text type="secondary">
                This module will help you schedule production runs, track manufacturing progress,
                monitor equipment utilization, and optimize production efficiency.
              </Text>
              <br /><br />
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>
                  New Production Order
                </Button>
                <Button icon={<PlayCircleOutlined />}>
                  View Schedule
                </Button>
              </Space>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default Production;