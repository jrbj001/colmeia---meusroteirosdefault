const { sql, getPool } = require('./db');

const S = 'serv_product_be180';

module.exports = async (req, res) => {
  try {
    const { planoMidiaGrupo_pk, praca, semanas, linhas } = req.body;

    if (!planoMidiaGrupo_pk || !praca || !Array.isArray(linhas) || linhas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: planoMidiaGrupo_pk, praca, linhas (array não vazio)',
      });
    }

    const numSemanas = Math.max(1, Math.min(12, Number(semanas) || 12));

    const linhasValidas = linhas.filter((l) => l.ambiente && l.ambiente.trim());
    if (linhasValidas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum ambiente válido encontrado nas linhas enviadas.',
      });
    }

    console.log(
      `💾 [indoor-salvar] planoMidiaGrupo_pk=${planoMidiaGrupo_pk} praça="${praca}" ${linhasValidas.length} linha(s) semanas=${numSemanas}`
    );

    const pool = await getPool();

    // Verifica se a SP já foi criada no banco
    const spCheck = await pool.request().query(`
      SELECT COUNT(*) AS cnt
      FROM sys.objects
      WHERE object_id = OBJECT_ID(N'[${S}].[sp_planoMidiaIndoorInsert]')
        AND type = 'P'
    `);
    if (spCheck.recordset[0].cnt === 0) {
      return res.status(503).json({
        success: false,
        message:
          'A SP sp_planoMidiaIndoorInsert ainda não foi criada no banco. Execute ongoing/15_SP_planoMidiaIndoorInsert.sql primeiro.',
      });
    }

    // Monta o JSON de linhas no formato esperado pela SP
    const records = linhasValidas.map((l) => ({
      praca_st:            praca,
      ambiente_st:         l.ambiente.trim(),
      indoorEspecifico_st: l.shopping ? l.shopping.trim() : '',
      tamanhoFormato_st:   l.tamanho  ? l.tamanho.trim()  : '',
      circulacao_st:       l.circulacao ? l.circulacao.trim() : '',
      tipo_st:             l.tipo || 'Estático',
      passantesManual_vl:  l.passantes != null && l.passantes !== '' ? Number(l.passantes) : null,
      insercoesPorSlot_vl: l.insercoesPorSlot != null && l.insercoesPorSlot !== '' ? Number(l.insercoesPorSlot) : null,
      slots_vl:            l.slots != null && l.slots !== '' ? Number(l.slots) : null,
      localidades:         Array.isArray(l.localidades)
        ? l.localidades.map((v) => Number(v) || 0)
        : Array(12).fill(0),
      faces:               Array.isArray(l.faces)
        ? l.faces.map((v) => Number(v) || 1)
        : Array(12).fill(1),
    }));

    const result = await pool
      .request()
      .input('recordsJson',        sql.NVarChar(sql.MAX),  JSON.stringify(records))
      .input('planoMidiaGrupo_pk', sql.Int,                planoMidiaGrupo_pk)
      .input('report_pk',          sql.Int,                planoMidiaGrupo_pk)
      .input('semanas',            sql.Int,                numSemanas)
      .input('praca_st',           sql.NVarChar(255),      praca)
      .execute(`[${S}].[sp_planoMidiaIndoorInsert]`);

    const row = result.recordset?.[0];

    if (!row || row.status_st !== 'SUCCESS') {
      throw new Error('SP retornou status inesperado: ' + JSON.stringify(row));
    }

    console.log(
      `✅ [indoor-salvar] SP OK — ${row.insertedCount_vl} ambiente(s) salvos para "${praca}"`
    );

    res.json({
      success: true,
      message: `${row.insertedCount_vl} ambiente(s) indoor salvo(s) para "${praca}"`,
      linhasInseridas: row.insertedCount_vl,
      report_pk:       row.report_pk,
      date_dh:         row.date_dh,
    });
  } catch (error) {
    console.error('❌ [indoor-salvar] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração indoor',
      error: error.message,
    });
  }
};
