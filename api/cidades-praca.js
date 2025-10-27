const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();
    const { search } = req.query;
    
    let query = `
      SELECT 
        pk as id_cidade,
        cidade_st as nome_cidade,
        estado_st as nome_estado
      FROM serv_product_be180.cidadeClassIbgeKantar_dm_vw 
      WHERE 1=1
    `;
    
    // Se houver termo de busca, filtrar por nome da cidade ou estado
    if (search && search.trim()) {
      query += ` AND (cidade_st LIKE @search OR estado_st LIKE @search)`;
    }
    
    query += ` ORDER BY cidade_st, estado_st`;
    
    const request = pool.request();
    
    if (search && search.trim()) {
      request.input('search', `%${search.trim()}%`);
    }
    
    const result = await request.query(query);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro na API /api/cidades-praca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
