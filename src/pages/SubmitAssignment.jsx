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

  // Add similarity calculation function
  const calculateSimilarity = (text1, text2) => {
    const words1 = text1.split(/\W+/);
    const words2 = text2.split(/\W+/);
    const wordSet1 = new Set(words1);
    const wordSet2 = new Set(words2);

    const intersection = [...wordSet1].filter(word => wordSet2.has(word)).length;
    const union = wordSet1.size + wordSet2.size - intersection;

    return union === 0 ? 0 : intersection / union;
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

      // Get existing assignments to check similarity
      const assignmentsRef = ref(database, `teachers/${teacherData.id}/classes/${classData.id}/assignments`);
      const assignmentsSnapshot = await get(assignmentsRef);
      let assignments = [];
      if (assignmentsSnapshot.exists()) {
        assignments = Object.values(assignmentsSnapshot.val());
      }

      // Find most similar existing assignment
      let mostSimilarFile = '';
      let mostSimilarId = '';
      let highestSimilarity = 0;

      // Compare with existing assignments
      assignments.forEach((assignment) => {
        const similarity = calculateSimilarity(text, assignment.extractedText);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarFile = assignment.fileName;
          mostSimilarId = assignment.id; // Store ID of most similar assignment
        }
      });

      // Upload to Vercel Blob
      const pdfBuffer = await selectedFile.arrayBuffer();
      const { url } = await put(`submissions/${selectedFile.name}`, pdfBuffer, {
        access: 'public',
        token: "vercel_blob_rw_vuBTDxs1Af4OyipF_7ktfANNunJPJCY1OsqLo4fevvrPM6A"
      });

      // Create submission data with student information and similarity results
      const submissionData = {
        fileName: selectedFile.name,
        uploadDate: new Date().toISOString(),
        extractedText: text,
        notes: '',
        status: 'Pending Review',
        grade: null,
        feedback: '',
        lastModified: new Date().toISOString(),
        fileUrl: url,
        similarFilename: mostSimilarFile,
        similarAssignmentId: mostSimilarId, // Store ID reference
        similarityRatio: highestSimilarity,
        submitter: {
          role: 'student',
          name: values.studentName,
          id: values.studentId,
          email: values.email
        }
      };

      // Save to teacher's assignments
      const submissionRef = push(ref(database, `teachers/${teacherData.id}/classes/${classData.id}/assignments`));
      await set(submissionRef, submissionData);

      // Show warning if similarity is high
      if (highestSimilarity > 0.7) {
        message.warning('Warning: High similarity detected with existing submission!', 5);
      }

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
                prefix={<SearchOutlined className="text-blue-500" />}
                placeholder="Enter class code"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              size="large"
              className="h-12 rounded-lg mt-4"
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
            <Card className="mb-6 rounded-lg border-l-4 border-l-blue-500">
              <Space direction="vertical" size="small">
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-blue-500 text-lg" />
                  <Text strong>Class: {classData?.className}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <TeamOutlined className="text-blue-500 text-lg" />
                  <Text strong>Teacher: {teacherData?.displayName}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <IdcardOutlined className="text-blue-500 text-lg" />
                  <Text strong>Class Code: {classData?.classCode}</Text>
                </div>
                <Text type="secondary" className="mt-2">
                  {classData?.description}
                </Text>
              </Space>
            </Card>

            <Space direction="vertical" size="large" className="w-full">
              <Form.Item
                name="studentName"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input 
                  prefix={<UserOutlined className="text-blue-500" />}
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="studentId"
                label="Student ID"
                rules={[{ required: true, message: 'Please enter your student ID' }]}
              >
                <Input className="rounded-lg" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input className="rounded-lg" />
              </Form.Item>

              <Form.Item
                name="file"
                label="Assignment File (PDF only)"
                rules={[{ required: true, message: 'Please upload your assignment' }]}
              >
                <Upload {...uploadProps}>
                  <Button 
                    icon={<UploadOutlined />}
                    className="h-12 rounded-lg w-full"
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
                className="h-12 rounded-lg"
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
              <Title level={3} className="text-green-500">
                Assignment Submitted Successfully!
              </Title>
            }
            subTitle={
              <Text className="text-base">
                Your assignment has been submitted to {classData?.className}
              </Text>
            }
            extra={[
              <Button 
                type="primary" 
                key="new" 
                size="large"
                className="h-12 rounded-lg"
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
      <Content className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 py-12 px-4">
        <Card className="max-w-3xl mx-auto rounded-2xl shadow-lg">
          <Space direction="vertical" size="large" className="w-full">
            <div className="text-center mb-5">
              <Title level={2} className="text-blue-500 mb-2 font-semibold">
                Submit Assignment
              </Title>
              <Text type="secondary" className="text-base">
                Enter your class code to submit your assignment
              </Text>
            </div>

            <Steps 
              current={currentStep} 
              className="mb-8 shadow-sm p-6 rounded-lg bg-white"
            >
              <Step title="Find Class" icon={<BookOutlined />} />
              <Step title="Submit" icon={<UploadOutlined />} />
              <Step title="Done" icon={<CheckCircleOutlined />} />
            </Steps>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              {renderStepContent()}
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default SubmitAssignment;
