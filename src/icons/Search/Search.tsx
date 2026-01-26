import React from "react";

interface SearchProps {
  className?: string;
  color?: string;
  size?: number;
}

export const Search: React.FC<SearchProps> = ({ 
  className = "", 
  color = "#9ca3af",
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
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M16 16L21 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
