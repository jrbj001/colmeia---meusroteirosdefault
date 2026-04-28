const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();
    const search = (req.query.search || '').replace(/\+/g, ' ').trim();
    const request = pool.request();

    let where = 'WHERE valid_bl = 1 AND exibidor_st IS NOT NULL AND LTRIM(RTRIM(exibidor_st)) <> \'\'';
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      where += ' AND exibidor_st LIKE @search';
    }

    const result = await request.query(`
      SELECT TOP 1000
        exibidor_st
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      ${where}
      GROUP BY exibidor_st
      ORDER BY exibidor_st
    `);

    const data = result.recordset.map((row) => ({
      id: row.exibidor_st,
      name: row.exibidor_st,
    }));

    res.status(200).json(data);

  } catch (error) {
    console.error('[exibidores] Erro:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar exibidores no SQL Server',
      error: error.message
    });
  }
};
