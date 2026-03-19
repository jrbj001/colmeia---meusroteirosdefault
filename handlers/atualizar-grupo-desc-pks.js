const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const { planoMidiaGrupo_pk, planoMidiaDescPks } = req.body;
    
    if (!planoMidiaGrupo_pk || !Array.isArray(planoMidiaDescPks) || planoMidiaDescPks.length === 0) {
      return res.status(400).json({ 
        error: 'planoMidiaGrupo_pk e planoMidiaDescPks (array) são obrigatórios' 
      });
    }
    
    console.log(`\n🔧 [atualizar-grupo-desc-pks] Atualizando grupo ${planoMidiaGrupo_pk}...`);
    console.log(`📊 PKs para adicionar: ${planoMidiaDescPks.join(', ')}`);
    
    const pool = await getPool();
    
    // Concatena todos os PKs em uma string separada por vírgulas
    const pksString = planoMidiaDescPks.join(',');
    
    console.log(`📝 String de PKs: ${pksString}`);
    
    // Atualiza o grupo usando uma SP (para evitar problemas de permissão)
    console.log(`🚀 Executando sp_planoMidiaGrupoUpdateDescPks...`);
    
    // Tentar usar a SP se existir, senão criar inline
    try {
      await pool.request()
        .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
        .input('planoMidiaDescPk_st', pksString)
        .execute('[serv_product_be180].[sp_planoMidiaGrupoUpdateDescPks]');
      
      console.log(`✅ Grupo ${planoMidiaGrupo_pk} atualizado via SP!`);
    } catch (spError) {
      console.error('⚠️ SP não encontrada, tentando UPDATE direto...');
      
      await pool.request()
        .input('pksString', pksString)
        .input('grupoPk', planoMidiaGrupo_pk)
        .query(`
          UPDATE serv_product_be180.planoMidiaGrupo_dm
          SET planoMidiaDescPk_st = @pksString
          WHERE pk = @grupoPk
        `);
      
      console.log(`✅ Grupo ${planoMidiaGrupo_pk} atualizado com UPDATE direto!`);
    }
    
    const result = await pool.request()
      .input('grupoPk', planoMidiaGrupo_pk)
      .query(`
        SELECT pk, planoMidiaDescPk_st
        FROM serv_product_be180.planoMidiaGrupo_dm
        WHERE pk = @grupoPk
      `);
    
    if (result.recordset.length > 0) {
      console.log(`📊 Valor atualizado: ${result.recordset[0].planoMidiaDescPk_st}`);
    }
    
    res.json({ 
      success: true,
      planoMidiaGrupo_pk,
      planoMidiaDescPk_st: pksString,
      confirmacao: result.recordset[0]
    });
    
  } catch (err) {
    console.error('❌ Erro na API /api/atualizar-grupo-desc-pks:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message 
    });
  }
};

