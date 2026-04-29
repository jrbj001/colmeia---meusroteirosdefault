/**
 * Migrations para Gestão de Exibidores:
 *   1. Cria exibidor_dominio_dm (1:N com exibidor_dm)
 *   2. Migra dominio_st existente (em exibidor_dm) para exibidor_dominio_dm
 *   3. Adiciona exibidor_dm.sandbox_bl (PixlPulseLab e similares ficam invisíveis em produção)
 *   4. Adiciona bancoAtivosJoin_ft.exibidor_fk (link soft com exibidor_dm)
 *   5. Marca PixlPulseLab como sandbox
 *
 * Idempotente. Uso: node scripts/apply-exibidor-gestao-migrations.js
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: { encrypt: true, trustServerCertificate: true, connectTimeout: 60000, requestTimeout: 60000 },
};

async function step(label, fn) {
  process.stdout.write(`  ${label}... `);
  try {
    const r = await fn();
    console.log(r === false ? '⏭️  já aplicado' : '✅');
  } catch (err) {
    console.log('❌');
    throw err;
  }
}

async function colExists(pool, schema, table, column) {
  const r = await pool.request()
    .input('s', sql.VarChar, schema)
    .input('t', sql.VarChar, table)
    .input('c', sql.VarChar, column)
    .query(`SELECT 1 AS x FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@s AND TABLE_NAME=@t AND COLUMN_NAME=@c`);
  return r.recordset.length > 0;
}

async function objExists(pool, fullName, type) {
  const r = await pool.request().query(`SELECT OBJECT_ID(N'${fullName}', N'${type}') AS oid`);
  return !!r.recordset[0]?.oid;
}

async function main() {
  if (!config.server || !config.database || !config.user || !config.password) {
    console.error('❌ Defina DB_SERVER, DB_DATABASE, DB_USER e DB_PASSWORD no .env');
    process.exit(1);
  }
  console.log(`\n🔌 Conectando: ${config.server} / ${config.database}\n`);
  const pool = await sql.connect(config);

  // 1. Tabela exibidor_dominio_dm
  await step('Criando exibidor_dominio_dm (1:N)', async () => {
    const exists = await objExists(pool, '[serv_product_be180].[exibidor_dominio_dm]', 'U');
    if (exists) return false;
    await pool.request().query(`
      CREATE TABLE [serv_product_be180].[exibidor_dominio_dm] (
        [dominio_pk]         INT IDENTITY(1,1) NOT NULL,
        [exibidor_fk]        INT NOT NULL,
        [dominio_st]         NVARCHAR(150) NOT NULL,
        [primario_bl]        BIT NOT NULL CONSTRAINT [DF_exib_dominio_primario] DEFAULT (0),
        [active_bl]          BIT NOT NULL CONSTRAINT [DF_exib_dominio_active] DEFAULT (1),
        [delete_bl]          BIT NOT NULL CONSTRAINT [DF_exib_dominio_delete] DEFAULT (0),
        [dataCriacao_dh]     DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_dominio_criacao] DEFAULT (SYSDATETIME()),
        [dataAtualizacao_dh] DATETIME2(0) NULL,
        CONSTRAINT [PK_exibidor_dominio_dm] PRIMARY KEY CLUSTERED ([dominio_pk]),
        CONSTRAINT [FK_exibidor_dominio_exibidor] FOREIGN KEY ([exibidor_fk]) REFERENCES [serv_product_be180].[exibidor_dm]([exibidor_pk])
      );
      CREATE UNIQUE NONCLUSTERED INDEX [UX_exibidor_dominio_dominio]
        ON [serv_product_be180].[exibidor_dominio_dm] ([dominio_st])
        WHERE [delete_bl] = 0 AND [active_bl] = 1;
      CREATE NONCLUSTERED INDEX [IX_exibidor_dominio_exibidor]
        ON [serv_product_be180].[exibidor_dominio_dm] ([exibidor_fk]) WHERE [delete_bl] = 0;
    `);
  });

  // 2. Migrar exibidor_dm.dominio_st para exibidor_dominio_dm
  await step('Migrando domínios existentes para exibidor_dominio_dm', async () => {
    const r = await pool.request().query(`
      INSERT INTO [serv_product_be180].[exibidor_dominio_dm] (exibidor_fk, dominio_st, primario_bl, active_bl, delete_bl)
      SELECT e.exibidor_pk, LOWER(LTRIM(RTRIM(e.dominio_st))), 1, 1, 0
      FROM [serv_product_be180].[exibidor_dm] e
      WHERE e.delete_bl = 0
        AND e.dominio_st IS NOT NULL
        AND LTRIM(RTRIM(e.dominio_st)) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM [serv_product_be180].[exibidor_dominio_dm] d
          WHERE d.exibidor_fk = e.exibidor_pk
            AND LOWER(d.dominio_st) = LOWER(LTRIM(RTRIM(e.dominio_st)))
        );
      SELECT @@ROWCOUNT AS inseridos
    `);
    const inseridos = r.recordset[0]?.inseridos || 0;
    process.stdout.write(`(${inseridos} migrados) `);
  });

  // 3. exibidor_dm.sandbox_bl
  await step('Adicionando exibidor_dm.sandbox_bl', async () => {
    const exists = await colExists(pool, 'serv_product_be180', 'exibidor_dm', 'sandbox_bl');
    if (exists) return false;
    await pool.request().query(`
      ALTER TABLE [serv_product_be180].[exibidor_dm]
        ADD [sandbox_bl] BIT NOT NULL CONSTRAINT [DF_exibidor_sandbox] DEFAULT (0)
    `);
  });

  // 4. bancoAtivosJoin_ft.exibidor_fk
  await step('Adicionando bancoAtivosJoin_ft.exibidor_fk', async () => {
    const exists = await colExists(pool, 'serv_product_be180', 'bancoAtivosJoin_ft', 'exibidor_fk');
    if (exists) return false;
    await pool.request().query(`
      ALTER TABLE [serv_product_be180].[bancoAtivosJoin_ft] ADD [exibidor_fk] INT NULL
    `);
    await pool.request().query(`
      CREATE NONCLUSTERED INDEX [IX_bancoAtivos_exibidor_fk]
        ON [serv_product_be180].[bancoAtivosJoin_ft] ([exibidor_fk])
        WHERE [exibidor_fk] IS NOT NULL
    `);
  });

  // 5. Marcar PixlPulseLab como sandbox
  await step('Marcando PixlPulseLab como sandbox', async () => {
    const r = await pool.request().query(`
      UPDATE [serv_product_be180].[exibidor_dm]
      SET sandbox_bl = 1
      WHERE LOWER(nome_st) = 'pixlpulselab' AND sandbox_bl = 0;
      SELECT @@ROWCOUNT AS marcados
    `);
    process.stdout.write(`(${r.recordset[0]?.marcados || 0} marcado) `);
  });

  // ── Verificação final ─────────────────────────────────────────────────────
  console.log('\n=== Estado final ===');
  const exib = await pool.request().query(`
    SELECT
      e.exibidor_pk, e.nome_st, e.sandbox_bl,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_dominio_dm] d
        WHERE d.exibidor_fk = e.exibidor_pk AND d.delete_bl = 0) AS qtd_dominios
    FROM [serv_product_be180].[exibidor_dm] e
    WHERE e.delete_bl = 0
    ORDER BY e.exibidor_pk
  `);
  exib.recordset.forEach(r =>
    console.log(`  exibidor_pk=${r.exibidor_pk} | ${r.nome_st} | sandbox=${r.sandbox_bl ? 'SIM' : 'NÃO'} | domínios: ${r.qtd_dominios}`)
  );

  const dominios = await pool.request().query(`
    SELECT d.dominio_pk, d.exibidor_fk, e.nome_st, d.dominio_st, d.primario_bl
    FROM [serv_product_be180].[exibidor_dominio_dm] d
    JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = d.exibidor_fk
    WHERE d.delete_bl = 0
    ORDER BY d.exibidor_fk, d.primario_bl DESC
  `);
  console.log('\n  Domínios cadastrados:');
  dominios.recordset.forEach(r =>
    console.log(`    ${r.dominio_st} → ${r.nome_st} (pk=${r.exibidor_fk})${r.primario_bl ? ' [primário]' : ''}`)
  );

  await pool.close();
  console.log('\n✅ Todas as migrations aplicadas com sucesso!\n');
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message);
  process.exit(1);
});
