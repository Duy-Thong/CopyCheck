import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Modal, Form, Input, message, List, Typography, Badge } from 'antd';
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
    className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white/70 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-white/80"
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
    <Layout className="min-h-screen">
      <Navbar />
      <Content className="p-6 bg-gradient-to-tl from-blue-400 via-blue-200 to-blue-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>My Classes</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              className="flex items-center"
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
                  <div className="relative">
                    <div className="absolute top-0 right-0 flex gap-2">
                      <Button
                        type="text"
                        icon={<EditOutlined className="text-slate-600 hover:text-slate-800" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          showModal(item);
                        }}
                        className="min-w-0 p-1"
                      />
                      <Button
                        type="text"
                        icon={<DeleteOutlined className="text-red-500 hover:text-red-600" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="min-w-0 p-1"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <div className="bg-blue-100 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                        <FolderOutlined className="text-2xl text-blue-600" />
                      </div>
                      <div className="mb-2">
                        <Typography.Text className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-mono text-xs">
                          {item.classCode}
                        </Typography.Text>
                      </div>
                      <Typography.Title 
                        level={4} 
                        className="m-0 text-lg text-slate-800"
                        ellipsis={{ 
                          tooltip: item.className 
                        }}
                      >
                        {item.className}
                      </Typography.Title>
                    </div>

                    <Typography.Paragraph
                      className="mb-4 text-slate-600 text-sm leading-relaxed"
                      ellipsis={{ 
                        rows: 2,
                        tooltip: item.description
                      }}
                    >
                      {item.description}
                    </Typography.Paragraph>

                    <div className="bg-slate-100 backdrop-blur-sm p-3 rounded-lg flex items-center gap-3">
                      <Badge 
                        count={item.submittedCount} 
                        className="shadow-sm"
                        style={{ 
                          backgroundColor: '#3B82F6',
                          color: 'white'
                        }}
                      />
                      <Typography.Text className="text-sm text-slate-600 m-0">
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
            className="rounded-lg"
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
