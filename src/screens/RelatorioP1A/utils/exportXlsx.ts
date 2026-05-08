import * as XLSX from 'xlsx';
import { ColmeiaRow, Dimension, ExibidorRow, ModeloRow } from '../types';

/* ─────────────────────────────────────────────────────────────────────────────
   Export "Planos Empilhados" — formato e colunas idênticos ao
   "public/Modelo Planos Empilhados.xlsx" (100 colunas, A..CV).
   ───────────────────────────────────────────────────────────────────────────── */

type EmpilhadoCellType = 'st' | 'vl' | 'dt' | 'pct';

interface EmpilhadoColumn {
  /** Cabeçalho exato como no modelo (incluindo `\r\n`). */
  label: string;
  /** Chave do JSON retornada pelo handler `/api/relatorio-p1a-empilhamento`.
   *  `null` = coluna vazia (placeholder de posição, p.ex. coluna Q sem header). */
  key: string | null;
  /** Largura da coluna em caracteres (Excel `wch`). */
  wch: number;
  /** Tipo da célula (define formatação numérica/data). */
  type: EmpilhadoCellType;
}

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Gera labels W1..W52 no formato "W{N} - DD/mmm" começando em 04/jan/2026
 *  (mesma base usada no modelo). */
function gerarLabelsSemanas(): string[] {
  const labels: string[] = [];
  const base = new Date(2026, 0, 4); // 04/jan/2026 (domingo, igual ao modelo)
  for (let w = 1; w <= 52; w++) {
    const d = new Date(base);
    d.setDate(base.getDate() + (w - 1) * 7);
    const dd = String(d.getDate()).padStart(2, '0');
    const mes = MESES_ABREV[d.getMonth()];
    labels.push(`W${w} - ${dd}/${mes}`);
  }
  return labels;
}

const SEMANAS_LABELS = gerarLabelsSemanas();

/** Cabeçalhos / posicionamento idênticos ao "Modelo Planos Empilhados.xlsx" */
const COLUNAS_EMPILHADO: EmpilhadoColumn[] = [
  { label: 'JOB',                                                                     key: 'job_st',                          wch: 10, type: 'st' },
  { label: 'CAMPANHA',                                                                key: 'campanha_st',                     wch: 38, type: 'st' },
  { label: 'Produto',                                                                 key: 'produto_st',                      wch: 22, type: 'st' },
  { label: 'Classif para P1A\r\nEscolher manual\r\nPacote SSA \r\nEmpenas RJ',        key: 'classifP1a_st',                   wch: 18, type: 'st' },
  { label: 'TIPO DE NEGOCIAÇÃO',                                                      key: 'tipoNegociacao_st',               wch: 18, type: 'st' },
  { label: 'Descrição\r\nEx Pacote Lola, Pacote Carnaval',                            key: 'descricaoPacote_st',              wch: 28, type: 'st' },
  { label: 'GEO',                                                                     key: 'geoAmbev_st',                     wch: 10, type: 'st' },
  { label: 'UF',                                                                      key: 'uf_st',                           wch: 6,  type: 'st' },
  { label: 'PRAÇA',                                                                   key: 'praca_st',                        wch: 18, type: 'st' },
  { label: 'EXIBIDOR',                                                                key: 'exibidor_st',                     wch: 18, type: 'st' },
  { label: 'AMBIENTE',                                                                key: 'ambiente_st',                     wch: 18, type: 'st' },
  { label: 'FORMATO',                                                                 key: 'formato_st',                      wch: 26, type: 'st' },
  { label: 'DESCRIÇÃO',                                                               key: 'descricao_st',                    wch: 26, type: 'st' },
  { label: 'GRUPO',                                                                   key: 'grupo_st',                        wch: 8,  type: 'st' },
  { label: 'TIPO',                                                                    key: 'tipo_st',                         wch: 10, type: 'st' },
  { label: 'KV',                                                                      key: 'kv_st',                           wch: 10, type: 'st' },
  /* Coluna Q (índice 16): sem cabeçalho no modelo — placeholder vazio */
  { label: '',                                                                        key: null,                              wch: 4,  type: 'st' },
  { label: 'ESPECIFICAÇÕES',                                                          key: 'especificacoes_st',               wch: 18, type: 'st' },
  { label: 'Numero de SLOTS',                                                         key: 'numeroSlots_vl',                  wch: 10, type: 'vl' },
  { label: 'Especificações\r\nDigital\r\ninserções',                                  key: 'specDigitalInsercoes_vl',         wch: 10, type: 'vl' },
  { label: 'Especificações\r\nDigital\r\nsecundagem',                                 key: 'specDigitalSecundagem_vl',        wch: 10, type: 'vl' },
  { label: 'Faixa de inserções para IPV',                                             key: 'faixaInsercoesIpv_st',            wch: 22, type: 'st' },
  { label: 'Número de inserções compradas',                                           key: 'numeroInsercoesCompradas_vl',     wch: 14, type: 'vl' },
  { label: 'Especificação Estático\r\nLargura',                                       key: 'specEstaticoLargura_vl',          wch: 10, type: 'vl' },
  { label: 'Especificação Estático\r\nAltura',                                        key: 'specEstaticoAltura_vl',           wch: 10, type: 'vl' },
  { label: 'Deflator de visibilidade\r\n(se estático)',                               key: 'deflatorVisibilidadeEstatico_vl', wch: 12, type: 'vl' },
  { label: 'TT DE PONTOS',                                                            key: 'ttPontos_vl',                     wch: 10, type: 'vl' },
  { label: 'PERIODO DA TABELA',                                                       key: 'periodoTabela_st',                wch: 14, type: 'st' },
  { label: 'NUM DIAS PERIODO TABELA',                                                 key: 'numeroDiasReferencia_vl',         wch: 12, type: 'vl' },
  { label: 'INÍCIO',                                                                  key: 'inicio_dt',                       wch: 12, type: 'dt' },
  { label: 'TÉRMINO',                                                                 key: 'termino_dt',                      wch: 12, type: 'dt' },
  { label: 'PERÍODO',                                                                 key: 'periodo_st',                      wch: 12, type: 'st' },
  { label: 'No. dias Campanha\r\nDigitar manualmente caso períodos com intervalos',   key: 'noDiasCampanhaManual_vl',         wch: 14, type: 'vl' },
  /* AH..CG — semanas W1..W52 (label dinâmico) */
  ...SEMANAS_LABELS.map((label, i) => ({
    label,
    key: `week${String(i + 1).padStart(2, '0')}_vl`,
    wch: 11,
    type: 'vl' as const,
  })),
  { label: 'Divisor\r\npara cálculo de flight e face',                                key: 'divisorFlightFace_vl',            wch: 12, type: 'vl' },
  { label: 'TT Flights',                                                              key: 'ttFlights_vl',                    wch: 9,  type: 'vl' },
  { label: 'TT Faces',                                                                key: 'ttFaces_vl',                      wch: 9,  type: 'vl' },
  { label: 'Modelo de compra (faces ou flights)',                                     key: 'modeloCompra_st',                 wch: 16, type: 'st' },
  { label: 'Justficativa do valor tabela diferente / métrica\r\nOBRIGATÓRIO',         key: 'justificativaValorTabela_st',     wch: 28, type: 'st' },
  { label: 'Tabela ORIGINAL DO VEICULO',                                              key: 'tabelaOriginalVeiculo_vl',        wch: 14, type: 'vl' },
  { label: 'TABELA Unitária',                                                         key: 'tabelaUnitaria_vl',               wch: 14, type: 'vl' },
  { label: 'Tabela Total',                                                            key: 'tabelaTotal_vl',                  wch: 14, type: 'vl' },
  { label: '%',                                                                       key: 'pctNegociado_vl',                 wch: 8,  type: 'pct' },
  { label: 'Negociado',                                                               key: 'negociado_vl',                    wch: 14, type: 'vl' },
  { label: 'Total Negociado',                                                         key: 'totalNegociado_vl',               wch: 14, type: 'vl' },
  { label: 'Valor liquido',                                                           key: 'valorLiquido_vl',                 wch: 14, type: 'vl' },
  { label: 'Faturavel ou NÃO faturável',                                              key: 'faturavel_st',                    wch: 18, type: 'st' },
  { label: 'Impacto IPV',                                                             key: 'impactoIpv_vl',                   wch: 16, type: 'vl' },
  { label: 'CpView',                                                                  key: 'cpmView_vl',                      wch: 12, type: 'vl' },
];

export interface EmpilhadoRow {
  [key: string]: unknown;
}

/* Excel epoch: dia 1 = 1900-01-01 (com bug do 1900 bissexto).
   Diferença em dias entre 1899-12-30 (00:00 UTC) e a data informada. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function dateToExcelSerial(d: Date): number {
  const ms = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((ms - EXCEL_EPOCH_MS) / 86_400_000);
}

/** Converte o valor cru (vindo do banco) para o tipo apropriado no Excel.
 *  Datas viram número serial Excel (igual ao modelo: AD2 = 46084). */
function coerceCellValue(val: unknown, type: EmpilhadoCellType): unknown {
  if (val === null || val === undefined || val === '') return null;

  if (type === 'dt') {
    let d: Date | null = null;
    if (val instanceof Date) d = val;
    else if (typeof val === 'string') {
      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    return d ? dateToExcelSerial(d) : null;
  }

  if (type === 'vl' || type === 'pct') {
    if (typeof val === 'number') return val;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  return String(val);
}

export function exportP1aEmpilhado(rows: EmpilhadoRow[], reportPks: number[]) {
  if (rows.length === 0) return;

  const headers = COLUNAS_EMPILHADO.map((c) => c.label);
  const data: unknown[][] = [headers];

  for (const row of rows) {
    data.push(
      COLUNAS_EMPILHADO.map((c) => {
        if (c.key === null) return null;
        return coerceCellValue(row[c.key], c.type);
      }),
    );
  }

  /* Gera a sheet sem flags de cellDates — datas já estão como número serial. */
  const ws = XLSX.utils.aoa_to_sheet(data);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planilha1');

  const pksStr =
    reportPks.slice(0, 5).join('-') + (reportPks.length > 5 ? '-etc' : '');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Planos_Empilhados_${pksStr}_${date}.xlsx`);
}

interface ExportArgs {
  filename?: string;
  dimension: Dimension;
  dimensionValue: string | null;
  colmeiaRows: ColmeiaRow[];
  exibidorRows: ExibidorRow[];
  modeloRows: ModeloRow[];
}

/**
 * Exporta as 3 abas + abas "(raw)" do Relatório P1A em um único .xlsx.
 *
 * Versão "simples" usando a lib `xlsx` que já temos no projeto. Não traz
 * cores/merges/freeze do workbook original — esse enriquecimento pode ser
 * adicionado em fase futura (com `xlsx-js-style` ou `exceljs`).
 */
export function exportP1aWorkbook({
  filename,
  dimension,
  dimensionValue,
  colmeiaRows,
  exibidorRows,
  modeloRows,
}: ExportArgs) {
  const wb = XLSX.utils.book_new();

  if (colmeiaRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(colmeiaRows),
      truncSheetName('5 Colmeia (raw)'),
    );
  }
  if (exibidorRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(exibidorRows),
      truncSheetName('6 Exibidor (raw)'),
    );
  }
  if (modeloRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(modeloRows),
      truncSheetName('7 Modelo P1A (raw)'),
    );
  }

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ aviso: 'Sem dados para exportar' }]),
      'Vazio',
    );
  }

  const safeDim = dimensionValue ? `_${dimensionValue.replace(/[^\w]+/g, '-')}` : '';
  const finalName =
    filename || `Relatorio_P1A_${dimension}${safeDim}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

function truncSheetName(name: string): string {
  // Excel limita a 31 caracteres
  return name.length > 31 ? name.slice(0, 31) : name;
}
