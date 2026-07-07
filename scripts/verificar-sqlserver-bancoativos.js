/**
 * Script de verificação: tabelas do Banco de Ativos no SQL Server
 * Uso: node scripts/verificar-sqlserver-bancoativos.js
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 60000,
  },
};

async function run() {
  console.log(`\n🔌 Conectando ao SQL Server...`);
  console.log(`   Server: ${config.server}`);
  console.log(`   DB:     ${config.database}\n`);

  const pool = await sql.connect(config);

  // 1. Listar schemas disponíveis
  console.log('📂 SCHEMAS disponíveis:');
  const schemas = await pool.request().query(`
    SELECT DISTINCT TABLE_SCHEMA, COUNT(*) AS total_tabelas
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    GROUP BY TABLE_SCHEMA
    ORDER BY total_tabelas DESC
  `);
  schemas.recordset.forEach(r => console.log(`   ${r.TABLE_SCHEMA} (${r.total_tabelas} tabelas)`));

  // 2. Buscar tabelas relacionadas a banco de ativos
  const KEYWORDS = ['media', 'point', 'exhib', 'city', 'cities', 'state', 'type', 'passante', 'ativo'];
  console.log('\n🔍 TABELAS relacionadas a banco de ativos:');
  const tables = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);

  const relevant = tables.recordset.filter(t =>
    KEYWORDS.some(k => t.TABLE_NAME.toLowerCase().includes(k))
  );

  if (relevant.length === 0) {
    console.log('   ⚠️  Nenhuma tabela com nomes similares encontrada.');
    console.log('\n   Listando TODAS as tabelas:');
    tables.recordset.forEach(t => console.log(`   ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`));
  } else {
    relevant.forEach(t => console.log(`   ✅ ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`));
  }

  // 3. Verificar colunas das tabelas encontradas
  for (const t of relevant) {
    const fqn = `[${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`;
    try {
      const cols = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${t.TABLE_SCHEMA}' AND TABLE_NAME = '${t.TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);
      console.log(`\n   📋 ${fqn} (${cols.recordset.length} colunas):`);
      cols.recordset.forEach(c => console.log(`      ${c.COLUMN_NAME} [${c.DATA_TYPE}]`));

      // Contar linhas
      const cnt = await pool.request().query(`SELECT COUNT(*) AS total FROM ${fqn}`);
      console.log(`      → ${cnt.recordset[0].total.toLocaleString()} registros`);
    } catch (e) {
      console.log(`   ⚠️  Erro ao inspecionar ${fqn}: ${e.message}`);
    }
  }

  // 4. Verificar especificamente media_types.environment
  const mediaTypesTable = relevant.find(t => t.TABLE_NAME.toLowerCase().includes('type'));
  if (mediaTypesTable) {
    const fqn = `[${mediaTypesTable.TABLE_SCHEMA}].[${mediaTypesTable.TABLE_NAME}]`;
    try {
      console.log(`\n🏷️  Valores em ${fqn}.environment:`);
      const envVals = await pool.request().query(`
        SELECT environment, COUNT(*) AS total
        FROM ${fqn}
        WHERE environment IS NOT NULL
        GROUP BY environment
        ORDER BY total DESC
      `);
      if (envVals.recordset.length === 0) {
        console.log('   ⚠️  Coluna environment sem dados ou não existe');
      } else {
        envVals.recordset.forEach(r => console.log(`   "${r.environment}" → ${r.total}`));
      }
    } catch (e) {
      console.log(`   ⚠️  Coluna environment: ${e.message}`);
    }
  }

  // 5. Sample da tabela principal (media_points ou similar)
  const pointsTable = relevant.find(t =>
    t.TABLE_NAME.toLowerCase().includes('point') || t.TABLE_NAME.toLowerCase().includes('media_point')
  );
  if (pointsTable) {
    const fqn = `[${pointsTable.TABLE_SCHEMA}].[${pointsTable.TABLE_NAME}]`;
    try {
      console.log(`\n🗺️  Sample de ${fqn} (3 linhas):`);
      const sample = await pool.request().query(`SELECT TOP 3 * FROM ${fqn}`);
      console.log(JSON.stringify(sample.recordset, null, 2));
    } catch (e) {
      console.log(`   ⚠️  Erro no sample: ${e.message}`);
    }
  }

  await pool.close();
  console.log('\n✅ Verificação concluída.\n');
}

run().catch(e => {
  console.error('❌ Erro fatal:', e.message);
  process.exit(1);
});
