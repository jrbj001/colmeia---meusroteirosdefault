const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    // 1. Buscar todos os usuários (sem exibir senhas)
    const usuariosResult = await pool.request().query(`
      SELECT 
        pk,
        pk2,
        nome_st,
        email_st,
        telefone_st,
        empresa_pk,
        ativo_bl,
        date_dh,
        date_dt,
        CASE WHEN senha_st IS NULL THEN 0 ELSE 1 END as tem_senha
      FROM [serv_product_be180].[usuario_dm]
      ORDER BY pk
    `);

    // 2. Ver estrutura da view usuario_dm_vw
    const viewUsuarioResult = await pool.request().query(`
      SELECT TOP 5 *
      FROM [serv_product_be180].[usuario_dm_vw]
    `);

    // 3. Ver estrutura da view planoMidiaDescUsuario_dm_vw
    const viewPlanoMidiaResult = await pool.request().query(`
      SELECT TOP 5 *
      FROM [serv_product_be180].[planoMidiaDescUsuario_dm_vw]
    `);

    // 4. Verificar se existe tabela de empresa
    const empresaResult = await pool.request().query(`
      SELECT 
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME LIKE '%empresa%'
    `);

    // 5. Se existe tabela empresa, buscar dados
    let empresasData = [];
    if (empresaResult.recordset.length > 0) {
      const tabelaEmpresa = empresaResult.recordset[0].TABLE_NAME;
      const empresas = await pool.request().query(`
        SELECT TOP 10 *
        FROM [serv_product_be180].[${tabelaEmpresa}]
      `);
      empresasData = empresas.recordset;
    }

    // 6. Verificar se existe alguma tabela de perfil ou role
    const perfilResult = await pool.request().query(`
      SELECT 
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND (TABLE_NAME LIKE '%perfil%' OR TABLE_NAME LIKE '%role%' OR TABLE_NAME LIKE '%permiss%')
    `);

    res.status(200).json({
      usuarios: usuariosResult.recordset,
      view_usuario: {
        colunas: viewUsuarioResult.recordset.length > 0 ? Object.keys(viewUsuarioResult.recordset[0]) : [],
        amostra: viewUsuarioResult.recordset
      },
      view_plano_midia_usuario: {
        colunas: viewPlanoMidiaResult.recordset.length > 0 ? Object.keys(viewPlanoMidiaResult.recordset[0]) : [],
        amostra: viewPlanoMidiaResult.recordset
      },
      tabelas_empresa: empresaResult.recordset.map(t => t.TABLE_NAME),
      empresas_amostra: empresasData,
      tabelas_perfil: perfilResult.recordset.map(t => t.TABLE_NAME),
      analise: {
        total_usuarios: usuariosResult.recordset.length,
        usuarios_ativos: usuariosResult.recordset.filter(u => u.ativo_bl === 1).length,
        usuarios_com_empresa: usuariosResult.recordset.filter(u => u.empresa_pk !== null).length,
        usuarios_com_senha: usuariosResult.recordset.filter(u => u.tem_senha === 1).length,
        tem_tabela_empresa: empresaResult.recordset.length > 0,
        tem_tabela_perfil: perfilResult.recordset.length > 0
      }
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes dos usuários:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar detalhes dos usuários',
      detalhes: error.message 
    });
  }
};
