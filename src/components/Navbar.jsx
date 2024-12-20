import React from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoutOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';

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

  const menu = (
    <Menu>
      <Menu.Item key="account" onClick={() => navigate('/account')}>Quản lý tài khoản</Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout}>Đăng xuất</Menu.Item>
    </Menu>
  );

  const items = [
    {
      key: 'home',
      icon: <HomeOutlined />, 
      label: 'Home',
      onClick: () => navigate('/'),
    },
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
        <Link to="/" style={{ color: '#1890ff', textDecoration: 'none' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>
            CopyCheck
          </h1>
        </Link>
        
      </div>
      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Dropdown overlay={menu} trigger={['click']}>
            <Avatar size="large" icon={<UserOutlined />} />
          </Dropdown>
        </div>
      )}
    </Header>
  );
};

export default Navbar;
