import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  QrcodeOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
}

type MenuItem = Required<MenuProps>['items'][number];

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: 'Orders',
    },
    {
      key: '/bom',
      icon: <ToolOutlined />,
      label: 'BOM',
    },
    {
      key: '/ul-compliance',
      icon: <SafetyCertificateOutlined />,
      label: 'UL Compliance',
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: 'Inventory',
    },
    {
      key: '/purchase',
      icon: <ShoppingOutlined />,
      label: 'Purchase',
    },
    {
      key: '/quality',
      icon: <QrcodeOutlined />,
      label: 'Quality',
    },
    {
      key: '/production',
      icon: <BuildOutlined />,
      label: 'Production',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div className="sidebar-logo">
        <div 
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px',
            color: 'white',
            fontSize: collapsed ? '18px' : '16px',
            fontWeight: 'bold',
            borderBottom: '1px solid #002140',
          }}
        >
          {collapsed ? 'ICS' : 'Inventory Control System'}
        </div>
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          height: 'calc(100% - 64px)',
          borderRight: 0,
        }}
      />
    </Sider>
  );
};

export default Sidebar;