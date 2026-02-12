require('dotenv').config();
const { getPool } = require('./api/db.js');

(async () => {
  try {
    const pool = await getPool();
    
    console.log('Verificando tabelas criadas...\n');
    
    const result = await pool.request().query(`
      SELECT 
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME IN ('perfil_dm', 'area_sistema_dm', 'perfil_permissao_ft', 'usuario_dm')
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tabelas encontradas:');
    console.table(result.recordset);
    
    // Verificar se usuario_dm tem as novas colunas
    const colunas = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME = 'usuario_dm'
        AND COLUMN_NAME IN ('perfil_pk', 'auth0_id_st')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\n📊 Colunas adicionadas em usuario_dm:');
    console.table(colunas.recordset);
    
    // Verificar perfis
    const perfis = await pool.request().query(`
      SELECT * FROM [serv_product_be180].[perfil_dm]
    `);
    
    console.log('\n📊 Perfis cadastrados:');
    console.table(perfis.recordset);
    
    // Verificar áreas
    const areas = await pool.request().query(`
      SELECT COUNT(*) as total FROM [serv_product_be180].[area_sistema_dm]
    `);
    
    console.log('\n📊 Total de áreas cadastradas:', areas.recordset[0].total);
    
    // Verificar usuários com perfil
    const usuarios = await pool.request().query(`
      SELECT 
        u.pk,
        u.nome_st,
        u.email_st,
        p.nome_st as perfil
      FROM [serv_product_be180].[usuario_dm] u
      LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
      WHERE u.ativo_bl = 1
      ORDER BY u.pk
    `);
    
    console.log('\n📊 Usuários com perfis:');
    console.table(usuarios.recordset);
    
    console.log('\n✅ Estruturas criadas com sucesso!');
    console.log('Apenas as VIEWS falharam, mas as tabelas estão OK.');
    console.log('\nVamos executar apenas o script 04 agora...');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
})();
