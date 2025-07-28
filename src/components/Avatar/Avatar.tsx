/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface AvatarProps {
  className?: string;
  size?: "small" | "medium" | "large";
  shape?: "circle" | "square";
}

export const Avatar: React.FC<AvatarProps> = ({ 
  className = "", 
  size = "medium", 
  shape = "circle" 
}) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-10 h-10", 
    large: "w-12 h-12"
  };

  const shapeClasses = {
    circle: "rounded-full",
    square: "rounded-lg"
  };

  return (
    <div className={`${sizeClasses[size]} ${shapeClasses[shape]} ${className} bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm`}>
      <svg 
        width="60%" 
        height="60%" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        {/* Cabeça */}
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        
        {/* Corpo */}
        <path 
          d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" 
          fill="currentColor"
        />
        
        {/* Detalhes do rosto */}
        <circle cx="10" cy="7" r="1" fill="white" opacity="0.8" />
        <circle cx="14" cy="7" r="1" fill="white" opacity="0.8" />
        <path 
          d="M10 10C10 10 11 11 12 11C13 11 14 10 14 10" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
