const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    const pool = await getPool();
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaGrupo_dm_vw');
    const total = countResult.recordset[0].total;
    const result = await pool.request().query(`
      SELECT * FROM serv_product_be180.planoMidiaGrupo_dm_vw
      ORDER BY date_dh DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);
    res.json({
      data: result.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: pageSize
      }
    });
  } catch (err) {
    console.error('Erro na API /api/roteiros:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 