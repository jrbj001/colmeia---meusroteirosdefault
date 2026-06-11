import React from "react";
import { Badge } from "./Badge.jsx";

/**
 * Colmeia StatusBadge — maps a known inventory/route status key to a
 * labelled, dotted badge. Mirrors the AdminInventarios status set.
 */
const STATUS = {
  APROVADO: { label: "Aprovado", tone: "success" },
  EM_ANALISE: { label: "Em análise", tone: "warning" },
  PROCESSANDO: { label: "Processando", tone: "warning" },
  PARA_CORRIGIR: { label: "Para corrigir", tone: "error" },
  REJEITADO: { label: "Rejeitado", tone: "neutral" },
  FINALIZADO: { label: "Finalizado", tone: "success" },
  PENDENTE: { label: "Pendente", tone: "neutral" },
  LIBERADO: { label: "Liberado", tone: "brand" },
};

export function StatusBadge({ status, label, size = "md", dot = true }) {
  const cfg = STATUS[status] || { label: label || status, tone: "neutral" };
  return (
    <Badge tone={cfg.tone} dot={dot} size={size}>
      {label || cfg.label}
    </Badge>
  );
}
