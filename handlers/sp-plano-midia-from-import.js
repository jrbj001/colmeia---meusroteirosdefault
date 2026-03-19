const { sql, getPool } = require('./db');

module.exports = async function spPlanoMidiaFromImport(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Utilize POST.',
    });
  }

  try {
    const { planoMidiaGrupo_pk } = req.body || {};

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaGrupo_pk é obrigatório.',
      });
    }

    const pool = await getPool();
    const request = pool
      .request()
      .input('planoMidiaGrupo_pk', sql.Int, Number(planoMidiaGrupo_pk));

    const result = await request.execute('serv_product_be180.sp_planoMidiaFromImport');
    const rows = result.recordset || [];

    const totalCidades = rows.length;
    const cidadesSemIbge = rows.filter((r) => !r.ibgeCode_vl).length;
    const totalPlanoMidia = rows.reduce((sum, r) => sum + Number(r.totalPlanoMidia_vl || 0), 0);
    const totalConsulta = rows.reduce((sum, r) => sum + Number(r.totalConsulta_vl || 0), 0);

    return res.status(200).json({
      success: true,
      message: 'sp_planoMidiaFromImport executada com sucesso.',
      data: rows,
      summary: {
        planoMidiaGrupo_pk: Number(planoMidiaGrupo_pk),
        totalCidades,
        cidadesSemIbge,
        totalPlanoMidia,
        totalConsulta,
      },
    });
  } catch (error) {
    console.error('[sp-plano-midia-from-import] Erro:', error.message ?? error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao executar a stored procedure sp_planoMidiaFromImport.',
      error: error.message,
    });
  }
};
