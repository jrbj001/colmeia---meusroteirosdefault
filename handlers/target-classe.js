const { sql, getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP (1000) [class]
      FROM [rawd_product_be180].[kantarTargetClass_dm_vw]
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao buscar classes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
