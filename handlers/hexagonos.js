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

    const result = await hexRequest.query(`
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
    `);
    
    console.log(`🔷 [API hexagonos] Total de hexágonos retornados: ${result.recordset.length}`);
    if (result.recordset.length > 0) {
      console.log(`🔷 [API hexagonos] Amostra do primeiro hexágono:`, result.recordset[0]);
      
      // VERIFICAÇÃO DAS CORES DOS HEXÁGONOS
      const primeiroHex = result.recordset[0];
      console.log(`\n🎨 [CORES DO HEXÁGONO] Verificando campos de cor:`);
      console.log(`   - hexColor_st: ${primeiroHex.hexColor_st || 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorR_vl: ${primeiroHex.rgbColorR_vl !== null && primeiroHex.rgbColorR_vl !== undefined ? primeiroHex.rgbColorR_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorG_vl: ${primeiroHex.rgbColorG_vl !== null && primeiroHex.rgbColorG_vl !== undefined ? primeiroHex.rgbColorG_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorB_vl: ${primeiroHex.rgbColorB_vl !== null && primeiroHex.rgbColorB_vl !== undefined ? primeiroHex.rgbColorB_vl : 'NULL/UNDEFINED'}`);
      
      // Análise de quantos hexágonos têm cores
      const hexComHexColor = result.recordset.filter(h => h.hexColor_st).length;
      const hexComRGB = result.recordset.filter(h => 
        h.rgbColorR_vl !== null && h.rgbColorR_vl !== undefined &&
        h.rgbColorG_vl !== null && h.rgbColorG_vl !== undefined &&
        h.rgbColorB_vl !== null && h.rgbColorB_vl !== undefined
      ).length;
      console.log(`\n🎨 [ESTATÍSTICAS COR] Hexágonos com cores:`);
      console.log(`   - Com hexColor_st: ${hexComHexColor}/${result.recordset.length} (${((hexComHexColor/result.recordset.length)*100).toFixed(1)}%)`);
      console.log(`   - Com RGB completo: ${hexComRGB}/${result.recordset.length} (${((hexComRGB/result.recordset.length)*100).toFixed(1)}%)`);
      
      // Estatísticas de fluxo - ANÁLISE COMPLETA
      const fluxosCalculados = result.recordset.map(h => h.calculatedFluxoEstimado_vl || 0).filter(f => f > 0);
      const fluxosEstimados = result.recordset.map(h => h.fluxoEstimado_vl || 0).filter(f => f > 0);
      
      console.log(`\n🔷 [API hexagonos] Análise de fluxo (${result.recordset.length} hexágonos):`);
      if (fluxosCalculados.length > 0) {
        const min = Math.min(...fluxosCalculados);
        const max = Math.max(...fluxosCalculados);
        const avg = fluxosCalculados.reduce((a, b) => a + b, 0) / fluxosCalculados.length;
        console.log(`   calculatedFluxoEstimado_vl: Min: ${min.toLocaleString('pt-BR')}, Max: ${max.toLocaleString('pt-BR')}, Média: ${avg.toFixed(0).toLocaleString('pt-BR')} (${fluxosCalculados.length}/${result.recordset.length} hexágonos)`);
      }
      if (fluxosEstimados.length > 0) {
        const min = Math.min(...fluxosEstimados);
        const max = Math.max(...fluxosEstimados);
        const avg = fluxosEstimados.reduce((a, b) => a + b, 0) / fluxosEstimados.length;
        console.log(`   fluxoEstimado_vl: Min: ${min.toLocaleString('pt-BR')}, Max: ${max.toLocaleString('pt-BR')}, Média: ${avg.toFixed(0).toLocaleString('pt-BR')} (${fluxosEstimados.length}/${result.recordset.length} hexágonos)`);
      }
      
      // Comparação entre os dois campos se ambos existirem
      if (fluxosCalculados.length > 0 && fluxosEstimados.length > 0) {
        const hexagonosComAmbos = result.recordset.filter(h => 
          (h.calculatedFluxoEstimado_vl || 0) > 0 && (h.fluxoEstimado_vl || 0) > 0
        );
        if (hexagonosComAmbos.length > 0) {
          const diferencas = hexagonosComAmbos.map(h => {
            const calculado = h.calculatedFluxoEstimado_vl;
            const estimado = h.fluxoEstimado_vl;
            const diff = estimado - calculado;
            const percentual = calculado > 0 ? (diff / calculado) * 100 : 0;
            return { calculado, estimado, diff, percentual };
          });
          const mediaDiff = diferencas.reduce((sum, d) => sum + d.diff, 0) / diferencas.length;
          const mediaPercentual = diferencas.reduce((sum, d) => sum + d.percentual, 0) / diferencas.length;
          console.log(`   Comparação: fluxoEstimado_vl é ${mediaDiff > 0 ? 'MAIOR' : 'MENOR'} que calculatedFluxoEstimado_vl em média (${mediaDiff > 0 ? '+' : ''}${mediaPercentual.toFixed(1)}%)`);
        }
      }
    }
    
    res.status(200).json({ hexagonos: Array.isArray(result.recordset) ? result.recordset : [] });
    
  } catch (err) {
    console.error('Erro na API /api/hexagonos:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message, stack: err.stack });
  }
}; 