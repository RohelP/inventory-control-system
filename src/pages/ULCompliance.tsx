import React from 'react';
import { Card, Typography, Row, Col, Statistic, Tag, Button, Space, Empty } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ULCompliance: React.FC = () => {
  // Mock data - would be replaced with real data from Redux store
  const complianceStats = {
    totalProducts: 45,
    compliant: 38,
    nonCompliant: 3,
    pending: 4,
    expired: 0
  };

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>UL Compliance Management</Title>
            <Text type="secondary">Track and manage UL certification compliance for fire damper products</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            Add Compliance Record
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total Products" 
              value={complianceStats.totalProducts}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Compliant" 
              value={complianceStats.compliant}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Non-Compliant" 
              value={complianceStats.nonCompliant}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Pending Review" 
              value={complianceStats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Content */}
      <Card>
        <Empty
          image={<SafetyCertificateOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>UL Compliance Module</Title>
              <Text type="secondary">
                This module will help you track UL certifications, manage compliance documentation,
                and ensure all fire damper products meet safety standards.
              </Text>
              <br /><br />
              <Space>
                <Button type="primary" icon={<FileTextOutlined />}>
                  View Documentation
                </Button>
                <Button icon={<PlusOutlined />}>
                  Add Compliance Record
                </Button>
              </Space>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default ULCompliance;