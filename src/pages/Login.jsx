import React, { useState } from 'react';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

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
      await signInWithEmailAndPassword(auth, values.email, values.password);
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
      message.success('Login successful!');
      navigate('/');
    } catch (error) {
      message.error(error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center p-5 relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-500">
      {/* Background circles */}
      <div className="absolute w-52 h-52 bg-blue-500/30 rounded-full top-[10%] left-[15%] blur-[80px]" />
      <div className="absolute w-72 h-72 bg-blue-400/30 rounded-full bottom-[10%] right-[15%] blur-[80px]" />
      
      <div className="w-full max-w-md p-8 glassmorphism">
        <div className="flex flex-col gap-6 items-center">
          <div className="text-center w-full">
            <h2 className="text-2xl font-semibold mb-2 text-white drop-shadow-sm">
              Welcome Back
            </h2>
            <p className="text-white/90">
              Don't have an account?{' '}
              <Link to="/register" className="text-white font-medium underline hover:text-white/80">
                Sign up
              </Link>
            </p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            className="w-full [&_.ant-form-item-label_label]:!text-white [&_.ant-form-item-label_label]:!opacity-90"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input 
                prefix={<UserOutlined className="text-white/70" />}
                placeholder="Email"
                className="h-10 !text-white placeholder:text-white/50"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-white/70" />}
                placeholder="Password"
                className="h-10 !text-white placeholder:text-white/50 [&_.ant-input]:!text-white"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="h-10 bg-white/10 border-white/30 text-white backdrop-blur hover:bg-white/20 transition-all"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider className="my-0 w-full border-white/30 !text-white/90">or</Divider>

          <Button
            icon={
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google"
                className="w-4 h-4 mr-2"
              />
            }
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            size="large"
            block
            className="h-10 border-white/30 bg-white/10 text-white font-medium backdrop-blur hover:bg-white/20 transition-all flex items-center justify-center"
          >
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
