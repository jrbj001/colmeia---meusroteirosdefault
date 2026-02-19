const { sql, getPool } = require('./db');

async function planoMidiaDescCleanup(req, res) {
    try {
        const { planoMidiaGrupo_pk, pattern } = req.body;

        if (!planoMidiaGrupo_pk || !pattern) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e pattern são obrigatórios' 
            });
        }

        const pool = await getPool();

        console.log(`🧹 [planoMidiaDescCleanup] Iniciando limpeza de registros temporários para grupo ${planoMidiaGrupo_pk} com pattern "${pattern}"`);

        // Primeiro, consultar quantos registros serão deletados
        const countResult = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('pattern', sql.NVarChar, `%${pattern}%`)
            .query(`
                SELECT COUNT(*) as total_count, 
                       STRING_AGG(planoMidiaDesc_st, ', ') as desc_names
                FROM [serv_product_be180].[planoMidiaDesc_dm]
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND planoMidiaDesc_st LIKE @pattern
            `);

        const totalToDelete = countResult.recordset[0].total_count;
        const descNames = countResult.recordset[0].desc_names;

        if (totalToDelete === 0) {
            console.log(`ℹ️ [planoMidiaDescCleanup] Nenhum registro temporário encontrado para deletar`);
            return res.json({
                success: true,
                message: 'Nenhum registro temporário encontrado para deletar',
                deleted_count: 0,
                deleted_records: []
            });
        }

        console.log(`🗑️ [planoMidiaDescCleanup] Encontrados ${totalToDelete} registro(s) para deletar: ${descNames}`);

        // Executar a deleção
        const deleteResult = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('pattern', sql.NVarChar, `%${pattern}%`)
            .query(`
                DELETE FROM [serv_product_be180].[planoMidiaDesc_dm]
                OUTPUT DELETED.pk, DELETED.planoMidiaDesc_st
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND planoMidiaDesc_st LIKE @pattern
            `);

        const deletedRecords = deleteResult.recordset;
        
        console.log(`✅ [planoMidiaDescCleanup] Limpeza concluída: ${deletedRecords.length} registro(s) deletado(s)`);
        deletedRecords.forEach(record => {
            console.log(`   🗑️ Deletado: PK ${record.pk} - ${record.planoMidiaDesc_st}`);
        });

        res.json({
            success: true,
            message: `Limpeza concluída: ${deletedRecords.length} registro(s) temporário(s) deletado(s)`,
            deleted_count: deletedRecords.length,
            deleted_records: deletedRecords.map(r => ({
                pk: r.pk,
                name: r.planoMidiaDesc_st
            }))
        });

    } catch (error) {
        console.error('❌ [planoMidiaDescCleanup] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao executar limpeza de registros temporários',
            error: error.message 
        });
    }
}

module.exports = planoMidiaDescCleanup;
