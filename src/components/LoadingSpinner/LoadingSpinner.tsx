import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
  </div>
);
