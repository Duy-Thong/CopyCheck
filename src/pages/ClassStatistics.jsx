import React, { useState, useEffect } from 'react';
import { Layout, Typography, Tabs, Statistic, Space, Progress } from 'antd';
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
    <Layout className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300">
      <Navbar />
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="glass rounded-xl p-6 mb-6 glassmorphism">
            <Title level={2} className="text-white m-0">
              {classData?.className || 'Class'} Statistics
              <Text className="text-base ml-3 opacity-85">
                (Code: {classData?.classCode})
              </Text>
            </Title>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-5 glassmorphism ">
            <div className="glass rounded-xl p-6 transition-all hover:scale-105">
              <Statistic
                title={<span className="text-black">Total Assignments</span>}
                value={stats.total}
                prefix={<FileTextOutlined className="text-black" />}
                valueStyle={{ color: 'black' }}
              />
            </div>
            <div className="glass rounded-xl p-6 transition-all hover:scale-105">
              <Statistic
                title={<span className="text-black">Pending Review</span>}
                value={stats.pending}
                prefix={<ClockCircleOutlined className="text-black" />}
                valueStyle={{ color: 'black' }}
              />
            </div>
            <div className="glass rounded-xl p-6 transition-all hover:scale-105 ">
              <Statistic
                title={<span className="text-black">Reviewed</span>}
                value={stats.reviewed}
                prefix={<CheckCircleOutlined className="text-black" />}
                valueStyle={{ color: 'black' }}
              />
            </div>
            <div className="glass rounded-xl p-6 transition-all hover:scale-105">
              <Statistic
                title={<span className="text-black">Flagged</span>}
                value={stats.flagged}
                prefix={<WarningOutlined className="text-black" />}
                valueStyle={{ color: 'black' }}
              />
            </div>
          </div>

          {/* Tabs Section */}
          <div className="glass rounded-xl p-6  glassmorphism">
            <Tabs 
              defaultActiveKey="1"
              className="text-black "
              items={[
                {
                  key: '1',
                  label: 'Grade Analysis',
                  children: (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="glass rounded-xl p-6">
                        <h3 className="text-black mb-4">Grade Distribution</h3>
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
                      </div>
                      <div className="glass rounded-xl p-6">
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <Title level={4} className="text-black">Grade Summary</Title>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text className="text-black">Total Graded: {assignments.filter(a => a.grade != null).length}</Text>
                            <Text className="text-black">Ungraded: {assignments.filter(a => a.grade == null).length}</Text>
                            <Text className="text-black">Highest Grade: {Math.max(...assignments.map(a => a.grade || 0))}%</Text>
                            <Text className="text-black">Lowest Grade: {Math.min(...assignments.filter(a => a.grade != null).map(a => a.grade))}%</Text>
                          </Space>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: 'Similarity Analysis',
                  children: (
                    <div className="glass rounded-xl p-6">
                      <h3 className="text-black mb-4">Similarity Distribution</h3>
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
                    </div>
                  ),
                },
                {
                  key: '3',
                  label: 'Submission Timing',
                  children: (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="glass rounded-xl p-6">
                        <h3 className="text-black mb-4">Submission Timeline</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={submissionTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              className="text-black"
                            />
                            <YAxis className="text-black" />
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
                      </div>
                      <div className="glass rounded-xl p-6">
                        <Statistic
                          title={<span className="text-black">On-time Submissions</span>}
                          value={stats.onTime}
                          suffix={`/ ${stats.total}`}
                          valueStyle={{ color: 'black' }}
                        />
                        <Progress 
                          percent={Math.round((stats.onTime / stats.total) * 100)} 
                          strokeColor="#52c41a"
                          strokeWidth={10}
                          status="active"
                        />
                      </div>
                      <div className="glass rounded-xl p-6">
                        <Statistic
                          title={<span className="text-black">Late Submissions</span>}
                          value={stats.late}
                          suffix={`/ ${stats.total}`}
                          valueStyle={{ color: 'black' }}
                        />
                        <Progress 
                          percent={Math.round((stats.late / stats.total) * 100)} 
                          strokeColor="#ff4d4f"
                          strokeWidth={10}
                          status="active"
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ClassStatistics;
