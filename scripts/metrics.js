/**
 * Script para obter métricas de apresentação (Number of Simulations, etc.).
 * Requer .env com DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD.
 * Uso: node scripts/metrics.js
 */
require('dotenv').config();
const { getPool } = require('../handlers/db');

async function run() {
  let pool;
  try {
    pool = await getPool();

    // 1) Total de roteiros (não excluídos)
    const total = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE delete_bl = 0
    `);
    const totalRoteiros = total.recordset[0]?.total ?? 0;

    // 2) Roteiros no último mês
    const ultimoMes = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE delete_bl = 0
        AND date_dh >= DATEADD(month, -1, GETUTCDATE())
    `);
    const totalUltimoMes = ultimoMes.recordset[0]?.total ?? 0;

    // 3) Roteiros nos últimos 7 dias
    const ultimaSemana = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE delete_bl = 0
        AND date_dh >= DATEADD(day, -7, GETUTCDATE())
    `);
    const totalUltimaSemana = ultimaSemana.recordset[0]?.total ?? 0;

    // 4) Se existir planoMidiaType_st na view (simulado vs completo)
    let totalSimulado = null;
    let totalCompleto = null;
    try {
      const porTipo = await pool.request().query(`
        SELECT planoMidiaType_st, COUNT(*) AS total
        FROM serv_product_be180.planoMidiaGrupo_dm_vw
        WHERE delete_bl = 0
        GROUP BY planoMidiaType_st
      `);
      porTipo.recordset.forEach((row) => {
        const t = (row.planoMidiaType_st || '').toLowerCase();
        if (t.includes('simulado')) totalSimulado = row.total;
        else if (t.includes('completo') || row.planoMidiaType_st) totalCompleto = (totalCompleto || 0) + row.total;
      });
      if (totalSimulado === null && porTipo.recordset.length === 1)
        totalSimulado = porTipo.recordset[0].total;
    } catch (_) {
      // Coluna pode não existir na view
    }

    const out = {
      number_of_simulations: {
        total_roteiros: totalRoteiros,
        ultimos_30_dias: totalUltimoMes,
        ultimos_7_dias: totalUltimaSemana,
        por_tipo: totalSimulado != null || totalCompleto != null
          ? { simulado: totalSimulado, completo: totalCompleto }
          : null,
      },
    };

    console.log(JSON.stringify(out, null, 2));
    console.log('\n--- Resumo para slide ---');
    console.log('Number of Simulations (total):', totalRoteiros);
    console.log('Number of Simulations (últimos 30 dias):', totalUltimoMes);
    console.log('Number of Simulations (últimos 7 dias):', totalUltimaSemana);
    if (totalSimulado != null) console.log('  - Simulado:', totalSimulado);
    if (totalCompleto != null) console.log('  - Completo:', totalCompleto);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    if (pool && pool.close) await pool.close();
  }
}

run();
