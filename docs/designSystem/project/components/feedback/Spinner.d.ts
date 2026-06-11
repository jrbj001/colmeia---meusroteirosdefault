import * as React from "react";

export interface SpinnerProps {
  size?: number | string;
  /** Ring color. @default brand orange */
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}

/** Brand-orange ring loader. */
export function Spinner(props: SpinnerProps): JSX.Element;
