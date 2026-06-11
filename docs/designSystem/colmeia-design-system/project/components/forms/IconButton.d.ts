import * as React from "react";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Material Symbols Outlined glyph name, e.g. "delete", "pin_drop". */
  icon?: string;
  /** Alternative to `icon` — pass an SVG/element directly. */
  children?: React.ReactNode;
  /** Accessible label + tooltip. */
  label?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Hover color. @default "neutral" */
  tone?: "neutral" | "danger";
  /** @default "bare" */
  variant?: "bare" | "outline";
  disabled?: boolean;
}

/**
 * Icon-only control. Requires the Material Symbols Outlined font when using `icon`.
 */
export function IconButton(props: IconButtonProps): JSX.Element;
