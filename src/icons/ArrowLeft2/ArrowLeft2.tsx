/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  color: string;
  className: any;
}

export const ArrowLeft2 = ({
  color = "#3A3A3A",
  className,
}: Props): JSX.Element => {
  return (
    <svg
      className={`${className}`}
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.6667 8H3.33334M3.33334 8L8 12.6667M3.33334 8L8 3.33334"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
};
