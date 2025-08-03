import React, { useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag, Button, Spin, Empty, Space } from 'antd';
import {
  ShoppingCartOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { loadDashboardData } from '../store/slices/dashboardSlice';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, chartData, lineChartData, loading } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(loadDashboardData());
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      dispatch(loadDashboardData());
    }, 300000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const quickActions = [
    { title: 'New Order', icon: <ShoppingCartOutlined />, color: '#1890ff' },
    { title: 'BOM Management', icon: <InboxOutlined />, color: '#52c41a' },
    { title: 'UL Compliance', icon: <CheckCircleOutlined />, color: '#fa8c16' },
    { title: 'Production', icon: <RiseOutlined />, color: '#722ed1' },
  ];

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '64px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Inventory Control Dashboard
        </Title>
        <Text type="secondary">
          Real-time inventory management and order tracking
        </Text>
      </div>

      {/* Key Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats?.totalProducts || 0}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats?.totalOrders || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={stats?.lowStockItems || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Reorder Required"
              value={stats?.reorderRequired || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Inventory Value"
              value={stats?.totalInventoryValue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats?.pendingOrders || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Completed Orders"
              value={stats?.completedOrders || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={6} key={action.title}>
              <Button
                type="default"
                icon={action.icon}
                style={{
                  width: '100%',
                  height: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: action.color,
                  color: action.color
                }}
              >
                <span style={{ marginTop: 8, fontSize: 12 }}>{action.title}</span>
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Activity" 
            extra={<Text type="secondary">Latest system activity</Text>}
          >
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <List
                dataSource={stats.recentActivity}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.title}</span>
                          {item.status && (
                            <Tag color={getActivityStatusColor(item.status)}>
                              {item.status}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary">{item.description}</Text>
                          <Text type="secondary">• {new Date(item.timestamp).toLocaleString()}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No recent activity" />
            )}
          </Card>
        </Col>

        {/* Category Distribution Chart */}
        <Col xs={24} lg={12}>
          <Card title="Inventory by Category">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || `#${Math.floor(Math.random()*16777215).toString(16)}`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No chart data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      {lineChartData && lineChartData.length > 0 && (
        <Card title="Inventory Trends" style={{ marginTop: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="orders" stroke="#1890ff" />
              <Line type="monotone" dataKey="revenue" stroke="#52c41a" />
              <Line type="monotone" dataKey="inventory" stroke="#fa8c16" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;