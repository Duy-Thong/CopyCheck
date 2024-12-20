import React, { useState } from 'react';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { GoogleOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import AuthLayout from '../components/AuthLayout';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, signInWithGoogle } = useAuth();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { email, password } = values;
      await signInWithEmailAndPassword(auth, email, password);
      message.success('Login successful!');
      navigate('/');
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      message.success('Login with Google successful!');
      navigate('/');
    } catch (error) {
      message.error(error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <Title level={2} style={{ marginBottom: '8px', fontSize: '28px' }}>
            Welcome Back
          </Title>
          <Text type="secondary">
            New to our platform?{' '}
            <Link to="/register">Create an account</Link>
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          style={{ width: '100%' }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Email"
              style={{ height: '40px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
              style={{ height: '40px' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ height: '40px' }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '0', width: '100%' }}>or</Divider>

        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          size="large"
          block
          style={{ height: '40px' }}
        >
          Continue with Google
        </Button>
      </div>
    </AuthLayout>
  );
};

export default Login;
