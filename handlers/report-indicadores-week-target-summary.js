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
        SELECT 
          report_pk,
          cidade_st,
          SUM(impactos_vl) as impactosTotal_vl,
          SUM(coberturaPessoas_vl) as coberturaPessoasTotal_vl,
          AVG(coberturaProp_vl) as coberturaProp_vl,
          AVG(frequencia_vl) as frequencia_vl,
          SUM(grp_vl) as grp_vl
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasWeekTarget_dm_vw]
        WHERE report_pk = @report_pk
        GROUP BY report_pk, cidade_st
        ORDER BY cidade_st
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Dados de resumo semanal de target não encontrados' });
    }

    res.status(200).json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('❌ Erro ao buscar dados de resumo semanal de target:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};
