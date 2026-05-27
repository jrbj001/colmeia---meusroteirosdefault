/* eslint-disable no-console */
/**
 * Teste end-to-end do parser de planos OOH (após o fix).
 * - Monta arquivos XLSX sintéticos em memória cobrindo cenários reais
 * - Lê com a MESMA biblioteca xlsx que o frontend usa
 * - Aplica EXATAMENTE a lógica do src/utils/parsePlanoOohExcel.ts
 * - Verifica que outrasEspecificacoesDigitar_st e descricao_st saem preenchidos onde esperado
 */
const XLSX = require('xlsx');

/* ─── Cópia FIEL do parser (após o fix) ─── */
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
    headers: [
      'OUTRAS ESPECIFICACOES DIGITAR', 'OUTRAS ESPECIFICACOES', 'PACOTE', 'NOME DO PACOTE',
      'DESCRICAO DA NEGOCIACAO', 'DESCRICAO NEGOCIACAO', 'DESCRICAO DO PACOTE',
    ],
    key: 'outrasEspecificacoesDigitar_st', type: 'st',
  },
  { headers: ['DESCRICAO'], key: 'outrasEspecificacoesDigitar_st', type: 'st', occurrence: 'first', requireMultiple: true },
  { headers: ['UF'], key: 'uf_st', type: 'st' },
  { headers: ['PRACA'], key: 'praca_st', type: 'st' },
  { headers: ['EXIBIDOR'], key: 'exibidor_st', type: 'st' },
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

function parseRecords(aoa) {
  const headerRow = aoa[1] ?? [];
  const mapping = buildColMapping(headerRow);
  const records = [];
  for (let rowIdx = 2; rowIdx < aoa.length; rowIdx++) {
    const rawRow = aoa[rowIdx];
    if (!rawRow || rawRow.every((c) => c === '' || c === null || c === undefined)) continue;
    const record = {};
    for (const [colIdxStr, m] of Object.entries(mapping)) {
      const v = rawRow[Number(colIdxStr)];
      if (v === '' || v === null || v === undefined) continue;
      if (m.type === 'st') {
        const s = String(v).trim();
        if (s) record[m.key] = s;
      }
    }
    records.push(record);
  }
  return { mapping, records };
}

/* ─── Helper: monta XLSX em memória e relê com a mesma lib ─── */
function buildAndRead(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OOH');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const wb2 = XLSX.read(buf, { type: 'buffer', cellDates: false });
  return XLSX.utils.sheet_to_json(wb2.Sheets['OOH'], { header: 1, defval: '', raw: true });
}

let pass = 0;
let fail = 0;
function expect(label, cond, info = '') {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else { console.log(`  ❌ ${label} ${info}`); fail++; }
}

/* ═══════════════════════════════════════════════════════════
   Cenário 1 — Template empilhado oficial (2× DESCRICAO)
   F = Descrição (Pacote) / M = DESCRIÇÃO (descrição do ponto)
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 1: template empilhado (2× DESCRICAO) ━━━━');
{
  const sheet = [
    ['Plano OOH 2026'],
    ['JOB','CAMPANHA','Produto','Classif para P1A','TIPO DE NEGOCIAÇÃO',
     'Descrição\nEx Pacote Lola, Pacote Carnaval','GEO','UF','PRAÇA','EXIBIDOR',
     'AMBIENTE','FORMATO','DESCRIÇÃO','GRUPO'],
    ['J4427','BRAHMA FWC','Guaraná','Demais OOH','Compromisso',
     'Pacote Copa','GEO RJ','RJ','Rio de Janeiro','JCDECAUX',
     'Via Pública','Mub Digital','Bloco MUPI Rio - Super Premium','G6'],
    ['J4427','BRAHMA FWC','Guaraná','Demais OOH','Compromisso',
     '','GEO RJ','RJ','Rio de Janeiro','JCDECAUX',
     'Via Pública','Mub Estático','Bloco RJ - Super Premium','G6'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('linha 1 — outrasEspecificacoesDigitar_st = "Pacote Copa"',
         records[0].outrasEspecificacoesDigitar_st === 'Pacote Copa', `(got: ${records[0].outrasEspecificacoesDigitar_st})`);
  expect('linha 1 — descricao_st = "Bloco MUPI Rio - Super Premium"',
         records[0].descricao_st === 'Bloco MUPI Rio - Super Premium', `(got: ${records[0].descricao_st})`);
  expect('linha 2 — outrasEspecificacoesDigitar_st vazio (sem pacote)',
         records[1].outrasEspecificacoesDigitar_st === undefined, `(got: ${records[1].outrasEspecificacoesDigitar_st})`);
  expect('linha 2 — descricao_st = "Bloco RJ - Super Premium"',
         records[1].descricao_st === 'Bloco RJ - Super Premium');
}

/* ═══════════════════════════════════════════════════════════
   Cenário 2 — Arquivo OOH simples (1× DESCRICAO)
   Antes do fix: parser metia "Bloco MUPI Rio..." em outrasEspec...
   Depois do fix: pacote deve ficar NULL, descricao_st recebe o conteúdo
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 2: arquivo OOH simples (1× DESCRICAO) ━━━━');
{
  const sheet = [
    ['Plano OOH'],
    ['JOB','CAMPANHA','Produto','TIPO DE NEGOCIAÇÃO','EXIBIDOR','FORMATO','DESCRIÇÃO'],
    ['J4289','HORA ZÉ','Brahma','Compromisso','JCDECAUX','Mub Digital','Bloco MUPI Rio - Super Premium'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('outrasEspecificacoesDigitar_st permanece vazio (sem coluna de pacote)',
         records[0].outrasEspecificacoesDigitar_st === undefined, `(got: ${records[0].outrasEspecificacoesDigitar_st})`);
  expect('descricao_st = "Bloco MUPI Rio - Super Premium"',
         records[0].descricao_st === 'Bloco MUPI Rio - Super Premium', `(got: ${records[0].descricao_st})`);
}

/* ═══════════════════════════════════════════════════════════
   Cenário 3 — Header "PACOTE" + 1 DESCRICAO
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 3: header "PACOTE" separado ━━━━');
{
  const sheet = [
    ['Plano OOH'],
    ['JOB','PACOTE','EXIBIDOR','FORMATO','DESCRIÇÃO'],
    ['J4400','Pacote Carnaval','ELETROMIDIA','LED','Avenida Atlântica'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('outrasEspecificacoesDigitar_st = "Pacote Carnaval"',
         records[0].outrasEspecificacoesDigitar_st === 'Pacote Carnaval');
  expect('descricao_st = "Avenida Atlântica"',
         records[0].descricao_st === 'Avenida Atlântica');
}

/* ═══════════════════════════════════════════════════════════
   Cenário 4 — Header "OUTRAS ESPECIFICAÇÕES DIGITAR" + 1 DESCRICAO
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 4: "OUTRAS ESPECIFICAÇÕES DIGITAR" + 1 DESCRICAO ━━━━');
{
  const sheet = [
    ['Plano OOH'],
    ['JOB','OUTRAS ESPECIFICAÇÕES DIGITAR','EXIBIDOR','FORMATO','DESCRIÇÃO'],
    ['J4399','tbd','NEOOH','LED','Posto AM PM'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('outrasEspecificacoesDigitar_st = "tbd"',
         records[0].outrasEspecificacoesDigitar_st === 'tbd');
  expect('descricao_st = "Posto AM PM"',
         records[0].descricao_st === 'Posto AM PM');
}

/* ═══════════════════════════════════════════════════════════
   Cenário 5 — Header "Descrição da Negociação" + 1 DESCRIÇÃO
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 5: "Descrição da Negociação" + 1 DESCRICAO ━━━━');
{
  const sheet = [
    ['Plano OOH'],
    ['JOB','Descrição da Negociação','EXIBIDOR','FORMATO','DESCRIÇÃO'],
    ['J4500','Pacote Premium 2026','ELETROMIDIA','Painel Led','Av. Paulista'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('outrasEspecificacoesDigitar_st = "Pacote Premium 2026"',
         records[0].outrasEspecificacoesDigitar_st === 'Pacote Premium 2026');
  expect('descricao_st = "Av. Paulista"',
         records[0].descricao_st === 'Av. Paulista');
}

/* ═══════════════════════════════════════════════════════════
   Cenário 6 — Regressão do BUG ORIGINAL (1× DESCRICAO)
   No parser ANTES do fix:
   - 1ª regra: DESCRICAO first → outrasEspecificacoesDigitar_st = "Pacote Copa"
   - 2ª regra: DESCRICAO last → descricao_st (sobrescreve idx, perde Pacote)
   - Resultado errado: descricao_st='Pacote Copa', outras=undefined
   Após o fix (com requireMultiple), só uma DESCRICAO vai para descricao_st e ponto.
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━ Cenário 6: regressão do bug (1× DESCRICAO com "Pacote" na string) ━━━━');
{
  const sheet = [
    ['Plano OOH'],
    ['JOB','CAMPANHA','EXIBIDOR','FORMATO','DESCRIÇÃO'],
    ['J4427','BRAHMA','JCDECAUX','LED','Bloco MUPI Rio - Super Premium - Pacote Copa'],
  ];
  const aoa = buildAndRead(sheet);
  const { records } = parseRecords(aoa);
  console.log('  records:', JSON.stringify(records, null, 2));
  expect('outrasEspecificacoesDigitar_st permanece vazio (não há coluna de Pacote)',
         records[0].outrasEspecificacoesDigitar_st === undefined);
  expect('descricao_st recebe a descrição inteira',
         records[0].descricao_st === 'Bloco MUPI Rio - Super Premium - Pacote Copa');
}

/* ═══════════════════════════════════════════════════════════
   Resumo
═══════════════════════════════════════════════════════════ */
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  RESULTADO: ${pass} ok / ${fail} falhas`);
process.exit(fail > 0 ? 1 : 0);
