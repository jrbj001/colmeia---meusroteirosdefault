const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool    = await getPool();
    const search  = (req.query.search || '').replace(/\+/g, ' ').trim();
    const praca   = (req.query.praca || '').replace(/\+/g, ' ').trim();
    const request = pool.request();

    let where = 'WHERE valid_bl = 1 AND exibidor_st IS NOT NULL';
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      where += ' AND exibidor_st LIKE @search';
    }
    if (praca) {
      request.input('praca', sql.NVarChar, `%${praca}%`);
      where += ' AND cidade_st LIKE @praca';
    }

    const result = await request.query(`
      SELECT TOP 500
        exibidor_st AS nome_exibidor
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      ${where}
      GROUP BY exibidor_st
      ORDER BY exibidor_st
    `);

    res.json(result.recordset.map(r => ({
      id_exibidor:     r.nome_exibidor,
      nome_exibidor:   r.nome_exibidor,
      codigo_exibidor: r.nome_exibidor,
    })));

  } catch (error) {
    console.error('[exibidores-praca] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar exibidores' });
  }
};
