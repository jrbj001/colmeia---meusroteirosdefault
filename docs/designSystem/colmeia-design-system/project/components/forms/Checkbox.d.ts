import * as React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;
}

/** Square checkbox with brand-orange fill. Requires Material Symbols for the tick. */
export function Checkbox(props: CheckboxProps): JSX.Element;
