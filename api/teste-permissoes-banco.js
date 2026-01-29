const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Método não permitido. Use POST.' 
    });
  }

  const testTableName = `test_permissions_${Date.now()}`;
  const results = [];

  try {
    const pool = await getPool();
    results.push({ step: 'Conexão', status: '✅ Conectado ao banco' });

    // Teste 1: Verificar permissões do usuário
    try {
      const userInfo = await pool.request().query(`
        SELECT 
          SUSER_NAME() as login_name,
          USER_NAME() as user_name,
          DB_NAME() as database_name
      `);
      results.push({ 
        step: 'Usuário conectado', 
        status: '✅ Sucesso',
        data: userInfo.recordset[0]
      });
    } catch (err) {
      results.push({ 
        step: 'Usuário conectado', 
        status: '❌ Falha',
        error: err.message 
      });
    }

    // Teste 2: Tentar criar uma tabela temporária
    try {
      await pool.request().query(`
        CREATE TABLE serv_product_be180.${testTableName} (
          id INT PRIMARY KEY IDENTITY(1,1),
          test_value VARCHAR(100),
          created_at DATETIME DEFAULT GETDATE()
        )
      `);
      results.push({ 
        step: 'CREATE TABLE', 
        status: '✅ Sucesso - Você TEM permissão para criar tabelas' 
      });
    } catch (err) {
      results.push({ 
        step: 'CREATE TABLE', 
        status: '❌ Falha - Você NÃO tem permissão para criar tabelas',
        error: err.message 
      });
      
      // Se não conseguiu criar, retornar aqui
      return res.json({
        success: false,
        message: 'Usuário não tem permissão para criar tabelas',
        results
      });
    }

    // Teste 3: Tentar inserir dados
    try {
      await pool.request()
        .input('test_value', sql.VarChar(100), 'Teste de permissões')
        .query(`
          INSERT INTO serv_product_be180.${testTableName} (test_value)
          VALUES (@test_value)
        `);
      results.push({ 
        step: 'INSERT', 
        status: '✅ Sucesso - Você pode inserir dados' 
      });
    } catch (err) {
      results.push({ 
        step: 'INSERT', 
        status: '❌ Falha',
        error: err.message 
      });
    }

    // Teste 4: Tentar ler dados
    try {
      const selectResult = await pool.request().query(`
        SELECT * FROM serv_product_be180.${testTableName}
      `);
      results.push({ 
        step: 'SELECT', 
        status: '✅ Sucesso - Você pode ler dados',
        data: selectResult.recordset 
      });
    } catch (err) {
      results.push({ 
        step: 'SELECT', 
        status: '❌ Falha',
        error: err.message 
      });
    }

    // Teste 5: Tentar deletar a tabela (cleanup)
    try {
      await pool.request().query(`
        DROP TABLE serv_product_be180.${testTableName}
      `);
      results.push({ 
        step: 'DROP TABLE (cleanup)', 
        status: '✅ Sucesso - Tabela de teste removida' 
      });
    } catch (err) {
      results.push({ 
        step: 'DROP TABLE (cleanup)', 
        status: '⚠️ Aviso - Não foi possível remover a tabela de teste',
        error: err.message,
        note: `Remova manualmente: DROP TABLE serv_product_be180.${testTableName}`
      });
    }

    // Teste 6: Verificar permissões detalhadas
    try {
      const permissions = await pool.request().query(`
        SELECT 
          SCHEMA_NAME() as schema_name,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'ALTER') as can_alter_schema,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'CREATE TABLE') as can_create_table,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'INSERT') as can_insert,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'SELECT') as can_select,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'UPDATE') as can_update,
          HAS_PERMS_BY_NAME('serv_product_be180', 'SCHEMA', 'DELETE') as can_delete
      `);
      results.push({ 
        step: 'Permissões detalhadas', 
        status: '✅ Informações obtidas',
        data: permissions.recordset[0]
      });
    } catch (err) {
      results.push({ 
        step: 'Permissões detalhadas', 
        status: '⚠️ Não foi possível verificar permissões detalhadas',
        error: err.message 
      });
    }

    return res.json({
      success: true,
      message: 'Teste de permissões concluído',
      results,
      summary: {
        can_create_tables: results.some(r => r.step === 'CREATE TABLE' && r.status.includes('✅')),
        can_insert: results.some(r => r.step === 'INSERT' && r.status.includes('✅')),
        can_select: results.some(r => r.step === 'SELECT' && r.status.includes('✅')),
        can_drop: results.some(r => r.step === 'DROP TABLE (cleanup)' && r.status.includes('✅'))
      }
    });

  } catch (error) {
    console.error('❌ Erro geral no teste de permissões:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao testar permissões',
      error: error.message,
      results
    });
  }
};
