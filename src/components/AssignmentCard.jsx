import React, { useState } from 'react';
import { Card, Space, Button, Popconfirm, Typography, Tag, Tooltip, Modal } from 'antd';
import { FileTextOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const AssignmentCard = ({ assignment, onDelete, onViewPdf, onCardClick, style }) => {
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);

  const getSimilarityColor = (ratio) => {
    const percentage = Math.round(ratio * 100);
    if (percentage >= 70) return 'red';
    if (percentage >= 40) return 'orange';
    return 'green';
  };

  return (
    <>
      <Card
        style={{
          width: '100%',
          height: '100%',
          ...style
        }}
        hoverable
        className="w-full min-h-[180px] glassmorphism [&_.ant-card-actions]:!bg-transparent" // Added transparent background for actions
        bodyStyle={{ padding: '16px' }} // Tăng padding
        onClick={(e) => {
          // Don't trigger card click if clicking on action buttons
          if (e.target.closest('.ant-card-actions')) return;
          onCardClick(assignment);
        }}
        actions={[
          <Tooltip title="Delete Assignment" >
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
                className="!text-red-500 hover:text-red-500 transition-colors" // Removed background styling
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
            className="hover:text-blue-600 text-sm " // Removed padding and background
            size="small"
          >
            View PDF
          </Button>
        ]}
      >
        <div className="flex flex-col h-full justify-between gap-3"> {/* Thêm justify-between và gap */}
          {/* Header with Filename */}
          <div className="flex items-start gap-3"> {/* Tăng gap */}
            <FileTextOutlined className="text-xl mt-1 text-blue-500 flex-shrink-0" /> {/* Tăng kích thước icon */}
            <div className="flex-1 min-w-0 space-y-2"> {/* Thêm space-y-2 để tạo khoảng cách dọc */}
              <Tooltip title={assignment.fileName}>
                <Text strong className="text-sm block truncate whitespace-normal break-words line-clamp-2 "> {/* Cho phép xuống 2 dòng */}
                  {assignment.fileName}
                </Text>
              </Tooltip>
              <div className="flex items-center gap-2">
                <ClockCircleOutlined className="text-xs flex-shrink-0 text-black" />
                <Text type="secondary" className="text-xs text-black">
                  {new Date(assignment.uploadDate).toLocaleDateString('vi-VN')} {/* Định dạng ngày kiểu VN */}
                </Text>
              </div>
            </div>
          </div>

          {/* Tags Section - Điều chỉnh layout */}
          <div className="flex flex-wrap gap-2"> {/* Tăng gap giữa các tag */}
            <Tooltip title={`Status: ${assignment.status}`}>
              <Tag 
                color={assignment.status === 'Flagged' ? 'red' : 
                       assignment.status === 'Reviewed' ? 'green' : 'blue'}
                className="rounded-full px-3 py-1 text-xs truncate max-w-[130px]" // Tăng padding và max-width
              >
                {assignment.status}
              </Tag>
            </Tooltip>

            {assignment.similarFilename && (
              <Tooltip title={`Similar to: ${assignment.similarFilename}`}>
                <Tag 
                  color={getSimilarityColor(assignment.similarityRatio)}
                  className="rounded-full px-3 py-1 text-xs truncate max-w-[130px]"
                >
                  {Math.round(assignment.similarityRatio * 100)}% Similar
                </Tag>
              </Tooltip>
            )}

            {assignment.grade && (
              <Tooltip title={`Grade: ${assignment.grade}%`}>
                <Tag 
                  color="processing" 
                  className="rounded-full px-3 py-1 text-xs truncate max-w-[110px]"
                >
                  Grade: {assignment.grade}%
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>

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
          className="w-full h-[80vh]"
          title="PDF Viewer"
        />
      </Modal>
    </>
  );
};

export default AssignmentCard;
