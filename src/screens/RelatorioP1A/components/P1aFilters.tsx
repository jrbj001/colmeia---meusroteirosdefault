import React from 'react';
import { Dimension, Negociacao, OptionsResponse, P1aFilters } from '../types';

interface P1aFiltersProps {
  filters: P1aFilters;
  options: OptionsResponse | null;
  onChange: (next: P1aFilters) => void;
  disabled?: boolean;
}

const DIMENSION_LABEL: Record<Dimension, string> = {
  GEO: 'GEO',
  PRACA: 'Praça',
  UF: 'UF',
};

const NEGOCIACAO_LABEL: Record<Negociacao, string> = {
  TOTAL: 'Total',
  FATURAVEL: 'Faturável',
  NAO_FATURAVEL: 'Não faturável',
};

export const P1aFiltersBar: React.FC<P1aFiltersProps> = ({
  filters,
  options,
  onChange,
  disabled,
}) => {
  const dimensionValues = options?.dimensions[filters.dimension] ?? [];
  const marcas = options?.marcas ?? [];

  const update = (patch: Partial<P1aFilters>) => onChange({ ...filters, ...patch });

  const baseSelectClass =
    'h-[44px] px-3 rounded-lg border bg-white text-sm text-[#3a3a3a] focus:outline-none focus:ring-2 focus:ring-[#ff4600]/30 focus:border-[#ff4600] disabled:bg-[#f8f8f8] disabled:text-[#999]';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#757575] uppercase tracking-wide">
          Marca
        </label>
        <select
          className={`${baseSelectClass} border-[#d9d9d9]`}
          value={filters.marca ?? ''}
          onChange={(e) => update({ marca: e.target.value || null })}
          disabled={disabled || marcas.length === 0}
        >
          <option value="">Todas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#757575] uppercase tracking-wide">
          Dimensão
        </label>
        <select
          className={`${baseSelectClass} border-[#d9d9d9]`}
          value={filters.dimension}
          onChange={(e) =>
            update({ dimension: e.target.value as Dimension, dimensionValue: null })
          }
          disabled={disabled}
        >
          {(['GEO', 'PRACA', 'UF'] as Dimension[]).map((d) => (
            <option key={d} value={d}>
              {DIMENSION_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#757575] uppercase tracking-wide">
          Valor da dimensão
        </label>
        <select
          className={`${baseSelectClass} border-[#d9d9d9]`}
          value={filters.dimensionValue ?? ''}
          onChange={(e) => update({ dimensionValue: e.target.value || null })}
          disabled={disabled || dimensionValues.length === 0}
        >
          <option value="">Todas</option>
          {dimensionValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#757575] uppercase tracking-wide">
          Negociação
        </label>
        <select
          className={`${baseSelectClass} border-[#d9d9d9]`}
          value={filters.negociacao}
          onChange={(e) => update({ negociacao: e.target.value as Negociacao })}
          disabled={disabled}
        >
          {(['TOTAL', 'FATURAVEL', 'NAO_FATURAVEL'] as Negociacao[]).map((n) => (
            <option key={n} value={n}>
              {NEGOCIACAO_LABEL[n]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
