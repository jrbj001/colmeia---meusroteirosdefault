const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool    = await getPool();
    const search  = (req.query.search || '').replace(/\+/g, ' ').trim();
    const request = pool.request();

    let where = 'WHERE valid_bl = 1 AND cidade_st IS NOT NULL';
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      where += ' AND (cidade_st LIKE @search OR estado_st LIKE @search)';
    }

    const result = await request.query(`
      SELECT TOP 1000
        cidade_st AS nome_cidade,
        estado_st AS nome_estado
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      ${where}
      GROUP BY cidade_st, estado_st
      ORDER BY cidade_st
    `);

    res.json(result.recordset.map(r => ({
      id_cidade:   r.nome_cidade,
      nome_cidade: r.nome_cidade,
      nome_estado: r.nome_estado || '',
    })));

  } catch (error) {
    console.error('[cidades-praca] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar cidades' });
  }
};
