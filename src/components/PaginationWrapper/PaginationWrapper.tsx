/*
We're constantly improving the code you see. 
Please share your feedback here: https://form.asana.com/?k=uvp-HPgd3_hyoXRBw1IcNg&d=1152665201300829
*/

import React from "react";
import { PaginationList } from "../PaginationList";
import { PaginationNext } from "../PaginationNext";
import { PaginationPrevious } from "../PaginationPrevious";

interface Props {
  className: any;
  paginationPreviousDivClassName: any;
  paginationPreviousArrowLeft2Color: string;
  paginationListPaginationGapDivClassName: any;
  paginationListPaginationPageDivClassName: any;
  paginationListPaginationPageDivClassNameOverride: any;
  paginationListPaginationPageDivClassName1: any;
  paginationListPaginationPageDivClassName2: any;
  paginationListPaginationPageDivClassName3: any;
  paginationListPaginationPageStateDefaultClassName: any;
  paginationNextDivClassName: any;
  paginationNextArrowRightColor: string;
}

export const PaginationWrapper = ({
  className,
  paginationPreviousDivClassName,
  paginationPreviousArrowLeft2Color = "#1E1E1E",
  paginationListPaginationGapDivClassName,
  paginationListPaginationPageDivClassName,
  paginationListPaginationPageDivClassNameOverride,
  paginationListPaginationPageDivClassName1,
  paginationListPaginationPageDivClassName2,
  paginationListPaginationPageDivClassName3,
  paginationListPaginationPageStateDefaultClassName,
  paginationNextDivClassName,
  paginationNextArrowRightColor = "#1E1E1E",
}: Props): JSX.Element => {
  return (
    <div
      className={`inline-flex items-center gap-[var(--size-space-200)] relative ${className}`}
    >
      <PaginationPrevious
        arrowLeft2Color={paginationPreviousArrowLeft2Color}
        className="!flex-[0_0_auto]"
        divClassName={paginationPreviousDivClassName}
        state="disabled"
      />
      <PaginationList
        className="!flex-[0_0_auto]"
        paginationGapDivClassName={paginationListPaginationGapDivClassName}
        paginationPageDivClassName={
          paginationListPaginationPageDivClassNameOverride
        }
        paginationPageDivClassName1={paginationListPaginationPageDivClassName2}
        paginationPageDivClassName2={paginationListPaginationPageDivClassName3}
        paginationPageDivClassName3={paginationListPaginationPageDivClassName}
        paginationPageDivClassNameOverride={
          paginationListPaginationPageDivClassName1
        }
        paginationPageStateDefaultClassName={
          paginationListPaginationPageStateDefaultClassName
        }
      />
      <PaginationNext
        arrowRightColor={paginationNextArrowRightColor}
        className="!flex-[0_0_auto]"
        divClassName={paginationNextDivClassName}
        stateProp="default"
      />
    </div>
  );
};
