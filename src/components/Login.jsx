import React from 'react';
import { Layout, Card, Form, Input, Button } from 'antd';

const { Content } = Layout;

const Login = () => {
  const onFinish = (values) => {
    console.log('Login values:', values);
    // Add login logic here
  };

  return (
    <Layout style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <Content style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: 420,
        padding: '24px'
      }}>
        <Card bordered={false} style={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Login</h2>
          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: 'Please input your email!' }]}
            >
              <Input />
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password />
            </Form.Item>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Login
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default Login;
