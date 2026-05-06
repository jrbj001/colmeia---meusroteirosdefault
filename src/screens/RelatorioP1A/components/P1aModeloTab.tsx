import React, { useMemo } from 'react';
import { ModeloRow } from '../types';
import { nomeExibidor, ordenarExibidores } from '../utils/exibidores';
import { fmt2, fmtBRL, fmtInt, fmtPct, toNum } from '../utils/formatters';
import { P1aTableSkeleton } from './P1aLoader';

interface P1aModeloTabProps {
  rows: ModeloRow[];
  loading?: boolean;
  hasSimulatedPlans?: boolean;
}

interface ColunaMetrica {
  label: string;
  field: keyof ModeloRow;
  format: (value: unknown) => string;
}

const COLUNAS_METRICA: ColunaMetrica[] = [
  { label: 'Investimento', field: 'investimento_vl', format: fmtBRL },
  { label: 'Cob%', field: 'coberturaProp_vl', format: fmtPct },
  { label: 'Freq.', field: 'frequencia_vl', format: fmt2 },
  { label: 'Faces', field: 'faces_vl', format: fmtInt },
  { label: 'Alcance', field: 'alcance_vl', format: fmtInt },
  { label: 'Impressões Qual.', field: 'impressoesQualificadas_vl', format: fmtInt },
];

export const P1aModeloTab: React.FC<P1aModeloTabProps> = ({ rows, loading, hasSimulatedPlans }) => {
  const blocos = useMemo(() => {
    const byDim = new Map<string, ModeloRow[]>();
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

        const idx = new Map<string, Map<number, ModeloRow>>();
        dimRows.forEach((r) => {
          const e = nomeExibidor(r.exibidorP1a_st);
          const w = toNum(r.week_vl);
          if (w === null) return;
          let m = idx.get(e);
          if (!m) {
            m = new Map();
            idx.set(e, m);
          }
          m.set(w, r);
        });

        return { dimVal, semanas, exibidores, idx };
      });
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <P1aTableSkeleton rows={4} cols={7} />
      </div>
    );
  }

  if (blocos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ededed] p-12 text-center text-[#757575]">
        Selecione um ou mais roteiros para visualizar o Modelo P1A.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSimulatedPlans && (
        <div className="rounded-lg border border-[#ffd87a] bg-[#fff8e1] px-4 py-3 text-sm text-[#8a6d00]">
          <strong>Atenção:</strong> a seleção contém roteiros simulados — colunas de
          investimento podem vir zeradas. Métricas físicas (cobertura, frequência, faces,
          alcance, impressões qualificadas) são válidas.
        </div>
      )}

      {blocos.map(({ dimVal, semanas, exibidores, idx }) => (
        <div key={dimVal} className="bg-white rounded-lg border border-[#ededed] overflow-hidden">
          <div className="bg-[#fff5ef] border-b border-[#ffd9c4] px-4 py-2">
            <span className="text-sm font-semibold text-[#3a3a3a]">{dimVal}</span>
          </div>

          <div className="overflow-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="bg-[#f8f8f8]">
                  <th
                    rowSpan={2}
                    className="px-3 py-2 text-left text-xs uppercase tracking-wide text-[#757575] sticky left-0 bg-[#f8f8f8] border-r border-[#ededed] min-w-[80px]"
                  >
                    Semana
                  </th>
                  {exibidores.map((ex) => (
                    <th
                      key={ex}
                      colSpan={COLUNAS_METRICA.length}
                      className={`px-3 py-2 text-center text-xs uppercase tracking-wide border-r border-[#ededed] ${
                        ex.toLowerCase() === 'demais ooh'
                          ? 'bg-[#ededed] text-[#3a3a3a]'
                          : ex.toLowerCase() === 'não informado'
                          ? 'bg-[#fff8e1] text-[#8a6d00]'
                          : 'bg-[#fff5ef] text-[#ff4600]'
                      } font-bold`}
                    >
                      {ex}
                    </th>
                  ))}
                </tr>
                <tr className="bg-[#fafafa]">
                  {exibidores.flatMap((ex) =>
                    COLUNAS_METRICA.map((c, idxCol) => (
                      <th
                        key={`${ex}-${c.label}`}
                        className={`px-2 py-1.5 text-right text-[10px] uppercase tracking-wide text-[#757575] ${
                          idxCol === COLUNAS_METRICA.length - 1
                            ? 'border-r border-[#ededed]'
                            : ''
                        }`}
                      >
                        {c.label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {semanas.map((s) => (
                  <tr key={s} className="border-t border-[#f0f0f0] hover:bg-[#fafafa]">
                    <td className="px-3 py-2 font-mono text-xs text-[#3a3a3a] sticky left-0 bg-white border-r border-[#ededed]">
                      W{s}
                    </td>
                    {exibidores.flatMap((ex) => {
                      const row = idx.get(ex)?.get(s);
                      return COLUNAS_METRICA.map((c, idxCol) => (
                        <td
                          key={`${ex}-${c.label}-${s}`}
                          className={`px-2 py-2 text-right font-mono text-xs ${
                            idxCol === COLUNAS_METRICA.length - 1
                              ? 'border-r border-[#ededed]'
                              : ''
                          }`}
                        >
                          {row ? c.format(row[c.field]) : '—'}
                        </td>
                      ));
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
