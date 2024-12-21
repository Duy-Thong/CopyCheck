import React, { useState, useEffect } from 'react';
import { Layout, List, Upload, Button, message, Typography, Card, Modal, Form, Input, Popconfirm, Tabs, Space, Select, Row, Col, Empty } from 'antd';
import { UploadOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SwapOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import pdfToText from 'react-pdftotext';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ClassAssignments = () => {
  const { classId } = useParams();
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [compareResults, setCompareResults] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewForm] = Form.useForm();
  const [form] = Form.useForm();
  const [similarityResults, setSimilarityResults] = useState([]);
  const [fileInput, setFileInput] = useState(null);
  const [newAssignment, setNewAssignment] = useState(null);
  const [similarityFilter, setSimilarityFilter] = useState('all');

  useEffect(() => {
    loadClassData();
    loadAssignments();
  }, [classId]);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, searchText, statusFilter, sortOrder, similarityFilter]);

  const loadClassData = async () => {
    try {
      const classRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}`);
      const snapshot = await get(classRef);
      if (snapshot.exists()) {
        setClassData(snapshot.val());
      }
    } catch (error) {
      message.error('Failed to load class data');
      console.error(error);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments`);
      const snapshot = await get(assignmentsRef);
      if (snapshot.exists()) {
        const assignmentsData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setAssignments(assignmentsData);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      message.error('Failed to load assignments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);
      
      // Extract text from PDF using pdfToText
      const text = await pdfToText(file);
      
      // Find most similar existing assignment
      let mostSimilarFile = '';
      let highestSimilarity = 0;
      
      // Compare with existing assignments
      assignments.forEach((assignment) => {
        const similarity = calculateSimilarity(text, assignment.extractedText);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarFile = assignment.fileName;
        }
      });
      
      // Save assignment data to database with similarity results
      const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments`);
      const newAssignmentId = push(assignmentsRef).key;
      await set(ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${newAssignmentId}`), {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        extractedText: text,
        notes: '',
        status: 'Pending Review',
        grade: null,
        feedback: '',
        lastModified: new Date().toISOString(),
        similarFilename: mostSimilarFile,
        similarityRatio: highestSimilarity
      });
      
      message.success('Assignment uploaded and processed successfully');
      loadAssignments();
    } catch (error) {
      message.error('Failed to process assignment');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (values) => {
    try {
      const assignmentRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${selectedAssignment.id}`);
      await set(assignmentRef, {
        ...selectedAssignment,
        ...values
      });
      message.success('Assignment updated successfully');
      loadAssignments();
      setIsEditModalVisible(false);
    } catch (error) {
      message.error('Failed to update assignment');
      console.error(error);
    }
  };

  const handleDelete = async (assignmentId) => {
    try {
      const assignmentRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${assignmentId}`);
      await remove(assignmentRef);
      message.success('Assignment deleted successfully');
      loadAssignments();
    } catch (error) {
      message.error('Failed to delete assignment');
      console.error(error);
    }
  };

  const compareAssignments = () => {
    const results = [];
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const similarity = calculateSimilarity(
          assignments[i].extractedText,
          assignments[j].extractedText
        );
        if (similarity > 0.7) { // 70% similarity threshold
          results.push({
            assignment1: assignments[i],
            assignment2: assignments[j],
            similarity: Math.round(similarity * 100)
          });
        }
      }
    }
    setCompareResults(results);
    setIsCompareModalVisible(true);
  };

  const calculateSimilarity = (text1, text2) => {
    const words1 = text1.split(/\W+/);
    const words2 = text2.split(/\W+/);
    const wordSet1 = new Set(words1);
    const wordSet2 = new Set(words2);

    const intersection = [...wordSet1].filter(word => wordSet2.has(word)).length;
    const union = wordSet1.size + wordSet2.size - intersection;

    return union === 0 ? 0 : intersection / union; // Jaccard similarity
  };

  const filterAndSortAssignments = () => {
    let filtered = [...assignments];

    // Apply search filter
    if (searchText) {
      filtered = filtered.filter(assignment => 
        assignment.fileName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }

    // Apply similarity filter
    if (similarityFilter !== 'all') {
      filtered = filtered.filter(assignment => {
        const similarity = assignment.similarityRatio ? Math.round(assignment.similarityRatio * 100) : 0;
        switch (similarityFilter) {
          case 'high':
            return similarity >= 70;
          case 'medium':
            return similarity >= 40 && similarity < 70;
          case 'low':
            return similarity < 40;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const nameA = a.fileName.toLowerCase();
      const nameB = b.fileName.toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    setFilteredAssignments(filtered);
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const uploadProps = {
    beforeUpload: (file) => {
      if (file.type !== 'application/pdf') {
        message.error('You can only upload PDF files!');
        return false;
      }
      handleUpload(file);
      return false;
    },
    showUploadList: false,
  };

  const showEditModal = (assignment) => {
    setSelectedAssignment(assignment);
    form.setFieldsValue({
      notes: assignment.notes,
      status: assignment.status
    });
    setIsEditModalVisible(true);
  };

  const showAssignmentContent = (assignment) => {
    setSelectedAssignment(assignment);
    viewForm.setFieldsValue({
      notes: assignment.notes,
      status: assignment.status,
      grade: assignment.grade,
      feedback: assignment.feedback
    });
    setIsModalVisible(true);
  };

  const handleAssignmentUpdate = async (values) => {
    try {
      console.log('Updating assignment with values:', values);
      console.log('Selected assignment:', selectedAssignment);
      
      if (!selectedAssignment || !selectedAssignment.id) {
        message.error('No assignment selected');
        return;
      }

      const assignmentRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${selectedAssignment.id}`);
      const updatedAssignment = {
        ...selectedAssignment,
        fileName: selectedAssignment.fileName,
        uploadDate: selectedAssignment.uploadDate,
        extractedText: selectedAssignment.extractedText,
        notes: values.notes || '',
        status: values.grade ? 'Reviewed' : (values.status || 'Pending Review'),
        grade: values.grade ? Number(values.grade) : null,
        feedback: values.feedback || '',
        lastModified: new Date().toISOString()
      };

      console.log('Updated assignment data:', updatedAssignment);
      
      await set(assignmentRef, updatedAssignment);
      setSelectedAssignment(updatedAssignment);
      
      // Update the form's status field to reflect the change
      if (values.grade && values.status !== 'Reviewed') {
        viewForm.setFieldValue('status', 'Reviewed');
        message.info('Status automatically set to Reviewed');
      }
      
      message.success('Assignment updated successfully');
      loadAssignments();
    } catch (error) {
      console.error('Update error:', error);
      message.error(`Failed to update assignment: ${error.message}`);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        // Initialize newAssignment with relevant properties
        const newAssignment = {
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          extractedText: text,
          // Add any other necessary fields here
        };
        compareWithExistingAssignments(newAssignment, text);
      };
      reader.readAsText(file);
    }
  };

  const compareWithExistingAssignments = (newAssignment, newAssignmentText) => {
    const existingAssignments = assignments.map(assignment => assignment.extractedText);
    let highestSimilarity = 0;
    let mostSimilarFile = '';

    existingAssignments.forEach((assignment, index) => {
      const similarity = calculateSimilarity(newAssignmentText, assignment);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilarFile = assignments[index].fileName;
      }
    });

    console.log('Most Similar File:', mostSimilarFile);
    console.log('Highest Similarity:', highestSimilarity);

    console.log('Most Similar File:', mostSimilarFile);
    console.log('Highest Similarity:', highestSimilarity);

    // Set similarity results for UI display
    setSimilarityResults([{ file: mostSimilarFile, similarity: highestSimilarity }]);

    // Update the assignment object with the most similar file and similarity percentage
    newAssignment.similarFilename = mostSimilarFile;
    newAssignment.ratioSimilar = highestSimilarity; // Store as a decimal without rounding

    // Save the updated assignment object to the database after finding the most similar file
    saveUpdatedAssignment(newAssignment);

    return { mostSimilarFile, highestSimilarity };
  };

  const saveUpdatedAssignment = async (assignment) => {
    const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments`);
    const newAssignmentId = push(assignmentsRef).key;
    console.log('Similarity Results:', similarityResults);
    await set(ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${newAssignmentId}`), {
      ...assignment,
      similarityResults: [...similarityResults],
    });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <Title level={2}>{classData?.className || 'Class Assignments'}</Title>
              <Text type="secondary">{classData?.description}</Text>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<SwapOutlined />}
                onClick={compareAssignments}
                disabled={assignments.length < 2}
              >
                Compare All
              </Button>
              <Upload {...uploadProps}>
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />}
                  loading={uploading}
                >
                  Upload Assignment
                </Button>
              </Upload>
            </Space>
          </div>

          {/* Search, Filter, and Sort Controls */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={6}>
              <Input
                placeholder="Search by filename"
                prefix={<SearchOutlined />}
                onChange={(e) => handleSearch(e.target.value)}
                value={searchText}
                allowClear
              />
            </Col>
            <Col xs={24} sm={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by status"
                onChange={handleStatusFilter}
                value={statusFilter}
                suffixIcon={<FilterOutlined />}
              >
                <Select.Option value="all">All Status</Select.Option>
                <Select.Option value="Pending Review">Pending Review</Select.Option>
                <Select.Option value="Reviewed">Reviewed</Select.Option>
                <Select.Option value="Flagged">Flagged</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by similarity"
                onChange={(value) => setSimilarityFilter(value)}
                value={similarityFilter}
                suffixIcon={<FilterOutlined />}
              >
                <Select.Option value="all">All Similarities</Select.Option>
                <Select.Option value="high">High (&ge;70%)</Select.Option>
                <Select.Option value="medium">Medium (40-69%)</Select.Option>
                <Select.Option value="low">Low (&lt;40%)</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Button
                icon={<SortAscendingOutlined />}
                onClick={toggleSortOrder}
                style={{ width: '100%' }}
              >
                Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
            </Col>
          </Row>

          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4,
            }}
            dataSource={filteredAssignments}
            loading={loading}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  style={{ 
                    width: '100%',
                    height: 180, // Fixed height for the card
                    overflow: 'hidden' // Prevent content overflow
                  }}
                  actions={[
                    <EditOutlined key="edit" onClick={(e) => {
                      e.stopPropagation();
                      showEditModal(item);
                    }} />,
                    <Popconfirm
                      title="Delete assignment"
                      description="Are you sure you want to delete this assignment?"
                      onConfirm={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <DeleteOutlined key="delete" onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  ]}
                  onClick={() => showAssignmentContent(item)}
                >
                  <Card.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                    title={<div style={{ marginBottom: 8 }}>{item.fileName}</div>}
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(item.uploadDate).toLocaleDateString()}
                        </Text>
                        <Text type={item.status === 'Flagged' ? 'danger' : 'secondary'} style={{ fontSize: '12px' }}>
                          Status: {item.status}
                        </Text>
                        {item.similarFilename && (
                          <Text type="warning" style={{ color: '#ff4d4f', fontSize: '12px' }}>
                            {Math.round(item.similarityRatio * 100)}% similar to: {item.similarFilename}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />

          {/* View Assignment Modal */}
          <Modal
            title={selectedAssignment?.fileName}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            width={800}
            footer={null}
          >
            <Form
              form={viewForm}
              layout="vertical"
              onFinish={handleAssignmentUpdate}
              initialValues={{
                status: 'Pending Review',
                grade: null,
                feedback: '',
                notes: ''
              }}
            >
              <Tabs defaultActiveKey="content">
                <TabPane tab="Content" key="content">
                  <div style={{ maxHeight: '40vh', overflow: 'auto', padding: '16px', marginBottom: '16px' }}>
                    <Paragraph>{selectedAssignment?.extractedText}</Paragraph>
                  </div>
                </TabPane>
                
                {/* Add new Similar Files tab */}
                <TabPane tab="Similar Files" key="similar">
                  <div style={{ padding: '16px' }}>
                    {selectedAssignment?.similarFilename ? (
                      <Card>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong>Most Similar File:</Text>
                          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Text>{selectedAssignment.similarFilename}</Text>
                              <Text type="warning" style={{ color: '#ff4d4f' }}>
                                Similarity: {Math.round(selectedAssignment.similarityRatio * 100)}%
                              </Text>
                            </Space>
                          </div>
                          {selectedAssignment.similarityRatio > 0.7 && (
                            <Text type="danger">
                              Warning: High similarity detected!
                            </Text>
                          )}
                        </Space>
                      </Card>
                    ) : (
                      <Empty description="No similar files found" />
                    )}
                  </div>
                </TabPane>

                {/* Existing tabs */}
                <TabPane tab="Grade & Feedback" key="grade">
                  <Space direction="vertical" style={{ width: '100%', padding: '16px' }}>
                    <Form.Item
                      name="grade"
                      label="Grade"
                      rules={[
                        {
                          type: 'number',
                          transform: (value) => {
                            const num = Number(value);
                            return isNaN(num) ? undefined : num;
                          },
                          min: 0,
                          max: 100,
                          message: 'Grade must be between 0 and 100'
                        }
                      ]}
                    >
                      <Input
                        type="number"
                        placeholder="Enter grade (0-100)"
                        suffix="%"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            viewForm.setFieldsValue({ grade: null });
                          } else {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                              viewForm.setFieldsValue({
                                grade: numValue,
                                status: 'Reviewed'
                              });
                            }
                          }
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="feedback"
                      label="Feedback"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Enter feedback for the student"
                      />
                    </Form.Item>
                  </Space>
                </TabPane>
                <TabPane tab="Notes & Status" key="notes">
                  <Space direction="vertical" style={{ width: '100%', padding: '16px' }}>
                    <Form.Item
                      name="status"
                      label="Status"
                      initialValue="Pending Review"
                    >
                      <Select>
                        <Select.Option value="Pending Review">Pending Review</Select.Option>
                        <Select.Option value="Reviewed">Reviewed</Select.Option>
                        <Select.Option value="Flagged">Flagged</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="notes"
                      label="Private Notes"
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Add private notes about this assignment"
                      />
                    </Form.Item>
                  </Space>
                </TabPane>
              </Tabs>

              <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
                <Space>
                  <Text type="secondary">
                    Last modified: {selectedAssignment?.lastModified 
                      ? new Date(selectedAssignment.lastModified).toLocaleString()
                      : 'Never'}
                  </Text>
                  <Button type="primary" htmlType="submit">
                    Save Changes
                  </Button>
                </Space>
              </div>
            </Form>
          </Modal>

          {/* Edit Assignment Modal */}
          <Modal
            title="Edit Assignment"
            open={isEditModalVisible}
            onCancel={() => setIsEditModalVisible(false)}
            footer={null}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEdit}
            >
              <Form.Item
                name="notes"
                label="Notes"
              >
                <Input.TextArea rows={4} placeholder="Add notes about this assignment" />
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
              >
                <Select
                  options={[
                    { value: 'Pending Review', label: 'Pending Review' },
                    { value: 'Reviewed', label: 'Reviewed' },
                    { value: 'Flagged', label: 'Flagged' }
                  ]}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          {/* Compare Results Modal */}
          <Modal
            title="Similarity Results"
            open={isCompareModalVisible}
            onCancel={() => setIsCompareModalVisible(false)}
            width={800}
            footer={null}
          >
            <List
              dataSource={compareResults}
              renderItem={(item) => (
                <List.Item>
                  <Card style={{ width: '100%' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Similarity: {item.similarity}%</Text>
                      <Space>
                        <Text>Between:</Text>
                        <Text type="secondary">{item.assignment1.fileName}</Text>
                        <Text>and</Text>
                        <Text type="secondary">{item.assignment2.fileName}</Text>
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </Modal>

          {/* Similarity Results */}
          <div>
            {similarityResults.map((result, index) => (
              <div key={index}>File: {result.file}, Similarity: {result.similarity}</div>
            ))}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ClassAssignments;
