const { sql, getPool } = require('./db');

async function uploadRoteirosPlanoMidia(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk || !date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e date_dh são obrigatórios' 
            });
        }

        const pool = await getPool();

        // Consultar a view para obter os dados processados
        const result = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('date_dh', sql.DateTime, new Date(date_dh))
            .query(`
                SELECT [planoMidiaGrupo_pk]
                      ,[praca_st]
                      ,[uf_st]
                      ,[semanaInicial_st]
                      ,[semanaFinal_st]
                      ,[semanaInicial_vl]
                      ,[semanaFinal_vl]
                      ,[semanasTotal_vl]
                      ,[countDistinct_vl]
                      ,[countTotal_vl]
                      ,[date_dh]
                      ,[date_dt]
                FROM [serv_product_be180].[uploadRoteirosPlanoMidia_ft_vw]
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND date_dh = @date_dh
                ORDER BY praca_st, semanaInicial_vl
            `);

        console.log(`✅ [uploadRoteirosPlanoMidia] Consultando view para grupo ${planoMidiaGrupo_pk}:`);
        console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);
        
        if (result.recordset.length > 0) {
            console.log(`📋 Dados da view:`);
            result.recordset.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.praca_st}/${row.uf_st} - ${row.semanaInicial_st} (${row.countTotal_vl} pontos)`);
            });
        }

        res.json({
            success: true,
            data: result.recordset,
            message: `${result.recordset.length} registros encontrados na view`
        });

    } catch (error) {
        console.error('❌ [uploadRoteirosPlanoMidia] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao consultar dados da view',
            error: error.message 
        });
    }
}

module.exports = uploadRoteirosPlanoMidia;
