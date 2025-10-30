const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const pool = await getPool();
    
    console.log('\n🔍 [ver-sp-planomidiadesc] Buscando código da SP sp_planoMidiaDescInsert...\n');
    
    const result = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('[serv_product_be180].[sp_planoMidiaDescInsert]')) AS ProcedureCode
    `);
    
    if (result.recordset.length === 0 || !result.recordset[0].ProcedureCode) {
      return res.status(404).json({ 
        success: false,
        error: 'Stored procedure não encontrada' 
      });
    }
    
    const codigo = result.recordset[0].ProcedureCode;
    
    console.log('📋 Código da SP encontrado!');
    console.log('📏 Tamanho:', codigo.length, 'caracteres');
    console.log('\n' + '='.repeat(80));
    console.log(codigo);
    console.log('='.repeat(80) + '\n');
    
    // Analisa o código para encontrar UPDATE statements
    const linhas = codigo.split('\n');
    const linhasUpdate = [];
    const linhasGrupo = [];
    
    linhas.forEach((linha, idx) => {
      const linhaUpper = linha.toUpperCase();
      if (linhaUpper.includes('UPDATE') && linhaUpper.includes('PLANO')) {
        linhasUpdate.push({ numero: idx + 1, conteudo: linha.trim() });
      }
      if (linhaUpper.includes('PLANOMIDIADESCPK') || linhaUpper.includes('PLANO_MIDIA_DESC_PK')) {
        linhasGrupo.push({ numero: idx + 1, conteudo: linha.trim() });
      }
    });
    
    console.log('\n📊 Análise do código:');
    console.log('   - Total de linhas:', linhas.length);
    console.log('   - Linhas com UPDATE:', linhasUpdate.length);
    console.log('   - Linhas manipulando planoMidiaDescPk:', linhasGrupo.length);
    
    if (linhasUpdate.length > 0) {
      console.log('\n🔍 Linhas com UPDATE encontradas:');
      linhasUpdate.forEach(l => {
        console.log(`   Linha ${l.numero}: ${l.conteudo}`);
      });
    }
    
    if (linhasGrupo.length > 0) {
      console.log('\n🔍 Linhas manipulando planoMidiaDescPk:');
      linhasGrupo.forEach(l => {
        console.log(`   Linha ${l.numero}: ${l.conteudo}`);
      });
    }
    
    res.json({ 
      success: true,
      procedure: {
        schema: 'serv_product_be180',
        name: 'sp_planoMidiaDescInsert',
        codigo: codigo,
        tamanho: codigo.length
      },
      analise: {
        totalLinhas: linhas.length,
        linhasComUpdate: linhasUpdate,
        linhasComPlanoMidiaDescPk: linhasGrupo
      }
    });
    
  } catch (err) {
    console.error('❌ Erro na API /api/ver-sp-planomidiadesc:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message 
    });
  }
};

