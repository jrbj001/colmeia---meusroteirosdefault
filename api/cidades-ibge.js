const { getPool, sql } = require('./db.js');

/**
 * Buscar código IBGE de uma cidade pelo nome
 * @route POST /api/cidades-ibge
 * @body { cidade_st: string, estado_st?: string }
 * @returns { ibgeCode: number, cidade_st: string, estado_st: string }
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cidade_st, estado_st } = req.body;
    
    if (!cidade_st) {
      return res.status(400).json({ error: 'cidade_st é obrigatório' });
    }

    const pool = await getPool();
    
    // Normalizar o nome da cidade (mesmo padrão do upload-roteiros.js)
    const cidadeNormalizada = cidade_st
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    console.log(`🔍 [cidades-ibge] Buscando ibgeCode para: ${cidadeNormalizada}${estado_st ? ` (${estado_st})` : ''}`);
    
    // Buscar na cidadeClass_dm_vw
    const query = estado_st
      ? `SELECT 
           ibgeCode,
           cidade_st,
           estado_st
         FROM [serv_product_be180].[cidadeClass_dm_vw]
         WHERE cidade_st = @cidade_st
         AND estado_st = @estado_st`
      : `SELECT 
           ibgeCode,
           cidade_st,
           estado_st
         FROM [serv_product_be180].[cidadeClass_dm_vw]
         WHERE cidade_st = @cidade_st`;
    
    const request = pool.request()
      .input('cidade_st', sql.VarChar, cidadeNormalizada);
    
    if (estado_st) {
      request.input('estado_st', sql.VarChar, estado_st.toUpperCase());
    }
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      console.warn(`⚠️ [cidades-ibge] Cidade não encontrada: ${cidadeNormalizada}`);
      return res.status(404).json({ 
        error: 'Cidade não encontrada',
        cidade_buscada: cidadeNormalizada,
        sugestao: 'Verifique se o nome da cidade está correto ou se existe no banco de dados'
      });
    }
    
    if (result.recordset.length > 1 && !estado_st) {
      console.warn(`⚠️ [cidades-ibge] Múltiplas cidades encontradas para: ${cidadeNormalizada}`);
      return res.status(400).json({ 
        error: 'Múltiplas cidades encontradas. Informe o estado_st para desambiguar.',
        cidades: result.recordset
      });
    }
    
    const cidade = result.recordset[0];
    console.log(`✅ [cidades-ibge] Encontrado: ${cidade.cidade_st}/${cidade.estado_st} - ibgeCode: ${cidade.ibgeCode}`);
    
    res.status(200).json({
      success: true,
      ibgeCode: cidade.ibgeCode,
      cidade_st: cidade.cidade_st,
      estado_st: cidade.estado_st
    });

  } catch (error) {
    console.error('❌ [cidades-ibge] Erro ao buscar código IBGE:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

