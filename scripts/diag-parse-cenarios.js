/* eslint-disable no-console */
/**
 * Valida o parser AJUSTADO contra cenários típicos de arquivos OOH.
 * Reproduz exatamente a lógica do src/utils/parsePlanoOohExcel.ts.
 */

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
  { headers: ['JOB'], key: 'job_st', type: 'st' },
  { headers: ['CAMPANHA'], key: 'campanha_st', type: 'st' },
  { headers: ['PRODUTO'], key: 'produto_st', type: 'st' },
  { headers: ['TIPO DE NEGOCIACAO'], key: 'tipoNegociacao_st', type: 'st' },
  {
    headers: ['OUTRAS ESPECIFICACOES DIGITAR', 'OUTRAS ESPECIFICACOES', 'PACOTE', 'NOME DO PACOTE',
             'DESCRICAO DA NEGOCIACAO', 'DESCRICAO NEGOCIACAO', 'DESCRICAO DO PACOTE'],
    key: 'outrasEspecificacoesDigitar_st', type: 'st',
  },
  { headers: ['DESCRICAO'], key: 'outrasEspecificacoesDigitar_st', type: 'st', occurrence: 'first', requireMultiple: true },
  { headers: ['UF'], key: 'uf_st', type: 'st' },
  { headers: ['EXIBIDOR'], key: 'exibidor_st', type: 'st' },
  { headers: ['FORMATO'], key: 'formato_st', type: 'st' },
  { headers: ['DESCRICAO'], key: 'descricao_st', type: 'st', occurrence: 'last' },
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
      if (fieldDef.requireMultiple && indices.length < 2) continue;
      if (fieldDef.occurrence === 'last') {
        const reverse = [...indices].reverse();
        colIdx = reverse.find((i) => !usedIndices.has(i)) ?? -1;
      } else if (fieldDef.occurrence === 'first') {
        colIdx = indices.find((i) => !usedIndices.has(i)) ?? -1;
      } else {
        colIdx = indices.find((i) => !usedIndices.has(i)) ?? indices[0];
      }
      if (colIdx !== -1) break;
    }
    if (colIdx !== -1) {
      mapping[colIdx] = { key: fieldDef.key, type: fieldDef.type };
      usedIndices.add(colIdx);
      assignedKeys.add(fieldDef.key);
    }
  }
  return mapping;
}

function summarize(label, header, expectedPacote, expectedDescricao) {
  const m = buildColMapping(header);
  const pacote = Object.entries(m).find(([, v]) => v.key === 'outrasEspecificacoesDigitar_st')?.[0];
  const descricao = Object.entries(m).find(([, v]) => v.key === 'descricao_st')?.[0];
  const okPacote = (pacote ?? 'null') === String(expectedPacote ?? 'null');
  const okDesc = (descricao ?? 'null') === String(expectedDescricao ?? 'null');
  const status = okPacote && okDesc ? '✅' : '❌';
  console.log(`${status} ${label}`);
  console.log(`     pacote_idx esperado=${expectedPacote ?? 'null'}  obtido=${pacote ?? 'null'}`);
  console.log(`     descricao_idx esperado=${expectedDescricao ?? 'null'}  obtido=${descricao ?? 'null'}`);
}

console.log('--- Cenário 1: Template oficial empilhado (2× DESCRICAO) ---');
summarize(
  '2 colunas Descrição: F=Pacote, M=Descrição',
  ['JOB', 'CAMPANHA', 'Produto', 'Classif para P1A', 'TIPO DE NEGOCIAÇÃO',
   'Descrição\nEx Pacote Lola, Pacote Carnaval', 'GEO', 'UF', 'PRAÇA', 'EXIBIDOR',
   'AMBIENTE', 'FORMATO', 'DESCRIÇÃO'],
  5, 12,
);

console.log('\n--- Cenário 2: Arquivo OOH simples (1× DESCRICAO) ---');
summarize(
  '1 coluna Descrição (deve ir pra descricao_st, pacote nulo)',
  ['JOB', 'CAMPANHA', 'Produto', 'TIPO DE NEGOCIAÇÃO', 'EXIBIDOR', 'FORMATO', 'DESCRIÇÃO'],
  null, 6,
);

console.log('\n--- Cenário 3: Arquivo com header "Pacote" separado ---');
summarize(
  'Coluna PACOTE explícita + 1 DESCRICAO',
  ['JOB', 'PACOTE', 'EXIBIDOR', 'FORMATO', 'DESCRIÇÃO'],
  1, 4,
);

console.log('\n--- Cenário 4: Header "Outras Especificações Digitar" + 1 DESCRICAO ---');
summarize(
  'OUTRAS ESPECIFICAÇÕES DIGITAR + 1 DESCRICAO',
  ['JOB', 'OUTRAS ESPECIFICAÇÕES DIGITAR', 'EXIBIDOR', 'FORMATO', 'DESCRIÇÃO'],
  1, 4,
);

console.log('\n--- Cenário 5: Header "Descrição da Negociação" + 1 DESCRICAO ---');
summarize(
  'DESCRIÇÃO DA NEGOCIAÇÃO + 1 DESCRIÇÃO',
  ['JOB', 'Descrição da Negociação', 'EXIBIDOR', 'FORMATO', 'DESCRIÇÃO'],
  1, 4,
);
