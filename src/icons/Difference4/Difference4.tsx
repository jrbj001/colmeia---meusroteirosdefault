/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  color?: string;
  className: any;
}

export const Difference4 = ({
  color,
  className,
}: Props): JSX.Element => {
  return (
    <svg
      className={`${className}`}
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.5 23H4.5C3.4 23 2.5 22.1 2.5 21V7H4.5V21H18.5V23ZM15 7V5H13V7H11V9H13V11H15V9H17V7H15ZM17 13H11V15H17V13ZM15.5 1H8.5C7.4 1 6.51 1.9 6.51 3L6.5 17C6.5 18.1 7.39 19 8.49 19H19.5C20.6 19 21.5 18.1 21.5 17V7L15.5 1ZM19.5 17H8.5V3H14.67L19.5 7.83V17Z"
        fill="currentColor"
      />
    </svg>
  );
};
