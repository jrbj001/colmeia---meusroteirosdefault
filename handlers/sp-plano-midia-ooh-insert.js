const { sql, getPool } = require('./db');

module.exports = async function spPlanoMidiaOohInsert(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Método não permitido. Utilize POST.' });
  }

  try {
    const {
      recordsJson,
      filename_st,
      source_st,
      firstWeekStart_dt,
      planoMidiaGrupo_pk,
    } = req.body;

    if (!recordsJson || !Array.isArray(recordsJson) || recordsJson.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'recordsJson é obrigatório e deve ser um array não-vazio.',
      });
    }

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaGrupo_pk é obrigatório.',
      });
    }

    const pool = await getPool();

    const request = pool
      .request()
      .input('recordsJson', sql.NVarChar(sql.MAX), JSON.stringify(recordsJson))
      .input('planoMidiaGrupo_pk', sql.Int, Number(planoMidiaGrupo_pk));

    if (filename_st) {
      request.input('filename_st', sql.NVarChar(500), String(filename_st));
    }
    if (source_st) {
      request.input('source_st', sql.NVarChar(255), String(source_st));
    }
    if (firstWeekStart_dt) {
      request.input('firstWeekStart_dt', sql.Date, new Date(firstWeekStart_dt));
    }

    const result = await request.execute('serv_product_be180.sp_planoMidiaOohInsert');

    const row = result.recordset?.[0] || {};

    return res.json({
      success: row.status_st === 'SUCCESS' || result.rowsAffected?.[0] > 0,
      planoMidiaImportFile_pk: row.planoMidiaImportFile_pk ?? null,
      insertedCount: row.insertedCount_vl ?? recordsJson.length,
      status: row.status_st ?? 'OK',
      date_dh: row.date_dh ?? null,
      message: `Importação concluída. ${row.insertedCount_vl ?? recordsJson.length} linha(s) inseridas.`,
    });
  } catch (error) {
    // Detectar erros de chave duplicada (SQL 2627 = PRIMARY KEY / UNIQUE violation)
    const precedingErrors = error?.precedingErrors ?? [];
    const isDuplicateKey =
      error?.number === 2627 ||
      precedingErrors.some((e) => e?.number === 2627);

    if (isDuplicateKey) {
      const isWeekDuplicate = precedingErrors.some(
        (e) => e?.message?.includes('planoMidiaImportWeek_dm')
      );
      const isLogDuplicate = precedingErrors.some(
        (e) => e?.message?.includes('processLogs_dm')
      );

      let hint = 'Este arquivo pode já ter sido importado anteriormente.';
      if (isWeekDuplicate) {
        hint = 'Já existem registros de semanas para este plano no banco de dados. Limpe os dados de teste antes de reimportar.';
      } else if (isLogDuplicate) {
        hint = 'Conflito interno no log da SP (processLogs_dm). Tente novamente ou contate o administrador.';
      }

      console.warn('[sp-plano-midia-ooh-insert] Duplicate key error:', precedingErrors.map(e => e?.message).join(' | '));
      return res.status(409).json({
        success: false,
        message: `Importação falhou: chave duplicada no banco. ${hint}`,
        error: 'DUPLICATE_KEY',
      });
    }

    console.error('[sp-plano-midia-ooh-insert] Erro:', error.message ?? error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao executar a stored procedure sp_planoMidiaOohInsert.',
      error: error.message,
    });
  }
};
