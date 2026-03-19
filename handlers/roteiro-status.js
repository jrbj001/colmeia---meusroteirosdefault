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
    
    console.log('🔍 API roteiro-status - Buscando PK:', pk);
    
    // Buscar status do roteiro específico
    // A coluna PK pode ter nomes diferentes: planoMidiaGrupo_pk, PlanoMidiaGrupo_pk, pk
    let result;
    try {
      // Tentar primeiro com planoMidiaGrupo_pk (nome mais provável)
      result = await pool.request()
        .input('pk', pk)
        .query(`
          SELECT 
            planoMidiaGrupo_pk as pk,
            planoMidiaGrupo_st,
            inProgress_bl,
            inProgress_st,
            date_dh,
            active_bl,
            delete_bl
          FROM serv_product_be180.planoMidiaGrupo_dm_vw
          WHERE planoMidiaGrupo_pk = @pk
        `);
    } catch (sqlError) {
      console.error('❌ Erro com planoMidiaGrupo_pk:', sqlError.message);
      
      try {
        // Se falhar, tentar sem o campo date_dh
        result = await pool.request()
          .input('pk', pk)
          .query(`
            SELECT 
              planoMidiaGrupo_pk as pk,
              planoMidiaGrupo_st,
              inProgress_bl,
              inProgress_st,
              active_bl,
              delete_bl
            FROM serv_product_be180.planoMidiaGrupo_dm_vw
            WHERE planoMidiaGrupo_pk = @pk
          `);
      } catch (sqlError2) {
        console.error('❌ Erro mesmo sem date_dh:', sqlError2.message);
        
        // Última tentativa: com PlanoMidiaGrupo_pk (case-sensitive)
        result = await pool.request()
          .input('pk', pk)
          .query(`
            SELECT 
              PlanoMidiaGrupo_pk as pk,
              planoMidiaGrupo_st,
              inProgress_bl,
              inProgress_st,
              active_bl,
              delete_bl
            FROM serv_product_be180.planoMidiaGrupo_dm_vw
            WHERE PlanoMidiaGrupo_pk = @pk
          `);
      }
    }
    
    if (result.recordset && result.recordset.length > 0) {
      const roteiro = result.recordset[0];
      
      console.log('✅ Roteiro encontrado:', {
        pk: roteiro.pk,
        nome: roteiro.planoMidiaGrupo_st,
        inProgress_bl: roteiro.inProgress_bl,
        date_dh: roteiro.date_dh
      });
      
      // Verificar se os dados realmente foram processados pelo Databricks
      // Apenas considerar "completo" se inProgress_bl = false E existem dados nas views
      let dadosProcessados = false;
      
      if (roteiro.inProgress_bl === 0) {
        console.log('🔍 inProgress_bl = false. Verificando se dados foram realmente processados...');
        
        try {
          // ✅ Verificar APENAS a view que EXISTE e FUNCIONA
          const checkViasPublicas = await pool.request()
            .input('pk', pk)
            .query(`
              SELECT COUNT(*) as total
              FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw]
              WHERE report_pk = @pk
            `);
          
          const totalViasPublicas = checkViasPublicas.recordset[0]?.total || 0;
          
          console.log('📊 Verificação de dados processados:');
          console.log('   - Vias Públicas:', totalViasPublicas, 'registros');
          
          // ✅ Dados processados se tiver pelo menos 1 registro
          dadosProcessados = totalViasPublicas > 0;
          
          if (!dadosProcessados) {
            console.log('⚠️ inProgress_bl = false, mas ainda não há dados. Databricks ainda processando...');
          } else {
            console.log('✅ Dados processados encontrados! Databricks terminou.');
          }
        } catch (checkError) {
          console.error('❌ Erro ao verificar dados processados:', checkError.message);
          // Se der erro na verificação, considerar como ainda processando
          dadosProcessados = false;
        }
      }
      
      // Usar data atual se date_dh não existir
      const dataCriacao = roteiro.date_dh || new Date().toISOString();
      
      // inProgress será true se:
      // - inProgress_bl = 1 (ainda submetendo) OU
      // - inProgress_bl = 0 MAS ainda não tem dados (Databricks ainda processando)
      const isStillProcessing = (roteiro.inProgress_bl === 1) || (!dadosProcessados);
      
      res.json({
        success: true,
        data: {
          pk: roteiro.pk,
          nome: roteiro.planoMidiaGrupo_st,
          inProgress: isStillProcessing,
          status: isStillProcessing ? 'processing' : 'completed',
          dataCriacao: dataCriacao,
          ativo: roteiro.active_bl === 1,
          deletado: roteiro.delete_bl === 1,
          dadosProcessados: dadosProcessados
        }
      });
    } else {
      console.log('⚠️ Roteiro não encontrado para PK:', pk);
      res.status(404).json({
        success: false,
        error: 'Roteiro não encontrado'
      });
    }
    
  } catch (err) {
    console.error('❌ Erro na API /api/roteiro-status:', err);
    console.error('Detalhes do erro:', err.message);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
};
