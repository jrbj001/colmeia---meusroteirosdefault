import React from "react";

interface CheckCircleProps {
  className?: string;
  color?: string;
  size?: number;
}

export const CheckCircle: React.FC<CheckCircleProps> = ({ 
  className = "", 
  color = "#3a3a3a",
  size = 16 
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
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
