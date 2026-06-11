import * as React from "react";

export type RouteStatus =
  | "APROVADO" | "EM_ANALISE" | "PROCESSANDO" | "PARA_CORRIGIR"
  | "REJEITADO" | "FINALIZADO" | "PENDENTE" | "LIBERADO";

export interface StatusBadgeProps {
  /** Known status key — picks label + tone automatically. */
  status: RouteStatus | string;
  /** Override the displayed label. */
  label?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

/** Maps an inventory/route status key to a labelled, dotted Badge. */
export function StatusBadge(props: StatusBadgeProps): JSX.Element;
