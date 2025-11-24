import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'sm', 
  color = '#FF9800' 
}) => {
  const sizeValues: { [key in 'sm' | 'md' | 'lg' | 'xl']: number } = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  return (
    <div className="flex items-center justify-center">
      <svg
        width={sizeValues[size]}
        height={sizeValues[size]}
        viewBox="0 0 24 24"
        className="animate-spin"
        style={{ 
          animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          transformOrigin: 'center'
        }}
      >
        <defs>
          <linearGradient id={`gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="50%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke={`url(#gradient-${size})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="60 158"
          style={{
            transformOrigin: 'center',
            strokeDashoffset: '0'
          }}
        />
      </svg>
      <style>{`
        @keyframes apple-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
