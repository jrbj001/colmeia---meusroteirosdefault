const { sql, getPool } = require('./db');

async function consolidadoResultado(req, res) {
  try {
    const { report_pk } = req.body;
    if (!report_pk) return res.status(400).json({ success: false, message: 'report_pk é obrigatório' });

    const pool = await getPool();

    const result = await pool.request()
      .input('report_pk', sql.Int, report_pk)
      .query(`
        SELECT [report_pk],[cidade_st],[impactosTotal_vl],[coberturaPessoasTotal_vl],
               [coberturaProp_vl],[frequencia_vl],[grp_vl],[populacaoTotal_vl],[temIndoor_fl]
        FROM [serv_product_be180].[reportDataIndicadoresConsolidadoTotal_dm_vw]
        WHERE report_pk = @report_pk
        ORDER BY [cidade_st]
      `);

    const summary = await pool.request()
      .input('report_pk', sql.Int, report_pk)
      .query(`
        SELECT TOP 1 [impactosTotal_vl],[coberturaPessoasTotal_vl],[coberturaProp_vl],
                     [frequencia_vl],[grp_vl],[populacaoTotal_vl]
        FROM [serv_product_be180].[reportDataIndicadoresConsolidadoTotalSummary_dm_vw]
        WHERE report_pk = @report_pk
      `);

    res.json({
      success: true,
      data: result.recordset,
      totais: summary.recordset[0] || null,
      summary: { total_cidades: result.recordset.length, report_pk }
    });
  } catch (error) {
    console.error('Erro ao consultar consolidado VP+Indoor:', error);
    res.status(500).json({ success: false, message: 'Erro ao consultar consolidado', error: error.message });
  }
}

module.exports = consolidadoResultado;
