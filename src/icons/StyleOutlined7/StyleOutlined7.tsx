/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  color?: string;
  className: any;
}

export const StyleOutlined7 = ({
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
        d="M3.5 9H5V15H3.5V12.5H1.5V15H0V9H1.5V11H3.5V9ZM17.5 9H13C12.45 9 12 9.45 12 10V15H13.5V10.5H14.5V14H16V10.49H17V15H18.5V10C18.5 9.45 18.05 9 17.5 9ZM11 9H6V10.5H7.75V15H9.25V10.5H11V9ZM24 15V13.5H21.5V9H20V15H24Z"
        fill="currentColor"
      />
    </svg>
  );
};
