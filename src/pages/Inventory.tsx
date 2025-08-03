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
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { loadProducts, createProduct, updateProduct, deleteProduct, setFilters } from '../store/slices/productSlice';
import { Product, CreateProductData } from '../types';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { confirm } = Modal;

const Inventory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { filteredProducts, loading, filters } = useSelector((state: RootState) => state.products);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(loadProducts());
  }, [dispatch]);

  const handleCreateProduct = async (values: CreateProductData) => {
    try {
      await dispatch(createProduct(values)).unwrap();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleUpdateProduct = async (values: Partial<Product>) => {
    if (!editingProduct) return;
    
    try {
      await dispatch(updateProduct({ id: editingProduct.id, updates: values })).unwrap();
      setIsModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    confirm({
      title: 'Delete Product',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await dispatch(deleteProduct(product.id)).unwrap();
        } catch (error) {
          console.error('Failed to delete product:', error);
        }
      },
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setIsModalVisible(true);
  };

  const handleSearch = (value: string) => {
    dispatch(setFilters({ search: value }));
  };

  const handleCategoryFilter = (category: string) => {
    dispatch(setFilters({ category: category === 'all' ? undefined : category }));
  };

  const handleStockStatusFilter = (status: string) => {
    dispatch(setFilters({ stockStatus: status as any }));
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock <= 0) {
      return { text: 'Out of Stock', color: 'error' };
    } else if (product.current_stock <= product.minimum_stock) {
      return { text: 'Low Stock', color: 'warning' };
    } else if (product.current_stock <= product.reorder_level) {
      return { text: 'Reorder Required', color: 'processing' };
    } else {
      return { text: 'In Stock', color: 'success' };
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      fixed: 'left',
      render: (sku) => <Text strong>{sku}</Text>,
    },
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.current_stock - b.current_stock,
      render: (stock, record) => {
        const status = getStockStatus(record);
        return (
          <Space>
            <Text strong>{stock}</Text>
            <Text type="secondary">{record.unit}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Min Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
      width: 100,
      align: 'right',
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorder_level',
      key: 'reorder_level',
      width: 120,
      align: 'right',
    },
    {
      title: 'Cost Price',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      align: 'right',
      render: (price) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 120,
      align: 'right',
      render: (price) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Stock Value',
      key: 'stock_value',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const value = record.current_stock * record.cost_price;
        return `$${value.toFixed(2)}`;
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_, record) => {
        const status = getStockStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteProduct(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const lowStockCount = filteredProducts.filter(p => p.current_stock <= p.minimum_stock).length;
  const reorderCount = filteredProducts.filter(p => p.current_stock <= p.reorder_level).length;
  const totalValue = filteredProducts.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0);

  const categories = [...new Set(filteredProducts.map(p => p.category))];

  return (
    <div className="fade-in" style={{ padding: '64px 0 0 0' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Inventory Management</Title>
            <Text type="secondary">Manage your product inventory, stock levels, and reorder points</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total Products" 
              value={filteredProducts.length}
              prefix={<SearchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Low Stock Items" 
              value={lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: lowStockCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Reorder Required" 
              value={reorderCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: reorderCount > 0 ? '#fa8c16' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="Total Inventory Value" 
              value={totalValue}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {lowStockCount > 0 && (
        <Alert
          message={`${lowStockCount} products are running low on stock`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => handleStockStatusFilter('low_stock')}>
              View Low Stock Items
            </Button>
          }
        />
      )}

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Search
              placeholder="Search products..."
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Category"
              style={{ width: '100%' }}
              value={filters.category || 'all'}
              onChange={handleCategoryFilter}
            >
              <Option value="all">All Categories</Option>
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Stock Status"
              style={{ width: '100%' }}
              value={filters.stockStatus || 'all'}
              onChange={handleStockStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="in_stock">In Stock</Option>
              <Option value="low_stock">Low Stock</Option>
              <Option value="out_of_stock">Out of Stock</Option>
              <Option value="reorder_required">Reorder Required</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<ReloadOutlined />} onClick={() => dispatch(loadProducts())}>
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
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500, y: 600 }}
          pagination={{
            total: filteredProducts.length,
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} products`,
          }}
          rowClassName={(record) => {
            const status = getStockStatus(record);
            return status.color === 'error' ? 'low-stock-row' : '';
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingProduct ? handleUpdateProduct : handleCreateProduct}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true, message: 'Please enter SKU' }]}
              >
                <Input placeholder="e.g., FD-STD-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input placeholder="e.g., Standard Fire Damper" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Product description..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please enter category' }]}
              >
                <Input placeholder="e.g., Fire Dampers" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please enter unit' }]}
              >
                <Input placeholder="e.g., pcs, kg, m" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cost_price"
                label="Cost Price"
                rules={[{ required: true, message: 'Please enter cost price' }]}
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
            <Col span={12}>
              <Form.Item
                name="selling_price"
                label="Selling Price"
                rules={[{ required: true, message: 'Please enter selling price' }]}
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

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="current_stock"
                label="Current Stock"
                rules={[{ required: true, message: 'Please enter current stock' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minimum_stock"
                label="Minimum Stock"
                rules={[{ required: true, message: 'Please enter minimum stock' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="reorder_level"
                label="Reorder Level"
                rules={[{ required: true, message: 'Please enter reorder level' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reorder_quantity"
                label="Reorder Quantity"
                rules={[{ required: true, message: 'Please enter reorder quantity' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Location"
              >
                <Input placeholder="e.g., Warehouse A-1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingProduct(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;