import React, { useState } from 'react';
import { Card, Space, Button, Popconfirm, Typography, Tag, Tooltip, Modal, List, Progress } from 'antd';
import { FileTextOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const AssignmentCard = ({ assignment, onDelete, onViewPdf, onCardClick, style }) => {
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [similarFilesVisible, setSimilarFilesVisible] = useState(false);

  const getSimilarityColor = (ratio) => {
    const percentage = Math.round(ratio * 100);
    if (percentage >= 70) return 'red';
    if (percentage >= 40) return 'orange';
    return 'green';
  };

  const renderSimilarityBadge = () => {
    if (!assignment.similarFiles || assignment.similarFiles.length === 0) return null;
    
    const highestSimilarity = Math.max(...assignment.similarFiles.map(f => f.similarity));
    const similarCount = assignment.similarFiles.length;

    return (
      <Tooltip title={`Click to see ${similarCount} similar files`}>
        <Tag 
          color={getSimilarityColor(highestSimilarity/100)}
          className="rounded-full px-2 text-xs cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSimilarFilesVisible(true);
          }}
        >
          {similarCount} Similar ({Math.round(highestSimilarity)}%)
        </Tag>
      </Tooltip>
    );
  };

  return (
    <>
      <Card
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...style
        }}
        hoverable
        className="w-full min-h-[160px] transition-all duration-300 hover:shadow-lg"
        bodyStyle={{ padding: '12px' }}
        onClick={(e) => {
          // Don't trigger card click if clicking on action buttons
          if (e.target.closest('.ant-card-actions')) return;
          onCardClick(assignment);
        }}
        actions={[
          <Tooltip title="Delete Assignment">
            <Popconfirm
              title="Delete assignment"
              description="Are you sure you want to delete this assignment?"
              onConfirm={(e) => {
                e.stopPropagation();
                onDelete(assignment.id);
              }}
              okText="Yes"
              cancelText="No"
            >
              <DeleteOutlined 
                key="delete" 
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-red-500 transition-colors text-sm" 
              />
            </Popconfirm>
          </Tooltip>,
          <Button 
            type="link" 
            key="view" 
            onClick={(e) => {
              e.stopPropagation();
              setIsPdfModalVisible(true);
            }}
            className="hover:text-blue-600 text-sm p-0"
            size="small"
          >
            View PDF
          </Button>
        ]}
      >
        <div className="flex flex-col gap-2" style={{ flex: 1, minHeight: '120px' }}>
          {/* Header */}
          <div className="flex items-start gap-2">
            <FileTextOutlined className="text-lg mt-1 text-blue-500" />
            <div className="flex-1 flex flex-col gap-1">
              <Text strong className="text-sm truncate">
                {assignment.fileName}
              </Text>
              <div className="flex items-center gap-1">
                <ClockCircleOutlined className="text-xs" />
                <Text type="secondary" className="text-xs">
                  {new Date(assignment.uploadDate).toLocaleDateString()}
                </Text>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="flex flex-wrap gap-1">
            <Tag 
              color={assignment.status === 'Flagged' ? 'red' : 
                     assignment.status === 'Reviewed' ? 'green' : 'blue'}
              className="rounded-full px-2 text-xs"
            >
              {assignment.status}
            </Tag>

            {renderSimilarityBadge()}

            {assignment.grade && (
              <Tag 
                color="processing" 
                className="rounded-full px-2 text-xs"
              >
                Grade: {assignment.grade}%
              </Tag>
            )}
          </div>
        </div>
      </Card>

      {/* Similar Files Modal */}
      <Modal
        title="Similar Assignments"
        open={similarFilesVisible}
        onCancel={() => setSimilarFilesVisible(false)}
        footer={null}
      >
        <List
          dataSource={assignment.similarFiles || []}
          renderItem={similar => (
            <List.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>{similar.fileName}</Text>
                <Progress 
                  percent={Math.round(similar.similarity)} 
                  status={similar.similarity >= 70 ? 'exception' : 'normal'}
                  size="small"
                />
                <Text type="secondary">
                  Uploaded: {new Date(similar.uploadDate).toLocaleDateString()}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={assignment.fileName}
        open={isPdfModalVisible}
        onCancel={() => setIsPdfModalVisible(false)}
        width="80%"
        style={{ top: 20 }}
        footer={null}
      >
        <iframe
          src={assignment.fileUrl}
          style={{ width: '100%', height: '80vh' }}
          title="PDF Viewer"
        />
      </Modal>
    </>
  );
};

export default AssignmentCard;
