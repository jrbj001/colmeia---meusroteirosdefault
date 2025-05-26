/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { PaginationGap } from "../PaginationGap";
import { PaginationPage } from "../PaginationPage";

interface Props {
  className: any;
  paginationPageDivClassName: any;
  paginationPageStateDefaultClassName: any;
  paginationPageDivClassNameOverride: any;
  paginationPageDivClassName1: any;
  paginationGapDivClassName: any;
  paginationPageDivClassName2: any;
  paginationPageDivClassName3: any;
}

export const PaginationList = ({
  className,
  paginationPageDivClassName,
  paginationPageStateDefaultClassName,
  paginationPageDivClassNameOverride,
  paginationPageDivClassName1,
  paginationGapDivClassName,
  paginationPageDivClassName2,
  paginationPageDivClassName3,
}: Props): JSX.Element => {
  return (
    <div
      className={`inline-flex items-center gap-[var(--size-space-200)] relative ${className}`}
    >
      <PaginationPage
        className={paginationPageStateDefaultClassName}
        divClassName={paginationPageDivClassName}
        number="1"
        stateProp="current"
      />
      <PaginationPage
        className="!flex-[0_0_auto]"
        divClassName={paginationPageDivClassNameOverride}
        number="2"
        stateProp="default"
      />
      <PaginationPage
        className="!flex-[0_0_auto]"
        divClassName={paginationPageDivClassName1}
        number="3"
        stateProp="default"
      />
      <PaginationGap
        className="!flex-[0_0_auto]"
        divClassName={paginationGapDivClassName}
      />
      <PaginationPage
        className="!flex-[0_0_auto]"
        divClassName={paginationPageDivClassName2}
        number="67"
        stateProp="default"
      />
      <PaginationPage
        className="!flex-[0_0_auto]"
        divClassName={paginationPageDivClassName3}
        number="68"
        stateProp="default"
      />
    </div>
  );
};
