const { sql, getPool } = require('./db');

async function uploadPontosUnicos(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk || !date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e date_dh são obrigatórios' 
            });
        }

        const pool = await getPool();

        // Consultar pontos únicos do uploadRoteiros_ft
        const pontosResult = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('date_dh', sql.DateTime, new Date(date_dh))
            .query(`
                SELECT DISTINCT
                       [ambiente_st]
                      ,[tipoMidia_st]
                      ,[latitude_vl]
                      ,[longitude_vl]
                FROM [serv_product_be180].[uploadRoteiros_ft]
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND date_dh = @date_dh
                ORDER BY ambiente_st, tipoMidia_st, latitude_vl, longitude_vl
            `);

        console.log(`✅ [uploadPontosUnicos] Pontos únicos encontrados: ${pontosResult.recordset.length}`);

        const pontos = pontosResult.recordset;
        
        if (pontos.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'Nenhum ponto único encontrado'
            });
        }

        // Simular fluxo de passantes (em produção viria do inventário real)
        const pontosEnriquecidos = pontos.map(ponto => ({
            ...ponto,
            fluxoPassante_vl: Math.floor(Math.random() * 10000) + 1000, // Simular fluxo entre 1000-11000
        }));

        // Inserir na tabela uploadInventario_ft
        const agora = new Date();
        const dateLote = new Date(agora.getTime() - (3 * 60 * 60 * 1000)); // -3 horas para compensar SQL Server

        const request = pool.request();
        const values = [];
        
        pontosEnriquecidos.forEach((ponto, index) => {
            const paramPrefix = `p${index}`;
            request.input(`${paramPrefix}_pk2`, sql.Int, 0);
            request.input(`${paramPrefix}_ambiente_st`, sql.VarChar(255), ponto.ambiente_st || '');
            request.input(`${paramPrefix}_tipoMidia_st`, sql.VarChar(255), ponto.tipoMidia_st || '');
            request.input(`${paramPrefix}_latitude_vl`, sql.Float, ponto.latitude_vl || 0);
            request.input(`${paramPrefix}_longitude_vl`, sql.Float, ponto.longitude_vl || 0);
            request.input(`${paramPrefix}_fluxoPassante_vl`, sql.Int, ponto.fluxoPassante_vl);
            request.input(`${paramPrefix}_date_dh`, sql.DateTime, dateLote);

            values.push(`(@${paramPrefix}_pk2, @${paramPrefix}_ambiente_st, @${paramPrefix}_tipoMidia_st, @${paramPrefix}_latitude_vl, @${paramPrefix}_longitude_vl, @${paramPrefix}_fluxoPassante_vl, @${paramPrefix}_date_dh, CAST(@${paramPrefix}_date_dh AS DATE))`);
        });

        const insertQuery = `
            INSERT INTO [serv_product_be180].[uploadInventario_ft] (
                pk2, ambiente_st, tipoMidia_st, latitude_vl, longitude_vl, 
                fluxoPassante_vl, date_dh, date_dt
            ) 
            OUTPUT INSERTED.pk, INSERTED.ambiente_st, INSERTED.tipoMidia_st, INSERTED.fluxoPassante_vl
            VALUES ${values.join(', ')};
        `;

        const insertResult = await request.query(insertQuery);

        console.log(`📊 [uploadPontosUnicos] ${insertResult.recordset.length} pontos inseridos na uploadInventario_ft`);
        console.log(`📅 [uploadPontosUnicos] Data/hora do lote: ${dateLote.toISOString()}`);

        res.json({
            success: true,
            data: {
                pontosUnicos: pontos.length,
                pontosInseridos: insertResult.recordset.length,
                insertedData: insertResult.recordset
            },
            message: `${insertResult.recordset.length} pontos únicos processados e inseridos`
        });

    } catch (error) {
        console.error('❌ [uploadPontosUnicos] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar pontos únicos',
            error: error.message 
        });
    }
}

module.exports = uploadPontosUnicos;
