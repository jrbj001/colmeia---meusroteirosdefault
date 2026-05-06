/**
 * GET /api/relatorio-p1a-options
 *
 * Lista os roteiros (planoMidiaGrupo) elegíveis para o Relatório P1A.
 * Quando `reportPks` é fornecido (querystring CSV), também devolve as
 * opções escopadas (marcas, GEOs, praças, UFs, negociações) extraídas
 * de reportDataP1aEmpilhamento_dm — útil para alimentar os filtros
 * dependentes da seleção corrente.
 *
 * Respeita as regras de visibilidade do Colmeia:
 *  - Usuário interno: vê todos os roteiros não deletados.
 *  - Agência: vê apenas roteiros da própria agência liberados
 *    (agencia_pk = empresa_pk AND liberadoAgencia_bl = 1).
 */
const { sql, getPool } = require('./db');
const { normalizePks } = require('./relatorio-p1a-utils');

const TOP_REPORTS = 200;

async function listReports(pool, empresaPk) {
  const req = pool.request();
  let agenciaFilter = '';
  if (empresaPk) {
    req.input('empresaPk', sql.Int, empresaPk);
    agenciaFilter = 'AND agencia_pk = @empresaPk AND liberadoAgencia_bl = 1';
  }

  const result = await req.query(`
    SELECT TOP ${TOP_REPORTS}
      planoMidiaGrupo_pk           AS _pk,
      planoMidiaGrupo_pk,
      planoMidiaGrupo_st,
      planoMidiaDesc_st_concat,
      usuarioId_st,
      usuarioName_st,
      gender_st,
      class_st,
      age_st,
      planoMidiaType_st,
      cidadeUpper_st_concat,
      semanasMax_vl,
      date_dh,
      agencia_st,
      liberadoAgencia_bl
    FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
    WHERE delete_bl = 0 ${agenciaFilter}
    ORDER BY planoMidiaGrupo_pk DESC
  `);

  return result.recordset || [];
}

async function listScopedOptions(pool, csvPks) {
  // Distinct de marcas, geos, cidades, ufs do stage empilhamento —
  // escopado pelos reports selecionados. Os nomes refletem o schema
  // real de [serv_product_be180].[reportDataP1aEmpilhamento_dm].
  const req = pool.request().input('pks', sql.NVarChar(sql.MAX), csvPks);

  const sqlText = `
    DECLARE @t TABLE (report_pk INT);
    INSERT INTO @t (report_pk)
    SELECT TRY_CAST(value AS INT)
    FROM STRING_SPLIT(@pks, ',')
    WHERE TRY_CAST(value AS INT) IS NOT NULL;

    SELECT DISTINCT marca_st
    FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm]
    WHERE report_pk IN (SELECT report_pk FROM @t) AND marca_st IS NOT NULL
    ORDER BY marca_st;

    SELECT DISTINCT geoAmbev_st
    FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm]
    WHERE report_pk IN (SELECT report_pk FROM @t) AND geoAmbev_st IS NOT NULL
    ORDER BY geoAmbev_st;

    SELECT DISTINCT cidade_st
    FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm]
    WHERE report_pk IN (SELECT report_pk FROM @t) AND cidade_st IS NOT NULL
    ORDER BY cidade_st;

    SELECT DISTINCT estado_st
    FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm]
    WHERE report_pk IN (SELECT report_pk FROM @t) AND estado_st IS NOT NULL
    ORDER BY estado_st;
  `;

  const result = await req.query(sqlText);
  const recordsets = result.recordsets || [];
  const marcas = (recordsets[0] || []).map((r) => r.marca_st);
  const geos = (recordsets[1] || []).map((r) => r.geoAmbev_st);
  const pracas = (recordsets[2] || []).map((r) => r.cidade_st);
  const ufs = (recordsets[3] || []).map((r) => r.estado_st);

  return {
    marcas,
    dimensions: { GEO: geos, PRACA: pracas, UF: ufs },
    negociacoes: ['TOTAL', 'FATURAVEL', 'NAO_FATURAVEL'],
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const empresaPk = req.user?.empresa_pk ?? null;
    const csvPks = normalizePks(req.query?.reportPks);
    const pool = await getPool();

    const reports = await listReports(pool, empresaPk);

    let scoped = null;
    if (csvPks) {
      try {
        scoped = await listScopedOptions(pool, csvPks);
      } catch (err) {
        console.error('⚠️ [relatorio-p1a-options] Erro ao buscar opções escopadas:', err.message);
        // Não falha a requisição inteira — devolve só a lista de reports
      }
    }

    return res.status(200).json({
      reports,
      marcas: scoped?.marcas ?? [],
      dimensions: scoped?.dimensions ?? { GEO: [], PRACA: [], UF: [] },
      negociacoes: scoped?.negociacoes ?? ['TOTAL', 'FATURAVEL', 'NAO_FATURAVEL'],
    });
  } catch (err) {
    console.error('❌ [relatorio-p1a-options] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
};
