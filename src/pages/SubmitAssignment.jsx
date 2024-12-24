import React, { useState } from 'react';
import { Layout, Form, Input, Button, Card, message, Upload, Space, Typography, Steps, Result } from 'antd';
import { SearchOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
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

      // Duyệt qua từng giảng viên để tìm lớp
      for (const [teacherId, teacher] of Object.entries(teachersSnapshot.val())) {
        if (teacher.classes) {
          for (const [classId, classInfo] of Object.entries(teacher.classes)) {
            if (classInfo.classCode === classCode) {
              foundClass = { ...classInfo, id: classId };
              foundTeacher = { ...teacher, id: teacherId };
              break;
            }
          }
        }
        if (foundClass) break;
      }

      if (foundClass && foundTeacher) {
        setClassData(foundClass);
        setTeacherData(foundTeacher);
        setCurrentStep(1);
        message.success('Class found!');
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
                prefix={<SearchOutlined />}
                placeholder="Enter class code"
                size="large"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
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
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Class Information:</Title>
                <Text>Class: {classData?.className}</Text>
                <br />
                <Text>Teacher: {teacherData?.name || 'Unknown'}</Text>
              </div>

              <Form.Item
                name="studentName"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item
                name="studentId"
                label="Student ID"
                rules={[{ required: true, message: 'Please enter your student ID' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="file"
                label="Assignment File (PDF only)"
                rules={[{ required: true, message: 'Please upload your assignment' }]}
              >
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={loading} block>
                Submit Assignment
              </Button>
            </Space>
          </Form>
        );

      case 2:
        return (
          <Result
            status="success"
            title="Assignment Submitted Successfully!"
            subTitle={`Your assignment has been submitted to ${classData?.className}`}
            extra={[
              <Button type="primary" key="new" onClick={() => {
                setCurrentStep(0);
                setClassData(null);
                setTeacherData(null);
                setSelectedFile(null);
                setSubmitted(false);
                form.resetFields();
              }}>
                Submit Another Assignment
              </Button>
            ]}
          />
        );
    }
  };

  return (
    <Layout>
      <Content style={{ padding: '50px 0', background: '#f0f2f5' }}>
        <Card
          style={{
            maxWidth: 600,
            margin: '0 auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={2}>Submit Assignment</Title>
              <Text type="secondary">
                Enter your class code to submit your assignment
              </Text>
            </div>

            <Steps current={currentStep} style={{ marginBottom: 24 }}>
              <Step title="Find Class" />
              <Step title="Submit" />
              <Step title="Done" />
            </Steps>

            {renderStepContent()}
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default SubmitAssignment;
