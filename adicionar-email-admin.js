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

async function adicionarEmailAdmin() {
  let pool;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!\n');

    const novoEmail = 'jrbj001@gmail.com';
    const novoNome = 'João Roberto';
    
    // Primeiro, verificar se o email já existe
    console.log(`🔍 Verificando se o email ${novoEmail} já existe...`);
    const checkEmail = await pool.request()
      .input('email', sql.VarChar, novoEmail)
      .query(`
        SELECT pk, nome_st, email_st, perfil_pk
        FROM [serv_product_be180].[usuario_dm]
        WHERE email_st = @email
      `);

    if (checkEmail.recordset.length > 0) {
      const usuario = checkEmail.recordset[0];
      console.log(`✅ Email já cadastrado!`);
      console.log(`   - PK: ${usuario.pk}`);
      console.log(`   - Nome: ${usuario.nome_st}`);
      console.log(`   - Email: ${usuario.email_st}`);
      console.log(`   - Perfil PK: ${usuario.perfil_pk}\n`);
      
      // Garantir que é Admin
      if (usuario.perfil_pk !== 1) {
        console.log('🔄 Atualizando para perfil Admin...');
        await pool.request()
          .input('pk', sql.Int, usuario.pk)
          .query(`
            UPDATE [serv_product_be180].[usuario_dm]
            SET perfil_pk = 1, ativo_bl = 1
            WHERE pk = @pk
          `);
        console.log('✅ Perfil atualizado para Admin!');
      } else {
        console.log('✅ Usuário já é Admin!');
      }
      return;
    }

    // Buscar um usuário sem email para atualizar
    console.log('🔍 Buscando usuário sem email para atualizar...\n');
    const userSemEmail = await pool.request()
      .query(`
        SELECT TOP 1 pk, nome_st
        FROM [serv_product_be180].[usuario_dm]
        WHERE email_st IS NULL OR email_st = ''
        ORDER BY pk
      `);

    if (userSemEmail.recordset.length > 0) {
      const usuario = userSemEmail.recordset[0];
      console.log(`📝 Encontrado usuário PK ${usuario.pk} (${usuario.nome_st}) sem email.`);
      console.log(`🔄 Atualizando com novo email e perfil Admin...\n`);
      
      await pool.request()
        .input('pk', sql.Int, usuario.pk)
        .input('email', sql.VarChar, novoEmail)
        .input('nome', sql.VarChar, novoNome)
        .query(`
          UPDATE [serv_product_be180].[usuario_dm]
          SET email_st = @email,
              nome_st = @nome,
              perfil_pk = 1,
              ativo_bl = 1
          WHERE pk = @pk
        `);
      
      console.log('✅ Usuário atualizado com sucesso!\n');
    } else {
      console.log('❌ Não há usuários sem email disponíveis.');
      console.log('   Você precisará manualmente adicionar o registro no banco.\n');
      return;
    }

    // Verificar resultado final
    console.log('📊 Verificando configuração final...');
    const resultFinal = await pool.request()
      .input('email', sql.VarChar, novoEmail)
      .query(`
        SELECT 
          u.pk as usuario_pk,
          u.nome_st as usuario_nome,
          u.email_st as usuario_email,
          p.nome_st as perfil_nome,
          COUNT(pp.perfilPermissao_pk) as total_permissoes
        FROM [serv_product_be180].[usuario_dm] u
        INNER JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
        LEFT JOIN [serv_product_be180].[perfil_permissao_ft] pp ON p.perfil_pk = pp.perfil_pk
        WHERE u.email_st = @email
        GROUP BY u.pk, u.nome_st, u.email_st, p.nome_st
      `);

    if (resultFinal.recordset.length > 0) {
      const usuario = resultFinal.recordset[0];
      console.log('✅ Configuração final:');
      console.log(`   - PK: ${usuario.usuario_pk}`);
      console.log(`   - Nome: ${usuario.usuario_nome}`);
      console.log(`   - Email: ${usuario.usuario_email}`);
      console.log(`   - Perfil: ${usuario.perfil_nome}`);
      console.log(`   - Total de permissões: ${usuario.total_permissoes}\n`);
      console.log('🎉 Configuração concluída com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('   Código:', error.code);
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexão fechada.');
    }
  }
}

adicionarEmailAdmin();
