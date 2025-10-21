import React from 'react';

interface MapLoadingOverlayProps {
  message?: string;
}

export const MapLoadingOverlay: React.FC<MapLoadingOverlayProps> = ({ 
  message = "Carregando mapa..." 
}) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      {/* Apple-style spinner */}
      <div 
        style={{
          width: 60,
          height: 60,
          position: 'relative',
          marginBottom: 24
        }}
      >
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          style={{
            animation: 'spin 1s linear infinite'
          }}
        >
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke="#007AFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="40 120"
            style={{
              transformOrigin: 'center',
            }}
          />
        </svg>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 500,
          color: '#1d1d1f',
          marginBottom: 8,
          letterSpacing: '-0.022em'
        }}
      >
        {message}
      </div>

      {/* Animated dots */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center'
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#86868b',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
        `}
      </style>
    </div>
  );
};

