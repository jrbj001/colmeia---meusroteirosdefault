/**
 * POST /api/relatorio-p1a-empilhamento
 *
 * Retorna todas as linhas do stage `reportDataP1aEmpilhamento_dm`
 * para os roteiros selecionados, enriquecidas com o nome do roteiro
 * (`planoMidiaGrupo_st`) e data de criação (`date_dh`) vindos de
 * `planoMidiaGrupo_dm_vw`. É o insumo bruto para o export "empilhado".
 *
 * Body: { reportPks: number[] | string | number }
 *
 * Colunas retornadas (em ordem amigável para o Excel):
 *   report_pk, planoMidiaGrupo_st, date_dh (do grupo),
 *   + todas as colunas do stage (week_vl, weekDate_dt, marca_st,
 *     campanha_st, produto_st, cidade_st, estado_st, geoAmbev_st,
 *     exibidorRaw_st, exibidorP1a_st, tipoP1a_st, negociacaoP1a_st,
 *     faturavel_bl, weekCount_vl, facesViasPublicas_vl,
 *     localidadeIndoor_vl, investimento_vl, impactosIndoor_vl,
 *     valorLiquido_vl, ttFaces_vl, divisorFlightFace_vl, impactoIpv_vl,
 *     sourceType_st — se existir, refreshedAt_dh)
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
          e.report_pk                        AS [Roteiro PK],
          g.planoMidiaGrupo_st               AS [Nome do roteiro],
          g.usuarioName_st                   AS [Usuário],
          g.agencia_st                       AS [Agência],
          g.date_dh                          AS [Data criação roteiro],
          e.week_vl                          AS [Semana],
          e.weekDate_dt                      AS [Data da semana],
          e.marca_st                         AS [Marca],
          e.campanha_st                      AS [Campanha],
          e.produto_st                       AS [Produto],
          e.cidade_st                        AS [Cidade],
          e.estado_st                        AS [UF],
          e.geoAmbev_st                      AS [GEO],
          e.exibidorRaw_st                   AS [Exibidor (raw)],
          e.exibidorP1a_st                   AS [Exibidor P1A],
          e.tipoP1a_st                       AS [Tipo P1A],
          e.negociacaoP1a_st                 AS [Negociação P1A],
          e.faturavel_bl                     AS [Faturável],
          e.weekCount_vl                     AS [Qtd semanas (flight)],
          e.facesViasPublicas_vl             AS [Faces vias públicas],
          e.localidadeIndoor_vl              AS [Localidades indoor],
          e.investimento_vl                  AS [Investimento],
          e.impactosIndoor_vl                AS [Impactos indoor],
          e.valorLiquido_vl                  AS [Valor líquido],
          e.ttFaces_vl                       AS [Total faces (TT)],
          e.divisorFlightFace_vl             AS [Divisor flight/face],
          e.impactoIpv_vl                    AS [Impacto IPV],
          e.refreshedAt_dh                   AS [Atualizado em (stage)]
        FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm] e
        LEFT JOIN [serv_product_be180].[planoMidiaGrupo_dm_vw] g
          ON g.planoMidiaGrupo_pk = e.report_pk
        WHERE e.report_pk IN (SELECT report_pk FROM @t)
        ORDER BY
          e.report_pk,
          e.week_vl,
          e.geoAmbev_st,
          e.exibidorP1a_st
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
