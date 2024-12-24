import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Input, Button, message, Typography, Avatar, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { ref, get, set } from 'firebase/database';
import { updatePassword, updateEmail } from 'firebase/auth';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const { Content } = Layout;
const { Title, Text } = Typography;

const AccountManagement = () => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUserData(snapshot.val());
        form.setFieldsValue({
          displayName: snapshot.val().displayName,
          email: currentUser.email,
          photoURL: snapshot.val().photoURL || '',
        });
      }
    } catch (error) {
      message.error('Failed to load user data');
      console.error(error);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Update display name in database
      if (values.displayName !== userData.displayName) {
        await set(ref(database, `users/${currentUser.uid}/displayName`), values.displayName);
      }

      // Update email if changed
      if (values.email !== currentUser.email) {
        await updateEmail(currentUser, values.email);
      }

      // Update password if provided
      if (values.newPassword) {
        await updatePassword(currentUser, values.newPassword);
      }

      message.success('Profile updated successfully');
      loadUserData();
    } catch (error) {
      message.error(`Failed to update profile: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Navbar />
      <Content style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Card
            style={{
              borderRadius: '15px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              border: 'none',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ textAlign: 'center' }}>
                <Avatar 
                  size={100} 
                  icon={<UserOutlined />}
                  src={userData?.photoURL}
                  style={{ 
                    border: '4px solid #fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Title level={2} style={{ 
                  marginTop: 24,
                  fontSize: '28px',
                  fontWeight: 600,
                  color: '#1a1a1a'
                }}>
                  Account Settings
                </Title>
              </div>

              <Divider style={{ margin: '24px 0' }} />

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
                style={{ padding: '0 20px' }}
              >
                <Form.Item
                  name="displayName"
                  label={<Text strong>Display Name</Text>}
                  rules={[{ required: true, message: 'Please input your display name!' }]}
                >
                  <Input 
                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Display Name"
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={<Text strong>Email</Text>}
                  rules={[
                    { required: true, message: 'Please input your email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Email"
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label={<Text strong>New Password</Text>}
                  rules={[
                    { min: 6, message: 'Password must be at least 6 characters!' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Leave blank to keep current password"
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label={<Text strong>Confirm New Password</Text>}
                  dependencies={['newPassword']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject('Passwords do not match!');
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Confirm new password"
                    size="large"
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: '32px' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    block
                    size="large"
                    style={{
                      height: '48px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 500,
                      background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
                      border: 'none',
                    }}
                  >
                    Update Profile
                  </Button>
                </Form.Item>
              </Form>

              <Divider style={{ margin: '24px 0' }} />

              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Account created: {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </div>
            </Space>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default AccountManagement;
