const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        pk as id_agencia,
        agencia_st as nome_agencia
      FROM serv_product_be180.agencia_dm_vw 
      WHERE active_bl = 1
      ORDER BY agencia_st
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro na API /api/agencia:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
