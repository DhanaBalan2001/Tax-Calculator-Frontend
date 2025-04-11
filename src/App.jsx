import React from 'react';
import { Layout } from 'antd';
import TaxCalculationPage from './components/TaxCalculation';
import 'antd/dist/reset.css'; // For Ant Design v5

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          Tax Calculation System
        </div>
      </Header>
      <Content style={{ padding: '0 50px', marginTop: '20px' }}>
        <TaxCalculationPage />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Tax Calculation System ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

export default App;
