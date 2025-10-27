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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Esconder a imagem e mostrar o avatar genérico
    e.currentTarget.style.display = 'none';
    const avatarElement = e.currentTarget.nextElementSibling as HTMLElement;
    if (avatarElement) {
      avatarElement.classList.remove('hidden');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {src ? (
        <>
          <img
            src={src}
            alt={alt || name || 'Usuário'}
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 hover:border-orange-500 transition-colors duration-200`}
            onError={handleImageError}
          />
          <Avatar
            className="!absolute !top-0 !left-0 hidden"
            shape="circle"
            size={size}
          />
        </>
      ) : (
        <Avatar
          className="!relative"
          shape="circle"
          size={size}
        />
      )}
    </div>
  );
};
