const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    // 1. Listar todas as tabelas do banco
    const tabelasResult = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    // 2. Procurar tabelas relacionadas a usuários (case insensitive)
    const tabelasUsuarios = tabelasResult.recordset.filter(t => 
      t.TABLE_NAME.toLowerCase().includes('user') || 
      t.TABLE_NAME.toLowerCase().includes('usuario') ||
      t.TABLE_NAME.toLowerCase().includes('permiss') ||
      t.TABLE_NAME.toLowerCase().includes('perfil') ||
      t.TABLE_NAME.toLowerCase().includes('role')
    );

    // 3. Para cada tabela de usuários encontrada, buscar estrutura
    const estruturasUsuarios = [];
    for (const tabela of tabelasUsuarios) {
      const colunas = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${tabela.TABLE_SCHEMA}'
          AND TABLE_NAME = '${tabela.TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);

      // Contar registros
      const count = await pool.request().query(`
        SELECT COUNT(*) as total 
        FROM [${tabela.TABLE_SCHEMA}].[${tabela.TABLE_NAME}]
      `);

      estruturasUsuarios.push({
        schema: tabela.TABLE_SCHEMA,
        nome: tabela.TABLE_NAME,
        colunas: colunas.recordset,
        total_registros: count.recordset[0].total
      });
    }

    // 4. Procurar views relacionadas a usuários
    const viewsResult = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_NAME LIKE '%user%' 
         OR TABLE_NAME LIKE '%usuario%'
         OR TABLE_NAME LIKE '%permiss%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    // 5. Listar todas as tabelas do schema serv_product_be180
    const tabelasSchema = await pool.request().query(`
      SELECT 
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    res.status(200).json({
      resumo: {
        total_tabelas: tabelasResult.recordset.length,
        tabelas_usuarios_encontradas: tabelasUsuarios.length,
        views_usuarios_encontradas: viewsResult.recordset.length,
        total_tabelas_serv_product: tabelasSchema.recordset.length
      },
      tabelas_relacionadas_usuarios: estruturasUsuarios,
      views_usuarios: viewsResult.recordset,
      todas_tabelas_serv_product: tabelasSchema.recordset.map(t => t.TABLE_NAME),
      sugestao_estrategia: estruturasUsuarios.length > 0 
        ? "EXISTE estrutura de usuários - devemos reaproveitar"
        : "NÃO EXISTE estrutura de usuários - criar do zero"
    });

  } catch (error) {
    console.error('Erro ao investigar banco de dados:', error);
    res.status(500).json({ 
      error: 'Erro ao investigar banco de dados',
      detalhes: error.message 
    });
  }
};
