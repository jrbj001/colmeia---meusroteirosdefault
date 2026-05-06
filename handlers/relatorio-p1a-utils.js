/**
 * Utilidades compartilhadas pelos handlers do Relatório P1A.
 *
 * Aceita reportPks como número, string CSV ou array (mesmo padrão usado
 * pela aplicação parceira) e devolve a string CSV exigida pelo parâmetro
 * @planoMidiaGrupoPk_st NVARCHAR(MAX) das stored procedures.
 */
function normalizePks(value) {
  if (value === undefined || value === null || value === '') return null;

  let arr = [];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'number') {
    arr = [value];
  } else if (typeof value === 'string') {
    arr = value.split(',');
  } else {
    return null;
  }

  const normalized = arr
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (normalized.length === 0) return null;
  // Remover duplicatas mantendo ordem
  const seen = new Set();
  const dedup = [];
  for (const n of normalized) {
    if (!seen.has(n)) {
      seen.add(n);
      dedup.push(n);
    }
  }
  return dedup.join(',');
}

/**
 * Aceita reportPks ou reportPk (retrocompat single-pk).
 * Retorna { csv, error } — error é mensagem amigável quando inválido.
 */
function extractReportPksCsv(body) {
  const raw = body?.reportPks ?? body?.reportPk ?? null;
  const csv = normalizePks(raw);
  if (!csv) {
    return {
      csv: null,
      error: 'reportPks é obrigatório (number, number[] ou CSV string)',
    };
  }
  return { csv, error: null };
}

const VALID_DIMENSIONS = ['GEO', 'PRACA', 'UF'];
const VALID_NEGOCIACOES = ['TOTAL', 'FATURAVEL', 'NAO_FATURAVEL'];

function normalizeDimension(value, fallback = 'GEO') {
  if (!value) return fallback;
  const upper = String(value).toUpperCase();
  return VALID_DIMENSIONS.includes(upper) ? upper : fallback;
}

function normalizeNegociacao(value) {
  if (!value) return 'TOTAL';
  const upper = String(value).toUpperCase();
  return VALID_NEGOCIACOES.includes(upper) ? upper : 'TOTAL';
}

module.exports = {
  normalizePks,
  extractReportPksCsv,
  normalizeDimension,
  normalizeNegociacao,
  VALID_DIMENSIONS,
  VALID_NEGOCIACOES,
};
