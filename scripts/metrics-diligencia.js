/**
 * Métricas de diligência do Colmeia.
 * Extrai performance de uso (planos, usuários, agências, inventário) do SQL Server
 * e imprime um JSON consolidado. Também grava em scripts/metrics-diligencia.out.json.
 *
 * Requer .env com DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 * Uso: node scripts/metrics-diligencia.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool } = require('../handlers/db');

const SCHEMA = 'serv_product_be180';

async function safe(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[falha] ${label}: ${err.message}`);
    return null;
  }
}

async function run() {
  let pool;
  const out = { extraido_em: new Date().toISOString(), planos: {}, usuarios: {}, agencias: {}, inventario: {} };

  try {
    pool = await getPool();

    // ── PLANOS ────────────────────────────────────────────────
    out.planos.total = await safe('planos.total', async () => {
      const r = await pool.request().query(`
        SELECT COUNT(*) AS total FROM ${SCHEMA}.planoMidiaGrupo_dm_vw WHERE delete_bl = 0
      `);
      return r.recordset[0]?.total ?? 0;
    });

    out.planos.ultimos_30_dias = await safe('planos.30d', async () => {
      const r = await pool.request().query(`
        SELECT COUNT(*) AS total FROM ${SCHEMA}.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0 AND date_dh >= DATEADD(day, -30, GETUTCDATE())
      `);
      return r.recordset[0]?.total ?? 0;
    });

    out.planos.ultimos_7_dias = await safe('planos.7d', async () => {
      const r = await pool.request().query(`
        SELECT COUNT(*) AS total FROM ${SCHEMA}.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0 AND date_dh >= DATEADD(day, -7, GETUTCDATE())
      `);
      return r.recordset[0]?.total ?? 0;
    });

    out.planos.por_tipo = await safe('planos.por_tipo', async () => {
      const r = await pool.request().query(`
        SELECT planoMidiaType_st AS tipo, COUNT(*) AS total
        FROM ${SCHEMA}.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0
        GROUP BY planoMidiaType_st
        ORDER BY total DESC
      `);
      return r.recordset;
    });

    out.planos.por_status = await safe('planos.por_status', async () => {
      const r = await pool.request().query(`
        SELECT planoMidiaStatus_st AS status, COUNT(*) AS total
        FROM ${SCHEMA}.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0
        GROUP BY planoMidiaStatus_st
        ORDER BY total DESC
      `);
      return r.recordset;
    });

    out.planos.serie_mensal = await safe('planos.serie_mensal', async () => {
      const r = await pool.request().query(`
        SELECT YEAR(date_dh) AS ano, MONTH(date_dh) AS mes, COUNT(*) AS total
        FROM ${SCHEMA}.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0 AND date_dh >= DATEADD(month, -12, GETUTCDATE())
        GROUP BY YEAR(date_dh), MONTH(date_dh)
        ORDER BY ano, mes
      `);
      return r.recordset;
    });

    // ── USUÁRIOS ──────────────────────────────────────────────
    out.usuarios.resumo = await safe('usuarios.resumo', async () => {
      const r = await pool.request().query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN empresa_pk IS NULL THEN 1 ELSE 0 END) AS internos,
          SUM(CASE WHEN empresa_pk IS NOT NULL THEN 1 ELSE 0 END) AS agencia,
          SUM(CASE WHEN ultimoAcesso_dh >= DATEADD(day, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS ativos_30d,
          SUM(CASE WHEN ultimoAcesso_dh >= DATEADD(day, -7,  SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS ativos_7d
        FROM ${SCHEMA}.usuario_dm
        WHERE ativo_bl = 1
      `);
      return r.recordset[0];
    });

    out.usuarios.adocao_mensal = await safe('usuarios.adocao_mensal', async () => {
      const r = await pool.request().query(`
        SELECT YEAR(primeiroAcesso_dh) AS ano, MONTH(primeiroAcesso_dh) AS mes, COUNT(*) AS total
        FROM ${SCHEMA}.usuario_dm
        WHERE ativo_bl = 1 AND primeiroAcesso_dh IS NOT NULL
          AND primeiroAcesso_dh >= DATEADD(month, -12, SYSUTCDATETIME())
        GROUP BY YEAR(primeiroAcesso_dh), MONTH(primeiroAcesso_dh)
        ORDER BY ano, mes
      `);
      return r.recordset;
    });

    // ── AGÊNCIAS ──────────────────────────────────────────────
    out.agencias.total = await safe('agencias.total', async () => {
      const r = await pool.request().query(`
        SELECT COUNT(*) AS total FROM ${SCHEMA}.agencia_dm_vw WHERE active_bl = 1
      `);
      return r.recordset[0]?.total ?? 0;
    });

    out.agencias.top_por_planos = await safe('agencias.top_por_planos', async () => {
      const r = await pool.request().query(`
        SELECT TOP 10 a.agencia_st AS agencia, COUNT(*) AS total
        FROM ${SCHEMA}.planoMidiaGrupo_dm_vw g
        LEFT JOIN ${SCHEMA}.agencia_dm_vw a ON a.pk = g.agencia_pk
        WHERE g.delete_bl = 0
        GROUP BY a.agencia_st
        ORDER BY total DESC
      `);
      return r.recordset;
    });

    // ── INVENTÁRIO DE EXIBIDORES (módulo novo) ────────────────
    out.inventario.lotes_por_status = await safe('inventario.lotes_por_status', async () => {
      const r = await pool.request().query(`
        SELECT status_st AS status, COUNT(*) AS total
        FROM ${SCHEMA}.exibidor_inventario_upload_lote_dm
        GROUP BY status_st
        ORDER BY total DESC
      `);
      return r.recordset;
    });

    const json = JSON.stringify(out, null, 2);
    const outPath = path.join(__dirname, 'metrics-diligencia.out.json');
    fs.writeFileSync(outPath, json);
    console.log(json);
    console.log(`\n--- gravado em ${outPath} ---`);
  } catch (err) {
    console.error('Erro fatal:', err.message);
    process.exit(1);
  } finally {
    if (pool && pool.close) await pool.close();
  }
}

run();
