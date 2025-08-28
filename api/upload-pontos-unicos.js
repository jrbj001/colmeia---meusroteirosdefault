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
            fluxoPassante_vl: Math.floor(Math.random() * 10000) + 1000, // Simular fluxo entre 1000-11000
            observacao: "SIMULADO - Substituir por consulta real ao inventário"
        }));

        console.log(`📊 [uploadPontosUnicos] ${pontos.length} pontos únicos processados`);
        console.log(`📍 [uploadPontosUnicos] Pontos:`, pontosEnriquecidos.map(p => 
            `${p.ambiente_st}/${p.tipoMidia_st} (${p.latitude_vl}, ${p.longitude_vl})`
        ));

        res.json({
            success: true,
            data: {
                pontosUnicos: pontos.length,
                pontosProcessados: pontosEnriquecidos.length,
                pontos: pontosEnriquecidos
            },
            message: `${pontos.length} pontos únicos processados com sucesso`
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
