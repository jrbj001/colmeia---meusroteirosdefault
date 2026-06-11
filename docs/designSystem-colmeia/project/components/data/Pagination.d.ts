import * as React from "react";

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** Max numbered buttons before collapsing with ellipses. @default 7 */
  maxButtons?: number;
}

/** Page list with prev/next; current page fills with the dark ink chip. */
export function Pagination(props: PaginationProps): JSX.Element | null;
