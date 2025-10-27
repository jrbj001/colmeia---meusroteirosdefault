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
        pk as id_marca,
        marca_st as nome_marca
      FROM serv_product_be180.marca_dm_vw 
      WHERE active_bl = 1
      ORDER BY marca_st
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Erro na API /api/marca:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
