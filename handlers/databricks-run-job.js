const axios = require('axios');

async function databricksRunJob(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk é obrigatório' 
            });
        }

        if (!date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'date_dh é obrigatório' 
            });
        }

        const engine = (process.env.EXECUTION_ENGINE || 'logic_app').toLowerCase();

        // Converter date_dh para o formato solicitado
        const dateDh = new Date(date_dh);
        const formattedDateDh = dateDh.toISOString().slice(0, 19).replace('T', ' ');
        const formattedDateDt = dateDh.toISOString().slice(0, 10);

        console.log(`📅 [databricksRunJob] Parâmetros formatados - date_dh: ${formattedDateDh}, date_dt: ${formattedDateDt}`);

        try {
            let runId;
            let statusOk;
            let downstreamStatus;
            let rawResponse;

            if (engine === 'logic_app') {
                const logicAppUrl = process.env.LOGIC_APP_URL_COMPLETO;
                if (!logicAppUrl) {
                    return res.status(500).json({
                        success: false,
                        message: 'LOGIC_APP_URL_COMPLETO não configurado'
                    });
                }

                const payload = {
                    planoMidiaGrupo_pk: planoMidiaGrupo_pk.toString(),
                    date_dh: formattedDateDh,
                    date_dt: formattedDateDt
                };

                console.log(`🚀 [databricksRunJob] Executando Logic App (Completo) para grupo ${planoMidiaGrupo_pk}`);

                const response = await axios.post(logicAppUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000,
                    validateStatus: s => s === 200 || s === 202
                });

                downstreamStatus = response.status;
                runId = response.headers['x-ms-workflow-run-id'] || 'unknown';
                statusOk = (response.status === 200 || response.status === 202);
                rawResponse = response.data;
            } else {
                // legacy databricks (manter pra rollback rápido — remover após sign-off)
                const databricksUrl = process.env.DATABRICKS_URL;
                const jobId = parseInt(process.env.DATABRICKS_JOB_ID);
                const authToken = process.env.DATABRICKS_AUTH_TOKEN;

                if (!databricksUrl || !jobId || !authToken) {
                    return res.status(500).json({
                        success: false,
                        error: 'Configurações do Databricks não encontradas',
                        message: 'Configure as variáveis de ambiente DATABRICKS_URL, DATABRICKS_JOB_ID e DATABRICKS_AUTH_TOKEN'
                    });
                }

                const jobPayload = {
                    job_id: jobId,
                    notebook_params: {
                        planoMidiaGrupo_pk: planoMidiaGrupo_pk.toString(),
                        date_dh: formattedDateDh,
                        date_dt: formattedDateDt
                    }
                };

                console.log(`🚀 [databricksRunJob] Executando Databricks Job (Completo) para grupo ${planoMidiaGrupo_pk}`);

                const response = await axios.post(databricksUrl, jobPayload, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 segundos timeout
                });

                downstreamStatus = response.status;
                runId = response.data?.run_id;
                statusOk = (response.status === 200);
                rawResponse = response.data;
            }

            if (!statusOk) {
                throw new Error(`Engine ${engine} retornou status ${downstreamStatus}`);
            }

            console.log(`✅ [databricksRunJob] Job (${engine}) iniciado para grupo ${planoMidiaGrupo_pk} - Run ID: ${runId}`);

            // Retornar resultado de sucesso
            res.json({
                success: true,
                summary: {
                    total: 1,
                    successful: 1,
                    failed: 0
                },
                result: {
                    planoMidiaGrupo_pk: planoMidiaGrupo_pk,
                    success: true,
                    run_id: runId,
                    engine,
                    databricks_response: rawResponse
                },
                message: `Processamento (${engine}) executado com sucesso para grupo ${planoMidiaGrupo_pk}`
            });

        } catch (error) {
            console.error(`❌ [databricksRunJob] Erro no job (${engine}) para grupo ${planoMidiaGrupo_pk}:`, error.message);
            
            res.json({
                success: false,
                summary: {
                    total: 1,
                    successful: 0,
                    failed: 1
                },
                error: {
                    planoMidiaGrupo_pk: planoMidiaGrupo_pk,
                    success: false,
                    error: error.message,
                    response: error.response?.data || null
                },
                message: `Erro ao executar processamento (${engine}) para grupo ${planoMidiaGrupo_pk}`
            });
        }

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
