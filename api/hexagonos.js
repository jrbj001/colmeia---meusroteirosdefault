const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const { desc_pk, grupo_st, planoMidiaDesc_st } = req.query;
    
    if (!desc_pk) {
      return res.status(400).json({ 
        error: 'Parâmetro desc_pk é obrigatório' 
      });
    }

    // Consulta simples, apenas por planoMidia_pk
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        hexagon_pk,
        hex_centroid_lat,
        hex_centroid_lon,
        geometry_8,
        hexagon_8,
        calculatedFluxoEstimado_vl,
        fluxoEstimado_vl,
        planoMidia_pk,
        grupo_st,
        count_vl,
        groupCount_vl,
        rgbColorR_vl,
        rgbColorG_vl,
        rgbColorB_vl,
        grupoDesc_st,
        hexColor_st
      FROM serv_product_be180.baseCalculadoraHexagonosJoin_dm_vw
      WHERE planoMidia_pk = '${desc_pk}'
    `);
    
    res.status(200).json({ hexagonos: Array.isArray(result.recordset) ? result.recordset : [] });
    
  } catch (err) {
    console.error('Erro na API /api/hexagonos:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message, stack: err.stack });
  }
}; 