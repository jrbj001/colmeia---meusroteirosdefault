const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const { id_cidade } = req.query;
    
    if (!id_cidade) {
      return res.status(400).json({ error: 'Parâmetro id_cidade é obrigatório' });
    }
    
    const pool = await getPool();
    
    // Buscar código IBGE baseado no id_cidade
    const result = await pool.request()
      .input('id_cidade', id_cidade)
      .query(`
        SELECT 
          pk as id_cidade,
          cidade_st as nome_cidade,
          estado_st as estado,
          ibgeCode as ibge_code
        FROM serv_product_be180.cidadeClassIbgeKantar_dm_vw
        WHERE pk = @id_cidade
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'Cidade não encontrada',
        id_cidade: id_cidade 
      });
    }
    
    const cidade = result.recordset[0];
    
    res.json({
      success: true,
      data: {
        id_cidade: cidade.id_cidade,
        nome_cidade: cidade.nome_cidade,
        estado: cidade.estado,
        ibge_code: cidade.ibge_code
      }
    });
    
  } catch (error) {
    console.error('Erro na API /api/cidade-ibge:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};
