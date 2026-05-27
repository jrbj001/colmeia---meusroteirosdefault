/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();

  console.log('=== Linhas de J4427 ===');
  const r1 = await pool.request().query(`
    SELECT TOP 20
      planoMidiaImportFile_pk AS file_pk,
      job_st,
      campanha_st,
      produto_st,
      tipoNegociacao_st,
      outrasEspecificacoesDigitar_st AS coluna_F_pacote,
      descricao_st AS coluna_M_descricao,
      exibidor_st,
      formato_st,
      especificacoes_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE job_st LIKE '%J4427%'
    ORDER BY pk
  `);
  console.log(`Total linhas de J4427: ${r1.recordset.length}`);
  console.table(r1.recordset);

  console.log('\n=== Outros campos do J4427 (file info) ===');
  const r2 = await pool.request().query(`
    SELECT DISTINCT
      i.planoMidiaImportFile_pk AS file_pk,
      f.filename_st,
      f.date_dh
    FROM [serv_product_be180].[planoMidiaImport_ft_vw] i
    JOIN [serv_product_be180].[planoMidiaImportFile_dm] f
      ON f.pk = i.planoMidiaImportFile_pk
    WHERE i.job_st LIKE '%J4427%'
  `);
  console.table(r2.recordset);

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
