import * as XLSX from 'xlsx';

export interface ParsedPlanoRow {
  _index: number;
  _willInsert: boolean;
  [key: string]: unknown;
}

export interface ParsePlanoOohResult {
  records: ParsedPlanoRow[];
  filename: string;
  willInsertCount: number;
  pracasUnicas: string[];
  firstWeekStartSuggestion: string;
  campanhaSuggestion: string;
  valorTotalSuggestion: number;
}

const parseNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseDate = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(v).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return null;
};

const rowPassesSPFilter = (record: Record<string, unknown>): boolean => {
  const g1 = !!(record.job_st || record.campanha_st || record.produto_st);
  const g2 = !!(
    record.inicio_dt ||
    record.termino_dt ||
    Array.from({ length: 52 }, (_, i) => `week${String(i + 1).padStart(2, '0')}_vl`).some((k) => record[k])
  );
  const g3 = !!(record.grupo_st || record.exibidor_st || record.formato_st);
  return g1 && g2 && g3;
};

/**
 * Normaliza um cabeçalho do Excel para comparação:
 * - Pega somente a primeira linha (ignora quebras de linha)
 * - Remove acentos e cedilha
 * - Converte para maiúsculas
 * - Colapsa espaços múltiplos
 */
const normalizeHeader = (h: unknown): string => {
  if (typeof h !== 'string') return '';
  return h
    .split(/[\r\n]+/)[0]
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Definição dos campos fixos: quais cabeçalhos do Excel mapeiam para qual chave JSON.
 * `headers` é uma lista de aliases normalizados (o primeiro que bater vence).
 * `occurrence: 'last'` usa a ÚLTIMA coluna com aquele nome (ex: DESCRICAO aparece duas vezes).
 */
const FIXED_FIELD_HEADERS: Array<{
  headers: string[];
  key: string;
  type: 'st' | 'vl' | 'dt';
  occurrence?: 'first' | 'last';
}> = [
  { headers: ['STATUS DO JOB'], key: 'statusJob_st', type: 'st' },
  { headers: ['JOB'], key: 'job_st', type: 'st' },
  { headers: ['CAMPANHA'], key: 'campanha_st', type: 'st' },
  { headers: ['PRODUTO'], key: 'produto_st', type: 'st' },
  { headers: ['TIPO DE NEGOCIACAO'], key: 'tipoNegociacao_st', type: 'st' },
  { headers: ['UF'], key: 'uf_st', type: 'st' },
  { headers: ['PRACA'], key: 'praca_st', type: 'st' },
  { headers: ['EXIBIDOR'], key: 'exibidor_st', type: 'st' },
  { headers: ['AMBIENTE'], key: 'ambiente_st', type: 'st' },
  { headers: ['FORMATO'], key: 'formato_st', type: 'st' },
  // DESCRICAO pode aparecer em coluna extra antes da coluna original; usar sempre a última
  { headers: ['DESCRICAO'], key: 'descricao_st', type: 'st', occurrence: 'last' },
  { headers: ['GRUPO'], key: 'grupo_st', type: 'st' },
  { headers: ['TIPO'], key: 'tipo_st', type: 'st' },
  { headers: ['OUTRAS ESPECIFICACOES DIGITAR', 'OUTRAS ESPECIFICACOES'], key: 'outrasEspecificacoesDigitar_st', type: 'st' },
  { headers: ['ESPECIFICACOES'], key: 'especificacoes_st', type: 'st' },
  { headers: ['NUMERO DE SLOTS'], key: 'numeroSlots_vl', type: 'vl' },
  { headers: ['ESPECIFICACOES DIGITAL INSERCOES'], key: 'specDigitalInsercoes_st', type: 'st' },
  { headers: ['ESPECIFICACOES DIGITAL SECUNDAGEM'], key: 'specDigitalSecundagem_st', type: 'st' },
  { headers: ['FAIXA DE INSERCOES PARA IPV'], key: 'faixaInsercoesIpv_st', type: 'st' },
  { headers: ['NUMERO DE INSERCOES COMPRADAS'], key: 'numeroInsercoesCompradas_vl', type: 'vl' },
  { headers: ['ESPECIFICACAO ESTATICO LARGURA'], key: 'specEstaticoLargura_vl', type: 'vl' },
  { headers: ['ESPECIFICACAO ESTATICO ALTURA'], key: 'specEstaticoAltura_vl', type: 'vl' },
  { headers: ['DEFLATOR DE VISIBILIDADE (SE ESTATICO)'], key: 'deflatorVisibilidadeEstatico_vl', type: 'vl' },
  { headers: ['TT DE PONTOS'], key: 'ttPontos_vl', type: 'vl' },
  { headers: ['PERIODO DA TABELA'], key: 'periodoTabela_st', type: 'st' },
  { headers: ['NUMERO DE DIAS REFERENCIA'], key: 'numeroDiasReferencia_vl', type: 'vl' },
  { headers: ['INICIO'], key: 'inicio_dt', type: 'dt' },
  { headers: ['TERMINO'], key: 'termino_dt', type: 'dt' },
  { headers: ['PERIODO'], key: 'periodo_st', type: 'st' },
  {
    headers: ['NO. DIAS CAMPANHA (MANUAL)', 'NO. DIAS CAMPANHA', 'NUMERO DE DIAS CAMPANHA'],
    key: 'noDiasCampanhaManual_vl',
    type: 'vl',
  },
  // ─── Pós-semanas ───────────────────────────────────────────────────────────
  { headers: ['DIVISOR PARA CALCULO DE FLIGHT E FACE'], key: 'divisorFlightFace_vl', type: 'vl' },
  { headers: ['TT FLIGHTS'], key: 'ttFlights_vl', type: 'vl' },
  { headers: ['TT FACES'], key: 'ttFaces_vl', type: 'vl' },
  { headers: ['MODELO DE COMPRA'], key: 'modeloCompra_st', type: 'st' },
  { headers: ['JUSTIFICATIVA DO VALOR TABELA'], key: 'justificativaValorTabela_st', type: 'st' },
  { headers: ['TABELA ORIGINAL DO VEICULO'], key: 'tabelaOriginalVeiculo_vl', type: 'vl' },
  { headers: ['TABELA UNITARIA'], key: 'tabelaUnitaria_vl', type: 'vl' },
  { headers: ['TABELA TOTAL'], key: 'tabelaTotal_vl', type: 'vl' },
  { headers: ['%'], key: 'pctNegociado_vl', type: 'vl' },
  { headers: ['NEGOCIADO'], key: 'negociado_vl', type: 'vl' },
  { headers: ['TOTAL NEGOCIADO'], key: 'totalNegociado_vl', type: 'vl' },
  { headers: ['VALOR LIQUIDO'], key: 'valorLiquido_vl', type: 'vl' },
  { headers: ['FATURAVEL OU NAO FATURAVEL', 'FATURAVEL OU NAO FATURAVEL'], key: 'faturavel_st', type: 'st' },
  { headers: ['IMPACTO IPV'], key: 'impactoIpv_vl', type: 'vl' },
  { headers: ['CPMVIEW'], key: 'cpmView_vl', type: 'vl' },
  { headers: ['PRODUCAO FINALIZACAO'], key: 'producaoFinalizacao_st', type: 'st' },
  { headers: ['PRODUCAO IMPRESSAO'], key: 'producaoImpressao_st', type: 'st' },
  { headers: ['PRAZO DE PAGAMENTO'], key: 'prazoPagamento_st', type: 'st' },
  { headers: ['TABELA VIGENTE'], key: 'tabelaVigente_st', type: 'st' },
  { headers: ['QTD DE FORMATOS'], key: 'qtdFormatos_vl', type: 'vl' },
  { headers: ['QTD DE LAYOUTS'], key: 'qtdLayouts_vl', type: 'vl' },
  { headers: ['VALOR UNITARIO'], key: 'valorUnitario_vl', type: 'vl' },
  { headers: ['VALOR TOTAL'], key: 'valorTotal_vl', type: 'vl' },
  { headers: ['QTD FACES'], key: 'qtdFaces_vl', type: 'vl' },
  { headers: ['QTD DE PRODUCOES'], key: 'qtdProducoes_vl', type: 'vl' },
  { headers: ['RESERVA TECNICA (%)'], key: 'reservaTecnicaPct_vl', type: 'vl' },
  { headers: ['QTD FACES PARA PRODUCAO'], key: 'qtdFacesProducao_vl', type: 'vl' },
  { headers: ['LARGURA (M)'], key: 'larguraM_vl', type: 'vl' },
  { headers: ['ALTURA (M)'], key: 'alturaM_vl', type: 'vl' },
  { headers: ['VALOR UNITARIO (R$/FACE)', 'VALOR UNITARIO (R$/ FACE)'], key: 'valorUnitarioFace_vl', type: 'vl' },
  { headers: ['VALOR UNITARIO (R$/M\u00B2)', 'VALOR UNITARIO (R$/M2)'], key: 'valorUnitarioM2_vl', type: 'vl' },
  { headers: ['TOTAL PARCIAL (R$)', 'TOTAL PARCIAL'], key: 'totalParcial_vl', type: 'vl' },
  { headers: ['CUSTO DE INSTALACAO (R$)', 'CUSTO DE INSTALACAO'], key: 'custoInstalacao_vl', type: 'vl' },
  { headers: ['TOTAL FINAL (R$)', 'TOTAL FINAL'], key: 'totalFinal_vl', type: 'vl' },
  { headers: ['BASE PARA CALCULO'], key: 'baseCalculo_st', type: 'st' },
  { headers: ['IMPACTO SE INFORMACAO FOR SEMANAL'], key: 'impactoSemanal_vl', type: 'vl' },
  { headers: ['FLUXO PASSANTES FORMATO & PRACA', 'FLUXO PASSANTES FORMATO E PRACA'], key: 'fluxoPassantesFormatoPraca_vl', type: 'vl' },
  { headers: ['FLUXO PASSANTES PRACA'], key: 'fluxoPassantesPraca_vl', type: 'vl' },
  { headers: ['IMPACTO SE INFORMACAO FOR MENSAL'], key: 'impactoMensal_vl', type: 'vl' },
  { headers: ['TT DE DIAS CAMPANHA'], key: 'ttDiasCampanha_vl', type: 'vl' },
  {
    headers: ['PUBLICO/ LOCAL NO PERIODO DA CAMPANHA', 'PUBLICO/LOCAL NO PERIODO DA CAMPANHA'],
    key: 'publicoLocalPeriodo_vl',
    type: 'vl',
  },
  { headers: ['SOMA DO TT LOCAIS OU FLIGHTS'], key: 'somaTtLocaisFlights_vl', type: 'vl' },
  { headers: ['FLUXO DE PASSANTES'], key: 'fluxoPassantes_vl', type: 'vl' },
  { headers: ['IPV AJUSTADO'], key: 'ipvAjustado_vl', type: 'vl' },
  { headers: ['IMPACTO IPV (CAMPANHA)'], key: 'impactoIpvCampanha_vl', type: 'vl' },
  { headers: ['IPV ORIGINAL'], key: 'ipvOriginal_vl', type: 'vl' },
  { headers: ['IPV DIGITAL'], key: 'ipvDigital_vl', type: 'vl' },
  { headers: ['DEFLATOR DE VISIBILIDADE - SOMENTE ESTATICOS'], key: 'deflatorVisibilidadeEstaticos_vl', type: 'vl' },
];

/**
 * Constrói o mapeamento índice-de-coluna → field dinâmicamente a partir da linha de cabeçalho.
 * As semanas (week01–52) são detectadas por posição após noDiasCampanhaManual.
 */
function buildColMapping(
  headerRow: unknown[],
): Record<number, { key: string; type: 'st' | 'vl' | 'dt' }> {
  // hMapAll: header normalizado → todos os índices de coluna com esse cabeçalho
  const hMapAll = new Map<string, number[]>();
  headerRow.forEach((h, i) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    if (!hMapAll.has(norm)) hMapAll.set(norm, []);
    hMapAll.get(norm)!.push(i);
  });

  const mapping: Record<number, { key: string; type: 'st' | 'vl' | 'dt' }> = {};
  const usedIndices = new Set<number>();

  for (const fieldDef of FIXED_FIELD_HEADERS) {
    let colIdx = -1;
    for (const headerAlias of fieldDef.headers) {
      const indices = hMapAll.get(headerAlias) ?? [];
      if (indices.length === 0) continue;
      if (fieldDef.occurrence === 'last') {
        colIdx = indices[indices.length - 1];
      } else {
        // Pegar a primeira ocorrência ainda não usada
        colIdx = indices.find((i) => !usedIndices.has(i)) ?? indices[0];
      }
      break;
    }
    if (colIdx !== -1) {
      mapping[colIdx] = { key: fieldDef.key, type: fieldDef.type };
      usedIndices.add(colIdx);
    }
  }

  // Detectar semanas por posição: logo após noDiasCampanhaManual_vl
  const noDiasEntry = Object.entries(mapping).find(([, v]) => v.key === 'noDiasCampanhaManual_vl');
  const divisorEntry = Object.entries(mapping).find(([, v]) => v.key === 'divisorFlightFace_vl');

  let weekStartIdx = -1;
  if (noDiasEntry) {
    weekStartIdx = Number(noDiasEntry[0]) + 1;
  } else if (divisorEntry) {
    weekStartIdx = Number(divisorEntry[0]) - 52;
  }

  if (weekStartIdx >= 0) {
    for (let w = 0; w < 52; w++) {
      const idx = weekStartIdx + w;
      if (!mapping[idx]) {
        mapping[idx] = { key: `week${String(w + 1).padStart(2, '0')}_vl`, type: 'vl' };
      }
    }
  }

  return mapping;
}

export async function parsePlanoOohExcel(file: File): Promise<ParsePlanoOohResult> {
  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    r.readAsArrayBuffer(file);
  });

  const wb = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'OOH') ?? wb.SheetNames[0];
  if (!sheetName) throw new Error('Nenhuma aba encontrada no arquivo.');

  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][];

  if (raw.length < 3) throw new Error('Planilha sem linhas de dados.');

  // Linha 1 (índice 1) = cabeçalhos das colunas
  const headerRow = raw[1] ?? [];
  const colMapping = buildColMapping(headerRow);

  const rows: ParsedPlanoRow[] = [];
  let valorTotalSuggestion = 0;

  for (let rowIdx = 2; rowIdx < raw.length; rowIdx++) {
    const rawRow = raw[rowIdx];
    if (!rawRow || rawRow.every((cell) => cell === '' || cell === null || cell === undefined)) continue;

    const record: Record<string, unknown> = {};
    for (const [colIdxStr, mapping] of Object.entries(colMapping)) {
      const colIdx = Number(colIdxStr);
      const rawVal = rawRow[colIdx];
      if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
      if (mapping.type === 'st') {
        const str = String(rawVal).trim();
        if (str) record[mapping.key] = str;
      } else if (mapping.type === 'vl') {
        const num = parseNumber(rawVal);
        if (num !== null) record[mapping.key] = num;
      } else if (mapping.type === 'dt') {
        const dt = parseDate(rawVal);
        if (dt) record[mapping.key] = dt;
      }
    }

    // Soma apenas uma vez por linha (valorLiquido ou totalFinal)
    const v = record.valorLiquido_vl ?? record.totalFinal_vl;
    if (typeof v === 'number') valorTotalSuggestion += v;

    rows.push({ ...record, _index: rowIdx + 1, _willInsert: rowPassesSPFilter(record) });
  }

  if (rows.length === 0) throw new Error('Nenhuma linha de dados encontrada na aba OOH.');

  const pracasUnicas = [...new Set(rows.map((r) => r.praca_st as string).filter(Boolean))].sort();
  const dates = rows.map((r) => r.inicio_dt as string).filter(Boolean).sort();
  const campanhas = [...new Set(rows.map((r) => r.campanha_st as string).filter(Boolean))];

  return {
    records: rows,
    filename: file.name,
    willInsertCount: rows.filter((r) => r._willInsert).length,
    pracasUnicas,
    firstWeekStartSuggestion: dates[0] ?? '',
    campanhaSuggestion: campanhas[0] ?? '',
    valorTotalSuggestion,
  };
}
