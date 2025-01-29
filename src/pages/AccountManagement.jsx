import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Input, Button, message, Typography, Avatar, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { ref, get, set } from 'firebase/database';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
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
      // Reauthenticate user if password is being changed
      if (values.newPassword) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          values.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
      }

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
      form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        message.error('Current password is incorrect');
      } else {
        message.error(`Failed to update profile: ${error.message}`);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-400">
      <Navbar />
      <Content className="p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="max-w-3xl mx-auto">
          <Card className="rounded-3xl shadow-xl border-none backdrop-blur-md bg-white/70 glassmorphism">
            <Space direction="vertical" className="w-full" size={32}>
              {/* Profile Header Section */}
              <div className="text-center relative">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-blue-300 to-cyan-500 rounded-t-3xl -mt-6 -mx-6" />
                <Avatar 
                  size={120} 
                  icon={<UserOutlined />}
                  src={userData?.photoURL}
                  className="border-4 border-white shadow-lg relative mt-8"
                />
                <Title level={2} className="mt-4 text-2xl font-bold text-gray-800">
                  {userData?.displayName || 'Account Settings'}
                </Title>
              </div>

              <Divider className="my-0" />

              {/* Form Section */}
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
                className="px-4 md:px-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Form.Item
                    name="displayName"
                    label={<Text className="text-gray-700 font-medium">Tên tài khoản</Text>}
                    rules={[{ required: true, message: 'Please input your display name!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined className="text-blue-400" />} 
                      placeholder="Display Name"
                      size="large"
                      className="rounded-lg hover:border-blue-400 focus:border-blue-500 transition-colors"
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label={<Text className="text-gray-700 font-medium">Email</Text>}
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined className="text-blue-400" />} 
                      placeholder="Email"
                      size="large"
                      className="rounded-lg hover:border-blue-400 focus:border-blue-500 transition-colors"
                    />
                  </Form.Item>
                </div>

                <div className="mt-6 bg-gray-50 p-6 rounded-2xl space-y-6">
                  <Text className="block text-lg font-semibold text-gray-700 mb-4">
                    Đổi mật khẩu
                  </Text>
                  
                  <Form.Item
                    name="currentPassword"
                    label={<Text className="text-gray-700 font-medium">Mật khẩu hiện tại</Text>}
                    rules={[
                      ({ getFieldValue }) => ({
                        required: !!getFieldValue('newPassword'),
                        message: 'Please input your current password before changing to a new one!',
                      }),
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined className="text-blue-400" />} 
                      placeholder="Nhập mật khẩu hiện tại"
                      size="large"
                      className="rounded-lg"
                    />
                  </Form.Item>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Form.Item
                      name="newPassword"
                      label={<Text className="text-gray-700 font-medium">Mật khẩu mới</Text>}
                      rules={[{ min: 6, message: 'Mật khẩu phải dài hơn 6 ký tự!' }]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined className="text-blue-400" />} 
                        placeholder="Mật khẩu mới"
                        size="large"
                        className="rounded-lg"
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label={<Text className="text-gray-700 font-medium">Nhập lại mật khẩu mới</Text>}
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
                        prefix={<LockOutlined className="text-blue-400" />} 
                        placeholder="Nhập lại mật khẩu mới"
                        size="large"
                        className="rounded-lg"
                      />
                    </Form.Item>
                  </div>
                </div>

                <Form.Item className="mt-8">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    block
                    size="large"
                    className="h-12 rounded-lg text-base font-medium bg-gradient-to-r from-blue-500 to-indigo-600 border-none hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cập nhật
                  </Button>
                </Form.Item>
              </Form>

              <Divider className="my-0" />

              <div className="text-center">
                <Text type="secondary" className="text-sm">
                  Đăng ký từ {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
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
