const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();
    const { cidade } = req.query;
    
    if (!cidade) {
      return res.status(400).json({ error: 'Parâmetro cidade é obrigatório' });
    }
    
    // Buscar inventário da cidade com detalhes dos grupos
    const result = await pool.request()
      .input('cidade', cidade)
      .query(`
        SELECT 
          inv.grupo_st,
          inv.grupoSub_st,
          inv.count_vl,
          g.grupoDesc_st as descricao
        FROM serv_product_be180.baseGeofusionJoinGrupoSubCount_ft_vw inv
        LEFT JOIN serv_product_be180.grupoSubDistinct_dm_vw g 
          ON inv.grupoSub_st = g.grupoSub_st
        WHERE inv.cidade_st = @cidade
        ORDER BY inv.grupo_st, inv.grupoSub_st
      `);
    
    // Agrupar dados por grupo principal
    const inventario = {};
    let total = 0;
    
    result.recordset.forEach(item => {
      const grupo = item.grupo_st;
      const subGrupo = item.grupoSub_st;
      const quantidade = item.count_vl;
      const descricao = item.descricao || '';
      
      if (!inventario[grupo]) {
        inventario[grupo] = {
          subgrupos: [],
          total: 0
        };
      }
      
      inventario[grupo].subgrupos.push({
        codigo: subGrupo,
        descricao: descricao,
        quantidade: quantidade
      });
      
      inventario[grupo].total += quantidade;
      total += quantidade;
    });
    
    res.json({
      cidade: cidade,
      total: total,
      grupos: inventario
    });
    
  } catch (error) {
    console.error('Erro na API /api/inventario-cidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};

