const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { desc_pk } = req.query;

    if (!desc_pk) {
      return res.status(400).json({ error: 'desc_pk é obrigatório' });
    }

    const pool = await getPool();
    
    // Primeiro, buscar TODOS os planoMidia_pk que aparecem nos hexágonos para este desc_pk
    // Isso garante que pegamos pontos de TODOS os grupos que aparecem no mapa
    const hexagonosResult = await pool.request().query(`
      SELECT DISTINCT planoMidia_pk
      FROM serv_product_be180.BaseCalculadoraHexagonosJoin_dm
      WHERE planoMidia_pk IN (
        SELECT pk FROM serv_product_be180.planoMidia_dm_vw
        WHERE planoMidiaDesc_vl = ${desc_pk}
      )
    `);

    if (!hexagonosResult.recordset || hexagonosResult.recordset.length === 0) {
      return res.status(200).json({ pontos: [] });
    }

    const planoMidiaPks = hexagonosResult.recordset.map(r => r.planoMidia_pk);
    
    console.log(`📍 [API pontos-midia] planoMidia_pks encontrados nos hexágonos:`, planoMidiaPks);
    
    // Buscar pontos de mídia da view
    const query = `
      SELECT *
      FROM serv_product_be180.baseCalculadoraLastPlanoMidia_ft_vw
      WHERE planoMidia_pk IN (${planoMidiaPks.join(',')})
    `;

    const result = await pool.request().query(query);
    
    console.log(`📍 [API pontos-midia] Total de pontos retornados: ${result.recordset.length}`);
    if (result.recordset.length > 0) {
      console.log(`📍 [API pontos-midia] Amostra do primeiro ponto:`, result.recordset[0]);
      
      // Contar por SubGrupo
      const porSubGrupo = result.recordset.reduce((acc, p) => {
        const sub = p.grupoSub_st || 'Sem SubGrupo';
        acc[sub] = (acc[sub] || 0) + 1;
        return acc;
      }, {});
      console.log(`📍 [API pontos-midia] Pontos por SubGrupo:`, porSubGrupo);
      
      // Contar por tipo (Digital/Estático)
      const porTipo = result.recordset.reduce((acc, p) => {
        const tipo = p.estaticoDigital_st || 'Sem Tipo';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});
      console.log(`📍 [API pontos-midia] Pontos por Tipo:`, porTipo);
      
      // Estatísticas de fluxo dos PONTOS
      const fluxosPontos = result.recordset.map(p => p.calculatedFluxoEstimado_vl || 0);
      const minFluxoPonto = Math.min(...fluxosPontos);
      const maxFluxoPonto = Math.max(...fluxosPontos);
      const avgFluxoPonto = fluxosPontos.reduce((a, b) => a + b, 0) / fluxosPontos.length;
      
      console.log(`📍 [API pontos-midia] Fluxo - Min: ${minFluxoPonto}, Max: ${maxFluxoPonto}, Média: ${avgFluxoPonto.toFixed(0)}`);
    }
    
    res.status(200).json({ 
      pontos: Array.isArray(result.recordset) ? result.recordset : [] 
    });
    
  } catch (err) {
    console.error('Erro na API /api/pontos-midia:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: err.message, 
      stack: err.stack 
    });
  }
};
