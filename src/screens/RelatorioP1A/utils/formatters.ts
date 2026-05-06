/**
 * Formatadores pt-BR centralizados para o Relatório P1A. Mantemos o mesmo
 * padrão visual usado no Excel original (workbook P1A_fev26).
 *
 * IMPORTANTE: vários campos retornados pelas SPs vêm como string
 * (ex.: bigints e decimais — `populationTotal_vl: "2417678"`,
 * `coberturaPessoas_vl: "143402"`). Por isso `toNum()` aceita unknown e
 * normaliza antes de aplicar `Intl.NumberFormat`.
 */
const NF_INT = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});
const NF_2DEC = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NF_4DEC = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const NF_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function fmtInt(value: unknown): string {
  const n = toNum(value);
  return n === null ? '—' : NF_INT.format(n);
}

export function fmt2(value: unknown): string {
  const n = toNum(value);
  return n === null ? '—' : NF_2DEC.format(n);
}

export function fmt4(value: unknown): string {
  const n = toNum(value);
  return n === null ? '—' : NF_4DEC.format(n);
}

export function fmtBRL(value: unknown): string {
  const n = toNum(value);
  return n === null ? '—' : NF_BRL.format(n);
}

/** Recebe fração (0..1) e devolve "X,YY%". */
export function fmtPct(value: unknown): string {
  const n = toNum(value);
  return n === null ? '—' : `${NF_2DEC.format(n * 100)}%`;
}

export function formatDateBr(input: string | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
