const { sql, getPool } = require('./db');

async function matrixDataRowQuery(req, res) {
  try {
    const { planoMidiaGrupo_pk } = req.body;

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ 
        success: false, 
        message: 'planoMidiaGrupo_pk é obrigatório' 
      });
    }

    const pool = await getPool();

    // Executar a stored procedure sp_baseCalculadoraMatrixDataRowQuery
    const result = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .execute('[serv_product_be180].[sp_baseCalculadoraMatrixDataRowQuery]');

    console.log(`✅ [matrixDataRowQuery] Executando sp_baseCalculadoraMatrixDataRowQuery para grupo ${planoMidiaGrupo_pk}:`);
    console.log(`📊 Total de registros retornados: ${result.recordset.length}`);
    
    // Log de amostra dos primeiros registros para debug
    if (result.recordset.length > 0) {
      console.log(`📋 Exemplo de registro:`, JSON.stringify(result.recordset[0], null, 2));
    } else {
      console.warn(`⚠️ [matrixDataRowQuery] ATENÇÃO: Stored procedure retornou 0 registros!`);
    }

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ [matrixDataRowQuery] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}

module.exports = matrixDataRowQuery;
