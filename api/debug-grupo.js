const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { grupo } = req.query;
    if (!grupo) {
      return res.status(400).json({ error: 'Grupo parameter is required' });
    }

    const pool = await getPool();
    
    // Verificar dados na VIEW principal
    const viewResult = await pool.request()
      .input('grupo', grupo)
      .query(`
        SELECT * FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw 
        WHERE planoMidiaGrupo_pk = @grupo
        ORDER BY cidadeUpper_st
      `);

    // Verificar dados na tabela uploadRoteiros_ft (que sabemos que existe)
    const roteirosResult = await pool.request()
      .input('grupo', grupo)
      .query(`
        SELECT * FROM serv_product_be180.uploadRoteiros_ft 
        WHERE pk2 = @grupo
        ORDER BY pk
      `);

    // Verificar se há diferença entre as duas APIs de cidades
    const cidadesResult = await pool.request()
      .input('grupo', grupo)
      .query(`
        SELECT DISTINCT cidadeUpper_st, planoMidiaGrupo_st
        FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
        WHERE planoMidiaGrupo_pk = @grupo
        ORDER BY cidadeUpper_st
      `);

    const cidadesRoteiroResult = await pool.request()
      .input('grupo', grupo)
      .query(`
        SELECT DISTINCT cidadeUpper_st as nome, planoMidiaDesc_pk, planoMidiaGrupo_st
        FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
        WHERE planoMidiaGrupo_pk = @grupo
        ORDER BY cidadeUpper_st
      `);

    res.json({
      view: viewResult.recordset,
      roteiros: roteirosResult.recordset,
      cidades: cidadesResult.recordset,
      cidadesRoteiro: cidadesRoteiroResult.recordset,
      totalView: viewResult.recordset.length,
      totalRoteiros: roteirosResult.recordset.length,
      totalCidades: cidadesResult.recordset.length,
      totalCidadesRoteiro: cidadesRoteiroResult.recordset.length,
      analise: {
        grupo: grupo,
        cidadesEncontradas: cidadesResult.recordset.map(c => c.cidadeUpper_st),
        cidadesRoteiroEncontradas: cidadesRoteiroResult.recordset.map(c => c.nome),
        diferenca: cidadesResult.recordset.length !== cidadesRoteiroResult.recordset.length ? 'DIFERENÇA ENCONTRADA!' : 'OK - Mesmo número de cidades'
      }
    });

  } catch (err) {
    console.error('Erro no debug:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message,
      stack: err.stack
    });
  }
};
