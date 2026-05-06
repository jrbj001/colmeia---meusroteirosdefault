/**
 * POST /api/relatorio-p1a-colmeia
 *
 * Aba "Colmeia" do Relatório P1A — matriz métrica × semana, agrupada
 * por dimensão (GEO | PRACA | UF). Executa
 * `sp_reportResultColmeiaGeoClosed` (a SP é única e aceita a dimensão
 * como parâmetro, conforme padrão do parceiro).
 *
 * Body:
 *   { reportPks, dimension?: 'GEO' | 'PRACA' | 'UF', dimensionValue?: string }
 */
const { sql, getPool } = require('./db');
const {
  extractReportPksCsv,
  normalizeDimension,
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

    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), csv)
      .input('dimension_st', sql.NVarChar(20), dimension)
      .input('dimensionValue_st', sql.NVarChar(255), dimensionValue);

    console.log(`🔄 [relatorio-p1a-colmeia] pks=${csv} dim=${dimension} value=${dimensionValue ?? '(todas)'}`);

    const result = await request.execute('[serv_product_be180].[sp_reportResultColmeiaGeoClosed]');

    return res.status(200).json({
      rows: result.recordset || [],
      dimension,
      dimensionValue,
    });
  } catch (err) {
    console.error('❌ [relatorio-p1a-colmeia] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro ao calcular aba Colmeia' });
  }
};
