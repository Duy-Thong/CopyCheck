import React, { useState, useEffect } from 'react';
import { Layout, List, Upload, Button, message, Typography, Card, Modal, Form, Input, Popconfirm, Tabs, Space, Select, Row, Col, Empty, Iframe, DatePicker } from 'antd';
import { UploadOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SwapOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import pdfToText from 'react-pdftotext';
import { put } from '@vercel/blob';
import AssignmentCard from '../components/AssignmentCard';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

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
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewForm] = Form.useForm();
  const [form] = Form.useForm();
  const [similarityResults, setSimilarityResults] = useState([]);
  const [fileInput, setFileInput] = useState(null);
  const [newAssignment, setNewAssignment] = useState(null);
  const [similarityFilter, setSimilarityFilter] = useState('all');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [isCompareModalVisible, setIsCompareModalVisible] = useState(false);
  const [comparedAssignment, setComparedAssignment] = useState(null);
  const [syncScrolling, setSyncScrolling] = useState(true);

  useEffect(() => {
    loadClassData();
    loadAssignments();
  }, [classId]);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, searchText, statusFilter, sortOrder, similarityFilter, dateRange]);

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
      const assignmentData = {
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
      };

      // Upload PDF to Vercel Blob
      const pdfBuffer = await file.arrayBuffer();
      const { url } = await put(`CopyCheck/${file.name}`, pdfBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
      console.log('File uploaded to:', url);

      // Save the URL to Firebase DB
      await set(ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${newAssignmentId}`), {
        ...assignmentData,
        fileUrl: url // Add the file URL here
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
    let filtered = [...assignments].filter(assignment => assignment && assignment.fileName);

    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(assignment => {
        const uploadDate = new Date(assignment.uploadDate);
        return uploadDate >= dateRange[0].startOf('day') && 
               uploadDate <= dateRange[1].endOf('day');
      });
    }

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

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
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

  const showPdfModal = (url) => {
    setPdfUrl(url);
    setIsPdfModalVisible(true);
  };

  const handleClosePdfModal = () => {
    setIsPdfModalVisible(false);
  };

  const showCompareModal = async (originalAssignment) => {
    try {
      const similarAssignment = assignments.find(
        a => a.fileName === originalAssignment.similarFilename
      );
      
      if (similarAssignment) {
        setComparedAssignment(similarAssignment);
        setIsCompareModalVisible(true);
      } else {
        message.error('Could not find the similar assignment for comparison');
      }
    } catch (error) {
      console.error('Error showing comparison:', error);
      message.error('Failed to load comparison view');
    }
  };

  const handleSyncScroll = (event, source) => {
    if (!syncScrolling) return;
    
    const container = event.target;
    const containers = document.querySelectorAll('.pdf-container');
    
    containers.forEach(elem => {
      if (elem !== container) {
        elem.scrollTop = container.scrollTop;
      }
    });
  };

  const toggleSyncScrolling = () => {
    setSyncScrolling(!syncScrolling);
  };

  const renderCompareModal = () => (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Compare Assignments</span>
          <Button
            type="text"
            onClick={toggleSyncScrolling}
            icon={<SwapOutlined />}
            style={{ color: syncScrolling ? '#1890ff' : '#999' }}
          >
            {syncScrolling ? 'Sync ON' : 'Sync OFF'}
          </Button>
        </div>
      }
      open={isCompareModalVisible}
      onCancel={() => setIsCompareModalVisible(false)}
      width="95%"
      style={{ top: 20 }}
      footer={null}
    >
      <div style={{ display: 'flex', height: '85vh', gap: '16px' }}>
        {/* Original Assignment PDF */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Title level={4}>{selectedAssignment?.fileName}</Title>
          <div 
            className="pdf-container"
            onScroll={(e) => syncScrolling && handleSyncScroll(e, 'left')}
            style={{ 
              flex: 1, 
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              overflow: 'auto'
            }}
          >
            <object
              data={selectedAssignment?.fileUrl}
              type="application/pdf"
              style={{ 
                width: '100%',
                height: '100%'
              }}
            >
              <p>Unable to display PDF. <a href={selectedAssignment?.fileUrl} target="_blank" rel="noopener noreferrer">Download</a> instead.</p>
            </object>
          </div>
        </div>

        {/* Similar Assignment PDF */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Title level={4}>{comparedAssignment?.fileName}</Title>
          <div 
            className="pdf-container"
            onScroll={(e) => syncScrolling && handleSyncScroll(e, 'right')}
            style={{ 
              flex: 1, 
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              overflow: 'auto'
            }}
          >
            <object
              data={comparedAssignment?.fileUrl}
              type="application/pdf"
              style={{ 
                width: '100%',
                height: '100%'
              }}
            >
              <p>Unable to display PDF. <a href={comparedAssignment?.fileUrl} target="_blank" rel="noopener noreferrer">Download</a> instead.</p>
            </object>
          </div>
        </div>
      </div>
    </Modal>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <Title level={2}>
                {classData?.className || 'Class Assignments'} 
                <Text type="secondary" style={{ fontSize: '16px', marginLeft: '12px' }}>
                  (Code: {classData?.classCode})
                </Text>
              </Title>
              <Text type="secondary">{classData?.description}</Text>
            </div>
            
            
            <Space>
              
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
          <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
            <Col flex="200px">
              <Input
                placeholder="Search by filename"
                prefix={<SearchOutlined />}
                onChange={(e) => handleSearch(e.target.value)}
                value={searchText}
                allowClear
              />
            </Col>
            <Col flex="180px">
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
            <Col flex="180px">
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
            <Col flex="280px">
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateRangeChange}
                placeholder={['Start Date', 'End Date']}
              />
            </Col>
            <Col flex="120px">
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
              gutter: [16, 16], // Equal horizontal and vertical spacing
              xs: 1,
              sm: 1,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 3, // Changed from 4 to 3 for better consistency
            }}
            dataSource={filteredAssignments}
            loading={loading}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch'
            }}
            renderItem={(item) => (
              <List.Item style={{ 
                display: 'flex',
                justifyContent: 'center',
                margin: 0
              }}>
                <AssignmentCard
                  assignment={item}
                  onDelete={handleDelete}
                  onViewPdf={showPdfModal}
                  onCardClick={showAssignmentContent}
                />
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
                              <Button 
                                type="primary" 
                                icon={<SwapOutlined />}
                                onClick={() => showCompareModal(selectedAssignment)}
                              >
                                Compare Files
                              </Button>
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

          {/* PDF Modal */}
          <Modal
            title="View PDF"
            visible={isPdfModalVisible}
            onCancel={handleClosePdfModal}
            footer={null}
          >
            <iframe src={pdfUrl} style={{ width: '100%', height: '500px' }} frameBorder="0"></iframe>
          </Modal>

          {/* Similarity Results */}
          <div>
            {similarityResults.map((result, index) => (
              <div key={index}>File: {result.file}, Similarity: {result.similarity}</div>
            ))}
          </div>

          {/* Add the new Compare Modal */}
          {renderCompareModal()}
        </div>
      </Content>
    </Layout>
  );
};

export default ClassAssignments;
