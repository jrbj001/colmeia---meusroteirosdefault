/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { ArrowLeft2 } from "../../icons/ArrowLeft2";

interface Props {
  state: "disabled";
  className: any;
  arrowLeft2Color: string;
  divClassName: any;
}

export const PaginationPrevious = ({
  state,
  className,
  arrowLeft2Color = "#1E1E1E",
  divClassName,
}: Props): JSX.Element => {
  return (
    <div
      className={`inline-flex items-center justify-center gap-[var(--size-space-200)] pt-[var(--size-space-200)] pr-[var(--size-space-300)] pb-[var(--size-space-200)] pl-[var(--size-space-300)] relative rounded-[var(--size-radius-200)] opacity-50 ${className}`}
    >
      <ArrowLeft2 className="!relative !w-4 !h-4" color={arrowLeft2Color} />
      <div
        className={`relative w-fit mt-[-1.00px] font-single-line-body-base font-[number:var(--single-line-body-base-font-weight)] text-color-text-default-secondary text-[length:var(--single-line-body-base-font-size)] tracking-[var(--single-line-body-base-letter-spacing)] leading-[var(--single-line-body-base-line-height)] whitespace-nowrap [font-style:var(--single-line-body-base-font-style)] ${divClassName}`}
      >
        Previous
      </div>
    </div>
  );
};
