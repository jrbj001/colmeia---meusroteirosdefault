const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { pk } = req.body;
    
    // Validar se o PK foi fornecido
    if (!pk || pk <= 0) {
      return res.status(400).json({ 
        error: 'PK é obrigatório e deve ser maior que zero' 
      });
    }
    
    const pool = await getPool();
    
    // Executar a procedure de delete
    const result = await pool.request()
      .input('pk', pk)
      .execute('serv_product_be180.sp_planoMidiaGrupoDelete');
    
    // Verificar se houve sucesso
    if (result.recordset && result.recordset.length > 0) {
      return res.json({ 
        success: true, 
        message: 'Roteiro excluído com sucesso',
        data: result.recordset[0]
      });
    } else {
      return res.status(500).json({ 
        error: 'Erro ao deletar roteiro: nenhum registro retornado' 
      });
    }
    
  } catch (err) {
    console.error('Erro ao deletar roteiro:', err);
    
    // Tratar erros específicos da procedure
    if (err.message.includes('não encontrado')) {
      return res.status(404).json({ error: 'Roteiro não encontrado' });
    }
    
    if (err.message.includes('já está deletado')) {
      return res.status(400).json({ error: 'Roteiro já está deletado' });
    }
    
    if (err.message.includes('PK inválido')) {
      return res.status(400).json({ error: 'PK inválido' });
    }
    
    // Erro genérico
    return res.status(500).json({ 
      error: 'Erro ao deletar roteiro',
      details: err.message 
    });
  }
};
