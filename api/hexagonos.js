const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const { desc_pk, semana } = req.query;
    
    if (!desc_pk) {
      return res.status(400).json({ 
        error: 'Parâmetro desc_pk é obrigatório' 
      });
    }

    const pool = await getPool();
    let planoMidiaPks = [];

    if (semana) {
      // Busca o pk da semana específica
      const semanaResult = await pool.request().query(`
        SELECT pk FROM serv_product_be180.planoMidia_dm_vw
        WHERE planoMidiaDesc_vl = ${desc_pk} AND semanaInicial_vl = ${semana}
      `);
      planoMidiaPks = semanaResult.recordset.map(r => r.pk);
      if (planoMidiaPks.length === 0) {
        return res.status(404).json({ error: 'Semana não encontrada para o desc_pk informado.' });
      }
    } else {
      // Busca todos os pks para o desc_pk
      const allSemanasResult = await pool.request().query(`
        SELECT pk FROM serv_product_be180.planoMidia_dm_vw
        WHERE planoMidiaDesc_vl = ${desc_pk}
      `);
      planoMidiaPks = allSemanasResult.recordset.map(r => r.pk);
      if (planoMidiaPks.length === 0) {
        return res.status(404).json({ error: 'Nenhuma semana encontrada para o desc_pk informado.' });
      }
    }

    // Monta a query para buscar os hexágonos dos pks encontrados
    const pkList = planoMidiaPks.join(',');
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
      FROM serv_product_be180.BaseCalculadoraHexagonosJoin_dm
      WHERE planoMidia_pk IN (${pkList})
    `);
    
    res.status(200).json({ hexagonos: Array.isArray(result.recordset) ? result.recordset : [] });
    
  } catch (err) {
    console.error('Erro na API /api/hexagonos:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message, stack: err.stack });
  }
}; 