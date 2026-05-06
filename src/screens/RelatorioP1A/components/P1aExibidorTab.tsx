import React, { useMemo } from 'react';
import { ExibidorRow } from '../types';
import { nomeExibidor, ordenarExibidores } from '../utils/exibidores';
import { fmt2, fmtBRL, fmtInt, fmtPct, toNum } from '../utils/formatters';
import { P1aTableSkeleton } from './P1aLoader';

interface P1aExibidorTabProps {
  rows: ExibidorRow[];
  loading?: boolean;
  hasSimulatedPlans?: boolean;
}

interface MetricaExibidor {
  label: string;
  field: keyof ExibidorRow;
  format: (value: unknown) => string;
}

/**
 * Métricas por exibidor — mapeadas para os campos reais retornados por
 * `sp_reportResultExibidor{Geo,Praca,Uf}Closed`.
 */
const METRICAS_EXIBIDOR: MetricaExibidor[] = [
  { label: '% Faces', field: 'pctFaces_vl', format: fmtPct },
  { label: 'Impactos', field: 'impactosTotal_vl', format: fmtInt },
  { label: 'Investimento', field: 'investimento_vl', format: fmtBRL },
  { label: 'Cobertura (%)', field: 'coberturaProp_vl', format: fmtPct },
  { label: 'Cobertura (pessoas)', field: 'coberturaPessoas_vl', format: fmtInt },
  { label: 'Frequência', field: 'frequencia_vl', format: fmt2 },
  { label: 'Faces (total)', field: 'facesTotal_vl', format: fmtInt },
  { label: 'Faces vias públicas', field: 'facesViasPublicas_vl', format: fmtInt },
  { label: 'Faces FATURÁVEIS', field: 'facesFaturaveis_vl', format: fmtInt },
  { label: 'Faces NÃO faturáveis', field: 'facesNaoFaturaveis_vl', format: fmtInt },
  { label: 'Localidades indoor', field: 'localidadesIndoor_vl', format: fmtInt },
  { label: 'Localidades indoor FAT', field: 'localidadesIndoorFaturaveis_vl', format: fmtInt },
  { label: 'Localidades indoor NÃO-FAT', field: 'localidadesIndoorNaoFaturaveis_vl', format: fmtInt },
  { label: 'Impressões qualificadas', field: 'impressoesQualificadas_vl', format: fmtInt },
];

interface MetricaTotal {
  label: string;
  pick: (row: ExibidorRow) => unknown;
  format: (value: unknown) => string;
}

/**
 * Bloco TOTAL (campos `*Sheet_vl` agregados pela SP). Repete em toda
 * linha, então pega-se uma linha qualquer por (dimVal × week).
 */
const METRICAS_TOTAL: MetricaTotal[] = [
  { label: 'Impactos (TOTAL)', pick: (r) => r.impactosTotalSheet_vl, format: fmtInt },
  {
    label: 'Cobertura (proporcional × população)',
    pick: (r) => {
      const cob = toNum(r.coberturaPropTotalSheet_vl) ?? 0;
      const pop = toNum(r.populationTotalSheet_vl) ?? 0;
      return cob * pop;
    },
    format: fmtInt,
  },
  { label: 'Cobertura proporcional (%)', pick: (r) => r.coberturaPropTotalSheet_vl, format: fmtPct },
  { label: 'População', pick: (r) => r.populationTotalSheet_vl, format: fmtInt },
  { label: 'Faces totais', pick: (r) => r.facesTotalSheet_vl, format: fmtInt },
  { label: 'Localidades indoor', pick: (r) => r.localidadesIndoorTotalSheet_vl, format: fmtInt },
  { label: 'Pontos Praça', pick: (r) => r.pontosPracaSheet_vl, format: fmtInt },
  { label: 'Pontos', pick: (r) => r.pontosSheet_vl, format: fmtInt },
];

export const P1aExibidorTab: React.FC<P1aExibidorTabProps> = ({
  rows,
  loading,
  hasSimulatedPlans,
}) => {
  const blocos = useMemo(() => {
    const byDim = new Map<string, ExibidorRow[]>();
    rows.forEach((row) => {
      const k = (row.dimensionValue_st as string) || '—';
      const arr = byDim.get(k) || [];
      arr.push(row);
      byDim.set(k, arr);
    });

    return Array.from(byDim.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([dimVal, dimRows]) => {
        const semanas = Array.from(
          new Set(
            dimRows
              .map((r) => toNum(r.week_vl))
              .filter((v): v is number => v !== null),
          ),
        ).sort((a, b) => a - b);
        const exibidores = ordenarExibidores(dimRows.map((r) => r.exibidorP1a_st));

        const idxByExibidor = new Map<string, Map<number, ExibidorRow>>();
        dimRows.forEach((row) => {
          const ex = nomeExibidor(row.exibidorP1a_st);
          const w = toNum(row.week_vl);
          if (w === null) return;
          let m = idxByExibidor.get(ex);
          if (!m) {
            m = new Map();
            idxByExibidor.set(ex, m);
          }
          m.set(w, row);
        });

        const totalRowBySemana = new Map<number, ExibidorRow>();
        dimRows.forEach((r) => {
          const s = toNum(r.week_vl);
          if (s === null) return;
          if (!totalRowBySemana.has(s)) totalRowBySemana.set(s, r);
        });

        return { dimVal, semanas, exibidores, idxByExibidor, totalRowBySemana };
      });
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <P1aTableSkeleton rows={8} cols={4} />
        <P1aTableSkeleton rows={14} cols={4} />
      </div>
    );
  }

  if (blocos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ededed] p-12 text-center text-[#757575]">
        Selecione um ou mais roteiros para visualizar os dados de Exibidor.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSimulatedPlans && (
        <div className="rounded-lg border border-[#ffd87a] bg-[#fff8e1] px-4 py-3 text-sm text-[#8a6d00]">
          <strong>Atenção:</strong> a seleção contém roteiros simulados (origem Colmeia).
          Métricas de investimento, faces faturáveis/não faturáveis e localidades indoor
          faturáveis/não faturáveis podem vir zeradas — apenas métricas físicas
          (faces, impactos, cobertura) são válidas para esses casos.
        </div>
      )}

      {blocos.map(({ dimVal, semanas, exibidores, idxByExibidor, totalRowBySemana }) => (
        <div key={dimVal} className="bg-white rounded-lg border border-[#ededed] overflow-hidden">
          <div className="bg-[#fff5ef] border-b border-[#ffd9c4] px-4 py-2">
            <span className="text-sm font-semibold text-[#3a3a3a]">{dimVal}</span>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#f8f8f8] text-left text-xs uppercase tracking-wide text-[#757575]">
                  <th className="px-3 py-2 sticky left-0 bg-[#f8f8f8] min-w-[280px]">Métrica</th>
                  {semanas.map((s) => (
                    <th key={s} className="px-3 py-2 text-right whitespace-nowrap">
                      W{s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={semanas.length + 1}
                    className="px-3 py-1.5 bg-[#fff8e1] text-xs uppercase tracking-wide text-[#8a6d00] font-bold"
                  >
                    TOTAL
                  </td>
                </tr>
                {METRICAS_TOTAL.map((m) => (
                  <tr key={m.label} className="border-t border-[#f0f0f0] bg-[#fffdf5]">
                    <td className="px-3 py-2 font-medium text-[#3a3a3a] sticky left-0 bg-[#fffdf5]">
                      {m.label}
                    </td>
                    {semanas.map((s) => {
                      const row = totalRowBySemana.get(s);
                      return (
                        <td key={s} className="px-3 py-2 text-right font-mono text-xs">
                          {row ? m.format(m.pick(row)) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {exibidores.map((exibidor) => (
                  <React.Fragment key={exibidor}>
                    <tr>
                      <td
                        colSpan={semanas.length + 1}
                        className={`px-3 py-1.5 text-xs uppercase tracking-wide font-bold ${
                          exibidor.toLowerCase() === 'demais ooh'
                            ? 'bg-[#ededed] text-[#3a3a3a]'
                            : exibidor.toLowerCase() === 'não informado'
                            ? 'bg-[#fff8e1] text-[#8a6d00]'
                            : 'bg-[#f8f8f8] text-[#3a3a3a]'
                        }`}
                      >
                        {exibidor}
                      </td>
                    </tr>
                    {METRICAS_EXIBIDOR.map((m) => {
                      const semanaMap = idxByExibidor.get(exibidor);
                      return (
                        <tr key={`${exibidor}-${m.label}`} className="border-t border-[#f0f0f0]">
                          <td className="px-3 py-2 text-[#3a3a3a] sticky left-0 bg-white">
                            {m.label}
                          </td>
                          {semanas.map((s) => {
                            const row = semanaMap?.get(s);
                            return (
                              <td key={s} className="px-3 py-2 text-right font-mono text-xs">
                                {row ? m.format(row[m.field]) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
