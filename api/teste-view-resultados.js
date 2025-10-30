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
    
    console.log('\n===========================================');
    console.log('🧪 TESTE VIEW DE RESULTADOS');
    console.log('===========================================\n');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
    
    // 1. Verificar na view que a documentação menciona
    console.log('\n--- View: reportDataPlanoMidiaWeekResultGb_dm_vw (da documentação) ---');
    const viewDoc = await pool.request()
      .input('report_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 100 [report_pk], [cidade_st], [week_vl], [impactos_vl], [coberturaPessoas_vl]
        FROM [serv_product_be180].[reportDataPlanoMidiaWeekResultGb_dm_vw]
        WHERE report_pk = @report_pk
        ORDER BY cidade_st, week_vl
      `);

    console.log(`Registros na view da doc: ${viewDoc.recordset.length}`);
    const cidadesDoc = [...new Set(viewDoc.recordset.map(r => r.cidade_st))];
    console.log(`Cidades únicas: ${cidadesDoc.length} - ${cidadesDoc.join(', ')}`);
    
    // 2. Verificar na view que o app usa
    console.log('\n--- View: reportDataIndicadoresViasPublicasTotal_dm_vw (usada pelo app) ---');
    const viewApp = await pool.request()
      .input('report_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 100 [report_pk], [cidade_st], [impactosTotal_vl], [coberturaPessoasTotal_vl]
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw]
        WHERE report_pk = @report_pk
        ORDER BY cidade_st
      `);

    console.log(`Registros na view do app: ${viewApp.recordset.length}`);
    const cidadesApp = viewApp.recordset.map(r => r.cidade_st);
    console.log(`Cidades: ${cidadesApp.join(', ')}`);
    
    // 3. Buscar na tabela planoMidiaDesc_dm usando todas as colunas
    console.log('\n--- Tabela: planoMidiaDesc_dm ---');
    const descTable = await pool.request()
      .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 100 *
        FROM [serv_product_be180].[planoMidiaDesc_dm]
        WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        ORDER BY date_dh DESC
      `);

    console.log(`Registros na tabela planoMidiaDesc_dm: ${descTable.recordset.length}`);
    if (descTable.recordset.length > 0) {
      console.log('\nPrimeiro registro (estrutura completa):');
      console.log(JSON.stringify(descTable.recordset[0], null, 2));
      
      console.log('\nTodos os registros:');
      descTable.recordset.forEach((r, idx) => {
        // Pegar as colunas que parecem ser o PK
        const possiveisPKs = Object.keys(r).filter(k => 
          k.toLowerCase().includes('pk') || 
          k.toLowerCase().includes('id') ||
          k === 'id'
        );
        console.log(`  ${idx + 1}. PKs possíveis: ${possiveisPKs.map(pk => `${pk}=${r[pk]}`).join(', ')}`);
        console.log(`     Nome: ${r.planoMidiaDesc_st || 'N/A'}`);
        console.log(`     IBGE: ${r.ibgeCode_vl || 'N/A'}`);
      });
    }
    
    console.log('\n===========================================');
    console.log('📋 DIAGNÓSTICO');
    console.log('===========================================');
    
    const diagnostico = {
      planoMidiaGrupo_pk,
      planoMidiaDesc_criados: descTable.recordset.length,
      cidades_na_view_doc: cidadesDoc.length,
      cidades_na_view_app: cidadesApp.length,
      problema: null
    };
    
    if (descTable.recordset.length > cidadesApp.length) {
      diagnostico.problema = `${descTable.recordset.length} planoMidiaDesc criados mas apenas ${cidadesApp.length} cidade(s) na view do app`;
      console.log(`❌ PROBLEMA: ${diagnostico.problema}`);
      console.log('💡 O Databricks não processou todos os planoMidiaDesc OU a view está filtrando incorretamente');
    } else if (descTable.recordset.length === cidadesApp.length) {
      console.log('✅ Número de planoMidiaDesc e cidades na view correspondem!');
    }
    
    console.log('\n===========================================\n');

    res.json({
      success: true,
      diagnostico,
      dados: {
        planoMidiaDesc: descTable.recordset,
        view_documentacao: viewDoc.recordset,
        view_app: viewApp.recordset
      }
    });

  } catch (error) {
    console.error('❌ Erro ao testar views:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
      details: error.message,
      stack: error.stack
    });
  }
};

