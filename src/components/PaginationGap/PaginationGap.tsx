/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  className: any;
  divClassName: any;
}

export const PaginationGap = ({
  className,
  divClassName,
}: Props): JSX.Element => {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center pt-[var(--size-space-200)] pr-[var(--size-space-400)] pb-[var(--size-space-200)] pl-[var(--size-space-400)] relative rounded-lg ${className}`}
    >
      <div
        className={`relative w-fit mt-[-1.00px] font-body-base-bold font-[number:var(--body-base-bold-font-weight)] text-colors-black-100 text-[length:var(--body-base-bold-font-size)] tracking-[var(--body-base-bold-letter-spacing)] leading-[var(--body-base-bold-line-height)] whitespace-nowrap [font-style:var(--body-base-bold-font-style)] ${divClassName}`}
      >
        ...
      </div>
    </div>
  );
};
