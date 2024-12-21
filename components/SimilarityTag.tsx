import React from 'react';

interface SimilarityTagProps {
  similarity: number;
}

export const SimilarityTag: React.FC<SimilarityTagProps> = ({ similarity }) => {
  if (similarity <= 60) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      {similarity}% similar
    </span>
  );
};
