import React, { useState, useEffect } from 'react';
import { Layout, List, Upload, Button, message, Typography, Card, Modal, Form, Input, Popconfirm, Tabs, Space, Select, Row, Col, Empty, Iframe, DatePicker, Progress, Radio } from 'antd';
import { UploadOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SwapOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined, DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import pdfToText from 'react-pdftotext';
import { put, del } from '@vercel/blob';
import AssignmentCard from '../components/AssignmentCard';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const convertToVNTime = (utcTimeString) => {
  const date = new Date(utcTimeString);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString()
    .replace('T', ' ')
    .replace('.000Z', '');
};

const ClassAssignments = () => {
  const { classId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
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
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractionMethod, setExtractionMethod] = useState('normal'); // 'normal' or 'ocr'

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

  const extractTextFromPdf = async (file) => {
    try {
      if (extractionMethod === 'ocr') {
        message.info('Using OCR to extract text...');
        return await processScannedPdf(file);
      }

      // Try normal PDF text extraction first
      const text = await pdfToText(file);
      
      // If normal method fails and auto-fallback is needed
      if (!text || text.trim().length === 0) {
        message.info('Standard extraction failed, attempting OCR...');
        return await processScannedPdf(file);
      }
      
      return text;
    } catch (error) {
      console.error('Text extraction failed:', error);
      message.error('Text extraction failed');
      throw error;
    }
  };

  const processScannedPdf = async (file) => {
    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    let fullText = '';

    // Create Tesseract worker
    const worker = await createWorker({
      logger: progress => {
        if (progress.status === 'recognizing text') {
          setOcrProgress(parseInt((progress.progress * 100).toFixed(0)));
        }
      }
    });

    await worker.loadLanguage('vie+eng');
    await worker.initialize('vie+eng');

    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas and context
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to image data
      const imageData = canvas.toDataURL('image/png');
      
      // Perform OCR on the image
      const { data: { text } } = await worker.recognize(imageData);
      fullText += text + '\n';

      message.info(`Processing page ${i} of ${pdf.numPages}`);
    }

    await worker.terminate();
    setOcrProgress(0);
    
    return fullText;
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);

      // Extract text using OCR if needed
      const text = await extractTextFromPdf(file);

      // Find most similar existing assignment
      let mostSimilarFile = '';
      let mostSimilarId = ''; // Add this line
      let highestSimilarity = 0;

      // Compare with existing assignments
      assignments.forEach((assignment) => {
        const similarity = calculateSimilarity(text, assignment.extractedText);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarFile = assignment.fileName;
          mostSimilarId = assignment.id; // Store the ID of the most similar assignment
        }
      });

      // Generate a new assignment ID
      const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments`);
      const newAssignmentId = push(assignmentsRef).key;

      // Create submission data with submitter information and ID
      const submissionData = {
        id: newAssignmentId, // Add the ID to the submission data
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        extractedText: text,
        notes: '',
        status: 'Pending Review',
        grade: null,
        feedback: '',
        lastModified: new Date().toISOString(),
        similarFilename: mostSimilarFile,
        similarAssignmentId: mostSimilarId, // Add ID reference
        similarityRatio: highestSimilarity,
        submitter: {
          role: 'teacher',
          name: currentUser.displayName || 'Unknown Teacher',
          email: currentUser.email,
          id: currentUser.uid
        }
      };

      // Upload PDF to Vercel Blob
      const pdfBuffer = await file.arrayBuffer();
      const { url } = await put(`submissions/${file.name}`, pdfBuffer, { 
        access: 'public', 
        token: "vercel_blob_rw_vuBTDxs1Af4OyipF_7ktfANNunJPJCY1OsqLo4fevvrPM6A" 
      });
      
      // Add file URL to submission data
      submissionData.fileUrl = url;

      // Save to Firebase DB using the generated ID
      await set(ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${newAssignmentId}`), submissionData);

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
      // Delete from Firebase
      const assignmentRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments/${assignmentId}`);
      await remove(assignmentRef);
      message.success('Assignment deleted successfully');
      loadAssignments();
    } catch (error) {
      message.error('Failed to delete assignment');
      console.error(error);
    }
  };

  // Thêm các hàm tính toán độ tương đồng mới
  const calculateSimilarity = (text1, text2) => {
    const words1 = text1.split(/\W+/);
    const words2 = text2.split(/\W+/);
    const wordSet1 = new Set(words1);
    const wordSet2 = new Set(words2);

    const intersection = [...wordSet1].filter(word => wordSet2.has(word)).length;
    const union = wordSet1.size + wordSet2.size - intersection;

    return union === 0 ? 0 : intersection / union;
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

  const ExtractionMethodSelector = () => (
    <Radio.Group 
      value={extractionMethod}
      onChange={(e) => setExtractionMethod(e.target.value)}
      className="mb-2"
    >
      <Radio.Button value="normal">Standard PDF Extraction</Radio.Button>
      <Radio.Button value="ocr">Force OCR</Radio.Button>
    </Radio.Group>
  );

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
      // Log để debug
      console.log('Original Assignment:', originalAssignment);
      console.log('Looking for similar assignment with ID:', originalAssignment.similarAssignmentId);
      console.log('All assignments:', assignments);

      // Tìm bài tập tương tự bằng ID
      const similarAssignment = assignments.find(
        a => a.id === originalAssignment.similarAssignmentId
      );

      console.log('Found similar assignment:', similarAssignment);

      if (similarAssignment) {
        // Cập nhật state cho modal
        setSelectedAssignment(originalAssignment); // Bài gốc
        setComparedAssignment(similarAssignment); // Bài tương tự
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
        <div className="flex justify-between items-center">
          <div>
            <span>Compare Assignments</span>
            <Text type="secondary" className="ml-2 text-sm">
              Similarity: {selectedAssignment?.similarityRatio ? 
                `${Math.round(selectedAssignment.similarityRatio * 100)}%` : 'N/A'}
            </Text>
          </div>
          <Button
            type="text"
            onClick={toggleSyncScrolling}
            icon={<SwapOutlined />}
            className={syncScrolling ? 'text-blue-500' : 'text-gray-500'}
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
      <div className="flex h-[85vh] gap-4">
        {/* Original Assignment PDF */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <Title level={4} className="m-0">{selectedAssignment?.fileName}</Title>
            <Text type="secondary">Current Assignment</Text>
          </div>
          <div 
            className="pdf-container flex-1 border border-gray-300 rounded overflow-auto"
            onScroll={(e) => syncScrolling && handleSyncScroll(e, 'left')}
          >
            <iframe
              src={selectedAssignment?.fileUrl}
              className="w-full h-full border-none"
              title="Original Assignment"
            />
          </div>
        </div>

        {/* Similar Assignment PDF */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <Title level={4} className="m-0">{comparedAssignment?.fileName}</Title>
            <Text type="secondary">Similar Assignment</Text>
          </div>
          <div 
            className="pdf-container flex-1 border border-gray-300 rounded overflow-auto"
            onScroll={(e) => syncScrolling && handleSyncScroll(e, 'right')}
          >
            <iframe
              src={comparedAssignment?.fileUrl}
              className="w-full h-full border-none"
              title="Similar Assignment"
            />
          </div>
        </div>
      </div>
    </Modal>
  );

  const renderSimilarFilesTab = () => (
    <TabPane tab="Similar Files" key="similar">
      <div className="p-4">
        {selectedAssignment?.similarAssignmentId ? (
          <Card>
            <Space direction="vertical" className="w-full">
              <Text strong>Most Similar File:</Text>
              <div className="bg-gray-100 p-3 rounded">
                <Space direction="vertical" className="w-full">
                  <div>
                    <Text>Filename: {selectedAssignment.similarFilename}</Text>
                  </div>
                  <div>
                    <Text type="secondary">ID: {selectedAssignment.similarAssignmentId}</Text>
                  </div>
                  <Text type="warning" className="text-red-500">
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
                <Text type="danger" className="mt-2">
                  Warning: High similarity detected! Please review carefully.
                </Text>
              )}
            </Space>
          </Card>
        ) : (
          <Empty description="No similar files found" />
        )}
      </div>
    </TabPane>
  );

  const exportGrades = () => {
    try {
      // Prepare data for export
      const exportData = filteredAssignments.map((assignment, index) => ({
        'No.': index + 1,
        'File Name': assignment.fileName,
        'Assignment ID': assignment.id,
        'Upload Time': convertToVNTime(assignment.uploadDate),  // Changed this line
        'Grade': assignment.grade/10 || 'Not graded',
        'Status': assignment.status,
        'Feedback': assignment.feedback || '',
        'Similarity': assignment.similarityRatio ? `${Math.round(assignment.similarityRatio * 100)}%` : 'N/A',
        'Similar File ID': assignment.similarAssignmentId || 'None',
        'Similar File': assignment.similarFilename || 'None'
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grades");

      // Auto-size columns
      const colWidths = [
        { wch: 5 },  // No.
        { wch: 30 }, // File Name
        { wch: 12 }, // Upload Date
        { wch: 8 },  // Grade
        { wch: 15 }, // Status
        { wch: 40 }, // Feedback
        { wch: 12 }, // Similarity
        { wch: 30 }, // Similar File
      ];
      ws['!cols'] = colWidths;

      // Generate filename with class name and date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${classData?.className || 'Class'}_Grades_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      message.success('Grades exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export grades');
    }
  };

  // Add this function to handle navigation to statistics page
  const handleNavigateToStats = () => {
    navigate(`/class/${classId}/statistics`);
  };

  return (
    <Layout className="min-h-screen ">
      <Navbar />
      <Content className="p-6  bg-gradient-to-br from-blue-100 to-blue-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Title level={2} className="flex items-center">
                {classData?.className || 'Class Assignments'} 
                <Text type="secondary" className="text-base ml-3">
                  (Code: {classData?.classCode})
                </Text>
              </Title>
              <Text type="secondary">{classData?.description}</Text>
            </div>
            
            <Space direction="vertical" align="end">
              <Space>
                <Button 
                  icon={<BarChartOutlined />}
                  onClick={handleNavigateToStats}
                  type="primary"
                  ghost
                >
                  View Statistics
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={exportGrades}
                  disabled={filteredAssignments.length === 0}
                >
                  Export Grades
                </Button>
              </Space>
              
              {/* Add extraction method selector above upload button */}
              <div className="text-right">
                <ExtractionMethodSelector />
                <Upload {...uploadProps}>
                  <Button 
                    type="primary" 
                    icon={<UploadOutlined />}
                    loading={uploading}
                  >
                    Upload Assignment
                  </Button>
                </Upload>
              </div>
            </Space>
          </div>

          {/* Search, Filter, and Sort Controls */}
          <Row gutter={16} className="mb-4" align="middle">
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
              gutter: [16, 16],
              xs: 1,    // 1 card per row on extra small screens
              sm: 2,    // 2 cards per row on small screens
              md: 3,    // 3 cards per row on medium screens
              lg: 4,    // 4 cards per row on large screens
              xl: 4,    // 4 cards per row on extra large screens
              xxl: 4,   // 4 cards per row on extra extra large screens
            }}
            dataSource={filteredAssignments}
            loading={loading}
            className="flex flex-col items-stretch"
            renderItem={(item) => (
              <List.Item className="flex justify-center m-0">
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
              className="space-y-4 "
            >
              <Tabs defaultActiveKey="content">
                {/* Add new Submitter Info tab before existing tabs */}
                <TabPane tab="Submitter Info" key="submitter">
                  <div className="p-4">
                    <Card>
                      <Space direction="vertical" className="w-full">
                        <div className="mb-4">
                          <Text strong className="text-base">
                            Submission Details
                          </Text>
                        </div>
                        
                        {selectedAssignment?.submitter ? (
                          <>
                            <div className="bg-gray-100 p-4 rounded-lg mb-4">
                              <Space direction="vertical" size="small" className="w-full">
                                <div>
                                  <Text type="secondary">Role:</Text>
                                  <Text strong className="ml-2">
                                    {selectedAssignment.submitter.role === 'student' ? '👨‍🎓 Student' : '👨‍🏫 Teacher'}
                                  </Text>
                                </div>
                                <div>
                                  <Text type="secondary">Name:</Text>
                                  <Text strong className="ml-2">
                                    {selectedAssignment.submitter.role === 'student' 
                                      ? selectedAssignment.submitter.name
                                      : selectedAssignment.submitter.name}
                                  </Text>
                                </div>
                                {selectedAssignment.submitter.role === 'student' && (
                                  <div>
                                    <Text type="secondary">Student ID:</Text>
                                    <Text strong className="ml-2">
                                      {selectedAssignment.submitter.id}
                                    </Text>
                                  </div>
                                )}
                                <div>
                                  <Text type="secondary">Email:</Text>
                                  <Text strong className="ml-2">
                                    {selectedAssignment.submitter.email}
                                  </Text>
                                </div>
                              </Space>
                            </div>
                            
                            <div>
                              <Text type="secondary">Submitted on:</Text>
                              <Text strong className="ml-2">
                                {convertToVNTime(selectedAssignment.uploadDate)}
                              </Text>
                            </div>
                          </>
                        ) : (
                          <Empty description="No submitter information available" />
                        )}
                      </Space>
                    </Card>
                  </div>
                </TabPane>

                {/* Existing tabs */}
                <TabPane tab="Content" key="content">
                  <div className="max-h-[40vh] overflow-auto p-4 mb-4">
                    <Paragraph>{selectedAssignment?.extractedText}</Paragraph>
                  </div>
                </TabPane>

                {/* Add new Similar Files tab */}
                {renderSimilarFilesTab()}

                {/* Existing tabs */}
                <TabPane tab="Grade & Feedback" key="grade">
                  <Space direction="vertical" className="w-full p-4">
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
                  <Space direction="vertical" className="w-full p-4">
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

              <div className="p-4 border-t border-gray-200 text-right">
                <Space>
                  <Text type="secondary">
                    Last modified: {selectedAssignment?.lastModified 
                      ? convertToVNTime(selectedAssignment.lastModified)
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
            <iframe src={pdfUrl} className="w-full h-[500px]" frameBorder="0"></iframe>
          </Modal>

          {/* Similarity Results */}
          <div>
            {similarityResults.map((result, index) => (
              <div key={index}>File: {result.file}, Similarity: {result.similarity}</div>
            ))}
          </div>

          {/* Add the new Compare Modal */}
          {renderCompareModal()}

          {/* Add OCR progress indicator */}
          {ocrProgress > 0 && (
            <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
              <div className="text-center">
                <Text>Processing OCR</Text>
                <Progress percent={ocrProgress} status="active" />
              </div>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );

};

export default ClassAssignments;
