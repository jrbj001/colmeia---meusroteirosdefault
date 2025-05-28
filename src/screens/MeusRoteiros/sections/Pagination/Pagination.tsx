import React from "react";

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
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(5, totalPages);
    }
    if (currentPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - 4);
    }

    if (startPage > 1) {
      pages.push(
        <span key="start-ellipsis" className="px-2">...</span>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = currentPage === i;
      pages.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          className={`w-12 h-12 mx-1 flex items-center justify-center text-base font-normal font-['Neue_Montreal-Regular'] leading-4 focus:outline-none focus:ring-0 transition-colors duration-150 border-0 outline-none shadow-none rounded-lg
            ${isActive ? "bg-[#3a3a3a] text-white" : "bg-white text-[#3a3a3a] hover:bg-[#b0b0b0] hover:text-[#222] hover:rounded-lg"}`}
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      pages.push(
        <span key="end-ellipsis" className="px-2">...</span>
      );
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 select-none">
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className={`w-20 h-8 flex items-center justify-center rounded text-[#b0b0b0] font-normal text-base mr-2 focus:outline-none focus:ring-0 border-0 outline-none shadow-none bg-transparent ${
          currentPage === 1 ? "cursor-not-allowed" : "hover:text-[#3a3a3a]"
        }`}
        style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
      >
        <span className="mr-2">&#8592;</span> Previous
      </button>
      {renderPageNumbers()}
      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`w-20 h-8 flex items-center justify-center rounded text-[#b0b0b0] font-normal text-base ml-2 focus:outline-none focus:ring-0 border-0 outline-none shadow-none bg-transparent ${
          currentPage === totalPages ? "cursor-not-allowed" : "hover:text-[#3a3a3a]"
        }`}
        style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
      >
        Next <span className="ml-2">&#8594;</span>
      </button>
    </div>
  );
};
