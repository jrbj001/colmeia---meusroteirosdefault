import * as React from "react";

export interface SidebarItem {
  icon?: string;
  label?: string;
  href?: string;
  active?: boolean;
  badge?: string | number;
  onClick?: (e: React.MouseEvent) => void;
  /** Render as a section header instead of a link. */
  section?: string;
}

export interface SidebarProps {
  /** Full-lockup logo (expanded state). */
  logoSrc?: string;
  /** Mark-only logo (collapsed state). */
  logoMarkSrc?: string;
  items: SidebarItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  footer?: React.ReactNode;
  width?: number;
  collapsedWidth?: number;
}

/** Fixed left navigation on the light grey surface. Icons use Material Symbols. */
export function Sidebar(props: SidebarProps): JSX.Element;
