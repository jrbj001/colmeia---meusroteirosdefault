import * as React from "react";

export interface AvatarProps {
  /** Image URL — falls back to initials on error. */
  src?: string;
  /** Used for initials + alt text. */
  name?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

/** Round user marker — photo or initials on a brand-orange gradient. */
export function Avatar(props: AvatarProps): JSX.Element;
