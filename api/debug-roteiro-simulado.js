const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk } = req.body;
    
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório' });
    }

    const pool = await getPool();
    
    console.log('🔍 DEBUG: Investigando dados do roteiro simulado...');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
    
    // 1. Verificar planoMidiaDesc_pk criados para este grupo
    // Usar TOP 100 e * para descobrir a estrutura da tabela
    const descPks = await pool.request()
      .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 100 *
        FROM serv_product_be180.planoMidiaDesc_dm
        WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        ORDER BY date_dh DESC
      `);

    console.log('📋 Registros encontrados:', descPks.recordset.length);
    
    // Descobrir qual é o nome correto da coluna PK
    if (descPks.recordset.length > 0) {
      console.log('📊 Estrutura da tabela (primeiro registro):');
      console.log(JSON.stringify(descPks.recordset[0], null, 2));
    }
    
    descPks.recordset.forEach((desc, idx) => {
      console.log(`  ${idx + 1}. ${JSON.stringify(desc)}`);
    });

    // 2. Pular verificação de tabela intermediária (não acessível diretamente)
    console.log('⏭️  Pulando verificação de tabela intermediária (dados processados pela SP)');
    const dadosSimulado = descPks.recordset.map(desc => ({
      ...desc,
      status: 'Processado pela SP'
    }));

    // 3. Verificar view de resultados
    const resultados = await pool.request()
      .input('report_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT cidade_st, report_pk, pontosTotal_vl, impactosTotal_vl
        FROM serv_product_be180.reportDataIndicadoresViasPublicasTotal_dm_vw
        WHERE report_pk = @report_pk
        ORDER BY cidade_st
      `);

    console.log('📊 Resultados na view (cidades):', resultados.recordset.length);
    resultados.recordset.forEach(r => {
      console.log(`  - Cidade: ${r.cidade_st}, Pontos: ${r.pontosTotal_vl}, Impactos: ${r.impactosTotal_vl}`);
    });

    res.status(200).json({
      success: true,
      planoMidiaGrupo_pk,
      planoMidiaDesc_pks: descPks.recordset,
      dados_simulado: dadosSimulado,
      resultados_view: resultados.recordset,
      diagnostico: {
        total_desc_pks: descPks.recordset.length,
        total_cidades_view: resultados.recordset.length,
        problema_identificado: descPks.recordset.length !== resultados.recordset.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao debugar roteiro simulado:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};

