/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";

interface Props {
  initials: string;
  type: "image";
  size: "large";
  shape: "circle";
  className: any;
}

export const Avatar = ({
  initials = "F",
  type,
  size,
  shape,
  className,
}: Props): JSX.Element => {
  return (
    <div
      className={`w-[var(--size-icon-large)] h-[var(--size-icon-large)] rounded-[var(--size-radius-full)] bg-[url(https://c.animaapp.com/SfpADyEM/img/shape-1@2x.png)] bg-cover bg-[50%_50%] ${className}`}
    />
  );
};
