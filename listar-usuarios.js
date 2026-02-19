require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function listarUsuarios() {
  let pool;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!\n');

    // Listar todos os usuários
    console.log('📋 Listando todos os usuários:\n');
    const result = await pool.request()
      .query(`
        SELECT TOP 20
          u.pk as usuario_pk,
          u.nome_st as usuario_nome,
          u.email_st as usuario_email,
          u.perfil_pk,
          p.nome_st as perfil_nome,
          u.ativo_bl
        FROM [serv_product_be180].[usuario_dm] u
        LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
        ORDER BY u.pk DESC
      `);

    if (result.recordset.length === 0) {
      console.log('Nenhum usuário encontrado.');
    } else {
      console.log(`Total de usuários encontrados: ${result.recordset.length}\n`);
      result.recordset.forEach((usuario, index) => {
        console.log(`${index + 1}. PK: ${usuario.usuario_pk}`);
        console.log(`   Nome: ${usuario.usuario_nome || 'N/A'}`);
        console.log(`   Email: ${usuario.usuario_email || 'N/A'}`);
        console.log(`   Perfil: ${usuario.perfil_nome || 'Nenhum'}`);
        console.log(`   Ativo: ${usuario.ativo_bl ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('   Código:', error.code);
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexão fechada.');
    }
  }
}

listarUsuarios();
