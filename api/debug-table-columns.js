const { getPool } = require('./db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    console.log('🔍 Buscando colunas da tabela uploadRoteiros_ft...');
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME = 'uploadRoteiros_ft'
      ORDER BY ORDINAL_POSITION
    `);

    console.log(`📊 Total de colunas: ${result.recordset.length}`);
    console.log('📊 Colunas:', result.recordset.map(c => c.COLUMN_NAME).join(', '));

    res.status(200).json({
      success: true,
      total: result.recordset.length,
      columns: result.recordset
    });
  } catch (error) {
    console.error('❌ Erro ao buscar colunas:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
};

