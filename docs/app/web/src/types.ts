export interface Ambiente {
  nome: string;
  ehShopping: boolean;
  tamanhoOverride: string;
}
export interface Dims {
  ambientes: Ambiente[];
  tamanhos: string[];
  visualizacoes: string[];
  shoppings: string[];
  cidades: string[];
  deflatorDigital: { min: number; mult: number }[];
}
export interface Linha {
  ambiente: string;
  shopping: string;
  tamanho: string;
  circulacao: string;
  tipo: string;
  passantes: string;
  insps: string;
  slots: string;
  totalInsOverride: string; // total de inserções manual (vazio = auto: insps × slots)
  locs: string[]; // localidades por semana (W1..W12)
}
export interface Detalhe {
  linha_pk: number;
  ambiente_st: string;
  semana_vl: number;
  impacto_vl: number;
  frequencia_vl: number;
  cobertura_vl: number;
  ipvAjustadoShopping_vl: number | null;
  ipvAjustadoDemais_vl: number | null;
}
export interface Agg {
  praca_st: string;
  semana_vl: number;
  impactoTotal_vl: number;
  coberturaTotal_vl: number;
  frequencia_vl: number | null;
  pctCobertura_vl: number | null;
}
export interface ConfigRow {
  linha_pk: number;
  ambiente: string;
  tipo: string;
  shopping: string;
  tamanho: string;
  circulacao: string;
  praca: string;
}
export interface Deflator {
  linha_pk: number;
  ipv_vl: number | null;
  regiaoTgi_st: string | null;
  freqBase_vl: number | null;
  tamanhoEfetivo_st: string | null;
  defTamanho_vl: number | null;
  defVisualizacao_vl: number | null;
  defDigital_vl: number | null;
  defConcentracao_vl: number | null;
  passantes_vl: number | null;
}
export interface Resultado {
  config: ConfigRow[];
  detalhe: Detalhe[];
  agregado: Agg[];
  deflatores: Deflator[];
}

export const emptyLinha = (): Linha => ({
  ambiente: "", shopping: "", tamanho: "", circulacao: "",
  tipo: "", passantes: "", insps: "", slots: "", totalInsOverride: "",
  locs: Array.from({ length: 12 }, () => ""),
});
