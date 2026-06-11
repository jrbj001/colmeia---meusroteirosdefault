import * as React from "react";

export interface Crumb { label: string; href?: string; }

export interface TopbarProps {
  breadcrumb?: Crumb[];
  userName?: string;
  userPhoto?: string;
  onLogout?: () => void;
  /** Extra node rendered before the user block (e.g. search). */
  right?: React.ReactNode;
}

/** White top bar: breadcrumb trail + user avatar/greeting + logout. */
export function Topbar(props: TopbarProps): JSX.Element;
