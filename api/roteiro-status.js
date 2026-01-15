const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { pk } = req.query;
    
    if (!pk) {
      return res.status(400).json({ 
        error: 'PK do roteiro é obrigatório' 
      });
    }
    
    const pool = await getPool();
    
    // Buscar status do roteiro específico
    const result = await pool.request()
      .input('pk', pk)
      .query(`
        SELECT 
          pk,
          planoMidiaGrupo_st,
          inProgress_bl,
          inProgress_st,
          date_dh,
          active_bl,
          delete_bl
        FROM serv_product_be180.planoMidiaGrupo_dm_vw
        WHERE pk = @pk
      `);
    
    if (result.recordset && result.recordset.length > 0) {
      const roteiro = result.recordset[0];
      
      res.json({
        success: true,
        data: {
          pk: roteiro.pk,
          nome: roteiro.planoMidiaGrupo_st,
          inProgress: roteiro.inProgress_bl === 1,
          status: roteiro.inProgress_st,
          dataCriacao: roteiro.date_dh,
          ativo: roteiro.active_bl === 1,
          deletado: roteiro.delete_bl === 1
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Roteiro não encontrado'
      });
    }
    
  } catch (err) {
    console.error('Erro na API /api/roteiro-status:', err);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};
