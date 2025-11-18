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
    
    // Buscar planoMidia_pks usando a mesma lógica da API de hexágonos
    const planoMidiaResult = await pool.request().query(`
      SELECT pk FROM serv_product_be180.planoMidia_dm_vw
      WHERE planoMidiaDesc_vl = ${desc_pk}
    `);

    if (!planoMidiaResult.recordset || planoMidiaResult.recordset.length === 0) {
      return res.status(200).json({ pontos: [] });
    }

    const planoMidiaPks = planoMidiaResult.recordset.map(r => r.pk);
    
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
