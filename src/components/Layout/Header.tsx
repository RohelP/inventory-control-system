import React from 'react';
import { Layout, Button, Space, Badge, Dropdown, Avatar, Typography, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const { stats } = useSelector((state: RootState) => state.dashboard);
  
  const notificationCount = (stats?.lowStockItems || 0) + (stats?.reorderRequired || 0);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        // Handle profile action
        break;
      case 'settings':
        // Handle settings action
        break;
      case 'logout':
        // Handle logout action
        break;
    }
  };

  const handleImportBOM = async () => {
    try {
      const bomData = await window.electronAPI.excel.importBOM();
      if (bomData) {
        // Handle imported BOM data
        console.log('Imported BOM data:', bomData);
      }
    } catch (error) {
      console.error('Error importing BOM:', error);
    }
  };

  const handleExportReport = async () => {
    try {
      const success = await window.electronAPI.excel.exportInventoryReport();
      if (success) {
        console.log('Report exported successfully');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <AntHeader 
      style={{ 
        position: 'fixed',
        top: 0,
        right: 0,
        left: collapsed ? 80 : 200,
        zIndex: 1000,
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'left 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{
            fontSize: '16px',
            width: 64,
            height: 64,
          }}
        />
        
        <div style={{ marginLeft: 16 }}>
          <Text strong style={{ fontSize: '18px', color: '#262626' }}>
            Damper Manufacturing & UL Compliance Management
          </Text>
        </div>
      </div>

      <Space size="middle">
        <Tooltip title="Import BOM from Excel">
          <Button
            type="text"
            icon={<ImportOutlined />}
            onClick={handleImportBOM}
          />
        </Tooltip>
        
        <Tooltip title="Export Inventory Report">
          <Button
            type="text"
            icon={<ExportOutlined />}
            onClick={handleExportReport}
          />
        </Tooltip>

        <Badge count={notificationCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            style={{ fontSize: '16px' }}
          />
        </Badge>

        <Dropdown
          menu={{
            items: userMenuItems,
            onClick: handleUserMenuClick,
          }}
          placement="bottomRight"
          arrow
        >
          <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
            <Space>
              <Avatar size={32} icon={<UserOutlined />} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Admin User</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>System Administrator</div>
              </div>
            </Space>
          </Button>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;