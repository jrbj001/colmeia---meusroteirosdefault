const { sql, getPool } = require('./db');
const S = 'serv_product_be180';

module.exports = async (req, res) => {
  try {
    const { planoMidiaGrupo_pk, report_pk } = req.body;
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ success: false, message: 'planoMidiaGrupo_pk é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .input('report_pk',          sql.Int, report_pk ?? planoMidiaGrupo_pk)
      .execute(`[${S}].[sp_planoMidiaIndoorBackfillPlanoMidiaPk]`);
    const row = result.recordset?.[0] || {};
    console.log(`✅ [backfillIndoorPlanoMidiaPk] grupo=${planoMidiaGrupo_pk} status=${row.status_st} linhas=${row.updatedLinhas_vl ?? 0} semanas=${row.updatedSemanas_vl ?? 0}`);
    res.json({ success: true, updatedSemanas: row.updatedSemanas_vl ?? 0, updatedLinhas: row.updatedLinhas_vl ?? 0 });
  } catch (error) {
    console.error('❌ [backfillIndoorPlanoMidiaPk] Erro:', error);
    res.status(500).json({ success: false, message: 'Erro no backfill planoMidia_pk indoor', error: error.message });
  }
};
