import React from 'react';
import { Avatar } from '../Avatar';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  alt, 
  name, 
  size = 'large',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  const [showFallback, setShowFallback] = React.useState(false);

  // Se não tem src ou deve mostrar fallback, mostrar avatar genérico
  if (!src || showFallback) {
    return (
      <div className={className}>
        <Avatar
          shape="circle"
          size={size}
        />
      </div>
    );
  }

  // Sempre tentar mostrar a foto
  return (
    <div className={className}>
      <img
        src={src}
        alt={alt || name || 'Usuário'}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 hover:border-orange-500 transition-colors duration-200`}
        onError={() => setShowFallback(true)}
      />
    </div>
  );
};
