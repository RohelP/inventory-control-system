import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin, message } from 'antd';
import { useDispatch } from 'react-redux';
import { AppDispatch } from './store/store';
import { loadProducts } from './store/slices/productSlice';
import { loadOrders } from './store/slices/orderSlice';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import BOM from './pages/BOM';
import ULCompliance from './pages/ULCompliance';
import Purchase from './pages/Purchase';
import Quality from './pages/Quality';
import Production from './pages/Production';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Initialize the application
    const initializeApp = async () => {
      try {
        // Load initial data
        await Promise.all([
          dispatch(loadProducts()),
          dispatch(loadOrders())
        ]);

        // Set up menu action listeners
        if (window.electronAPI) {
          window.electronAPI.onMenuAction((action: string) => {
            switch (action) {
              case 'import-bom':
                handleImportBOM();
                break;
              case 'export-report':
                handleExportReport();
                break;
            }
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        message.error('Failed to initialize application');
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu:import-bom');
        window.electronAPI.removeAllListeners('menu:export-report');
      }
    };
  }, [dispatch]);

  const handleImportBOM = async () => {
    try {
      const bomData = await window.electronAPI.excel.importBOM();
      if (bomData) {
        message.success('BOM data imported successfully');
        // Handle the imported BOM data
        console.log('Imported BOM data:', bomData);
      }
    } catch (error) {
      console.error('Error importing BOM:', error);
      message.error('Failed to import BOM data');
    }
  };

  const handleExportReport = async () => {
    try {
      const success = await window.electronAPI.excel.exportInventoryReport();
      if (success) {
        message.success('Inventory report exported successfully');
      } else {
        message.error('Failed to export inventory report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      message.error('Failed to export inventory report');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>Loading Inventory Control System...</p>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header 
          collapsed={collapsed} 
          onToggle={() => setCollapsed(!collapsed)} 
        />
        <Content className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/bom" element={<BOM />} />
            <Route path="/ul-compliance" element={<ULCompliance />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/quality" element={<Quality />} />
            <Route path="/production" element={<Production />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;