const { sql, getPool } = require('./db');

async function reportIndicadoresViasPublicas(req, res) {
    try {
        const { report_pk } = req.body;

        if (!report_pk) {
            return res.status(400).json({ 
                success: false, 
                message: 'report_pk é obrigatório' 
            });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('report_pk', sql.Int, report_pk)
            .query(`
                SELECT [report_pk]
                      ,[cidade_st]
                      ,[impactosTotal_vl]
                      ,[coberturaPessoasTotal_vl]
                      ,[coberturaPessoasGTotal_vl]
                      ,[coberturaPessoasPTotal_vl]
                      ,[coberturaProporcionalGPTotal_vl]
                      ,[coberturaProp_vl]
                      ,[frequencia_vl]
                      ,[grp_vl]
                      ,[pontosPracaTotal_vl]
                      ,[pontosTotal_vl]
                      ,[pontosPracaPropTotal_vl]
                      ,[deflacaoFrequencia_vl]
                      ,[oohLimitProp_vl]
                      ,[populacaoTotal_vl]
                      ,[coberturaLimiteTotal_vl]
                      ,[frequenciaTeorica_vl]
                      ,[noCobProp_vl]
                FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw]
                WHERE report_pk = @report_pk
                ORDER BY [cidade_st]
            `);

        console.log(`✅ [reportIndicadoresViasPublicas] Consultando indicadores para report_pk ${report_pk}:`);
        console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);

        // Calcular totais
        const dados = result.recordset;
        const totais = {
            impactosTotal_vl: dados.reduce((sum, item) => sum + (item.impactosTotal_vl || 0), 0),
            coberturaPessoasTotal_vl: dados.reduce((sum, item) => sum + (item.coberturaPessoasTotal_vl || 0), 0),
            coberturaPessoasGTotal_vl: dados.reduce((sum, item) => sum + (item.coberturaPessoasGTotal_vl || 0), 0),
            coberturaPessoasPTotal_vl: dados.reduce((sum, item) => sum + (item.coberturaPessoasPTotal_vl || 0), 0),
            frequencia_vl: dados.length > 0 ? dados.reduce((sum, item) => sum + (item.frequencia_vl || 0), 0) / dados.length : 0,
            grp_vl: dados.reduce((sum, item) => sum + (item.grp_vl || 0), 0),
            pontosPracaTotal_vl: dados.reduce((sum, item) => sum + (item.pontosPracaTotal_vl || 0), 0),
            pontosTotal_vl: dados.reduce((sum, item) => sum + (item.pontosTotal_vl || 0), 0)
        };

        // Calcular cobertura total percentual
        const populacaoTotal = dados.reduce((sum, item) => sum + (item.populacaoTotal_vl || 0), 0);
        totais.coberturaProp_vl = populacaoTotal > 0 ? (totais.coberturaPessoasTotal_vl / populacaoTotal) * 100 : 0;

        res.json({ 
            success: true, 
            data: dados,
            totais: totais,
            summary: {
                total_cidades: dados.length,
                report_pk: report_pk
            }
        });

    } catch (error) {
        console.error('❌ Erro ao consultar indicadores de vias públicas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao consultar indicadores', 
            error: error.message 
        });
    }
}

module.exports = reportIndicadoresViasPublicas;
