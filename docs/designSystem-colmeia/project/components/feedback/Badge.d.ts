import * as React from "react";

export interface BadgeProps {
  children?: React.ReactNode;
  /** Semantic palette. @default "neutral" */
  tone?: "success" | "warning" | "error" | "info" | "neutral" | "brand";
  /** Show a leading status dot. */
  dot?: boolean;
  /** @default "soft" */
  variant?: "soft" | "outline";
  /** @default "md" */
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** Small status pill. */
export function Badge(props: BadgeProps): JSX.Element;
