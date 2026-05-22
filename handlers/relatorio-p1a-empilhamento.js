/**
 * POST /api/relatorio-p1a-empilhamento
 *
 * Retorna todas as linhas do plano de mídia OOH original (formato largo,
 * uma linha por compra/face/flight com 52 colunas de semana W1–W52)
 * para os roteiros selecionados — exatamente o mesmo formato/colunas
 * do "Modelo Planos Empilhados.xlsx".
 *
 * Origem dos dados:
 *   serv_product_be180.planoMidiaImport_ft_vw  (137 colunas, dados crus do upload)
 *   ↳ JOIN planoMidiaImportFile_dm (ativo_bl = 1, filtra pelo roteiro)
 *   ↳ LEFT JOIN p1aExibidorClassificacao_dm  → "Classif para P1A"
 *   ↳ LEFT JOIN p1aUfGeo_dm                  → "GEO"
 *   ↳ LEFT JOIN planoMidiaGrupo_dm_vw        → nome do roteiro
 *
 * Body: { reportPks: number[] | string | number }
 */
const { sql, getPool } = require('./db');
const { extractReportPksCsv } = require('./relatorio-p1a-utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { csv, error } = extractReportPksCsv(req.body);
    if (error) return res.status(400).json({ error });

    const pool = await getPool();

    const result = await pool
      .request()
      .input('pks', sql.NVarChar(sql.MAX), csv)
      .query(`
        DECLARE @t TABLE (report_pk INT);
        INSERT INTO @t (report_pk)
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@pks, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL;

        SELECT
          f.planoMidiaGrupo_pk                    AS report_pk,
          g.planoMidiaGrupo_st                    AS planoMidiaGrupo_st,
          /* Coluna A — JOB */
          i.job_st,
          /* Coluna B — CAMPANHA */
          i.campanha_st,
          /* Coluna C — Produto */
          i.produto_st,
          /* Coluna D — Classif para P1A (Demais OOH / Eletromidia / etc.) */
          c.exibidorP1a_st                        AS classifP1a_st,
          /* Coluna E — TIPO DE NEGOCIAÇÃO */
          i.tipoNegociacao_st,
          /* Coluna F — Pacote (1ª coluna DESCRICAO do upload OOH) */
          i.outrasEspecificacoesDigitar_st        AS descricaoPacote_st,
          /* Coluna G — GEO */
          ufgeo.geoAmbev_st,
          /* Coluna H — UF */
          i.uf_st,
          /* Coluna I — PRAÇA */
          i.praca_st,
          /* Coluna J — EXIBIDOR */
          i.exibidor_st,
          /* Coluna K — AMBIENTE */
          i.ambiente_st,
          /* Coluna L — FORMATO */
          i.formato_st,
          /* Coluna M — DESCRIÇÃO */
          i.descricao_st,
          /* Coluna N — GRUPO */
          i.grupo_st,
          /* Coluna O — TIPO */
          i.tipo_st,
          /* Coluna P — KV (não consta na tabela; preenchido como NULL) */
          CAST(NULL AS NVARCHAR(50))              AS kv_st,
          /* Coluna R — ESPECIFICAÇÕES */
          i.especificacoes_st,
          /* Coluna S — Numero de SLOTS */
          i.numeroSlots_vl,
          /* Coluna T — Especificações Digital inserções */
          TRY_CAST(i.specDigitalInsercoes_st AS INT) AS specDigitalInsercoes_vl,
          /* Coluna U — Especificações Digital secundagem */
          TRY_CAST(i.specDigitalSecundagem_st AS INT) AS specDigitalSecundagem_vl,
          /* Coluna V — Faixa de inserções para IPV */
          i.faixaInsercoesIpv_st,
          /* Coluna W — Número de inserções compradas */
          i.numeroInsercoesCompradas_vl,
          /* Coluna X — Especificação Estático Largura */
          i.specEstaticoLargura_vl,
          /* Coluna Y — Especificação Estático Altura */
          i.specEstaticoAltura_vl,
          /* Coluna Z — Deflator de visibilidade (se estático) */
          i.deflatorVisibilidadeEstatico_vl,
          /* Coluna AA — TT DE PONTOS */
          i.ttPontos_vl,
          /* Coluna AB — PERIODO DA TABELA */
          i.periodoTabela_st,
          /* Coluna AC — NUM DIAS PERIODO TABELA */
          i.numeroDiasReferencia_vl,
          /* Coluna AD — INÍCIO */
          i.inicio_dt,
          /* Coluna AE — TÉRMINO */
          i.termino_dt,
          /* Coluna AF — PERÍODO */
          i.periodo_st,
          /* Coluna AG — No. dias Campanha */
          i.noDiasCampanhaManual_vl,
          /* Colunas AH..CG — W1..W52 */
          i.week01_vl, i.week02_vl, i.week03_vl, i.week04_vl, i.week05_vl,
          i.week06_vl, i.week07_vl, i.week08_vl, i.week09_vl, i.week10_vl,
          i.week11_vl, i.week12_vl, i.week13_vl, i.week14_vl, i.week15_vl,
          i.week16_vl, i.week17_vl, i.week18_vl, i.week19_vl, i.week20_vl,
          i.week21_vl, i.week22_vl, i.week23_vl, i.week24_vl, i.week25_vl,
          i.week26_vl, i.week27_vl, i.week28_vl, i.week29_vl, i.week30_vl,
          i.week31_vl, i.week32_vl, i.week33_vl, i.week34_vl, i.week35_vl,
          i.week36_vl, i.week37_vl, i.week38_vl, i.week39_vl, i.week40_vl,
          i.week41_vl, i.week42_vl, i.week43_vl, i.week44_vl, i.week45_vl,
          i.week46_vl, i.week47_vl, i.week48_vl, i.week49_vl, i.week50_vl,
          i.week51_vl, i.week52_vl,
          /* Coluna CH — Divisor para cálculo de flight e face */
          i.divisorFlightFace_vl,
          /* Coluna CI — TT Flights */
          i.ttFlights_vl,
          /* Coluna CJ — TT Faces */
          i.ttFaces_vl,
          /* Coluna CK — Modelo de compra (faces ou flights) */
          i.modeloCompra_st,
          /* Coluna CL — Justificativa do valor tabela diferente */
          i.justificativaValorTabela_st,
          /* Coluna CM — Tabela ORIGINAL DO VEICULO */
          i.tabelaOriginalVeiculo_vl,
          /* Coluna CN — TABELA Unitária */
          i.tabelaUnitaria_vl,
          /* Coluna CO — Tabela Total */
          i.tabelaTotal_vl,
          /* Coluna CP — % */
          i.pctNegociado_vl,
          /* Coluna CQ — Negociado */
          i.negociado_vl,
          /* Coluna CR — Total Negociado */
          i.totalNegociado_vl,
          /* Coluna CS — Valor liquido */
          i.valorLiquido_vl,
          /* Coluna CT — Faturavel ou NÃO faturável */
          i.faturavel_st,
          /* Coluna CU — Impacto IPV */
          i.impactoIpv_vl,
          /* Coluna CV — CpView */
          i.cpmView_vl
        FROM [serv_product_be180].[planoMidiaImport_ft_vw] i
        INNER JOIN [serv_product_be180].[planoMidiaImportFile_dm] f
          ON f.pk = i.planoMidiaImportFile_pk AND f.ativo_bl = 1
        LEFT JOIN [serv_product_be180].[planoMidiaGrupo_dm_vw] g
          ON g.planoMidiaGrupo_pk = f.planoMidiaGrupo_pk
        LEFT JOIN [serv_product_be180].[p1aExibidorClassificacao_dm] c
          ON c.exibidorRaw_st = i.exibidor_st
         AND c.active_bl = 1 AND c.delete_bl = 0
        LEFT JOIN [serv_product_be180].[p1aUfGeo_dm] ufgeo
          ON ufgeo.estado_st = i.uf_st
         AND ufgeo.active_bl = 1 AND ufgeo.delete_bl = 0
        WHERE f.planoMidiaGrupo_pk IN (SELECT report_pk FROM @t)
        ORDER BY
          f.planoMidiaGrupo_pk,
          i.job_st,
          i.exibidor_st,
          i.formato_st,
          i.pk
      `);

    console.log(
      `📊 [relatorio-p1a-empilhamento] pks=${csv} → ${result.recordset.length} linhas`,
    );

    return res.status(200).json({ rows: result.recordset || [] });
  } catch (err) {
    console.error('❌ [relatorio-p1a-empilhamento] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro ao buscar dados empilhados' });
  }
};
