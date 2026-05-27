/* eslint-disable no-console */
/**
 * Inspeciona a SP serv_product_be180.sp_planoMidiaOohInsert
 * para descobrir se ela está mapeando outrasEspecificacoesDigitar_st do JSON.
 */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();

  const r = await pool.request().query(`
    SELECT OBJECT_DEFINITION(OBJECT_ID('serv_product_be180.sp_planoMidiaOohInsert')) AS body
  `);
  const body = r.recordset?.[0]?.body;
  if (!body) {
    console.log('(SP não encontrada)');
    process.exit(0);
  }

  // Procura todas as menções a outras_especif ou descricao
  console.log('=== Linhas com "outrasEspec" ===');
  body.split(/\r?\n/).forEach((line, i) => {
    if (/outrasEspec/i.test(line) || /OUTRAS_ESPEC/i.test(line)) {
      console.log(`L${i + 1}: ${line.trim()}`);
    }
  });

  console.log('\n=== Linhas com "descricao_st" ===');
  body.split(/\r?\n/).forEach((line, i) => {
    if (/descricao_st/i.test(line)) {
      console.log(`L${i + 1}: ${line.trim()}`);
    }
  });

  console.log('\n=== Tamanho total da SP:', body.length, 'chars,', body.split(/\r?\n/).length, 'linhas');

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
