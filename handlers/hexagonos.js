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
      const semanaResult = await pool.request()
        .input('desc_pk', desc_pk)
        .input('semana', semana)
        .query(`
          SELECT pk FROM serv_product_be180.planoMidia_dm_vw
          WHERE planoMidiaDesc_vl = @desc_pk AND semanaInicial_vl = @semana
        `);
      planoMidiaPks = semanaResult.recordset.map(r => r.pk);
      if (planoMidiaPks.length === 0) {
        return res.status(404).json({ error: 'Semana não encontrada para o desc_pk informado.' });
      }
    } else {
      const allSemanasResult = await pool.request()
        .input('desc_pk', desc_pk)
        .query(`
          SELECT pk FROM serv_product_be180.planoMidia_dm_vw
          WHERE planoMidiaDesc_vl = @desc_pk
        `);
      planoMidiaPks = allSemanasResult.recordset.map(r => r.pk);
      if (planoMidiaPks.length === 0) {
        return res.status(404).json({ error: 'Nenhuma semana encontrada para o desc_pk informado.' });
      }
    }

    const hexRequest = pool.request();
    const pkParams = planoMidiaPks.map((pk, i) => {
      hexRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');

    const baseQuery = `
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
      WHERE planoMidia_pk IN (${pkParams})
    `;

    const financeiroQuery = `
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
        hexColor_st,
        valorLiquido_vl,
        totalFinal_vl,
        totalNegociado_vl,
        valorTotal_vl,
        cpmView_vl
      FROM serv_product_be180.BaseCalculadoraHexagonosJoin_dm
      WHERE planoMidia_pk IN (${pkParams})
    `;

    let result;
    try {
      result = await hexRequest.query(financeiroQuery);
    } catch (financeiroErr) {
      console.warn('[hexagonos] Colunas financeiras indisponíveis, usando query base:', financeiroErr.message);
      result = await hexRequest.query(baseQuery);
    }
    
    console.log(`[hexagonos] ${result.recordset.length} hexagonos retornados`);
    
    res.status(200).json({ hexagonos: Array.isArray(result.recordset) ? result.recordset : [] });
    
  } catch (err) {
    console.error('Erro na API /api/hexagonos:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message, stack: err.stack });
  }
}; 