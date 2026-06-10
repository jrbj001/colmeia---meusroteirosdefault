const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT pk, planoMidiaStatus_st, hexColor_st, ordem_vl
      FROM serv_product_be180.planoMidiaStatus_dm_vw
      ORDER BY ordem_vl
    `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Erro ao listar status de plano de mídia:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
