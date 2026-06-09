/**
 * SEED: Usuário sandbox João → exibidor Eletromídia
 * Uso: node scripts/seed-sandbox-joao-eletromidia.js
 * Requer .env na raiz com DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 60000,
    requestTimeout: 120000,
  },
};

const EMAIL = 'jotagefreitass@gmail.com';
const NOME  = 'João Freitas (Sandbox Eletromídia)';

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado ao banco:', process.env.DB_SERVER);

    // ── 1. Resolve perfil_pk Exibidor ────────────────────────
    const perfilRes = await pool.request().query(`
      SELECT TOP 1 perfil_pk
      FROM [serv_product_be180].[perfil_dm]
      WHERE LOWER(nome_st) LIKE '%exibidor%'
      ORDER BY perfil_pk
    `);
    if (!perfilRes.recordset.length) {
      throw new Error('Perfil Exibidor não encontrado. Execute ongoing/09_SEED_perfil_exibidor_teste.sql primeiro.');
    }
    const perfilPk = perfilRes.recordset[0].perfil_pk;
    console.log('perfil_pk Exibidor =', perfilPk);

    // ── 2. Resolve exibidor_pk Eletromídia ───────────────────
    const exibRes = await pool.request().query(`
      SELECT TOP 1 exibidor_pk
      FROM [serv_product_be180].[exibidor_dm]
      WHERE delete_bl = 0
        AND active_bl = 1
        AND (
              LOWER(nome_st)          LIKE '%eletromidia%'
           OR LOWER(nome_st)          LIKE '%eletromídia%'
           OR LOWER(nome_fantasia_st) LIKE '%eletromidia%'
           OR LOWER(nome_fantasia_st) LIKE '%eletromídia%'
        )
      ORDER BY exibidor_pk
    `);
    if (!exibRes.recordset.length) {
      throw new Error('Exibidor Eletromídia não encontrado em exibidor_dm. Verifique o nome cadastrado.');
    }
    const exibidorPk = exibRes.recordset[0].exibidor_pk;
    console.log('exibidor_pk Eletromídia =', exibidorPk);

    // ── 3. Upsert usuário ────────────────────────────────────
    const existsRes = await pool.request()
      .input('email', sql.NVarChar, EMAIL)
      .query(`
        SELECT 1 AS existe
        FROM [serv_product_be180].[usuario_dm]
        WHERE LOWER(email_st) = LOWER(@email)
      `);

    if (existsRes.recordset.length) {
      await pool.request()
        .input('perfilPk',   sql.Int,      perfilPk)
        .input('exibidorPk', sql.Int,      exibidorPk)
        .input('email',      sql.NVarChar, EMAIL)
        .query(`
          UPDATE [serv_product_be180].[usuario_dm]
          SET perfil_pk   = @perfilPk,
              exibidor_fk = @exibidorPk,
              ativo_bl    = 1
          WHERE LOWER(email_st) = LOWER(@email)
        `);
      console.log(`✅ Usuário ${EMAIL} atualizado → perfil Exibidor, exibidor_fk=${exibidorPk}`);
    } else {
      await pool.request()
        .input('nome',       sql.NVarChar, NOME)
        .input('email',      sql.NVarChar, EMAIL)
        .input('perfilPk',   sql.Int,      perfilPk)
        .input('exibidorPk', sql.Int,      exibidorPk)
        .query(`
          INSERT INTO [serv_product_be180].[usuario_dm]
            (nome_st, email_st, perfil_pk, exibidor_fk, empresa_pk, ativo_bl, date_dh, date_dt)
          VALUES
            (@nome, @email, @perfilPk, @exibidorPk, NULL, 1, GETDATE(), CAST(GETDATE() AS DATE))
        `);
      console.log(`✅ Usuário ${EMAIL} criado → perfil Exibidor, exibidor_fk=${exibidorPk}`);
    }

    // ── 4. Verificação final ─────────────────────────────────
    const check = await pool.request()
      .input('email', sql.NVarChar, EMAIL)
      .query(`
        SELECT
          u.pk            AS usuario_pk,
          u.nome_st       AS nome,
          u.email_st      AS email,
          p.nome_st       AS perfil,
          u.exibidor_fk,
          e.nome_st       AS exibidor_nome,
          e.nome_fantasia_st AS exibidor_fantasia,
          u.empresa_pk,
          u.ativo_bl
        FROM [serv_product_be180].[usuario_dm]  u
        JOIN [serv_product_be180].[perfil_dm]   p ON p.perfil_pk   = u.perfil_pk
        LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
        WHERE LOWER(u.email_st) = LOWER(@email)
      `);

    console.log('\n── Resultado final ──────────────────────────────────');
    console.table(check.recordset);

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
