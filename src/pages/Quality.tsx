import React from 'react';
import { Card, Typography, Row, Col, Statistic, Button, Space, Empty } from 'antd';
import {
  QrcodeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Quality: React.FC = () => {
  // Mock data - would be replaced with real data from Redux store
  const qualityStats = {
    totalChecks: 156,
    passed: 142,
    failed: 8,
    pending: 6,
    passRate: 91.0
  };

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Quality Control</Title>
            <Text type="secondary">Manage quality inspections, testing protocols, and product quality assurance</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            New Quality Check
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Total Checks" 
              value={qualityStats.totalChecks}
              prefix={<QrcodeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Passed" 
              value={qualityStats.passed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Failed" 
              value={qualityStats.failed}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic 
              title="Pending" 
              value={qualityStats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic 
              title="Pass Rate" 
              value={qualityStats.passRate}
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
          image={<QrcodeOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>Quality Control Module</Title>
              <Text type="secondary">
                This module will help you manage quality inspections, track defects,
                maintain testing protocols, and ensure consistent product quality standards.
              </Text>
              <br /><br />
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>
                  New Quality Check
                </Button>
                <Button icon={<AuditOutlined />}>
                  View Reports
                </Button>
              </Space>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default Quality;