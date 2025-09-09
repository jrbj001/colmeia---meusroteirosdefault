const axios = require('axios');

async function databricksRunJob(req, res) {
    try {
        const { planoMidia_pks, date_dh } = req.body;

        if (!planoMidia_pks || !Array.isArray(planoMidia_pks) || planoMidia_pks.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidia_pks é obrigatório e deve ser um array não vazio' 
            });
        }

        if (!date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'date_dh é obrigatório' 
            });
        }

        const databricksUrl = process.env.DATABRICKS_URL;
        const jobId = parseInt(process.env.DATABRICKS_JOB_ID);
        const authToken = process.env.DATABRICKS_AUTH_TOKEN;

        // Validar se as variáveis de ambiente estão configuradas
        if (!databricksUrl || !jobId || !authToken) {
            return res.status(500).json({
                success: false,
                error: 'Configurações do Databricks não encontradas',
                message: 'Configure as variáveis de ambiente DATABRICKS_URL, DATABRICKS_JOB_ID e DATABRICKS_AUTH_TOKEN'
            });
        }

        console.log(`✅ [databricksRunJob] Executando jobs do Databricks para ${planoMidia_pks.length} planos de mídia`);

        const results = [];
        const errors = [];

        // Executar job para cada planoMidia_pk
        for (let i = 0; i < planoMidia_pks.length; i++) {
            const planoMidia_pk = planoMidia_pks[i];
            
            try {
                console.log(`🔄 [databricksRunJob] Processando plano mídia ${i + 1}/${planoMidia_pks.length} - PK: ${planoMidia_pk}`);

                // Converter date_dh para o formato solicitado
                const dateDh = new Date(date_dh);
                const formattedDateDh = dateDh.toISOString().slice(0, 19).replace('T', ' ');
                const formattedDateDt = dateDh.toISOString().slice(0, 10);

                console.log(`📅 [databricksRunJob] Parâmetros formatados - date_dh: ${formattedDateDh}, date_dt: ${formattedDateDt}`);

                const jobPayload = {
                    job_id: jobId,
                    notebook_params: {
                        planoMidia_pk: planoMidia_pk.toString(),
                        date_dh: formattedDateDh,
                        date_dt: formattedDateDt
                    }
                };

                const response = await axios.post(databricksUrl, jobPayload, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 segundos timeout
                });

                results.push({
                    planoMidia_pk: planoMidia_pk,
                    success: true,
                    run_id: response.data.run_id,
                    databricks_response: response.data
                });

                console.log(`✅ [databricksRunJob] Job iniciado para PK ${planoMidia_pk} - Run ID: ${response.data.run_id}`);

            } catch (error) {
                console.error(`❌ [databricksRunJob] Erro no job para PK ${planoMidia_pk}:`, error.message);
                
                errors.push({
                    planoMidia_pk: planoMidia_pk,
                    success: false,
                    error: error.message,
                    response: error.response?.data || null
                });
            }

            // Aguardar 1 segundo entre chamadas para evitar rate limiting
            if (i < planoMidia_pks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successCount = results.length;
        const errorCount = errors.length;

        console.log(`📊 [databricksRunJob] Processamento concluído: ${successCount} sucessos, ${errorCount} erros`);

        // Retornar resultado consolidado
        res.json({
            success: errorCount === 0,
            summary: {
                total: planoMidia_pks.length,
                successful: successCount,
                failed: errorCount
            },
            results: results,
            errors: errors,
            message: `${successCount} de ${planoMidia_pks.length} jobs do Databricks executados com sucesso`
        });

    } catch (error) {
        console.error('❌ [databricksRunJob] Erro geral:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao executar jobs do Databricks',
            error: error.message 
        });
    }
}

module.exports = databricksRunJob;
