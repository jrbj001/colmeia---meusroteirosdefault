/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

const PK = process.env.TEST_PLANO_MIDIA_GRUPO_PK || '6406';

async function exec(pool, label, spName, params) {
  console.log(`\n=== ${label} (${spName}) ===`);
  const req = pool.request();
  for (const [name, type, value] of params) req.input(name, type, value);
  try {
    const t0 = Date.now();
    const result = await req.execute(spName);
    const elapsed = Date.now() - t0;
    const rs = result.recordset || [];
    console.log(`  ✅ ${rs.length} linhas em ${elapsed}ms`);
    if (rs.length > 0) {
      console.log(`  colunas:`, Object.keys(rs[0]).slice(0, 30).join(', '));
      console.log(`  amostra:`, JSON.stringify(rs[0]).slice(0, 500));
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
}

(async () => {
  const pool = await getPool();

  await exec(
    pool,
    'refresh',
    '[serv_product_be180].[sp_reportDataP1aEmpilhamentoRefresh]',
    [
      ['planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), PK],
      ['skipIfFresherThanMinutes_vl', sql.Int, 0],
    ],
  );

  await exec(
    pool,
    'colmeia (GEO)',
    '[serv_product_be180].[sp_reportResultColmeiaGeoClosed]',
    [
      ['planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), PK],
      ['dimension_st', sql.NVarChar(20), 'GEO'],
      ['dimensionValue_st', sql.NVarChar(510), null],
    ],
  );

  await exec(
    pool,
    'exibidor (GEO)',
    '[serv_product_be180].[sp_reportResultExibidorGeoClosed]',
    [
      ['planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), PK],
      ['dimensionValue_st', sql.NVarChar(510), null],
      ['marca_st', sql.NVarChar(510), null],
      ['negociacao_st', sql.NVarChar(40), 'TOTAL'],
    ],
  );

  await exec(
    pool,
    'modelo (GEO)',
    '[serv_product_be180].[sp_reportResultP1aBase]',
    [
      ['planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), PK],
      ['dimension_st', sql.NVarChar(20), 'GEO'],
      ['dimensionValue_st', sql.NVarChar(510), null],
      ['marca_st', sql.NVarChar(510), null],
      ['negociacao_st', sql.NVarChar(40), 'TOTAL'],
    ],
  );

  process.exit(0);
})();
