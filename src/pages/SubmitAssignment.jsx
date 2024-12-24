import React, { useState } from 'react';
import { Layout, Form, Input, Button, Card, message, Upload, Space, Typography, Steps, Result } from 'antd';
import { SearchOutlined, UploadOutlined, UserOutlined, BookOutlined, TeamOutlined, IdcardOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../firebase/config';
import { put } from '@vercel/blob';
import pdfToText from 'react-pdftotext';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

const SubmitAssignment = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [classData, setClassData] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const searchClass = async (values) => {
    try {
      setLoading(true);
      const classCode = values.classCode;
      
      // Tìm kiếm trong tất cả các giảng viên
      const teachersRef = ref(database, 'teachers');
      const teachersSnapshot = await get(teachersRef);
      
      if (!teachersSnapshot.exists()) {
        message.error('Class not found');
        return;
      }

      let foundClass = null;
      let foundTeacher = null;
      let teacherId = null;

      // Duyệt qua từng giảng viên để tìm lớp
      for (const [tid, teacher] of Object.entries(teachersSnapshot.val())) {
        if (teacher.classes) {
          for (const [classId, classInfo] of Object.entries(teacher.classes)) {
            if (classInfo.classCode === classCode) {
              foundClass = { ...classInfo, id: classId };
              teacherId = tid;
              break;
            }
          }
        }
        if (foundClass) break;
      }

      // Nếu tìm thấy lớp, lấy thông tin giáo viên từ users database
      if (foundClass && teacherId) {
        const userRef = ref(database, `users/${teacherId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          foundTeacher = {
            ...userSnapshot.val(),
            id: teacherId,
            displayName: userSnapshot.val().displayName || 'Unknown Teacher'
          };
          
          setClassData(foundClass);
          setTeacherData(foundTeacher);
          setCurrentStep(1);
          message.success('Class found!');
        } else {
          message.error('Teacher information not found');
        }
      } else {
        message.error('Class not found');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to search for class');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      if (!selectedFile) {
        message.error('Please select a file');
        return;
      }

      // Extract text from PDF
      const text = await pdfToText(selectedFile);

      // Upload to Vercel Blob
      const pdfBuffer = await selectedFile.arrayBuffer();
      const { url } = await put(`submissions/${selectedFile.name}`, pdfBuffer, {
        access: 'public',
        token: "vercel_blob_rw_vuBTDxs1Af4OyipF_7ktfANNunJPJCY1OsqLo4fevvrPM6A"
      });

      // Create submission data
      const submissionData = {
        studentName: values.studentName,
        studentId: values.studentId,
        email: values.email,
        fileName: selectedFile.name,
        fileUrl: url,
        uploadDate: new Date().toISOString(),
        status: 'Pending Review',
        extractedText: text,
        grade: null,
        feedback: '',
      };

      // Save to teacher's assignments
      const submissionRef = push(ref(database, `teachers/${teacherData.id}/classes/${classData.id}/assignments`));
      await set(submissionRef, submissionData);

      setSubmitted(true);
      setCurrentStep(2);
      message.success('Assignment submitted successfully');
    } catch (error) {
      console.error(error);
      message.error('Failed to submit assignment');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') {
        message.error('You can only upload PDF files!');
        return false;
      }
      setSelectedFile(file);
      return false;
    },
    maxCount: 1,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form onFinish={searchClass}>
            <Form.Item
              name="classCode"
              rules={[{ required: true, message: 'Please enter class code' }]}
            >
              <Input 
                prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
                placeholder="Enter class code"
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              size="large"
              style={{ 
                height: '45px',
                borderRadius: '8px',
                marginTop: '16px'
              }}
            >
              Search Class
            </Button>
          </Form>
        );

      case 1:
        return (
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
          >
            <Card 
              className="class-info"
              style={{ 
                marginBottom: '24px',
                borderRadius: '8px',
                borderLeft: '4px solid #1890ff'
              }}
            >
              <Space direction="vertical" size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  <Text strong>Class: {classData?.className}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TeamOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  <Text strong>Teacher: {teacherData?.displayName}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IdcardOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  <Text strong>Class Code: {classData?.classCode}</Text>
                </div>
                <Text type="secondary" style={{ marginTop: '8px' }}>
                  {classData?.description}
                </Text>
              </Space>
            </Card>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Form.Item
                name="studentName"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="studentId"
                label="Student ID"
                rules={[{ required: true, message: 'Please enter your student ID' }]}
              >
                <Input style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item
                name="file"
                label="Assignment File (PDF only)"
                rules={[{ required: true, message: 'Please upload your assignment' }]}
              >
                <Upload {...uploadProps}>
                  <Button 
                    icon={<UploadOutlined />}
                    style={{ 
                      height: '45px',
                      borderRadius: '8px',
                      width: '100%'
                    }}
                  >
                    Select File
                  </Button>
                </Upload>
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                size="large"
                style={{ 
                  height: '45px',
                  borderRadius: '8px'
                }}
              >
                Submit Assignment
              </Button>
            </Space>
          </Form>
        );

      case 2:
        return (
          <Result
            status="success"
            title={
              <Title level={3} style={{ color: '#52c41a' }}>
                Assignment Submitted Successfully!
              </Title>
            }
            subTitle={
              <Text style={{ fontSize: '16px' }}>
                Your assignment has been submitted to {classData?.className}
              </Text>
            }
            extra={[
              <Button 
                type="primary" 
                key="new" 
                size="large"
                style={{ 
                  height: '45px',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  setCurrentStep(0);
                  setClassData(null);
                  setTeacherData(null);
                  setSelectedFile(null);
                  setSubmitted(false);
                  form.resetFields();
                }}
              >
                Submit Another Assignment
              </Button>
            ]}
          />
        );
    }
  };

  return (
    <Layout>
      <Content 
        style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          padding: '50px 20px'
        }}
      >
        <Card
          style={{
            maxWidth: 800,
            margin: '0 auto',
            borderRadius: '15px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Title level={2} style={{ 
                color: '#1890ff',
                marginBottom: '8px',
                fontWeight: 600
              }}>
                Submit Assignment
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Enter your class code to submit your assignment
              </Text>
            </div>

            <Steps 
              current={currentStep} 
              style={{ 
                marginBottom: 32,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                padding: '24px',
                borderRadius: '8px',
                background: '#fff'
              }}
            >
              <Step title="Find Class" icon={<BookOutlined />} />
              <Step title="Submit" icon={<UploadOutlined />} />
              <Step title="Done" icon={<CheckCircleOutlined />} />
            </Steps>

            <div className="step-content" style={{ 
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {renderStepContent()}
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default SubmitAssignment;
