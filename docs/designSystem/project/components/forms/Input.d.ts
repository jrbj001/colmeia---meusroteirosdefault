import * as React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Material Symbols glyph name shown at the start of the field. */
  icon?: string;
  iconRight?: React.ReactNode;
  /** Error message — also turns the border red. */
  error?: string;
  helper?: string;
  disabled?: boolean;
}

/** Labelled text field with brand-orange focus ring. */
export function Input(props: InputProps): JSX.Element;
