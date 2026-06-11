import * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** @default "md" */
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** Pill toggle — brand orange when on. Used for "liberar para agência". */
export function Switch(props: SwitchProps): JSX.Element;
