export type LoteStatus = 'EM_ANALISE' | 'APROVADO' | 'PARA_CORRIGIR' | 'REJEITADO';

export interface LoteListItem {
  lote_pk: number;
  exibidor_fk: number | null;
  exibidor_nome_st: string | null;
  exibidor_fantasia_st: string | null;
  arquivo_st: string;
  uploadedBy_st: string | null;
  status_st: LoteStatus;
  totalRegistros_vl: number;
  processados_vl: number;
  dataCriacao_dh: string;
  dataAtualizacao_dh: string | null;
  itensAtivos_vl: number;
  comGeo_vl: number;
  comDePara_vl: number;
  semCodigo_vl: number;
  semValor_vl: number;
  comErro_vl: number;
  qualidade: {
    geo_pct: number;
    depara_pct: number;
    sem_codigo_pct: number;
    sem_valor_pct: number;
    com_erro_pct: number;
  };
}

export interface LoteAnaliseLote {
  lote_pk: number;
  exibidor_fk: number | null;
  arquivo_st: string;
  uploadedBy_st: string | null;
  status_st: LoteStatus;
  totalRegistros_vl: number;
  processados_vl: number;
  pendentes_vl: number;
  rejeitados_vl: number;
  observacao_st: string | null;
  dataCriacao_dh: string;
  dataAtualizacao_dh: string | null;
  exibidor_nome_st: string | null;
  exibidor_fantasia_st: string | null;
  exibidor_codigo_st: string | null;
  exibidor_cnpj_st: string | null;
  exibidor_dominio_st: string | null;
}

export interface LoteAnaliseVisao {
  total: number;
  ativos: number;
  excluidos: number;
  em_analise: number;
  aprovados: number;
  para_corrigir: number;
  rejeitados: number;
  com_depara: number;
  sem_depara: number;
  com_geo: number;
  sem_geo: number;
  sem_codigo: number;
  sem_praca: number;
  sem_uf: number;
  sem_ambiente: number;
  sem_formato: number;
  sem_tipo: number;
  sem_valor: number;
  com_erro: number;
}

export interface LoteAnaliseQualidade {
  geo_pct: number;
  depara_pct: number;
  sem_codigo_pct: number;
  sem_valor_pct: number;
  com_erro_pct: number;
}

export interface FlagItem {
  tipo: 'critico' | 'atencao';
  mensagem: string;
}

export interface Diagnostico {
  tipo: 'critico' | 'atencao';
  titulo: string;
  causa: string;
  acao: string;
  responsavel: 'BE180' | 'EXIBIDOR';
  bloqueia: boolean;
}

export interface Veredito {
  recomendacao: 'verde' | 'amarelo' | 'vermelho';
  recomendacao_texto: string;
  flags: FlagItem[];
  positivos: string[];
  diagnosticos: Diagnostico[];
}

export interface ComparativoTipo {
  tipo_novo: string;
  qtd_novo: number;
  mapeados_novo: number;
  // Sugestão vinda do cadastro (catálogo de tipos usado por todos os exibidores no banco de
  // ativos atual) — não é restrita ao histórico deste exibidor.
  sugestao_cadastro: { tipo: string; qtd: number } | null;
}

export interface PracaReconciliacao {
  praca_novo: string;
  uf_novo: string;
  qtd_novo: number;
  status: 'match' | 'parecida' | 'nova';
  cidade_legado: string | null;
  qtd_legado: number | null;
}

export interface ItemInventario {
  item_pk: number;
  linhaArquivo_vl: number;
  codigo_ativo_st: string | null;
  praca_st: string | null;
  uf_st: string | null;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  tipo_ambiente_indoor_st: string | null;
  nome_fantasia_st: string | null;
  latitude: number | null;
  longitude: number | null;
  valor_tabela_vl: number | null;
  periodo_tabela_st: string | null;
  mapped_ambiente_st: string | null;
  mapped_formato_st: string | null;
  mapped_tipo_st: string | null;
  mapped_bl: number;
  status_st: string;
  erroValidacao_st: string | null;
  observacoes_st: string | null;
}

export type FiltroItens = '' | 'sem_geo' | 'sem_depara' | 'com_erro' | 'sem_codigo' | 'sem_valor';

export interface ItensResposta {
  success: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  data: ItemInventario[];
}

export interface LoteAnalise {
  lote: LoteAnaliseLote;
  visao: LoteAnaliseVisao;
  qualidade: LoteAnaliseQualidade;
  distribuicao: {
    ufs: Array<{ uf: string; qtd: number; pracas: number }>;
    pracas: Array<{ praca: string; uf: string; qtd: number }>;
    ambientes: Array<{ ambiente: string; qtd: number; mapeados: number }>;
    formatos: Array<{ formato: string; qtd: number }>;
    tipos: Array<{ tipo: string; qtd: number; mapeados: number }>;
  };
  duplicidades: Array<{ codigo_ativo_st: string; qtd: number }>;
  erros: Array<{ item_pk: number; codigo_ativo_st: string; status_st: string; erroValidacao_st: string }>;
  sem_depara: Array<{ ambiente: string; formato: string; tipo: string; qtd: number }>;
  comparativo_tipos: ComparativoTipo[];
  pracas_reconciliacao: PracaReconciliacao[];
  amostra: Array<{
    item_pk: number;
    codigo_ativo_st: string;
    praca_st: string | null;
    uf_st: string | null;
    ambiente_st: string | null;
    formato_midia_st: string | null;
    tipo_midia_st: string | null;
    latitude: number | null;
    longitude: number | null;
    valor_tabela_vl: number | null;
    status_st: string;
    mapped_bl: number;
  }>;
  legado: null | {
    validos: number;
    pracas: number;
    codigos_lote: number;
    codigos_match: number;
    cidades: {
      novo_cidades: number;
      legado_cidades: number;
      comum: number;
      apenas_novo: number;
      apenas_legado: number;
    };
    cidades_faltantes: Array<{ cidade_st: string; estado_st: string; qtd: number }>;
  };
  places: { total: number; pendente: number; processando: number; concluido: number; erro: number };
  comentarios: Array<{
    comentario_pk: number;
    autor_st: string;
    mensagem_st: string;
    dataCriacao_dh: string;
  }>;
  veredito: Veredito;
}
