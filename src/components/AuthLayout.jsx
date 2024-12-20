import React from 'react';
import { Layout, Card } from 'antd';

const { Content } = Layout;

const AuthLayout = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <Content style={{ width: '100%', maxWidth: 420, padding: '24px' }}>
        <Card bordered={false} style={{ width: '100%' }}>
          {children}
        </Card>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
