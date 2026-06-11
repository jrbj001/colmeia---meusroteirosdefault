import * as React from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** Footer node — usually action Buttons. */
  footer?: React.ReactNode;
  /** Max width in px. @default 460 */
  width?: number;
  closeOnBackdrop?: boolean;
}

/** Centred dialog with backdrop, 16px radius, modal shadow. */
export function Modal(props: ModalProps): JSX.Element | null;
