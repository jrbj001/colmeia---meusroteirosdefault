/**
 * POST /api/relatorio-p1a-modelo
 *
 * Aba "Modelo P1A" — saída plana da SP `sp_reportResultP1aBase`. O pivot
 * (week × exibidor × 6 métricas) é feito no cliente para preservar
 * flexibilidade de filtros/exibição.
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

    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), csv)
      .input('dimension_st', sql.NVarChar(20), dimension)
      .input('dimensionValue_st', sql.NVarChar(255), dimensionValue)
      .input('marca_st', sql.NVarChar(255), marca)
      .input('negociacao_st', sql.NVarChar(40), negociacao);

    console.log(
      `🔄 [relatorio-p1a-modelo] pks=${csv} dim=${dimension} value=${dimensionValue ?? '(todas)'} marca=${marca ?? '(todas)'} neg=${negociacao}`,
    );

    const result = await request.execute('[serv_product_be180].[sp_reportResultP1aBase]');

    return res.status(200).json({
      rows: result.recordset || [],
      dimension,
      dimensionValue,
      marca,
      negociacao,
    });
  } catch (err) {
    console.error('❌ [relatorio-p1a-modelo] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro ao calcular aba Modelo P1A' });
  }
};
