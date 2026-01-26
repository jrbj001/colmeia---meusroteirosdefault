const { getPool } = require('./db');

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
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({ 
        error: 'Termo de busca deve ter pelo menos 2 caracteres' 
      });
    }
    
    const pool = await getPool();
    
    // Busca com LIKE no SQL Server
    const searchPattern = `%${searchTerm}%`;
    
    // Contar total de resultados
    const countResult = await pool.request()
      .input('searchPattern', searchPattern)
      .query(`
        SELECT COUNT(*) as total 
        FROM serv_product_be180.planoMidiaGrupo_dm_vw
        WHERE planoMidiaGrupo_st LIKE @searchPattern
        AND delete_bl = 0
      `);
    
    const total = countResult.recordset[0].total;
    
    // Buscar resultados com paginação
    const result = await pool.request()
      .input('searchPattern', searchPattern)
      .input('offset', offset)
      .input('pageSize', pageSize)
      .query(`
        SELECT * 
        FROM serv_product_be180.planoMidiaGrupo_dm_vw
        WHERE planoMidiaGrupo_st LIKE @searchPattern
        AND delete_bl = 0
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
