import React from 'react';

interface SkeletonLoaderProps {
  type?: 'select' | 'text' | 'card' | 'map';
  count?: number;
  height?: string;
  width?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'text', 
  count = 1,
  height = 'h-10',
  width = 'w-full'
}) => {
  const items = Array.from({ length: count });

  const renderSkeleton = () => {
    switch (type) {
      case 'select':
        return (
          <div className={`${height} ${width} bg-gray-200 rounded-lg animate-pulse`}>
            <div className="flex items-center justify-between px-4 h-full">
              <div className="h-4 bg-gray-300 rounded w-1/3 animate-shimmer"></div>
              <div className="h-3 bg-gray-300 rounded w-3 animate-shimmer"></div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`${height} ${width} bg-gray-200 rounded animate-pulse`}>
            <div className="h-4 bg-gray-300 rounded w-3/4 animate-shimmer"></div>
          </div>
        );
      
      case 'card':
        return (
          <div className={`${height} ${width} bg-gray-200 rounded-lg p-4 animate-pulse`}>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-1/2 animate-shimmer"></div>
              <div className="h-3 bg-gray-300 rounded w-full animate-shimmer"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3 animate-shimmer"></div>
            </div>
          </div>
        );
      
      case 'map':
        return (
          <div className={`${height} ${width} bg-gray-200 rounded-lg animate-pulse relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-shimmer"></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {items.map((_, index) => (
        <div key={index} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};
