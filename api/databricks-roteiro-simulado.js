const axios = require('axios');

async function databricksRoteiroSimulado(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { planoMidiaDesc_pk, date_dh, date_dt } = req.body;

    console.log('🎯 [databricksRoteiroSimulado] Iniciando processamento Databricks para roteiro simulado...');
    console.log('📊 Dados recebidos:', {
      planoMidiaDesc_pk: planoMidiaDesc_pk, // PK individual da praça (será processado pelo Databricks)
      date_dh,
      date_dt
    });

    // Validações básicas
    if (!planoMidiaDesc_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaDesc_pk é obrigatório'
      });
    }

    if (!date_dh || !date_dt) {
      return res.status(400).json({
        success: false,
        message: 'date_dh e date_dt são obrigatórios'
      });
    }

    // Configurações do Databricks
    const databricksUrl = process.env.DATABRICKS_URL;
    const databricksJobId = process.env.DATABRICKS_JOB_ID_ROTEIRO_SIMULADO;
    const authToken = process.env.DATABRICKS_AUTH_TOKEN;

    if (!databricksUrl || !authToken) {
      console.error('❌ [databricksRoteiroSimulado] DATABRICKS_URL ou DATABRICKS_AUTH_TOKEN não encontrado no .env');
      return res.status(500).json({
        success: false,
        message: 'Configuração do Databricks não encontrada'
      });
    }

    if (!databricksJobId) {
      console.error('❌ [databricksRoteiroSimulado] DATABRICKS_JOB_ID_ROTEIRO_SIMULADO não encontrado no .env');
      return res.status(500).json({
        success: false,
        message: 'Job ID do roteiro simulado não configurado'
      });
    }

    // Corpo da requisição específico para roteiro simulado
    const requestBody = {
      job_id: parseInt(databricksJobId),
      notebook_params: {
        planoMidiaDesc_pk: planoMidiaDesc_pk.toString(), // ← CORRETO! Nome do parâmetro corrigido
        date_dh: date_dh,
        date_dt: date_dt
      }
    };

    console.log('🚀 [databricksRoteiroSimulado] Executando job Databricks...');
    console.log(`📋 Job ID: ${databricksJobId}`);
    console.log(`📊 Parâmetros:`, requestBody.notebook_params);

    // Executar job no Databricks
    const databricksResponse = await axios.post(databricksUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos timeout
    });

    if (databricksResponse.status === 200) {
      const runId = databricksResponse.data.run_id;
      
      console.log('✅ [databricksRoteiroSimulado] Job executado com sucesso!');
      console.log(`📋 Run ID: ${runId}`);
      
      res.json({
        success: true,
        message: 'Processamento Databricks iniciado com sucesso para roteiro simulado',
        data: {
          run_id: runId,
          job_id: databricksJobId,
          planoMidiaDesc_pk: planoMidiaDesc_pk, // PK processado
          parameters: requestBody.notebook_params,
          status: 'RUNNING'
        }
      });
    } else {
      throw new Error(`Databricks retornou status ${databricksResponse.status}`);
    }

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
