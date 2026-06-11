import * as React from "react";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  /** Highlighted subject (e.g. the route name being deleted). */
  highlight?: string;
  note?: string;
  confirmText?: string;
  cancelText?: string;
  /** @default "danger" */
  tone?: "danger" | "primary";
  loading?: boolean;
}

/** Confirmation modal for destructive actions. */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element | null;
