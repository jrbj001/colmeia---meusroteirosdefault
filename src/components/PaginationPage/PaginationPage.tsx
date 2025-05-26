/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { useReducer } from "react";

interface Props {
  number: string;
  stateProp: "current" | "hover" | "current-hover" | "default";
  className: any;
  divClassName: any;
}

export const PaginationPage = ({
  number = "1",
  stateProp,
  className,
  divClassName,
}: Props): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, {
    state: stateProp || "default",
  });

  return (
    <div
      className={`inline-flex flex-col items-center pt-[var(--size-space-200)] pr-[var(--size-space-300)] pb-[var(--size-space-200)] pl-[var(--size-space-300)] rounded-[var(--size-radius-200)] justify-center relative ${state.state === "hover" ? "bg-color-background-default-default-hover" : (state.state === "current") ? "bg-color-background-brand-default" : state.state === "current-hover" ? "bg-color-background-brand-hover" : ""} ${className}`}
      onMouseLeave={() => {
        dispatch("mouse_leave");
      }}
      onMouseEnter={() => {
        dispatch("mouse_enter");
      }}
    >
      <div
        className={`font-single-line-body-base w-fit mt-[-1.00px] tracking-[var(--single-line-body-base-letter-spacing)] text-[length:var(--single-line-body-base-font-size)] [font-style:var(--single-line-body-base-font-style)] font-[number:var(--single-line-body-base-font-weight)] leading-[var(--single-line-body-base-line-height)] whitespace-nowrap relative ${["current-hover", "current"].includes(state.state) ? "text-color-text-brand-on-brand" : "text-color-text-default-default"} ${divClassName}`}
      >
        {number}
      </div>
    </div>
  );
};

function reducer(state: any, action: any) {
  if (state.state === "default") {
    switch (action) {
      case "mouse_enter":
        return {
          state: "hover",
        };
    }
  }

  if (state.state === "hover") {
    switch (action) {
      case "mouse_leave":
        return {
          state: "default",
        };
    }
  }

  if (state.state === "current") {
    switch (action) {
      case "mouse_enter":
        return {
          state: "current-hover",
        };
    }
  }

  if (state.state === "current-hover") {
    switch (action) {
      case "mouse_leave":
        return {
          state: "current",
        };
    }
  }

  return state;
}
