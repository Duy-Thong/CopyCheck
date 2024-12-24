import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Typography, Statistic, Space, Progress, Tabs } from 'antd';
import { PieChart, Pie, BarChart, Bar, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useParams } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { FileTextOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ClassStatistics = () => {
  const { classId } = useParams();
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [classData, setClassData] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [studentPerformance, setStudentPerformance] = useState([]);

  useEffect(() => {
    loadClassData();
    loadAssignments();
  }, [classId]);

  const loadClassData = async () => {
    try {
      const classRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}`);
      const snapshot = await get(classRef);
      if (snapshot.exists()) {
        setClassData(snapshot.val());
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const assignmentsRef = ref(database, `teachers/${currentUser.uid}/classes/${classId}/assignments`);
      const snapshot = await get(assignmentsRef);
      if (snapshot.exists()) {
        const assignmentsData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const getStatistics = () => {
    const total = assignments.length;
    const reviewed = assignments.filter(a => a.status === 'Reviewed').length;
    const pending = assignments.filter(a => a.status === 'Pending Review').length;
    const flagged = assignments.filter(a => a.status === 'Flagged').length;

    const highSimilarity = assignments.filter(a => (a.similarityRatio || 0) >= 0.7).length;
    const mediumSimilarity = assignments.filter(a => {
      const ratio = a.similarityRatio || 0;
      return ratio >= 0.4 && ratio < 0.7;
    }).length;
    const lowSimilarity = assignments.filter(a => (a.similarityRatio || 0) < 0.4).length;

    const averageGrade = assignments
      .filter(a => a.grade !== null && a.grade !== undefined)
      .reduce((acc, curr, idx, arr) => {
        acc += curr.grade;
        return idx === arr.length - 1 ? acc / arr.length : acc;
      }, 0);

    // Calculate submission timing
    const onTime = assignments.filter(a => new Date(a.submissionDate) <= new Date(a.dueDate)).length;
    const late = assignments.filter(a => new Date(a.submissionDate) > new Date(a.dueDate)).length;

    // Calculate grade distribution
    const gradeRanges = {
      excellent: assignments.filter(a => a.grade >= 90).length,
      good: assignments.filter(a => a.grade >= 70 && a.grade < 90).length,
      average: assignments.filter(a => a.grade >= 50 && a.grade < 70).length,
      poor: assignments.filter(a => a.grade < 50 && a.grade != null).length
    };

    return {
      total,
      reviewed,
      pending,
      flagged,
      highSimilarity,
      mediumSimilarity,
      lowSimilarity,
      averageGrade: isNaN(averageGrade) ? 0 : averageGrade,
      onTime,
      late,
      gradeRanges,
    };
  };

  const getSubmissionTimelineData = () => {
    const sortedAssignments = [...assignments].sort((a, b) => 
      new Date(a.submissionDate) - new Date(b.submissionDate)
    );

    return sortedAssignments.map((assignment, index) => {
      const submissionDate = new Date(assignment.submissionDate);
      return {
        name: submissionDate.toLocaleDateString(),
        submissions: index + 1,
        onTime: new Date(assignment.submissionDate) <= new Date(assignment.dueDate) ? 'On Time' : 'Late',
        color: new Date(assignment.submissionDate) <= new Date(assignment.dueDate) ? '#52c41a' : '#ff4d4f'
      };
    });
  };

  const submissionTimelineData = getSubmissionTimelineData();

  const stats = getStatistics();

  const COLORS = {
    excellent: '#52c41a',
    good: '#1890ff',
    average: '#faad14',
    poor: '#ff4d4f'
  };

  const gradeDistributionData = [
    { name: 'Excellent (90-100%)', value: stats.gradeRanges.excellent, color: COLORS.excellent },
    { name: 'Good (70-89%)', value: stats.gradeRanges.good, color: COLORS.good },
    { name: 'Average (50-69%)', value: stats.gradeRanges.average, color: COLORS.average },
    { name: 'Poor (<50%)', value: stats.gradeRanges.poor, color: COLORS.poor },
  ];

  const similarityChartData = [
    { name: 'High Similarity', value: stats.highSimilarity, color: '#ff4d4f' },
    { name: 'Medium Similarity', value: stats.mediumSimilarity, color: '#faad14' },
    { name: 'Low Similarity', value: stats.lowSimilarity, color: '#52c41a' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Header with improved styling */}
          <Card className="statistics-header" style={{ marginBottom: 24, background: '#1890ff' }}>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              {classData?.className || 'Class'} Statistics
              <Text style={{ fontSize: '16px', marginLeft: '12px', color: 'rgba(255,255,255,0.85)' }}>
                (Code: {classData?.classCode})
              </Text>
            </Title>
          </Card>

          {/* Summary Cards with improved styling */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Assignments"
                  value={stats.total}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Pending Review"
                  value={stats.pending}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Reviewed"
                  value={stats.reviewed}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Flagged"
                  value={stats.flagged}
                  prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Card>
            </Col>
          </Row>

          <Tabs defaultActiveKey="1" style={{ marginBottom: 24 }}>
            <TabPane tab="Grade Analysis" key="1">
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Grade Distribution" bordered={false}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={gradeDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {gradeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Grade Summary" bordered={false}>
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Title level={4}>Grade Summary</Title>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text>Total Graded: {assignments.filter(a => a.grade != null).length}</Text>
                        <Text>Ungraded: {assignments.filter(a => a.grade == null).length}</Text>
                        <Text>Highest Grade: {Math.max(...assignments.map(a => a.grade || 0))}%</Text>
                        <Text>Lowest Grade: {Math.min(...assignments.filter(a => a.grade != null).map(a => a.grade))}%</Text>
                      </Space>
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Similarity Analysis" key="2">
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="Similarity Distribution" bordered={false}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={similarityChartData}>
                        <Bar dataKey="value">
                          {similarityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                        <Tooltip />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Submission Timing" key="3">
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="Submission Timeline" bordered={false}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={submissionTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="submissions" 
                          stroke="#1890ff"
                          strokeWidth={2}
                          dot={{ fill: data => data.color }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card bordered={false}>
                    <Statistic
                      title="On-time Submissions"
                      value={stats.onTime}
                      suffix={`/ ${stats.total}`}
                      valueStyle={{ color: '#52c41a' }}
                    />
                    <Progress 
                      percent={Math.round((stats.onTime / stats.total) * 100)} 
                      strokeColor="#52c41a"
                      strokeWidth={10}
                      status="active"
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card bordered={false}>
                    <Statistic
                      title="Late Submissions"
                      value={stats.late}
                      suffix={`/ ${stats.total}`}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                    <Progress 
                      percent={Math.round((stats.late / stats.total) * 100)} 
                      strokeColor="#ff4d4f"
                      strokeWidth={10}
                      status="active"
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </Layout>
  );
};

// Add these styles to your CSS
const styles = `
.statistics-header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.ant-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.ant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.ant-tabs-nav {
  margin-bottom: 16px;
}

.ant-progress-circle {
  transition: all 0.3s;
}

.ant-progress-circle:hover {
  transform: scale(1.05);
}
`;

export default ClassStatistics;
