import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoutOutlined, HomeOutlined } from '@ant-design/icons';

const { Header } = Layout;

const Navbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const items = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
      onClick: () => navigate('/')
    }
  ];

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: '#fff',
      padding: '0 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '24px'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>
          CopyCheck
        </h1>
        <Menu 
          mode="horizontal" 
          items={items}
          style={{ border: 'none' }}
        />
      </div>
      
      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{currentUser.email}</span>
          <Button 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      )}
    </Header>
  );
};

export default Navbar;
