const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  try {
    const pool = await getPool();
    const search = (req.query.search || '').replace(/\+/g, ' ').trim();
    const praca = (req.query.praca || '').replace(/\+/g, ' ').trim();
    const request = pool.request();

    let where = `WHERE valid_bl = 1 AND district IS NOT NULL AND LTRIM(RTRIM(district)) <> ''`;
    if (praca) {
      request.input('praca', sql.NVarChar, `%${praca}%`);
      where += ' AND cidade_st LIKE @praca';
    }
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
      where += ' AND district LIKE @search';
    }

    const result = await request.query(`
      SELECT TOP 1000 district AS name
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      ${where}
      GROUP BY district
      ORDER BY district
    `);

    res.status(200).json(result.recordset || []);

  } catch (error) {
    console.error('❌ [Bairros] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar bairros',
      error: error.message
    });
  }
};
