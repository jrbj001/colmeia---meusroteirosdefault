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
    const empresaPk = req.user?.empresa_pk ?? null;

    const pool = await getPool();

    const agenciaFilter = empresaPk
      ? 'AND agencia_pk = @empresaPk AND liberadoAgencia_bl = 1'
      : '';

    const countReq = pool.request();
    if (empresaPk) countReq.input('empresaPk', empresaPk);
    const countResult = await countReq.query(
      `SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaGrupo_dm_vw WHERE delete_bl = 0 ${agenciaFilter}`
    );
    const total = countResult.recordset[0].total;

    const dataReq = pool.request()
      .input('offset', offset)
      .input('pageSize', pageSize);
    if (empresaPk) dataReq.input('empresaPk', empresaPk);

    const result = await dataReq.query(`
      SELECT * FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE delete_bl = 0 ${agenciaFilter}
      ORDER BY date_dh DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
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
