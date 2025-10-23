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
          // Usar grupo_st como código se grupoSub_st parecer ser descrição
          const codigoGrupo = grupoSub_st.includes(' ') ? linha.grupo_st : grupoSub_st;
          
          recordsJson.push({
            week_vl,
            grupoSub_st: codigoGrupo, // Garantir que seja código, não descrição
            contagem_vl,
            // 🆕 Novos campos adicionados
            seDigitalInsercoes_vl: parseInt(semana.seDigitalInsercoes_vl) || 0,
            seDigitalMaximoInsercoes_vl: parseInt(semana.seDigitalMaximoInsercoes_vl) || 0,
            seEstaticoVisibilidade_vl: parseFloat(semana.seEstaticoVisibilidade_vl) || 0
          });
        }
      });
    });

    console.log(`📝 Registros processados: ${recordsJson.length}`);
    console.log('🔍 Primeiros 5 registros:', recordsJson.slice(0, 5));
    
    // DEBUG DETALHADO - Dados que serão enviados para a stored procedure
    console.log('🔍 ===== DEBUG DETALHADO =====');
    console.log('📊 planoMidiaDesc_pk:', planoMidiaDesc_pk);
    console.log('📊 Tipo do planoMidiaDesc_pk:', typeof planoMidiaDesc_pk);
    console.log('📊 recordsJson (string):', JSON.stringify(recordsJson));
    console.log('📊 recordsJson (objeto):', recordsJson);
    console.log('📊 Total de registros:', recordsJson.length);
    
    // Debug de cada registro individual
    recordsJson.forEach((registro, index) => {
      console.log(`📊 Registro ${index + 1}:`, {
        week_vl: registro.week_vl,
        grupoSub_st: registro.grupoSub_st,
        contagem_vl: registro.contagem_vl,
        seDigitalInsercoes_vl: registro.seDigitalInsercoes_vl,
        seDigitalMaximoInsercoes_vl: registro.seDigitalMaximoInsercoes_vl,
        seEstaticoVisibilidade_vl: registro.seEstaticoVisibilidade_vl,
        tipo_grupoSub_st: typeof registro.grupoSub_st
      });
    });
    console.log('🔍 ===== FIM DEBUG =====');

    if (recordsJson.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum registro válido encontrado. Verifique se há valores de inserção comprada > 0 e visibilidade = "Selecionável".'
      });
    }

    // Executar a procedure
    const pool = await getPool();
    
    console.log('🚀 Executando sp_planoColmeiaSimuladoInsert...');
    console.log('🔍 ===== PARÂMETROS ENVIADOS =====');
    console.log('📊 Parâmetro 1 - planoMidiaDesc_pk:', planoMidiaDesc_pk);
    console.log('📊 Parâmetro 2 - recordsJson (string):', JSON.stringify(recordsJson));
    console.log('🔍 ===== FIM PARÂMETROS =====');
    
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
          totalDigitalInsercoes: recordsJson.reduce((sum, r) => sum + r.seDigitalInsercoes_vl, 0),
          totalDigitalMaximoInsercoes: recordsJson.reduce((sum, r) => sum + r.seDigitalMaximoInsercoes_vl, 0),
          totalEstaticoVisibilidade: recordsJson.reduce((sum, r) => sum + r.seEstaticoVisibilidade_vl, 0),
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
