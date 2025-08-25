const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_st } = req.body;
    
    if (!planoMidiaGrupo_st) {
      return res.status(400).json({ error: 'planoMidiaGrupo_st é obrigatório' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('planoMidiaGrupo_st', planoMidiaGrupo_st)
      .execute('[serv_product_be180].[sp_planoMidiaGrupoInsert]');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

