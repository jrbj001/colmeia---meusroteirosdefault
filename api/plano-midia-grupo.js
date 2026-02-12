const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_st, agencia_pk, marca_pk, categoria_pk, valorCampanha_vl } = req.body;
    
    // Validações
    if (!planoMidiaGrupo_st) {
      return res.status(400).json({ error: 'planoMidiaGrupo_st é obrigatório' });
    }
    if (!agencia_pk) {
      return res.status(400).json({ error: 'agencia_pk é obrigatório' });
    }
    if (!marca_pk) {
      return res.status(400).json({ error: 'marca_pk é obrigatório' });
    }
    if (!categoria_pk) {
      return res.status(400).json({ error: 'categoria_pk é obrigatório' });
    }
    if (!valorCampanha_vl) {
      return res.status(400).json({ error: 'valorCampanha_vl é obrigatório' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('planoMidiaGrupo_st', planoMidiaGrupo_st)
      .input('agencia_pk', agencia_pk)
      .input('marca_pk', marca_pk)
      .input('categoria_pk', categoria_pk)
      .input('valorCampanha_vl', valorCampanha_vl)
      .execute('[serv_product_be180].[sp_planoMidiaGrupoInsert]');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

