const { getPool } = require('./db');

async function roteiroSimulado(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      planoMidiaDesc_pk, 
      dadosTabela, 
      pracasSelecionadas, 
      quantidadeSemanas 
    } = req.body;

    console.log('🎯 [roteiroSimulado] Iniciando salvamento do roteiro simulado...');
    console.log('📊 Dados recebidos:', {
      planoMidiaDesc_pk,
      quantidadeSemanas,
      totalLinhas: dadosTabela?.length,
      pracas: pracasSelecionadas?.length
    });

    // Validações básicas
    if (!planoMidiaDesc_pk) {
      return res.status(400).json({
        success: false,
        message: 'planoMidiaDesc_pk é obrigatório'
      });
    }

    if (!dadosTabela || !Array.isArray(dadosTabela)) {
      return res.status(400).json({
        success: false,
        message: 'dadosTabela é obrigatório e deve ser um array'
      });
    }

    if (!quantidadeSemanas || quantidadeSemanas < 1) {
      return res.status(400).json({
        success: false,
        message: 'quantidadeSemanas deve ser maior que 0'
      });
    }

    // Transformar dados da tabela para formato da procedure
    const recordsJson = [];
    
    dadosTabela.forEach((linha) => {
      const { 
        grupoSub_st, 
        visibilidade, 
        semanas = [] 
      } = linha;

      // Só processar linhas com visibilidade "Selecionável"
      if (visibilidade !== 'Selecionável') {
        console.log(`⏭️ Pulando ${grupoSub_st} - visibilidade: ${visibilidade}`);
        return;
      }

      // Processar cada semana
      semanas.forEach((semana, index) => {
        const week_vl = index + 1;
        const contagem_vl = parseInt(semana.insercaoComprada) || 0;

        // Só adicionar se houver contagem > 0
        if (contagem_vl > 0) {
          recordsJson.push({
            week_vl,
            grupoSub_st,
            contagem_vl
          });
        }
      });
    });

    console.log(`📝 Registros processados: ${recordsJson.length}`);
    console.log('🔍 Primeiros 5 registros:', recordsJson.slice(0, 5));

    if (recordsJson.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum registro válido encontrado. Verifique se há valores de inserção comprada > 0 e visibilidade = "Selecionável".'
      });
    }

    // Executar a procedure
    const pool = await getPool();
    
    console.log('🚀 Executando sp_planoColmeiaSimuladoInsert...');
    
    const result = await pool.request()
      .input('planoMidiaDesc_pk', planoMidiaDesc_pk)
      .input('recordsJson', JSON.stringify(recordsJson))
      .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');

    console.log('✅ Procedure executada com sucesso!');
    console.log('📊 Resultado:', result);

    // Preparar resposta
    const response = {
      success: true,
      message: `Roteiro simulado salvo com sucesso! ${recordsJson.length} registros processados.`,
      data: {
        planoMidiaDesc_pk,
        registrosProcessados: recordsJson.length,
        semanasConfiguradas: quantidadeSemanas,
        gruposConfigurados: [...new Set(recordsJson.map(r => r.grupoSub_st))].length,
        detalhes: {
          totalInsecoesCompradas: recordsJson.reduce((sum, r) => sum + r.contagem_vl, 0),
          gruposAtivos: [...new Set(recordsJson.map(r => r.grupoSub_st))],
          distribuicaoSemanal: recordsJson.reduce((acc, r) => {
            acc[`W${r.week_vl}`] = (acc[`W${r.week_vl}`] || 0) + r.contagem_vl;
            return acc;
          }, {})
        }
      }
    };

    console.log('🎉 Roteiro simulado salvo com sucesso!');
    res.json(response);

  } catch (error) {
    console.error('❌ [roteiroSimulado] Erro:', error);
    
    let errorMessage = 'Erro interno do servidor';
    if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao salvar roteiro simulado',
      error: errorMessage,
      details: error.stack
    });
  }
}

module.exports = roteiroSimulado;
