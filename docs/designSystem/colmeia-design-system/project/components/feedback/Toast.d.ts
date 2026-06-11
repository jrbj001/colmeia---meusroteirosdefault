import * as React from "react";

export interface ToastProps {
  /** @default "info" */
  tone?: "success" | "error" | "warning" | "info";
  title?: string;
  message?: string;
  onClose?: () => void;
  style?: React.CSSProperties;
}

/** Transient inline notification with semantic accent + Material icon. */
export function Toast(props: ToastProps): JSX.Element;
