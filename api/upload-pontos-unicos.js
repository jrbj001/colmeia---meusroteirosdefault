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

        console.log(`🔍 [uploadPontosUnicos] Consultando pontos únicos para grupo ${planoMidiaGrupo_pk} e data ${date_dh}`);

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

        // TODO: Em produção, consultar tabela de inventário real
        // Exemplo de como deveria ser:
        /*
        const inventarioQuery = `
            SELECT 
                i.latitude_vl,
                i.longitude_vl,
                i.ambiente_st,
                i.tipoMidia_st,
                i.fluxoPassante_vl,
                i.visibilidade_vl,
                i.deflatorVisibilidade_vl
            FROM [serv_product_be180].[inventario_ft] i
            WHERE i.latitude_vl IN (${pontos.map(p => p.latitude_vl).join(',')})
              AND i.longitude_vl IN (${pontos.map(p => p.longitude_vl).join(',')})
              AND i.ambiente_st = @ambiente_st
              AND i.tipoMidia_st = @tipoMidia_st
        `;
        */
        
        // Por enquanto, simular fluxo de passantes (TEMPORÁRIO)
        const pontosEnriquecidos = pontos.map(ponto => ({
            ...ponto,
            fluxoPassantes_vl: Math.floor(Math.random() * 10000) + 1000, // Simular fluxo entre 1000-11000
            observacao: "SIMULADO - Substituir por consulta real ao inventário"
        }));

        // ✅ RESTAURAR INSERÇÃO na uploadInventario_ft com processamento em lotes
        const agora = new Date();
        const dateLote = new Date(agora.getTime() - (3 * 60 * 60 * 1000)); // -3 horas para compensar SQL Server

        // Processar em lotes para evitar limite de 2100 parâmetros do SQL Server
        // Cada ponto usa 7 parâmetros, então máximo 250 pontos por lote (250 × 7 = 1750) - margem de segurança
        const batchSize = 250;
        const allInsertResults = [];
        
        console.log(`🗄️ [uploadPontosUnicos] Inserindo ${pontosEnriquecidos.length} pontos na uploadInventario_ft em lotes de ${batchSize}...`);
        
        for (let i = 0; i < pontosEnriquecidos.length; i += batchSize) {
            const batch = pontosEnriquecidos.slice(i, i + batchSize);
            const request = pool.request();
            const values = [];
            
            batch.forEach((ponto, batchIndex) => {
                const paramPrefix = `p${batchIndex}`;
                request.input(`${paramPrefix}_pk2`, sql.Int, 0);
                request.input(`${paramPrefix}_ambiente_st`, sql.VarChar(255), ponto.ambiente_st || '');
                request.input(`${paramPrefix}_tipoMidia_st`, sql.VarChar(255), ponto.tipoMidia_st || '');
                request.input(`${paramPrefix}_latitude_vl`, sql.Float, ponto.latitude_vl || 0);
                request.input(`${paramPrefix}_longitude_vl`, sql.Float, ponto.longitude_vl || 0);
                request.input(`${paramPrefix}_fluxoPassantes_vl`, sql.Int, ponto.fluxoPassantes_vl);
                request.input(`${paramPrefix}_date_dh`, sql.DateTime, dateLote);

                values.push(`(@${paramPrefix}_pk2, @${paramPrefix}_ambiente_st, @${paramPrefix}_tipoMidia_st, @${paramPrefix}_latitude_vl, @${paramPrefix}_longitude_vl, @${paramPrefix}_fluxoPassantes_vl, @${paramPrefix}_date_dh, CAST(@${paramPrefix}_date_dh AS DATE))`);
            });

            const insertQuery = `
                INSERT INTO [serv_product_be180].[uploadInventario_ft] (
                    pk2, ambiente_st, tipoMidia_st, latitude_vl, longitude_vl, 
                    fluxoPassantes_vl, date_dh, date_dt
                ) 
                OUTPUT INSERTED.pk, INSERTED.ambiente_st, INSERTED.tipoMidia_st, INSERTED.fluxoPassantes_vl, INSERTED.date_dh
                VALUES ${values.join(', ')};
            `;

            console.log(`🔄 [uploadPontosUnicos] Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(pontosEnriquecidos.length/batchSize)} (${batch.length} pontos)...`);

            const insertResult = await request.query(insertQuery);
            allInsertResults.push(...insertResult.recordset);
            
            console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} processado: ${insertResult.recordset.length} pontos inseridos`);
        }

        const insertResult = { recordset: allInsertResults };

        console.log(`📊 [uploadPontosUnicos] ${pontos.length} pontos únicos processados`);
        console.log(`📍 [uploadPontosUnicos] ${insertResult.recordset.length} pontos inseridos na uploadInventario_ft`);
        console.log(`📅 [uploadPontosUnicos] Data/hora do lote: ${dateLote.toISOString()}`);

        res.json({
            success: true,
            data: {
                pontosUnicos: pontos.length,
                pontosInseridos: insertResult.recordset.length,
                insertedData: insertResult.recordset
            },
            message: `${insertResult.recordset.length} pontos únicos processados e inseridos na uploadInventario_ft`
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
