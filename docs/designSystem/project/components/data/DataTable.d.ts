import * as React from "react";

export interface DataTableColumn<T = any> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  /** Custom cell renderer. */
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => React.Key;
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
}

/** Operational data table — dark charcoal header, zebra rows, hover highlight. */
export function DataTable<T = any>(props: DataTableProps<T>): JSX.Element;
