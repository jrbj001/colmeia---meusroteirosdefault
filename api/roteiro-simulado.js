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

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 [CHAMADA 2/3/4/5] POST /roteiro-simulado');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 BODY COMPLETO:', JSON.stringify(req.body, null, 2));
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 planoMidiaDesc_pk:', planoMidiaDesc_pk);
    console.log('📊 Tipo:', typeof planoMidiaDesc_pk);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 quantidadeSemanas:', quantidadeSemanas);
    console.log('📊 Tipo:', typeof quantidadeSemanas);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 dadosTabela (total de linhas):', dadosTabela?.length || 0);
    console.log('📊 dadosTabela (primeiras 3 linhas):');
    dadosTabela?.slice(0, 3).forEach((linha, index) => {
      console.log(`   [${index + 1}]:`, JSON.stringify(linha, null, 6));
    });
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 pracasSelecionadas (total):', pracasSelecionadas?.length || 0);
    console.log('📊 pracasSelecionadas (dados):');
    pracasSelecionadas?.forEach((praca, index) => {
      console.log(`   [${index + 1}]:`, JSON.stringify(praca, null, 6));
    });
    console.log('═══════════════════════════════════════════════════════════════');

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
        seDigitalInsercoes_vl,
        seDigitalMaximoInsercoes_vl,
        semanas = []
      } = linha;

      // Só processar linhas com visibilidade válida (25, 50, 75, 100)
      const visibilidadeValida = ['25', '50', '75', '100'].includes(visibilidade);
      if (!visibilidadeValida) {
        console.log(`⏭️ Pulando ${grupoSub_st} - visibilidade inválida: ${visibilidade}`);
        return;
      }

      // Usar grupo_st como código se grupoSub_st parecer ser descrição
      const codigoGrupo = grupoSub_st.includes(' ') ? linha.grupo_st : grupoSub_st;
      
      // Usar o valor de visibilidade como contagem simbólica para permitir visualização
      // Isso é necessário para que o Databricks possa processar e gerar hexágonos no mapa
      const contagemSimbolica = parseFloat(visibilidade) || 100;
      
      // Se houver semanas configuradas, processar cada semana
      if (semanas.length > 0) {
        semanas.forEach((semana, index) => {
          const week_vl = index + 1;
          
          // Sempre usar 0 quando não houver valor (null, undefined ou 0)
          const contagem = parseInt(semana.insercaoComprada) || 0;
          
          // Verificar valores digitais - sempre 0 quando não houver valor
          const digInsercoes = parseInt(semana.seDigitalInsercoes_vl) || parseInt(seDigitalInsercoes_vl) || 0;
          const digMaxInsercoes = parseInt(semana.seDigitalMaximoInsercoes_vl) || parseInt(seDigitalMaximoInsercoes_vl) || 0;
          
          // Visibilidade estático - usar o valor da linha (25, 50, 75, 100)
          const estaticoVisibilidade = parseInt(visibilidade) || 0;
          
          recordsJson.push({
            week_vl,
            grupoSub_st: codigoGrupo,
            contagem_vl: contagem,
            seDigitalInsercoes_vl: digInsercoes,
            seDigitalMaximoInsercoes_vl: digMaxInsercoes,
            seEstaticoVisibilidade_vl: estaticoVisibilidade
          });
        });
      } else {
        // Se não houver semanas, adicionar apenas um registro com os campos de configuração
        // Sempre usar 0 como padrão quando não houver valor
        const insDig = parseInt(seDigitalInsercoes_vl) || 0;
        const maxDig = parseInt(seDigitalMaximoInsercoes_vl) || 0;
        const estaticoVisibilidade = parseInt(visibilidade) || 0;
        
        recordsJson.push({
          week_vl: 1, // Semana padrão
          grupoSub_st: codigoGrupo,
          contagem_vl: 0, // Sempre 0 quando não houver semanas configuradas
          seDigitalInsercoes_vl: insDig,
          seDigitalMaximoInsercoes_vl: maxDig,
          seEstaticoVisibilidade_vl: estaticoVisibilidade
        });
      }
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
        tipo_grupoSub_st: typeof registro.grupoSub_st
      });
    });
    console.log('🔍 ===== FIM DEBUG =====');

    if (recordsJson.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum registro válido encontrado. Verifique se há visibilidade válida configurada (25, 50, 75, 100).'
      });
    }

    // Executar a procedure
    const pool = await getPool();
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 EXECUTANDO: sp_planoColmeiaSimuladoInsert');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 PARÂMETRO 1 - planoMidiaDesc_pk:', planoMidiaDesc_pk);
    console.log('📊 Tipo:', typeof planoMidiaDesc_pk);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 PARÂMETRO 2 - recordsJson (total de registros):', recordsJson.length);
    console.log('📊 recordsJson (TODOS os registros):');
    recordsJson.forEach((record, index) => {
      console.log(`   [${index + 1}]:`, JSON.stringify(record, null, 6));
    });
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 recordsJson (STRING que será enviada):');
    console.log(JSON.stringify(recordsJson, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    
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
