const { sql, getPool } = require('./db');

async function grupoSubDistinct(req, res) {
  try {
    const pool = await getPool();

    // Consultar a view grupoSubDistinct_dm_vw
    const result = await pool.request()
      .query(`
        SELECT TOP (1000) 
          [subGrupo_pk],
          [grupo_st],
          [grupoSub_st],
          [ipv_vl],
          [hexColor_st],
          [ativo_bl],
          [date_dh],
          [date_dt],
          [rgbColorR_vl],
          [rgbColorG_vl],
          [rgbColorB_vl],
          [grupoDesc_st]
        FROM [serv_product_be180].[grupoSubDistinct_dm_vw]
        WHERE [ativo_bl] = 1
        ORDER BY [grupo_st], [grupoSub_st]
      `);

    console.log(`✅ [grupoSubDistinct] Consultando grupoSubDistinct_dm_vw:`);
    console.log(`📊 Total de registros encontrados: ${result.recordset.length}`);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ [grupoSubDistinct] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}

module.exports = grupoSubDistinct;
