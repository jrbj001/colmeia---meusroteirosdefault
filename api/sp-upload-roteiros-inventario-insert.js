const { sql, getPool } = require('./db');

async function spUploadRoteirosInventarioInsert(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk || !date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e date_dh são obrigatórios' 
            });
        }

        const pool = await getPool();

        console.log(`✅ [spUploadRoteirosInventarioInsert] Executando stored procedure para grupo ${planoMidiaGrupo_pk} e data ${date_dh}`);

        // Executar a stored procedure original (como sempre funcionou)
        console.log(`📅 [spUploadRoteirosInventarioInsert] Executando stored procedure original`);
        
        const result = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('date_dh', sql.DateTime, new Date(date_dh))
            .execute('[serv_product_be180].[sp_uploadRoteirosInventarioToBaseCalculadoraInsert]');

        console.log(`📊 [spUploadRoteirosInventarioInsert] Stored procedure executada com sucesso`);
        console.log(`📋 [spUploadRoteirosInventarioInsert] Resultado:`, result.recordset);

        res.json({
            success: true,
            data: result.recordset,
            message: `Stored procedure sp_uploadRoteirosInventarioToBaseCalculadoraInsert executada com sucesso`
        });

    } catch (error) {
        console.error('❌ [spUploadRoteirosInventarioInsert] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao executar stored procedure sp_uploadRoteirosInventarioToBaseCalculadoraInsert',
            error: error.message 
        });
    }
}

module.exports = spUploadRoteirosInventarioInsert;
