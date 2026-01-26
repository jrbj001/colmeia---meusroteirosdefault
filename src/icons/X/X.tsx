import React from "react";

interface XProps {
  className?: string;
  color?: string;
  size?: number;
}

export const X: React.FC<XProps> = ({ 
  className = "", 
  color = "#6b7280",
  size = 20 
}) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6L18 18M6 18L18 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
