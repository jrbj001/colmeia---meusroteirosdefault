/**
 * Aplica as migrations pendentes para suporte a exibidor:
 *  1. Adiciona dominio_st em exibidor_dm
 *  2. Adiciona exibidor_fk em usuario_dm
 *  3. Recria usuario_completo_vw com exibidor_fk
 *  4. Cria perfil "Exibidor" se não existir
 *  5. Seed do exibidor de teste (PixlPulseLab) com domínio pixlpulselab.dev
 *
 * Uso: node scripts/apply-exibidor-migrations.js
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

async function run(pool, label, sql_str) {
  process.stdout.write(`  ${label}... `);
  await pool.request().query(sql_str);
  console.log('✅');
}

async function main() {
  if (!config.server || !config.database || !config.user || !config.password) {
    console.error('❌ Defina DB_SERVER, DB_DATABASE, DB_USER e DB_PASSWORD no .env');
    process.exit(1);
  }

  console.log(`\n🔌 Conectando: ${config.server} / ${config.database}\n`);
  const pool = await sql.connect(config);

  // ── 1. dominio_st em exibidor_dm ────────────────────────────────────────────
  const hasDominio = await pool.request().query(`
    SELECT 1 AS existe FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[serv_product_be180].[exibidor_dm]') AND name = 'dominio_st'
  `);
  if (!hasDominio.recordset.length) {
    await run(pool, 'Adicionando dominio_st em exibidor_dm', `
      ALTER TABLE [serv_product_be180].[exibidor_dm]
        ADD [dominio_st] NVARCHAR(150) NULL
    `);
    await run(pool, 'Criando índice único por domínio', `
      CREATE UNIQUE NONCLUSTERED INDEX [UX_exibidor_dm_dominio]
        ON [serv_product_be180].[exibidor_dm] ([dominio_st])
        WHERE [delete_bl] = 0 AND [dominio_st] IS NOT NULL
    `);
  } else {
    console.log('  dominio_st já existe em exibidor_dm ✅');
  }

  // ── 2. exibidor_fk em usuario_dm ────────────────────────────────────────────
  const hasExibFk = await pool.request().query(`
    SELECT 1 AS existe FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'exibidor_fk'
  `);
  if (!hasExibFk.recordset.length) {
    await run(pool, 'Adicionando exibidor_fk em usuario_dm', `
      ALTER TABLE [serv_product_be180].[usuario_dm]
        ADD [exibidor_fk] INT NULL
    `);
  } else {
    console.log('  exibidor_fk já existe em usuario_dm ✅');
  }

  // ── 3. Recriar usuario_completo_vw com exibidor_fk ──────────────────────────
  await run(pool, 'Recriando usuario_completo_vw', `
    ALTER VIEW [serv_product_be180].[usuario_completo_vw]
    AS
    SELECT
      u.pk              AS usuario_pk,
      u.pk2             AS usuario_pk2,
      u.nome_st         AS usuario_nome,
      u.email_st        AS usuario_email,
      u.telefone_st     AS usuario_telefone,
      u.empresa_pk,
      u.exibidor_fk,
      u.auth0_id_st,
      u.ativo_bl        AS usuario_ativo,
      u.date_dh         AS usuario_data_criacao,
      u.date_dt         AS usuario_data,
      p.perfil_pk,
      p.nome_st         AS perfil_nome,
      p.descricao_st    AS perfil_descricao,
      p.ativo_bl        AS perfil_ativo,
      e.nome_st         AS exibidor_nome,
      e.nome_fantasia_st AS exibidor_nome_fantasia,
      e.dominio_st      AS exibidor_dominio
    FROM [serv_product_be180].[usuario_dm] u
    LEFT JOIN [serv_product_be180].[perfil_dm]  p ON p.perfil_pk  = u.perfil_pk
    LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk AND e.delete_bl = 0
  `);

  // ── 4. Perfil "Exibidor" ─────────────────────────────────────────────────────
  const perfilExist = await pool.request().query(`
    SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
    WHERE LOWER(nome_st) LIKE '%exibidor%'
  `);
  let perfilPk;
  if (!perfilExist.recordset.length) {
    const ins = await pool.request().query(`
      INSERT INTO [serv_product_be180].[perfil_dm] (nome_st, descricao_st, ativo_bl, dataCriacao_dh, dataAtualizacao_dh)
      OUTPUT INSERTED.perfil_pk
      VALUES ('Exibidor', 'Perfil exclusivo para exibidores de mídia OOH', 1, GETDATE(), GETDATE())
    `);
    perfilPk = ins.recordset[0].perfil_pk;
    console.log(`  Perfil Exibidor criado (pk=${perfilPk}) ✅`);
  } else {
    perfilPk = perfilExist.recordset[0].perfil_pk;
    console.log(`  Perfil Exibidor já existe (pk=${perfilPk}) ✅`);
  }

  // ── 5. Exibidor de teste: PixlPulseLab ───────────────────────────────────────
  const dominio = 'pixlpulselab.dev';
  const exibExist = await pool.request()
    .input('dominio', sql.NVarChar(150), dominio)
    .query(`
      SELECT exibidor_pk FROM [serv_product_be180].[exibidor_dm]
      WHERE delete_bl = 0 AND LOWER(dominio_st) = @dominio
    `);
  let exibidorPk;
  if (!exibExist.recordset.length) {
    const ins = await pool.request()
      .input('dominio', sql.NVarChar(150), dominio)
      .query(`
        INSERT INTO [serv_product_be180].[exibidor_dm]
          (nome_st, nome_fantasia_st, codigo_st, email_st, dominio_st, active_bl, delete_bl)
        OUTPUT INSERTED.exibidor_pk
        VALUES ('PixlPulseLab', 'PixlPulseLab', 'PIXLPULSE', 'contato@pixlpulselab.dev', @dominio, 1, 0)
      `);
    exibidorPk = ins.recordset[0].exibidor_pk;
    console.log(`  Exibidor PixlPulseLab criado (pk=${exibidorPk}, domínio=${dominio}) ✅`);
  } else {
    exibidorPk = exibExist.recordset[0].exibidor_pk;
    console.log(`  Exibidor PixlPulseLab já existe (pk=${exibidorPk}) ✅`);
  }

  // ── 6. Verificação final ─────────────────────────────────────────────────────
  console.log('\n=== Estado final ===');
  const verify = await pool.request().query(`
    SELECT
      e.exibidor_pk,
      e.nome_st,
      e.dominio_st,
      COUNT(u.pk) AS total_usuarios
    FROM [serv_product_be180].[exibidor_dm] e
    LEFT JOIN [serv_product_be180].[usuario_dm] u
      ON u.exibidor_fk = e.exibidor_pk AND u.ativo_bl = 1
    WHERE e.delete_bl = 0
    GROUP BY e.exibidor_pk, e.nome_st, e.dominio_st
    ORDER BY e.exibidor_pk
  `);
  verify.recordset.forEach(r =>
    console.log(`  exibidor_pk=${r.exibidor_pk} | ${r.nome_st} | domínio: ${r.dominio_st} | usuários: ${r.total_usuarios}`)
  );

  await pool.close();
  console.log('\n✅ Todas as migrations aplicadas com sucesso!\n');
  console.log('Próximo passo: faça login com ze@pixlpulselab.dev');
  console.log('O sistema vai auto-provisionar o usuário com perfil Exibidor na primeira entrada.\n');
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message);
  process.exit(1);
});
