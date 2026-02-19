const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { report_pk } = req.body;
    
    if (!report_pk) {
      return res.status(400).json({ error: 'report_pk é obrigatório' });
    }

    const pool = await getPool();
    
    const result = await pool.request()
      .input('report_pk', report_pk)
      .query(`
        SELECT *
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasWeekSummary_dm_vw]
        WHERE report_pk = @report_pk
        ORDER BY cidade_st
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Dados de resumo semanal não encontrados' });
    }

    res.status(200).json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('❌ Erro ao buscar dados de resumo semanal:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};
