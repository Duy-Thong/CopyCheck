import React, { useState, useEffect } from 'react';
import { Layout, Dropdown, Avatar, Space } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoutOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
const { Header } = Layout;

const Navbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const menuItems = [
    {
      key: 'account',
      icon: <SettingOutlined />,
      label: 'Quản lý tài khoản',
      onClick: () => navigate('/account'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#1890ff', textDecoration: 'none' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            CopyCheck
          </h1>
        </Link>
      </div>

      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
            <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
              <Avatar
                style={{ backgroundColor: '#1890ff' }}
                icon={<UserOutlined />}
                src={userData?.photoURL}
              />
              <span style={{ color: '#666' }}>
                {currentUser.displayName || currentUser.email}
              </span>
            </Space>
          </Dropdown>
        </div>
      )}
    </Header>
  );
};

export default Navbar;
