import React from 'react';
import { LoteStatus } from '../types';

const CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
  EM_ANALISE:    { label: 'Em análise',    color: '#b45309', bg: '#fef3c7', dot: '#d97706' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#b91c1c', bg: '#fee2e2', dot: '#dc2626' },
  REJEITADO:     { label: 'Rejeitado',     color: '#374151', bg: '#f3f4f6', dot: '#6b7280' },
};

export const StatusBadge: React.FC<{ status: LoteStatus | string; small?: boolean }> = ({ status, small }) => {
  const cfg = CFG[status] ?? { label: status, color: '#374151', bg: '#f3f4f6', dot: '#6b7280' };
  return (
    <span
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span style={{ backgroundColor: cfg.dot }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {cfg.label}
    </span>
  );
};
