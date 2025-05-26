/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { useReducer } from "react";
import { ArrowRight } from "../../icons/ArrowRight";

interface Props {
  stateProp: "hover" | "default";
  className: any;
  divClassName: any;
  arrowRightColor: string;
}

export const PaginationNext = ({
  stateProp,
  className,
  divClassName,
  arrowRightColor = "#1E1E1E",
}: Props): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, {
    state: stateProp || "default",
  });

  return (
    <div
      className={`inline-flex items-center gap-[var(--size-space-200)] pt-[var(--size-space-200)] pr-[var(--size-space-300)] pb-[var(--size-space-200)] pl-[var(--size-space-300)] rounded-[var(--size-radius-200)] justify-center relative ${state.state === "hover" ? "bg-color-background-default-default-hover" : ""} ${className}`}
      onMouseLeave={() => {
        dispatch("mouse_leave");
      }}
      onMouseEnter={() => {
        dispatch("mouse_enter");
      }}
    >
      <div
        className={`font-single-line-body-base w-fit mt-[-1.00px] tracking-[var(--single-line-body-base-letter-spacing)] text-[length:var(--single-line-body-base-font-size)] [font-style:var(--single-line-body-base-font-style)] text-color-text-default-default font-[number:var(--single-line-body-base-font-weight)] leading-[var(--single-line-body-base-line-height)] whitespace-nowrap relative ${divClassName}`}
      >
        Next
      </div>

      <ArrowRight className="!relative !w-4 !h-4" color={arrowRightColor} />
    </div>
  );
};

function reducer(state: any, action: any) {
  switch (action) {
    case "mouse_enter":
      return {
        ...state,
        state: "hover",
      };

    case "mouse_leave":
      return {
        ...state,
        state: "default",
      };
  }

  return state;
}
