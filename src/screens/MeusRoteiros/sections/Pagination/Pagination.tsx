import React from "react";
import { PaginationWrapper } from "../../../../components/PaginationWrapper";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}): JSX.Element => {
  return (
    <div className="w-full flex justify-center py-4">
      <PaginationWrapper
        className="flex items-center gap-2"
        paginationListPaginationGapDivClassName="text-[#3a3a3a]"
        paginationListPaginationPageDivClassName="text-[#3a3a3a] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationListPaginationPageDivClassName1="text-[#3a3a3a] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationListPaginationPageDivClassName2="text-[#3a3a3a] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationListPaginationPageDivClassName3="text-[#3a3a3a] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationListPaginationPageDivClassNameOverride="text-neutral-100 tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationListPaginationPageStateDefaultClassName="flex-[0_0_auto] bg-[#3a3a3a]"
        paginationNextArrowRightColor="#3A3A3A"
        paginationNextDivClassName="text-[#3a3a3a] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
        paginationPreviousArrowLeft2Color="#3A3A3A"
        paginationPreviousDivClassName="text-[#757575] tracking-[0] text-base font-normal font-['Neue_Montreal-Regular'] leading-4"
      />
    </div>
  );
};
