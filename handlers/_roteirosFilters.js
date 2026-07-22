// Helper compartilhado: filtros multiselect da tela "Meus Roteiros".
// Usado por handlers/roteiros.js (list) e handlers/roteiros-search.js.
//
// Cada filtro aceita múltiplos valores (querystring), combinados assim:
//   - dentro de um filtro: OR  (IN (...))
//   - entre filtros:       AND
// Valores chegam separados por vírgula (ou como array). Ids/nomes desses
// campos não contêm vírgula, então o split é seguro.

function parseList(v) {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((s) => String(s).trim()).filter((s) => s.length > 0);
}

const SPECS = [
  { key: 'usuarioId', col: 'usuarioId_st', p: 'fUsr' },
  { key: 'marca',     col: 'marca_st',     p: 'fMarca' },
  { key: 'agencia',   col: 'agencia_st',   p: 'fAgencia' },
  { key: 'categoria', col: 'categoria_st', p: 'fCategoria' },
];

// Monta o trecho SQL (" AND col IN (@p0, @p1) AND ...") e a lista de binds.
// Retorna { sql, binds: [{name, value}] }.
function buildRoteiroFilters(query) {
  const clauses = [];
  const binds = [];
  for (const s of SPECS) {
    const vals = parseList(query[s.key]);
    if (!vals.length) continue;
    const placeholders = vals.map((_, i) => `@${s.p}${i}`);
    clauses.push(`${s.col} IN (${placeholders.join(', ')})`);
    vals.forEach((v, i) => binds.push({ name: `${s.p}${i}`, value: v }));
  }
  return {
    sql: clauses.length ? ' AND ' + clauses.join(' AND ') : '',
    binds,
  };
}

// Aplica os binds num request do mssql.
function applyBinds(request, binds) {
  for (const b of binds) request.input(b.name, b.value);
  return request;
}

module.exports = { buildRoteiroFilters, applyBinds };