import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Modal, Form, Input, message, List, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Title } = Typography;

const Home = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingClass, setEditingClass] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadClasses();
    }
  }, [currentUser]);

  const loadClasses = async () => {
    try {
      const classesRef = ref(database, `teachers/${currentUser.uid}/classes`);
      const snapshot = await get(classesRef);
      if (snapshot.exists()) {
        const classesData = snapshot.val();
        const classesArray = Object.entries(classesData).map(([id, data]) => ({
          id,
          ...data
        }));
        setClasses(classesArray);
      } else {
        setClasses([]);
      }
    } catch (error) {
      message.error('Failed to load classes');
      console.error(error);
    }
  };

  const showModal = (classData = null) => {
    setEditingClass(classData);
    if (classData) {
      form.setFieldsValue(classData);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingClass(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const classesRef = ref(database, `teachers/${currentUser.uid}/classes`);
      if (editingClass) {
        // Update existing class
        await set(ref(database, `teachers/${currentUser.uid}/classes/${editingClass.id}`), values);
        message.success('Class updated successfully');
      } else {
        // Create new class
        await push(classesRef, values);
        message.success('Class created successfully');
      }
      handleCancel();
      loadClasses();
    } catch (error) {
      message.error('Failed to save class');
      console.error(error);
    }
  };

  const handleDelete = async (classId) => {
    try {
      await remove(ref(database, `teachers/${currentUser.uid}/classes/${classId}`));
      message.success('Class deleted successfully');
      loadClasses();
    } catch (error) {
      message.error('Failed to delete class');
      console.error(error);
    }
  };

  const handleCardClick = (classId) => {
    navigate(`/class/${classId}/assignments`);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Title level={2}>My Classes</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              Add New Class
            </Button>
          </div>

          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 3,
              xl: 4,
              xxl: 4,
            }}
            dataSource={classes}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleCardClick(item.id)}
                  actions={[
                    <EditOutlined key="edit" onClick={(e) => {
                      e.stopPropagation();
                      showModal(item);
                    }} />,
                    <DeleteOutlined key="delete" onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }} />
                  ]}
                >
                  <Card.Meta
                    avatar={<FolderOutlined style={{ fontSize: 24 }} />}
                    title={item.className}
                    description={item.description}
                  />
                  
                </Card>
              </List.Item>
            )}
          />

          <Modal
            title={editingClass ? "Edit Class" : "Add New Class"}
            open={isModalVisible}
            onCancel={handleCancel}
            footer={null}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="className"
                label="Class Name"
                rules={[{ required: true, message: 'Please input class name!' }]}
              >
                <Input placeholder="Enter class name" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: 'Please input class description!' }]}
              >
                <Input.TextArea placeholder="Enter class description" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                  {editingClass ? 'Update' : 'Create'}
                </Button>
                <Button onClick={handleCancel}>
                  Cancel
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default Home;
