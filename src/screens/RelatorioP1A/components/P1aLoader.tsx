import React, { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   P1aRefreshLoader
   Exibido enquanto o stage está sendo reconstruído (sp_reportDataP1aEmpilhamentoRefresh).
   Mostra passos animados com progresso temporal — sem barra falsa de % pois
   o tempo real varia; usamos etapas com shimmer no ícone.
   ───────────────────────────────────────────────────────────────────────────── */

const ETAPAS = [
  { label: 'Recebendo roteiros selecionados', durationMs: 600 },
  { label: 'Apagando dados anteriores do stage', durationMs: 1200 },
  { label: 'Recalculando empilhamento de semanas', durationMs: 1800 },
  { label: 'Gravando resultados consolidados', durationMs: 1200 },
  { label: 'Finalizando e verificando integridade', durationMs: 0 },
];

interface P1aRefreshLoaderProps {
  reportCount?: number;
}

export const P1aRefreshLoader: React.FC<P1aRefreshLoaderProps> = ({ reportCount = 1 }) => {
  const [etapa, setEtapa] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (etapa >= ETAPAS.length - 1) return;
    const d = ETAPAS[etapa].durationMs;
    if (d === 0) return;
    const t = setTimeout(() => setEtapa((e) => e + 1), d);
    return () => clearTimeout(t);
  }, [etapa]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const tempoStr = m > 0 ? `${m}min ${s}s` : `${s}s`;

  return (
    <div className="bg-white rounded-xl border border-[#ededed] px-8 py-10 flex flex-col items-center gap-6 max-w-xl mx-auto shadow-sm">
      {/* Spinner laranja */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-[3px] border-[#f0f0f0] border-t-[#ff4600] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#ff4600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7h16M4 7l2-3h12l2 3" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-base font-semibold text-[#222]">Sincronizando dados P1A</h3>
        <p className="text-sm text-[#757575] mt-1">
          {reportCount === 1
            ? 'Atualizando 1 roteiro no stage'
            : `Atualizando ${reportCount} roteiros no stage`}
        </p>
      </div>

      <ul className="w-full space-y-2">
        {ETAPAS.map((e, i) => {
          const done = i < etapa;
          const active = i === etapa;
          const pending = i > etapa;
          return (
            <li key={e.label} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors duration-300 ${
                  done
                    ? 'bg-[#ff4600] text-white'
                    : active
                    ? 'border-2 border-[#ff4600] bg-white'
                    : 'border-2 border-[#e0e0e0] bg-white'
                }`}
              >
                {done ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <div className="w-2 h-2 rounded-full bg-[#ff4600] animate-pulse" />
                ) : null}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  done
                    ? 'text-[#3a3a3a] line-through decoration-[#ccc]'
                    : active
                    ? 'text-[#222] font-medium'
                    : 'text-[#bbb]'
                }`}
              >
                {e.label}
              </span>
              {active && (
                <span className="ml-auto text-xs text-[#ff4600] animate-pulse">em andamento</span>
              )}
              {pending && <span className="ml-auto text-xs text-[#d0d0d0]">aguardando</span>}
            </li>
          );
        })}
      </ul>

      <div className="text-xs text-[#b3b3b3] flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff4600] animate-pulse" />
        {tempoStr}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   P1aTableSkeleton
   Exibido enquanto uma aba está carregando (operação rápida, ~300-600ms).
   Imita a estrutura visual real da tabela: header laranja + linhas de métricas.
   ───────────────────────────────────────────────────────────────────────────── */

interface P1aTableSkeletonProps {
  rows?: number;
  cols?: number;
}

const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded bg-[#f0f0f0] ${className}`}>
    <div
      className="absolute inset-0 -translate-x-full"
      style={{
        animation: 'p1a-shimmer 1.4s infinite',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
      }}
    />
  </div>
);

export const P1aTableSkeleton: React.FC<P1aTableSkeletonProps> = ({
  rows = 9,
  cols = 4,
}) => (
  <>
    <style>{`
      @keyframes p1a-shimmer {
        from { transform: translateX(-100%); }
        to   { transform: translateX(200%); }
      }
    `}</style>
    <div className="bg-white rounded-lg border border-[#ededed] overflow-hidden">
      {/* Header da dimensão */}
      <div className="bg-[#fff5ef] border-b border-[#ffd9c4] px-4 py-2 flex items-center gap-2">
        <Shimmer className="h-4 w-10" />
        <Shimmer className="h-4 w-36" />
      </div>

      <table className="min-w-full">
        <thead>
          <tr className="bg-[#f8f8f8]">
            {/* coluna de métrica */}
            <th className="px-3 py-2 min-w-[220px]">
              <Shimmer className="h-3 w-20" />
            </th>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-2 text-right">
                <Shimmer className="h-3 w-8 ml-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t border-[#f0f0f0]">
              <td className="px-3 py-[10px]">
                <Shimmer className={`h-3 ${rowIdx % 3 === 0 ? 'w-44' : rowIdx % 3 === 1 ? 'w-32' : 'w-36'}`} />
              </td>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-3 py-[10px] text-right">
                  <Shimmer
                    className={`h-3 ml-auto ${colIdx % 2 === 0 ? 'w-14' : 'w-10'}`}
                    style={{ animationDelay: `${(rowIdx + colIdx) * 60}ms` } as React.CSSProperties}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);
