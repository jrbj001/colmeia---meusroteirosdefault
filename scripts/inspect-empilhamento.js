/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT TOP 1 *
    FROM [serv_product_be180].[reportDataP1aEmpilhamento_dm]
  `);
  if (r.recordset.length === 0) {
    console.log('(stage vazio)');
  } else {
    console.log('Colunas:', Object.keys(r.recordset[0]).join(', '));
    console.log('\nAmostra:');
    console.log(JSON.stringify(r.recordset[0], null, 2));
  }
  process.exit(0);
})();
