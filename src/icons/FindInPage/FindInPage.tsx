/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  color: string;
  className: any;
}

export const FindInPage = ({
  color = "#3A3A3A",
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
        d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 4H13L18 9V17.58L16.16 15.74C17.44 13.8 17.23 11.17 15.52 9.46C14.55 8.49 13.28 8 12 8C10.72 8 9.45 8.49 8.47 9.46C6.52 11.41 6.52 14.57 8.47 16.51C9.44 17.48 10.72 17.97 12 17.97C12.96 17.97 13.92 17.69 14.75 17.14L17.6 20H6V4ZM14.11 15.1C13.55 15.66 12.8 15.98 12 15.98C11.2 15.98 10.45 15.67 9.89 15.1C9.33 14.54 9.01 13.79 9.01 12.99C9.01 12.19 9.32 11.44 9.89 10.88C10.45 10.31 11.2 10 12 10C12.8 10 13.55 10.31 14.11 10.88C14.67 11.44 14.99 12.19 14.99 12.99C14.99 13.79 14.68 14.54 14.11 15.1Z"
        fill={color}
      />
    </svg>
  );
};
