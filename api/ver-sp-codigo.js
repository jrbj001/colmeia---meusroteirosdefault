const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    console.log('\n===========================================');
    console.log('🔍 EXTRAINDO CÓDIGO DA STORED PROCEDURE');
    console.log('===========================================\n');
    
    // Buscar o código da SP
    const spCode = await pool.request()
      .query(`
        SELECT 
          OBJECT_SCHEMA_NAME(object_id) AS schema_name,
          OBJECT_NAME(object_id) AS procedure_name,
          definition
        FROM sys.sql_modules
        WHERE object_id = OBJECT_ID('[serv_product_be180].[sp_planoColmeiaSimuladoInsert]')
      `);

    if (spCode.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stored procedure não encontrada'
      });
    }

    const sp = spCode.recordset[0];
    
    console.log(`📊 Schema: ${sp.schema_name}`);
    console.log(`📊 Procedure: ${sp.procedure_name}`);
    console.log('\n--- CÓDIGO DA PROCEDURE ---\n');
    console.log(sp.definition);
    console.log('\n--- FIM DO CÓDIGO ---\n');
    
    // Analisar o código para encontrar problemas
    const codigo = sp.definition.toLowerCase();
    const analise = {
      tem_delete: codigo.includes('delete'),
      tem_truncate: codigo.includes('truncate'),
      deleta_por_grupo: codigo.includes('planomidiagrupo_pk') && codigo.includes('delete'),
      deleta_por_desc: codigo.includes('planomidiadesc_pk') && codigo.includes('delete'),
      linhas_delete: []
    };
    
    // Extrair linhas com DELETE
    const linhas = sp.definition.split('\n');
    linhas.forEach((linha, idx) => {
      if (linha.toLowerCase().includes('delete') || linha.toLowerCase().includes('truncate')) {
        analise.linhas_delete.push({
          linha_numero: idx + 1,
          codigo: linha.trim()
        });
      }
    });
    
    console.log('\n===========================================');
    console.log('📋 ANÁLISE');
    console.log('===========================================');
    console.log(`Tem DELETE: ${analise.tem_delete ? '✅' : '❌'}`);
    console.log(`Tem TRUNCATE: ${analise.tem_truncate ? '✅' : '❌'}`);
    console.log(`Deleta por grupo: ${analise.deleta_por_grupo ? '⚠️ SIM (PROBLEMA!)' : '✅ Não'}`);
    console.log(`Deleta por desc: ${analise.deleta_por_desc ? '✅ SIM (correto)' : '❌ Não'}`);
    
    if (analise.linhas_delete.length > 0) {
      console.log('\n🔍 Linhas com DELETE/TRUNCATE:');
      analise.linhas_delete.forEach(l => {
        console.log(`  Linha ${l.linha_numero}: ${l.codigo}`);
      });
    }
    
    console.log('\n===========================================\n');

    res.json({
      success: true,
      procedure: {
        schema: sp.schema_name,
        name: sp.procedure_name,
        codigo: sp.definition
      },
      analise
    });

  } catch (error) {
    console.error('❌ Erro ao extrair código da SP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
      details: error.message,
      stack: error.stack
    });
  }
};

