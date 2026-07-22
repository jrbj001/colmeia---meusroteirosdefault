const { getPool } = require('./db');
const { buildRoteiroFilters, applyBinds } = require('./_roteirosFilters');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const searchTerm = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    const empresaPk = req.user?.empresa_pk ?? null;

    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        error: 'Termo de busca deve ter pelo menos 2 caracteres'
      });
    }

    const pool = await getPool();
    const searchPattern = `%${searchTerm}%`;

    const agenciaFilter = empresaPk
      ? 'AND agencia_pk = @empresaPk AND liberadoAgencia_bl = 1'
      : '';

    // Filtros multiselect (usuário / marca / agência / categoria) — combinam com a busca
    const { sql: filtrosSql, binds: filtrosBinds } = buildRoteiroFilters(req.query);

    const countReq = pool.request().input('searchPattern', searchPattern);
    if (empresaPk) countReq.input('empresaPk', empresaPk);
    applyBinds(countReq, filtrosBinds);

    const countResult = await countReq.query(`
      SELECT COUNT(*) as total
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE planoMidiaGrupo_st LIKE @searchPattern
        AND delete_bl = 0 ${agenciaFilter} ${filtrosSql}
    `);
    const total = countResult.recordset[0].total;

    const dataReq = pool.request()
      .input('searchPattern', searchPattern)
      .input('offset', offset)
      .input('pageSize', pageSize);
    if (empresaPk) dataReq.input('empresaPk', empresaPk);
    applyBinds(dataReq, filtrosBinds);

    const result = await dataReq.query(`
      SELECT *
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE planoMidiaGrupo_st LIKE @searchPattern
        AND delete_bl = 0 ${agenciaFilter} ${filtrosSql}
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
      },
      searchTerm: searchTerm
    });
    
  } catch (err) {
    console.error('Erro na API /api/roteiros-search:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
