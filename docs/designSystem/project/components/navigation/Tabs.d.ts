import * as React from "react";

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange?: (key: string) => void;
  style?: React.CSSProperties;
}

/** Underline tab strip with brand-orange active indicator. */
export function Tabs(props: TabsProps): JSX.Element;
