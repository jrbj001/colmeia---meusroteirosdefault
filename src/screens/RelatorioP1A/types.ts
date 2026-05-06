export type Dimension = 'GEO' | 'PRACA' | 'UF';
export type Negociacao = 'TOTAL' | 'FATURAVEL' | 'NAO_FATURAVEL';
export type SourceType = 'import' | 'colmeia' | 'skipped' | null;
export type P1aTab = 'colmeia' | 'exibidor' | 'modelo';

/** Linha do `planoMidiaGrupo_dm_vw` exposta pelo `/api/relatorio-p1a-options`. */
export interface ReportOption {
  _pk: number;
  planoMidiaGrupo_pk: number;
  planoMidiaGrupo_st: string;
  planoMidiaDesc_st_concat: string | null;
  usuarioId_st: string | null;
  usuarioName_st: string | null;
  gender_st: string | null;
  class_st: string | null;
  age_st: string | null;
  planoMidiaType_st: string | null;
  cidadeUpper_st_concat: string | null;
  semanasMax_vl: number | null;
  date_dh: string;
  agencia_st: string | null;
  liberadoAgencia_bl: number | null;
  marca_st?: string | null;
}

export interface OptionsResponse {
  reports: ReportOption[];
  marcas: string[];
  dimensions: Record<Dimension, string[]>;
  negociacoes: Negociacao[];
}

export interface RefreshRow {
  report_pk: number;
  refreshedAt_dh: string;
  rowsWritten_vl: number;
  skipped_bl: number | boolean;
  sourceType_st: SourceType;
}

/**
 * Aba 5 — Colmeia. Recordset real de `sp_reportResultColmeiaGeoClosed`.
 * Uma linha por (dimensionValue × week) com todas as métricas em colunas.
 */
export interface ColmeiaRow {
  planoMidiaGrupoPk_st?: string | null;
  dimension_st?: Dimension | string | null;
  dimensionValue_st?: string | null;
  geoAmbev_st?: string | null;
  week_vl: number | string;
  impactosIpv_vl?: number | string | null;
  coberturaProp_vl?: number | string | null;
  coberturaPessoas_vl?: number | string | null;
  populationTotal_vl?: number | string | null;
  pontosPraca_vl?: number | string | null;
  pontos_vl?: number | string | null;
  dominacao_vl?: number | string | null;
  segmento_st?: string | null;
  deflatorInventario_vl?: number | string | null;
  frequenciaTeorica_vl?: number | string | null;
  frequencia_vl?: number | string | null;
  grp_vl?: number | string | null;
  [key: string]: unknown;
}

/**
 * Aba 6 — Exibidor. Recordset real de
 * `sp_reportResultExibidor{Geo,Praca,Uf}Closed`. Uma linha por
 * (dimensionValue × week × exibidorP1a) — os campos `*Sheet_vl` são os
 * totais agregados que alimentam o bloco "TOTAL" da UI.
 */
export interface ExibidorRow {
  planoMidiaGrupoPk_st?: string | null;
  dimension_st?: string | null;
  dimensionValue_st?: string | null;
  week_vl: number | string;
  exibidorP1a_st?: string | null;

  // Métricas por exibidor (físicas e financeiras)
  facesViasPublicas_vl?: number | string | null;
  facesTotal_vl?: number | string | null;
  facesFaturaveis_vl?: number | string | null;
  facesNaoFaturaveis_vl?: number | string | null;
  localidadesIndoor_vl?: number | string | null;
  localidadesIndoorFaturaveis_vl?: number | string | null;
  localidadesIndoorNaoFaturaveis_vl?: number | string | null;
  impactosIndoor_vl?: number | string | null;
  impactosViasPublicas_vl?: number | string | null;
  impactosTotal_vl?: number | string | null;
  pctFaces_vl?: number | string | null;
  investimento_vl?: number | string | null;
  coberturaProp_vl?: number | string | null;
  coberturaPessoas_vl?: number | string | null;
  frequencia_vl?: number | string | null;
  impressoesQualificadas_vl?: number | string | null;

  // Totais "Sheet" — usados no bloco TOTAL
  facesTotalSheet_vl?: number | string | null;
  localidadesIndoorTotalSheet_vl?: number | string | null;
  impactosTotalSheet_vl?: number | string | null;
  coberturaPropTotalSheet_vl?: number | string | null;
  populationTotalSheet_vl?: number | string | null;
  pontosSheet_vl?: number | string | null;
  pontosPracaSheet_vl?: number | string | null;

  segmento_st?: string | null;
  dominacao_vl?: number | string | null;

  [key: string]: unknown;
}

/**
 * Aba 7 — Modelo P1A. Recordset real de `sp_reportResultP1aBase`.
 * Plano (week × exibidor) — pivot é feito no cliente.
 */
export interface ModeloRow {
  planoMidiaGrupoPk_st?: string | null;
  dimensionType_st?: string | null;
  dimensionValue_st?: string | null;
  week_vl: number | string;
  exibidorP1a_st?: string | null;
  investimento_vl?: number | string | null;
  coberturaProp_vl?: number | string | null;
  frequencia_vl?: number | string | null;
  faces_vl?: number | string | null;
  alcance_vl?: number | string | null;
  impressoesQualificadas_vl?: number | string | null;
  [key: string]: unknown;
}

export interface P1aFilters {
  reportPks: number[];
  dimension: Dimension;
  dimensionValue: string | null;
  marca: string | null;
  negociacao: Negociacao;
}

export const DEFAULT_FILTERS: P1aFilters = {
  reportPks: [],
  dimension: 'GEO',
  dimensionValue: null,
  marca: null,
  negociacao: 'TOTAL',
};
