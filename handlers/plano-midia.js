const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { periodsJson } = req.body;
    
    if (!periodsJson) {
      return res.status(400).json({ error: 'periodsJson é obrigatório' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('periodsJson', JSON.stringify(periodsJson))
      .execute('[serv_product_be180].[sp_planoMidiaInsert]');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

