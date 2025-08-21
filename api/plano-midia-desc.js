const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk, recordsJson } = req.body;
    
    if (!planoMidiaGrupo_pk || !recordsJson) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk e recordsJson são obrigatórios' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
      .input('recordsJson', JSON.stringify(recordsJson))
      .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia desc:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

