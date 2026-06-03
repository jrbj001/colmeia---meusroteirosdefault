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

    console.log(`💾 [indoor-salvar] planoMidiaGrupo_pk=${planoMidiaGrupo_pk} praça="${praca}" ${linhas.length} linha(s)`);

    const pool = await getPool();

    // Verifica se as tabelas já existem no banco antes de tentar escrever
    const tablesCheck = await pool.request().query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME IN ('planoIndoorLinha_ft', 'planoIndoorLocalidadeSemana_ft')
    `);
    if (tablesCheck.recordset[0].cnt < 2) {
      return res.status(503).json({
        success: false,
        message: 'As tabelas de Indoor ainda não estão disponíveis no banco. Aguarde a criação das estruturas.',
      });
    }

    const t = pool.transaction();
    await t.begin();

    try {
      // Apagar linhas anteriores desta praça + plano (permite re-salvar)
      const linhasAnteriores = await t.request()
        .input('pk', sql.Int, planoMidiaGrupo_pk)
        .input('praca', sql.NVarChar, praca)
        .query(
          `SELECT pk FROM ${S}.planoIndoorLinha_ft WHERE planoMidiaGrupo_pk = @pk AND praca_st = @praca`
        );

      const pksAnteriores = linhasAnteriores.recordset.map((r) => r.pk);

      if (pksAnteriores.length > 0) {
        await t.request()
          .input('pk', sql.Int, planoMidiaGrupo_pk)
          .input('praca', sql.NVarChar, praca)
          .query(
            `DELETE w FROM ${S}.planoIndoorLocalidadeSemana_ft w
             JOIN ${S}.planoIndoorLinha_ft l ON w.linha_pk = l.pk
             WHERE l.planoMidiaGrupo_pk = @pk AND l.praca_st = @praca`
          );

        await t.request()
          .input('pk', sql.Int, planoMidiaGrupo_pk)
          .input('praca', sql.NVarChar, praca)
          .query(
            `DELETE FROM ${S}.planoIndoorLinha_ft WHERE planoMidiaGrupo_pk = @pk AND praca_st = @praca`
          );

        console.log(`🗑️ [indoor-salvar] ${pksAnteriores.length} linha(s) anterior(es) removida(s)`);
      }

      // Inserir novas linhas
      let totalLinhasInseridas = 0;
      for (const l of linhas) {
        if (!l.ambiente || !l.ambiente.trim()) continue;

        const insertResult = await t.request()
          .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
          .input('report_pk', sql.Int, planoMidiaGrupo_pk)
          .input('praca_st', sql.NVarChar, praca)
          .input('ambiente_st', sql.NVarChar, l.ambiente.trim())
          .input('shopping_st', sql.NVarChar, l.shopping || null)
          .input('tamanhoFormato_st', sql.NVarChar, l.tamanho || null)
          .input('circulacao_st', sql.NVarChar, l.circulacao || null)
          .input('tipo_st', sql.NVarChar, l.tipo || 'Estático')
          .input('passantesManual_vl', sql.Decimal(18, 2), l.passantes != null ? Number(l.passantes) : null)
          .input('insercoesPorSlot_vl', sql.Decimal(18, 2), l.insercoesPorSlot != null ? Number(l.insercoesPorSlot) : null)
          .input('slots_vl', sql.Decimal(18, 2), l.slots != null ? Number(l.slots) : null)
          .query(
            `INSERT INTO ${S}.planoIndoorLinha_ft
               (planoMidiaGrupo_pk, report_pk, praca_st, ambiente_st, shopping_st,
                tamanhoFormato_st, circulacao_st, tipo_st, passantesManual_vl,
                insercoesPorSlot_vl, slots_vl)
             OUTPUT INSERTED.pk
             VALUES
               (@planoMidiaGrupo_pk, @report_pk, @praca_st, @ambiente_st, @shopping_st,
                @tamanhoFormato_st, @circulacao_st, @tipo_st, @passantesManual_vl,
                @insercoesPorSlot_vl, @slots_vl)`
          );

        const linhaPk = insertResult.recordset[0].pk;
        totalLinhasInseridas++;

        // Inserir localidades por semana (W1..W12)
        const locs = Array.isArray(l.localidades) ? l.localidades : [];
        for (let w = 1; w <= 12; w++) {
          const val = w <= numSemanas ? (Number(locs[w - 1]) || 0) : 0;
          await t.request()
            .input('linha_pk', sql.Int, linhaPk)
            .input('semana_vl', sql.Int, w)
            .input('localidades_vl', sql.Int, val)
            .query(
              `INSERT INTO ${S}.planoIndoorLocalidadeSemana_ft (linha_pk, semana_vl, localidades_vl)
               VALUES (@linha_pk, @semana_vl, @localidades_vl)`
            );
        }

        console.log(`  ✅ Linha ${totalLinhasInseridas}: ${l.ambiente} pk=${linhaPk}`);
      }

      await t.commit();

      console.log(`✅ [indoor-salvar] ${totalLinhasInseridas} linha(s) salva(s) com sucesso`);

      res.json({
        success: true,
        message: `${totalLinhasInseridas} ambiente(s) indoor salvo(s) para "${praca}"`,
        linhasInseridas: totalLinhasInseridas,
      });
    } catch (innerError) {
      await t.rollback();
      throw innerError;
    }
  } catch (error) {
    console.error('❌ [indoor-salvar] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração indoor',
      error: error.message,
    });
  }
};
