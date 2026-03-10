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
    
    const planoMidiaResult = await pool.request()
      .input('desc_pk', desc_pk)
      .query(`
        SELECT pk FROM serv_product_be180.planoMidia_dm_vw
        WHERE planoMidiaDesc_vl = @desc_pk
      `);

    if (!planoMidiaResult.recordset || planoMidiaResult.recordset.length === 0) {
      return res.status(200).json({ pontos: [] });
    }

    const planoMidiaPks = planoMidiaResult.recordset.map(r => r.pk);
    
    const gruposRequest = pool.request();
    const grupoPkParams = planoMidiaPks.map((pk, i) => {
      gruposRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');

    const gruposHexagonosResult = await gruposRequest.query(`
      SELECT DISTINCT grupo_st
      FROM serv_product_be180.BaseCalculadoraHexagonosJoin_dm
      WHERE planoMidia_pk IN (${grupoPkParams})
        AND grupo_st IS NOT NULL
        AND grupo_st != ''
    `);
    
    const gruposHexagonos = gruposHexagonosResult.recordset.map(r => r.grupo_st);
    
    if (gruposHexagonos.length === 0) {
      return res.status(200).json({ pontos: [] });
    }
    
    const pontosRequest = pool.request();
    const pontosPkParams = planoMidiaPks.map((pk, i) => {
      pontosRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');
    const gruposParams = gruposHexagonos.map((g, i) => {
      pontosRequest.input(`grupo${i}`, g);
      return `@grupo${i}`;
    }).join(',');

    const result = await pontosRequest.query(`
      SELECT *
      FROM serv_product_be180.baseCalculadoraLastPlanoMidia_ft_vw
      WHERE planoMidia_pk IN (${pontosPkParams})
        AND grupo_st IN (${gruposParams})
    `);
    
    const pontosProcessados = result.recordset
      .filter(ponto => ponto.grupo_st)
      .map(ponto => {
        if (!ponto.grupoSub_st || !ponto.grupoSub_st.startsWith(ponto.grupo_st)) {
          const tipo = ponto.estaticoDigital_st || 'D';
          return { ...ponto, grupoSub_st: `${ponto.grupo_st}${tipo}` };
        }
        return ponto;
      });
    
    console.log(`[pontos-midia] ${pontosProcessados.length} pontos retornados`);
    
    res.status(200).json({ 
      pontos: pontosProcessados
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
