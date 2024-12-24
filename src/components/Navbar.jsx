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
      className="flex items-center justify-between bg-white sticky top-0 z-10 w-full shadow-sm"
      style={{
        padding: '0 16px', // Mobile padding
        '@media (min-width: 640px)': {
          padding: '0 24px',
        },
        '@media (min-width: 1024px)': {
          padding: '0 70px',
        },
      }}
    >
      <div className="flex items-center">
        <Link to="/" className="text-blue-500 no-underline">
          <h1 className="m-0 text-lg sm:text-xl lg:text-2xl font-bold truncate">
            PlagiarismGuard
          </h1>
        </Link>
      </div>

      {currentUser && (
        <div className="flex items-center">
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
            <Space className="cursor-pointer px-2 sm:px-4">
              <Avatar
                className="bg-blue-500"
                icon={<UserOutlined />}
                src={userData?.photoURL}
                size={{ xs: 32, sm: 36, md: 40 }}
              />
              <span className="hidden sm:inline text-gray-600">
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
