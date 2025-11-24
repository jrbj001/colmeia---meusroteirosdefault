const { sql, getPool } = require('./db');

async function debugSpMatrix(req, res) {
  try {
    const pool = await getPool();

    // Consultar a definição da stored procedure
    const spDefinition = await pool.request().query(`
      SELECT 
        OBJECT_DEFINITION(OBJECT_ID('[serv_product_be180].[sp_baseCalculadoraMatrixDataRowQuery]')) AS definition
    `);

    console.log('📋 Definição da SP:');
    console.log(spDefinition.recordset[0].definition);

    res.json({
      success: true,
      definition: spDefinition.recordset[0].definition
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}

module.exports = debugSpMatrix;

