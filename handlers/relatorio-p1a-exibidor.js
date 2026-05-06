/**
 * POST /api/relatorio-p1a-exibidor
 *
 * Aba "Exibidor" do Relatório P1A — TOTAL agregado + bloco por exibidor.
 * Mapeia a dimensão para a SP "Closed" correspondente:
 *   GEO   → sp_reportResultExibidorGeoClosed
 *   PRACA → sp_reportResultExibidorPracaClosed
 *   UF    → sp_reportResultExibidorUfClosed
 *
 * Body:
 *   { reportPks, dimension: 'GEO' | 'PRACA' | 'UF',
 *     dimensionValue?, marca?, negociacao? }
 */
const { sql, getPool } = require('./db');
const {
  extractReportPksCsv,
  normalizeDimension,
  normalizeNegociacao,
} = require('./relatorio-p1a-utils');

const SP_BY_DIMENSION = {
  GEO: '[serv_product_be180].[sp_reportResultExibidorGeoClosed]',
  PRACA: '[serv_product_be180].[sp_reportResultExibidorPracaClosed]',
  UF: '[serv_product_be180].[sp_reportResultExibidorUfClosed]',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { csv, error } = extractReportPksCsv(req.body);
    if (error) return res.status(400).json({ error });

    const dimension = normalizeDimension(req.body?.dimension, 'GEO');
    const dimensionValue = req.body?.dimensionValue || null;
    const marca = req.body?.marca || null;
    const negociacao = normalizeNegociacao(req.body?.negociacao);

    const spName = SP_BY_DIMENSION[dimension];
    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), csv)
      .input('dimensionValue_st', sql.NVarChar(255), dimensionValue)
      .input('marca_st', sql.NVarChar(255), marca)
      .input('negociacao_st', sql.NVarChar(40), negociacao);

    console.log(
      `🔄 [relatorio-p1a-exibidor] pks=${csv} dim=${dimension} value=${dimensionValue ?? '(todas)'} marca=${marca ?? '(todas)'} neg=${negociacao}`,
    );

    const result = await request.execute(spName);

    return res.status(200).json({
      rows: result.recordset || [],
      dimension,
      dimensionValue,
      marca,
      negociacao,
    });
  } catch (err) {
    console.error('❌ [relatorio-p1a-exibidor] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro ao calcular aba Exibidor' });
  }
};
