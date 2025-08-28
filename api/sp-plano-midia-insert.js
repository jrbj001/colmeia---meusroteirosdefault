const { sql, getPool } = require('./db');

async function spPlanoMidiaInsert(req, res) {
    try {
        const { periodsJson } = req.body;

        if (!periodsJson) {
            return res.status(400).json({ 
                success: false, 
                message: 'periodsJson é obrigatório' 
            });
        }

        console.log(`✅ [spPlanoMidiaInsert] Executando stored procedure com:`, periodsJson);

        const pool = await getPool();

        // Executar a stored procedure
        const result = await pool.request()
            .input('periodsJson', sql.NVarChar, periodsJson)
            .execute('[serv_product_be180].[sp_planoMidiaInsert]');

        console.log(`📊 [spPlanoMidiaInsert] Resultado da stored procedure:`, result.recordset);

        res.json({
            success: true,
            data: result.recordset,
            message: `${result.recordset.length} registros criados na tabela planoMidia_dm`
        });

    } catch (error) {
        console.error('❌ [spPlanoMidiaInsert] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao executar stored procedure sp_planoMidiaInsert',
            error: error.message 
        });
    }
}

module.exports = spPlanoMidiaInsert;
