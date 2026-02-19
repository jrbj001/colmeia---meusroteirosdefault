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

async function configurarAdmin() {
  let pool;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!\n');

    const email = 'jrbj001@gmail.com';
    
    // Verificar se o usuário existe
    console.log(`🔍 Verificando usuário: ${email}`);
    const resultVerifica = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT 
          u.pk as usuario_pk,
          u.nome_st as usuario_nome,
          u.email_st as usuario_email,
          u.perfil_pk,
          p.nome_st as perfil_nome
        FROM [serv_product_be180].[usuario_dm] u
        LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
        WHERE u.email_st = @email
      `);

    if (resultVerifica.recordset.length === 0) {
      console.log('❌ Usuário não encontrado. Criando novo usuário...');
      
      // Criar novo usuário
      await pool.request()
        .input('email', sql.VarChar, email)
        .input('nome', sql.VarChar, 'João Roberto')
        .input('perfil_pk', sql.Int, 1) // Admin
        .query(`
          INSERT INTO [serv_product_be180].[usuario_dm] (email_st, nome_st, perfil_pk, ativo_bl)
          VALUES (@email, @nome, @perfil_pk, 1)
        `);
      
      console.log('✅ Usuário criado com sucesso como Admin!\n');
    } else {
      const usuario = resultVerifica.recordset[0];
      console.log(`📋 Usuário encontrado:`);
      console.log(`   - PK: ${usuario.usuario_pk}`);
      console.log(`   - Nome: ${usuario.usuario_nome}`);
      console.log(`   - Email: ${usuario.usuario_email}`);
      console.log(`   - Perfil atual: ${usuario.perfil_nome || 'Nenhum'}\n`);

      if (usuario.perfil_pk === 1) {
        console.log('✅ Usuário já é Admin! Nada a fazer.\n');
      } else {
        // Atualizar para Admin
        console.log('🔄 Atualizando usuário para Admin...');
        await pool.request()
          .input('email', sql.VarChar, email)
          .input('perfil_pk', sql.Int, 1) // Admin
          .query(`
            UPDATE [serv_product_be180].[usuario_dm]
            SET perfil_pk = @perfil_pk,
                ativo_bl = 1
            WHERE email_st = @email
          `);
        
        console.log('✅ Usuário atualizado para Admin com sucesso!\n');
      }
    }

    // Verificar resultado final
    console.log('📊 Verificando configuração final...');
    const resultFinal = await pool.request()
      .input('email', sql.VarChar, email)
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

configurarAdmin();
