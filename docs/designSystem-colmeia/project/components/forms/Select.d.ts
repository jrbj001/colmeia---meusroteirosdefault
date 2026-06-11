import * as React from "react";

export interface SelectOption { value: string; label: string; }

export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<SelectOption | string>;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** Native select styled to match Input, with a Material chevron. */
export function Select(props: SelectProps): JSX.Element;
