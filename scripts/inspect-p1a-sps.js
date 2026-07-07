/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

const SPS = [
  'sp_reportDataP1aEmpilhamentoRefresh',
  'sp_reportResultColmeiaGeoClosed',
  'sp_reportResultExibidorGeoClosed',
  'sp_reportResultExibidorPracaClosed',
  'sp_reportResultExibidorUfClosed',
  'sp_reportResultP1aBase',
];

(async () => {
  try {
    const pool = await getPool();
    for (const spName of SPS) {
      console.log(`\n=== ${spName} ===`);
      const res = await pool
        .request()
        .input('schema', sql.NVarChar, 'serv_product_be180')
        .input('name', sql.NVarChar, spName).query(`
          SELECT
            p.parameter_id,
            p.name              AS param_name,
            TYPE_NAME(p.user_type_id) AS param_type,
            p.max_length,
            p.is_output
          FROM sys.parameters p
          INNER JOIN sys.objects o ON o.object_id = p.object_id
          INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
          WHERE s.name = @schema AND o.name = @name
          ORDER BY p.parameter_id
        `);
      if (res.recordset.length === 0) {
        console.log('  (SP não encontrada ou sem parâmetros)');
        continue;
      }
      res.recordset.forEach((r) => {
        console.log(
          `  ${r.param_name.padEnd(40)} ${r.param_type} (${r.max_length})${r.is_output ? ' OUTPUT' : ''}`,
        );
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exit(1);
  }
})();
