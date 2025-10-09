const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: '35.247.196.233',
    port: 5432,
    database: 'colmeia_dev',
    user: 'readonly_user',
    password: '_e2Jy9r9kOo(',
    ssl: { rejectUnauthorized: false }, // Tentando com SSL
    connectionTimeoutMillis: 20000,
  });

  console.log('🔄 Tentando conectar ao PostgreSQL...');
  console.log('Host: 35.247.196.233:5432');
  console.log('Database: colmeia_dev');
  console.log('User: readonly_user');
  console.log('');

  try {
    await client.connect();
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log('');

    // Testar uma query simples
    console.log('🔍 Testando query básica...');
    const result = await client.query('SELECT version()');
    console.log('✅ Query executada com sucesso!');
    console.log('Versão do PostgreSQL:', result.rows[0].version);
    console.log('');

    // Listar tabelas
    console.log('📋 Listando tabelas do banco...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 20
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`✅ Encontradas ${tablesResult.rows.length} tabelas (mostrando primeiras 20):`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela encontrada no schema public');
    }

    await client.end();
    console.log('');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ ERRO NA CONEXÃO:');
    console.error('');
    console.error('Tipo do erro:', error.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código:', error.code);
    }
    
    console.error('');
    console.error('💡 Possíveis causas:');
    console.error('  1. Firewall bloqueando a conexão');
    console.error('  2. IP não autorizado no servidor PostgreSQL');
    console.error('  3. Credenciais incorretas');
    console.error('  4. Servidor não está acessível');
    console.error('  5. Necessário usar SSL');
    
    process.exit(1);
  }
}

testConnection();

