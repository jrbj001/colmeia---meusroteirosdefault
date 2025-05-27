import React from 'react';

interface LogoProps {
  className?: string;
  short?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', short = false }) => {
  return (
    <img
      src={short ? "/logo_colmeia_short.png" : "/logo_colmeia.png"}
      alt="Logo Colmeia"
      className={`h-[25px] w-auto ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}; 