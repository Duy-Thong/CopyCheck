import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Modal, Form, Input, message, List, Typography, Badge, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Title } = Typography;

const CLASS_NAME_MAX_LENGTH = 30;
const DESCRIPTION_MAX_LENGTH = 100;
const CLASS_CODE_LENGTH = 6;

const StyledCard = ({ children, ...props }) => (
  <Card
    {...props}
    style={{
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      border: 'none',
      background: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease',
      ...props.style,
    }}
    bodyStyle={{
      padding: '20px',
    }}
  >
    {children}
  </Card>
);

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
        const classesArray = await Promise.all(Object.entries(classesData).map(async ([id, data]) => {
          const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${id}/assignments`);
          const assignmentsSnapshot = await get(assignmentsRef);
          const submittedCount = assignmentsSnapshot.exists() ? Object.keys(assignmentsSnapshot.val()).length : 0;

          return {
            id,
            ...data,
            submittedCount,
          };
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

  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array(CLASS_CODE_LENGTH).fill(0)
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join('');
  };

  const showModal = (classData = null) => {
    setEditingClass(classData);
    if (classData) {
      form.setFieldsValue(classData);
    } else {
      form.resetFields();
      // Generate class code for new classes
      form.setFieldsValue({ classCode: generateClassCode() });
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
      <Content style={{ padding: '24px', background: '#f8fafc' }}>
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
              gutter: 24,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4,
            }}
            dataSource={classes}
            renderItem={(item) => (
              <List.Item>
                <StyledCard
                  hoverable
                  onClick={() => handleCardClick(item.id)}
                >
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        display: 'flex',
                        gap: '8px',
                      }}
                    >
                      <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#4B5563' }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          showModal(item);
                        }}
                        style={{ minWidth: 'auto', padding: '4px' }}
                      />
                      <Button
                        type="text"
                        icon={<DeleteOutlined style={{ color: '#EF4444' }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        style={{ minWidth: 'auto', padding: '4px' }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                          borderRadius: '12px',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px',
                        }}
                      >
                        <FolderOutlined style={{ fontSize: 24, color: '#0284C7' }} />
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <Typography.Text
                          style={{
                            backgroundColor: '#E0F2FE',
                            color: '#0284C7',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        >
                          {item.classCode}
                        </Typography.Text>
                      </div>
                      <Typography.Title 
                        level={4} 
                        style={{ 
                          margin: 0,
                          fontSize: '18px',
                          color: '#1E293B',
                          width: '100%',
                        }}
                        ellipsis={{ 
                          tooltip: item.className 
                        }}
                      >
                        {item.className}
                      </Typography.Title>
                    </div>

                    <Typography.Paragraph
                      type="secondary"
                      style={{ 
                        margin: '0 0 16px 0',
                        color: '#64748B',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}
                      ellipsis={{ 
                        rows: 2,
                        tooltip: item.description
                      }}
                    >
                      {item.description}
                    </Typography.Paragraph>

                    <div
                      style={{
                        background: '#F1F5F9',
                        padding: '12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <Badge 
                        count={item.submittedCount} 
                        style={{ 
                          backgroundColor: '#10B981',
                          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                        }}
                      />
                      <Typography.Text
                        style={{
                          fontSize: '14px',
                          color: '#64748B',
                          margin: 0
                        }}
                      >
                        Submitted Assignments
                      </Typography.Text>
                    </div>
                  </div>
                </StyledCard>
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
                name="classCode"
                label="Class Code"
                rules={[
                  { required: true, message: 'Class code is required!' },
                  { 
                    pattern: /^[A-Z0-9]{6}$/,
                    message: 'Class code must be 6 alphanumeric characters'
                  }
                ]}
              >
                <Input 
                  disabled={true}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              <Form.Item
                name="className"
                label={`Class Name (${CLASS_NAME_MAX_LENGTH} characters max)`}
                rules={[
                  { required: true, message: 'Please input class name!' },
                  { max: CLASS_NAME_MAX_LENGTH, message: `Class name cannot exceed ${CLASS_NAME_MAX_LENGTH} characters` }
                ]}
              >
                <Input 
                  placeholder="Enter class name" 
                  maxLength={CLASS_NAME_MAX_LENGTH}
                  showCount
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={`Description (${DESCRIPTION_MAX_LENGTH} characters max)`}
                rules={[
                  { required: true, message: 'Please input class description!' },
                  { max: DESCRIPTION_MAX_LENGTH, message: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` }
                ]}
              >
                <Input.TextArea 
                  placeholder="Enter class description" 
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  showCount
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
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
