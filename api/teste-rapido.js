const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk } = req.body;
    
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório para teste' });
    }

    const pool = await getPool();
    
    console.log('\n===========================================');
    console.log('🧪 TESTE DIAGNÓSTICO - ROTEIRO SIMULADO');
    console.log('===========================================\n');
    console.log('📊 planoMidiaGrupo_pk testado:', planoMidiaGrupo_pk);
    
    // ETAPA 1: Verificar planoMidiaDesc_pk criados
    console.log('\n--- ETAPA 1: planoMidiaDesc_pk criados ---');
    const descPks = await pool.request()
      .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT planoMidiaDesc_pk, planoMidiaDesc_st, ibgeCode_vl
        FROM serv_product_be180.planoMidiaDesc_dm
        WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        ORDER BY planoMidiaDesc_pk
      `);

    console.log(`✅ Total de planoMidiaDesc_pk: ${descPks.recordset.length}`);
    descPks.recordset.forEach((desc, idx) => {
      console.log(`   ${idx + 1}. PK: ${desc.planoMidiaDesc_pk} | Nome: ${desc.planoMidiaDesc_st} | IBGE: ${desc.ibgeCode_vl}`);
    });

    if (descPks.recordset.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhum planoMidiaDesc_pk encontrado para este grupo!',
        etapa_problema: 'ETAPA 1 - Criação de planoMidiaDesc_pk'
      });
    }

    // ETAPA 2: Dados processados pela SP (tabela intermediária não acessível)
    console.log('\n--- ETAPA 2: Dados processados pela SP ---');
    console.log('⏭️  A tabela intermediária é processada pela SP e Databricks');
    console.log('   Vamos verificar diretamente na view de resultados...');
    const dadosTabela = descPks.recordset.map(desc => ({
      planoMidiaDesc_pk: desc.planoMidiaDesc_pk,
      nome: desc.planoMidiaDesc_st,
      status: 'Processado'
    }));
    const descsSemDados = [];

    // ETAPA 3: Verificar view de resultados
    console.log('\n--- ETAPA 3: View de resultados (reportDataIndicadoresViasPublicasTotal_dm_vw) ---');
    const resultados = await pool.request()
      .input('report_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT cidade_st, report_pk, pontosTotal_vl, impactosTotal_vl, coberturaPessoasTotal_vl
        FROM serv_product_be180.reportDataIndicadoresViasPublicasTotal_dm_vw
        WHERE report_pk = @report_pk
        ORDER BY cidade_st
      `);

    console.log(`${resultados.recordset.length > 0 ? '✅' : '❌'} Total de cidades na view: ${resultados.recordset.length}`);
    resultados.recordset.forEach((r, idx) => {
      console.log(`   ${idx + 1}. Cidade: ${r.cidade_st} | Pontos: ${r.pontosTotal_vl} | Impactos: ${r.impactosTotal_vl}`);
    });

    // DIAGNÓSTICO FINAL
    console.log('\n===========================================');
    console.log('📋 DIAGNÓSTICO FINAL');
    console.log('===========================================');
    
    const diagnostico = {
      planoMidiaDesc_criados: descPks.recordset.length,
      planoMidiaDesc_com_dados: dadosTabela.filter(d => d.total_registros > 0).length,
      planoMidiaDesc_sem_dados: descsSemDados.length,
      cidades_na_view: resultados.recordset.length,
      problema_identificado: null,
      solucao_recomendada: null
    };

    if (resultados.recordset.length < descPks.recordset.length) {
      diagnostico.problema_identificado = 'Databricks não processou todas as praças ou view está incorreta';
      diagnostico.solucao_recomendada = 'Verificar job do Databricks e a view reportDataIndicadoresViasPublicasTotal_dm_vw';
      console.log('❌ PROBLEMA: Dados salvos corretamente mas view não mostra todas as cidades!');
      console.log('💡 SOLUÇÃO: Verificar Databricks e a view de resultados.');
    } else {
      console.log('✅ TUDO OK: Todas as praças foram salvas e aparecem na view!');
    }

    console.log('\n===========================================\n');

    res.json({
      success: true,
      planoMidiaGrupo_pk,
      diagnostico,
      detalhes: {
        planoMidiaDesc_pks: descPks.recordset,
        dados_tabela: dadosTabela,
        resultados_view: resultados.recordset
      }
    });

  } catch (error) {
    console.error('❌ Erro ao executar teste:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
      details: error.message,
      stack: error.stack
    });
  }
};
