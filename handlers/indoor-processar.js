const { sql, getPool } = require('./db');

const S = 'serv_product_be180';

module.exports = async (req, res) => {
  try {
    const { planoMidiaGrupo_pk } = req.body;

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaGrupo_pk é obrigatório',
      });
    }

    console.log(`⚙️  [indoor-processar] Calculando resultados para planoMidiaGrupo_pk=${planoMidiaGrupo_pk}`);

    const pool = await getPool();

    await pool
      .request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .input('report_pk',          sql.Int, planoMidiaGrupo_pk)
      .execute(`[${S}].[sp_indoorResultadoInsert]`);

    const countRes = await pool
      .request()
      .input('pk', sql.Int, planoMidiaGrupo_pk)
      .query(`
        SELECT COUNT(*) AS total
        FROM [${S}].[indoorResultado_ft]
        WHERE report_pk = @pk
      `);

    const total = countRes.recordset[0].total;

    console.log(`✅ [indoor-processar] ${total} resultado(s) calculado(s)`);

    res.json({
      success: true,
      message: `${total} resultado(s) indoor calculado(s)`,
      total,
      planoMidiaGrupo_pk,
    });
  } catch (error) {
    console.error('❌ [indoor-processar] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular resultados indoor',
      error: error.message,
    });
  }
};
