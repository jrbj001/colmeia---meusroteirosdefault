/* eslint-disable no-console */
/**
 * Reproduz a lógica de parse do frontend (src/utils/parsePlanoOohExcel.ts)
 * sobre o template oficial "public/Modelo Planos Empilhados.xlsx" para
 * confirmar se o mapeamento da Coluna F (Pacote) está correto.
 */
const path = require('path');
const XLSX = require('xlsx');

const normalizeHeader = (h) => {
  if (typeof h !== 'string') return '';
  return h
    .split(/[\r\n]+/)[0]
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};

const FIXED_FIELD_HEADERS = [
  { headers: ['STATUS DO JOB'], key: 'statusJob_st', type: 'st' },
  { headers: ['JOB'], key: 'job_st', type: 'st' },
  { headers: ['CAMPANHA'], key: 'campanha_st', type: 'st' },
  { headers: ['PRODUTO'], key: 'produto_st', type: 'st' },
  { headers: ['TIPO DE NEGOCIACAO'], key: 'tipoNegociacao_st', type: 'st' },
  { headers: ['OUTRAS ESPECIFICACOES DIGITAR', 'OUTRAS ESPECIFICACOES'], key: 'outrasEspecificacoesDigitar_st', type: 'st' },
  { headers: ['DESCRICAO'], key: 'outrasEspecificacoesDigitar_st', type: 'st', occurrence: 'first' },
  { headers: ['UF'], key: 'uf_st', type: 'st' },
  { headers: ['PRACA'], key: 'praca_st', type: 'st' },
  { headers: ['EXIBIDOR'], key: 'exibidor_st', type: 'st' },
  { headers: ['AMBIENTE'], key: 'ambiente_st', type: 'st' },
  { headers: ['FORMATO'], key: 'formato_st', type: 'st' },
  { headers: ['DESCRICAO'], key: 'descricao_st', type: 'st', occurrence: 'last' },
  { headers: ['GRUPO'], key: 'grupo_st', type: 'st' },
];

function buildColMapping(headerRow) {
  const hMapAll = new Map();
  headerRow.forEach((h, i) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    if (!hMapAll.has(norm)) hMapAll.set(norm, []);
    hMapAll.get(norm).push(i);
  });

  const mapping = {};
  const usedIndices = new Set();
  const assignedKeys = new Set();

  for (const fieldDef of FIXED_FIELD_HEADERS) {
    if (assignedKeys.has(fieldDef.key)) continue;
    let colIdx = -1;
    for (const headerAlias of fieldDef.headers) {
      const indices = hMapAll.get(headerAlias) ?? [];
      if (indices.length === 0) continue;
      if (fieldDef.occurrence === 'last') {
        colIdx = indices[indices.length - 1];
      } else {
        colIdx = indices.find((i) => !usedIndices.has(i)) ?? indices[0];
      }
      break;
    }
    if (colIdx !== -1) {
      mapping[colIdx] = { key: fieldDef.key, type: fieldDef.type };
      usedIndices.add(colIdx);
      assignedKeys.add(fieldDef.key);
    }
  }

  return mapping;
}

const file = path.join(__dirname, '..', 'public', 'Modelo Planos Empilhados.xlsx');
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

// O parse atual: assume linha 1 (idx 1) = header. Aqui o template tem header na linha 0!
console.log('=== Header da linha 0 (template tem só uma linha de header) ===');
console.log('parsePlanoOohExcel usa raw[1] como header — mas o template tem header em raw[0].');
console.log('');

console.log('=== Mapeamento usando raw[0] (header CORRETO) ===');
const mappingCorrect = buildColMapping(aoa[0]);
const colF = Object.entries(mappingCorrect).find(([idx]) => Number(idx) === 5);
const colM = Object.entries(mappingCorrect).find(([idx]) => Number(idx) === 12);
console.log(`  idx 5 (Coluna F): ${JSON.stringify(colF?.[1])}`);
console.log(`  idx 12 (Coluna M): ${JSON.stringify(colM?.[1])}`);

console.log('');
console.log('=== Mapeamento usando raw[1] (como o código atual faz) ===');
const mappingActual = buildColMapping(aoa[1] || []);
const cnt = Object.keys(mappingActual).length;
console.log(`  colunas mapeadas: ${cnt}`);
if (cnt === 0) {
  console.log('  ⚠️ NENHUMA COLUNA mapeada! O parse não encontrou cabeçalhos.');
  console.log('  Primeiros valores da linha usada como header:');
  (aoa[1] || []).slice(0, 8).forEach((v, i) => console.log(`    idx ${i}: ${JSON.stringify(v)}`));
}
