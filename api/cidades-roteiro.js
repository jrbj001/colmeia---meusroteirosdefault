const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    
    const pool = await getPool();
    
    // Consultar a VIEW que faz o relacionamento entre grupo e cidades
    const result = await pool.request().query(`
      SELECT DISTINCT 
        cidadeUpper_st,
        planoMidiaDesc_pk,
        planoMidiaGrupo_st
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
      ORDER BY cidadeUpper_st
    `);
    
    if (result.recordset.length === 0) {
      return res.json({ 
        cidades: [], 
        nomeGrupo: null,
        message: 'Nenhuma cidade encontrada para este grupo'
      });
    }
    
    // Extrair informações das cidades
    const cidades = result.recordset.map(r => ({
      nome: r.cidadeUpper_st,
      planoMidiaDesc_pk: r.planoMidiaDesc_pk,
      planoMidiaGrupo_st: r.planoMidiaGrupo_st
    }));
    
    // O nome do grupo já vem da VIEW
    const nomeGrupo = result.recordset.length > 0 ? result.recordset[0].planoMidiaGrupo_st : null;
    
    res.json({ 
      cidades, 
      nomeGrupo,
      totalCidades: cidades.length,
      message: `${cidades.length} cidade(s) encontrada(s)`
    });
    
  } catch (err) {
    console.error('Erro na API /api/cidades-roteiro:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message 
    });
  }
};
