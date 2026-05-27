/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT OBJECT_DEFINITION(OBJECT_ID('serv_product_be180.sp_planoMidiaOohInsert')) AS body
  `);
  const body = r.recordset?.[0]?.body || '';
  console.log(body);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
