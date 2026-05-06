import React, { useMemo } from 'react';
import { ColmeiaRow, Dimension } from '../types';
import { fmt2, fmt4, fmtInt, fmtPct, toNum } from '../utils/formatters';
import { P1aTableSkeleton } from './P1aLoader';

interface P1aColmeiaTabProps {
  rows: ColmeiaRow[];
  dimension: Dimension;
  loading?: boolean;
}

interface MetricaConfig {
  label: string;
  field: keyof ColmeiaRow;
  format: (value: unknown) => string;
}

/**
 * Métricas da aba 5 do workbook P1A. Os nomes refletem exatamente os
 * campos retornados por `sp_reportResultColmeiaGeoClosed`.
 */
const METRICAS: MetricaConfig[] = [
  { label: 'Impactos Vias públicas', field: 'impactosIpv_vl', format: fmtInt },
  { label: 'Cobertura Vias públicas', field: 'coberturaPessoas_vl', format: fmtInt },
  { label: 'Cobertura (%)', field: 'coberturaProp_vl', format: fmtPct },
  { label: 'Frequência teórica', field: 'frequenciaTeorica_vl', format: fmt2 },
  { label: 'Frequência', field: 'frequencia_vl', format: fmt2 },
  { label: 'GRP', field: 'grp_vl', format: fmt2 },
  { label: 'Deflator do inventário', field: 'deflatorInventario_vl', format: fmt4 },
  { label: '% Dominação', field: 'dominacao_vl', format: fmtPct },
  { label: 'Pontos Praça', field: 'pontosPraca_vl', format: fmtInt },
  { label: 'Pontos', field: 'pontos_vl', format: fmtInt },
  { label: 'População', field: 'populationTotal_vl', format: fmtInt },
];

function dimensionKey(row: ColmeiaRow): string {
  return (
    (row.dimensionValue_st as string) ||
    (row.geoAmbev_st as string) ||
    '—'
  );
}

export const P1aColmeiaTab: React.FC<P1aColmeiaTabProps> = ({ rows, dimension, loading }) => {
  const blocos = useMemo(() => {
    const groups = new Map<
      string,
      { semanas: Set<number>; rowsByWeek: Map<number, ColmeiaRow>; segmento: string | null }
    >();

    rows.forEach((row) => {
      const dimVal = dimensionKey(row);
      const week = toNum(row.week_vl);
      if (week === null) return;
      let group = groups.get(dimVal);
      if (!group) {
        group = { semanas: new Set(), rowsByWeek: new Map(), segmento: null };
        groups.set(dimVal, group);
      }
      group.semanas.add(week);
      group.rowsByWeek.set(week, row);
      if (!group.segmento && row.segmento_st) group.segmento = row.segmento_st;
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([dimVal, group]) => ({
        dimVal,
        segmento: group.segmento,
        semanas: Array.from(group.semanas).sort((a, b) => a - b),
        rowsByWeek: group.rowsByWeek,
      }));
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <P1aTableSkeleton rows={11} cols={4} />
      </div>
    );
  }

  if (blocos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ededed] p-12 text-center text-[#757575]">
        Selecione um ou mais roteiros para visualizar os dados Colmeia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocos.map(({ dimVal, segmento, semanas, rowsByWeek }) => (
        <div key={dimVal} className="bg-white rounded-lg border border-[#ededed] overflow-hidden">
          <div className="bg-[#fff5ef] border-b border-[#ffd9c4] px-4 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-[#ff4600] font-bold">
              {dimension}
            </span>
            <span className="text-sm font-semibold text-[#3a3a3a]">{dimVal}</span>
            {segmento && (
              <span className="ml-auto text-xs text-[#8a6d00] bg-[#fff8e1] border border-[#ffd87a] rounded-full px-2 py-0.5">
                Segmento: {segmento}
              </span>
            )}
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#f8f8f8] text-left text-xs uppercase tracking-wide text-[#757575]">
                  <th className="px-3 py-2 sticky left-0 bg-[#f8f8f8] min-w-[220px]">Métrica</th>
                  {semanas.map((s) => (
                    <th key={s} className="px-3 py-2 text-right whitespace-nowrap">
                      W{s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICAS.map((m) => (
                  <tr key={m.label} className="border-t border-[#f0f0f0]">
                    <td className="px-3 py-2 font-medium text-[#3a3a3a] sticky left-0 bg-white">
                      {m.label}
                    </td>
                    {semanas.map((s) => {
                      const row = rowsByWeek.get(s);
                      return (
                        <td key={s} className="px-3 py-2 text-right font-mono text-xs">
                          {row ? m.format(row[m.field]) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
