const { sql, getPool } = require('./db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      planoMidiaGrupo_pk,
      gender_st = null,
      class_st = null,
      age_st = null,
      usuarioId_st = null,
      usuarioName_st = null,
    } = req.body || {};

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório' });
    }

    if (!gender_st || !class_st || !age_st) {
      return res.status(400).json({
        error: 'gender_st, class_st e age_st são obrigatórios para atualizar o target do grupo.',
      });
    }

    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, Number(planoMidiaGrupo_pk))
      .input('gender_st', sql.NVarChar(255), String(gender_st))
      .input('class_st', sql.NVarChar(255), String(class_st))
      .input('age_st', sql.NVarChar(255), String(age_st))
      .input('usuarioId_st', sql.NVarChar(255), usuarioId_st ? String(usuarioId_st) : null)
      .input('usuarioName_st', sql.NVarChar(255), usuarioName_st ? String(usuarioName_st) : null);

    // Executa a SP solicitada para atualizar target do grupo.
    await request.execute('[serv_product_be180].[sp_planoMidiaGrupoUpdateTarget]');

    // Confirma o estado final salvo no grupo.
    const confirmResult = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, Number(planoMidiaGrupo_pk))
      .query(`
        SELECT
          pk,
          gender_st,
          class_st,
          age_st,
          usuarioId_st,
          usuarioName_st
        FROM serv_product_be180.planoMidiaGrupo_dm
        WHERE pk = @planoMidiaGrupo_pk
      `);

    const row = confirmResult.recordset?.[0];
    if (!row) {
      return res.status(404).json({
        error: `Grupo ${planoMidiaGrupo_pk} não encontrado para atualização de target.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Target do grupo atualizado com sucesso.',
      data: row,
    });
  } catch (error) {
    const msg = error?.message || 'Erro interno';
    const invalidColumn = error?.number === 207 || /Invalid column name/i.test(msg);
    const invalidProcedure = error?.number === 2812 || /Could not find stored procedure/i.test(msg);

    if (invalidColumn) {
      return res.status(500).json({
        success: false,
        error: 'Colunas de demographics não encontradas em planoMidiaGrupo_dm.',
        message: 'Faça o deploy do script 06_sp_planoMidiaGrupoInsert.sql no BE180 antes de usar este fluxo.',
        details: msg,
      });
    }

    if (invalidProcedure) {
      return res.status(500).json({
        success: false,
        error: 'Stored procedure sp_planoMidiaGrupoUpdateTarget não encontrada.',
        message: 'Faça o deploy do script ongoing/06_sp_planoMidiaGrupoInsert.sql no banco BE180.',
        details: msg,
      });
    }

    console.error('Erro ao atualizar target do plano mídia grupo:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: msg,
    });
  }
};
