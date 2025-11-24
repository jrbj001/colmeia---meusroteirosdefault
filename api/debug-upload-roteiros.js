const { getPool } = require('./db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planoMidiaDesc_pk } = req.query;

    if (!planoMidiaDesc_pk) {
      return res.status(400).json({ error: 'planoMidiaDesc_pk é obrigatório' });
    }

    const pool = await getPool();
    
    console.log(`🔍 Buscando dados em uploadRoteiros_ft para planoMidiaDesc_pk: ${planoMidiaDesc_pk}`);
    
    const result = await pool.request().query(`
      SELECT TOP 50 *
      FROM serv_product_be180.uploadRoteiros_ft
      WHERE planoMidiaDesc_pk = ${planoMidiaDesc_pk}
    `);

    console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);
    
    if (result.recordset.length > 0) {
      console.log(`📊 Primeiro registro:`, result.recordset[0]);
      console.log(`📊 Campos disponíveis:`, Object.keys(result.recordset[0]));
    }

    res.status(200).json({
      success: true,
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};

