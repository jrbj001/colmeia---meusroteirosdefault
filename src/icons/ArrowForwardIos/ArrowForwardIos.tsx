/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  className: any;
}

export const ArrowForwardIos = ({ className }: Props): JSX.Element => {
  return (
    <svg
      className={`${className}`}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.9042 3.14165L13.4292 1.66665L5.09584 9.99998L13.4292 18.3333L14.9042 16.8583L8.04584 9.99998L14.9042 3.14165Z"
        fill="currentColor"
      />
    </svg>
  );
};
