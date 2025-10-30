const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    
    const pool = await getPool();
    
    console.log(`\n🔍 [verificar-desc-salvos] Verificando planoMidiaDesc_dm para grupo: ${grupo}`);
    
    // Primeiro, descobre os nomes das colunas
    const sampleResult = await pool.request().query(`
      SELECT TOP 1 *
      FROM serv_product_be180.planoMidiaDesc_dm
    `);
    
    if (sampleResult.recordset.length > 0) {
      console.log(`📋 Colunas disponíveis na tabela: ${Object.keys(sampleResult.recordset[0]).join(', ')}`);
    }
    
    // Agora busca todos os registros recentes
    const result = await pool.request().query(`
      SELECT TOP 100 *
      FROM serv_product_be180.planoMidiaDesc_dm
      ORDER BY 1 DESC
    `);
    
    console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);
    
    if (result.recordset.length > 0) {
      console.log(`📋 Primeiros 10 registros:`);
      result.recordset.slice(0, 10).forEach((r, idx) => {
        console.log(`   ${idx + 1}. ${JSON.stringify(r)}`);
      });
    }
    
    res.json({ 
      total: result.recordset.length,
      colunas: sampleResult.recordset.length > 0 ? Object.keys(sampleResult.recordset[0]) : [],
      primeiros10: result.recordset.slice(0, 10)
    });
  } catch (err) {
    console.error('❌ Erro na API /api/verificar-desc-salvos:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message 
    });
  }
};

