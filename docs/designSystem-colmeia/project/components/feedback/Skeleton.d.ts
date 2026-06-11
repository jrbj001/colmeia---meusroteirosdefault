import * as React from "react";

export interface SkeletonProps {
  /** @default "text" */
  variant?: "text" | "block" | "card" | "circle";
  width?: string | number;
  height?: string | number;
  /** Number of lines for the text variant. */
  lines?: number;
  radius?: string;
  style?: React.CSSProperties;
}

/** Shimmer loading placeholder (2s sweep). */
export function Skeleton(props: SkeletonProps): JSX.Element;
