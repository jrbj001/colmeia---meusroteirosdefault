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

        console.log(`✅ [databricksRunJob] Executando job do Databricks para grupo ${planoMidiaGrupo_pk}`);

        // Converter date_dh para o formato solicitado
        const dateDh = new Date(date_dh);
        const formattedDateDh = dateDh.toISOString().slice(0, 19).replace('T', ' ');
        const formattedDateDt = dateDh.toISOString().slice(0, 10);

        console.log(`📅 [databricksRunJob] Parâmetros formatados - date_dh: ${formattedDateDh}, date_dt: ${formattedDateDt}`);

        const jobPayload = {
            job_id: jobId,
            notebook_params: {
                planoMidiaGrupo_pk: planoMidiaGrupo_pk.toString(),
                date_dh: formattedDateDh,
                date_dt: formattedDateDt
            }
        };

        try {
            const response = await axios.post(databricksUrl, jobPayload, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 segundos timeout
            });

            console.log(`✅ [databricksRunJob] Job iniciado para grupo ${planoMidiaGrupo_pk} - Run ID: ${response.data.run_id}`);

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
                    run_id: response.data.run_id,
                    databricks_response: response.data
                },
                message: `Job do Databricks executado com sucesso para grupo ${planoMidiaGrupo_pk}`
            });

        } catch (error) {
            console.error(`❌ [databricksRunJob] Erro no job para grupo ${planoMidiaGrupo_pk}:`, error.message);
            
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
                message: `Erro ao executar job do Databricks para grupo ${planoMidiaGrupo_pk}`
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
