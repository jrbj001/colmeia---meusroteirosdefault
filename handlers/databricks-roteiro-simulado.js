const axios = require('axios');

async function databricksRoteiroSimulado(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { planoMidiaGrupo_pk, date_dh, date_dt } = req.body;

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 [CHAMADA 6] POST /databricks-roteiro-simulado');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 BODY COMPLETO:', JSON.stringify(req.body, null, 2));
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
    console.log('📊 Tipo:', typeof planoMidiaGrupo_pk);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 date_dh:', date_dh);
    console.log('📊 Tipo:', typeof date_dh);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 date_dt:', date_dt);
    console.log('📊 Tipo:', typeof date_dt);
    console.log('═══════════════════════════════════════════════════════════════');

    // Validações básicas
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaGrupo_pk é obrigatório'
      });
    }

    if (!date_dh || !date_dt) {
      return res.status(400).json({
        success: false,
        message: 'date_dh e date_dt são obrigatórios'
      });
    }

    // Seleção do motor de execução (rollback fácil via env, sem deploy)
    const engine = (process.env.EXECUTION_ENGINE || 'logic_app').toLowerCase();

    let runId;
    let statusOk;
    let downstreamStatus;

    if (engine === 'logic_app') {
      const logicAppUrl = process.env.LOGIC_APP_URL_SIMULADO;
      if (!logicAppUrl) {
        console.error('❌ [databricksRoteiroSimulado] LOGIC_APP_URL_SIMULADO não encontrado no .env');
        return res.status(500).json({
          success: false,
          message: 'LOGIC_APP_URL_SIMULADO não configurado'
        });
      }

      const payload = {
        planoMidiaGrupo_pk: planoMidiaGrupo_pk.toString(),
        date_dh,
        date_dt
      };

      console.log('\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🚀 EXECUTANDO: Logic App (Simulado)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 URL:', logicAppUrl.slice(0, 80) + '…');
      console.log('📦 PAYLOAD:', JSON.stringify(payload));
      console.log('═══════════════════════════════════════════════════════════════');

      const logicAppResponse = await axios.post(logicAppUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
        validateStatus: s => s === 200 || s === 202 // Logic App responde 202 (assíncrono)
      });

      downstreamStatus = logicAppResponse.status;
      runId = logicAppResponse.headers['x-ms-workflow-run-id'] || 'unknown';
      statusOk = (logicAppResponse.status === 200 || logicAppResponse.status === 202);
    } else {
      // legacy databricks (manter pra rollback rápido — remover após sign-off)
      const databricksUrl = process.env.DATABRICKS_URL;
      const databricksJobId = process.env.DATABRICKS_JOB_ID_ROTEIRO_SIMULADO;
      const authToken = process.env.DATABRICKS_AUTH_TOKEN;

      if (!databricksUrl || !authToken || !databricksJobId) {
        console.error('❌ [databricksRoteiroSimulado] Configuração do Databricks ausente no .env');
        return res.status(500).json({
          success: false,
          message: 'Configuração do Databricks não encontrada'
        });
      }

      const requestBody = {
        job_id: parseInt(databricksJobId),
        notebook_params: {
          planoMidiaGrupo_pk: planoMidiaGrupo_pk.toString(),
          date_dh,
          date_dt
        }
      };

      console.log('\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🚀 EXECUTANDO: Databricks Job (Simulado)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 URL:', databricksUrl);
      console.log('📊 Job ID:', databricksJobId);
      console.log('📊 REQUEST BODY:', JSON.stringify(requestBody, null, 2));
      console.log('═══════════════════════════════════════════════════════════════');

      const databricksResponse = await axios.post(databricksUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      });

      downstreamStatus = databricksResponse.status;
      runId = databricksResponse.data?.run_id;
      statusOk = (databricksResponse.status === 200);
    }

    if (!statusOk) {
      throw new Error(`Engine ${engine} retornou status ${downstreamStatus}`);
    }

    console.log(`✅ [databricksRoteiroSimulado] Processamento (${engine}) iniciado!`);
    console.log(`📋 Run ID: ${runId}`);

    res.json({
      success: true,
      message: `Processamento (${engine}) iniciado com sucesso para roteiro simulado`,
      data: {
        run_id: runId,
        engine,
        planoMidiaGrupo_pk: planoMidiaGrupo_pk, // PK do grupo processado
        parameters: { planoMidiaGrupo_pk, date_dh, date_dt },
        status: 'RUNNING'
      }
    });

  } catch (error) {
    console.error('❌ [databricksRoteiroSimulado] Erro:', error);
    
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        message: 'Timeout na execução do Databricks',
        error: 'O processamento pode estar em andamento. Verifique o status no Databricks.'
      });
    } else if (error.response) {
      console.error('❌ [databricksRoteiroSimulado] Resposta de erro do Databricks:', error.response.data);
      res.status(error.response.status || 500).json({
        success: false,
        message: 'Erro no processamento Databricks',
        error: error.response.data || error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro interno na execução do Databricks',
        error: error.message
      });
    }
  }
}

module.exports = databricksRoteiroSimulado;
