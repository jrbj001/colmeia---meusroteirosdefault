const { sql, getPool } = require('./db');

async function uploadRoteirosDetalhes(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk || !date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e date_dh são obrigatórios' 
            });
        }

        const pool = await getPool();

        // Consultar dados agregados por grupo/praça/semana com os campos necessários
        const result = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('date_dh', sql.DateTime, new Date(date_dh))
            .query(`
                SELECT 
                    praca_st AS cidade_st,
                    uf_st AS estado_st,
                    grupoFormatosMidia_st,
                    formato_st,
                    SUBSTRING(semana_st, 7, LEN(semana_st)) AS semana_vl,
                    MAX(seDigitalInsercoes_vl) AS seDigitalInsercoes_vl,
                    MAX(seDigitalMaximoInsercoes_vl) AS seDigitalMaximoInsercoes_vl,
                    MAX(seEstaticoVisibilidade_vl) AS seEstaticoVisibilidade_st,
                    COUNT(*) AS qtd_registros
                FROM [serv_product_be180].[uploadRoteiros_ft]
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND date_dh = @date_dh
                GROUP BY praca_st, uf_st, grupoFormatosMidia_st, formato_st, semana_st
                ORDER BY praca_st, uf_st, grupoFormatosMidia_st, formato_st, semana_vl
            `);

        console.log(`✅ [uploadRoteirosDetalhes] Consultando detalhes para grupo ${planoMidiaGrupo_pk}:`);
        console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);
        
        if (result.recordset.length > 0) {
            console.log(`📋 Exemplo de registro:`, result.recordset[0]);
        }

        res.json({
            success: true,
            data: result.recordset,
            message: `${result.recordset.length} registros encontrados`
        });

    } catch (error) {
        console.error('❌ [uploadRoteirosDetalhes] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao consultar detalhes',
            error: error.message 
        });
    }
}

module.exports = uploadRoteirosDetalhes;

