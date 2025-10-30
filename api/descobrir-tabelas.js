const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    console.log('🔍 Descobrindo tabelas do schema serv_product_be180...\n');
    
    // Listar todas as tabelas/views que contêm "simulado" ou "colmeia" no nome
    const tabelas = await pool.request()
      .query(`
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'serv_product_be180'
          AND (
            TABLE_NAME LIKE '%simulado%' 
            OR TABLE_NAME LIKE '%Simulado%'
            OR TABLE_NAME LIKE '%colmeia%'
            OR TABLE_NAME LIKE '%Colmeia%'
          )
        ORDER BY TABLE_NAME
      `);

    console.log(`📊 Tabelas/Views encontradas: ${tabelas.recordset.length}\n`);
    
    tabelas.recordset.forEach((t, idx) => {
      console.log(`${idx + 1}. [${t.TABLE_TYPE}] ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    });

    // Também listar as principais tabelas do plano de mídia
    console.log('\n📊 Tabelas principais do plano de mídia:\n');
    const tabelasPrincipais = await pool.request()
      .query(`
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'serv_product_be180'
          AND (
            TABLE_NAME LIKE '%planoMidia%'
            OR TABLE_NAME LIKE '%planoColmeia%'
          )
        ORDER BY TABLE_NAME
      `);

    tabelasPrincipais.recordset.forEach((t, idx) => {
      console.log(`${idx + 1}. [${t.TABLE_TYPE}] ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    });

    res.json({
      success: true,
      tabelas_simulado: tabelas.recordset,
      tabelas_principais: tabelasPrincipais.recordset
    });

  } catch (error) {
    console.error('❌ Erro ao descobrir tabelas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
};

