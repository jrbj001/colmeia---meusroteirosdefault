/* eslint-disable no-console */
/**
 * Diagnóstico do bug "Coluna F (Pacote) vazia no export Empilhado".
 * Verifica:
 *  1. Quantas linhas em planoMidiaImport_ft_vw têm outrasEspecificacoesDigitar_st preenchido vs vazio
 *  2. Amostra de descricao_st (Coluna M) que contém "Pacote" — provavelmente foi importado lá em vez de F
 *  3. Lista os planoMidiaImportFile mais recentes pra ver quando o último import aconteceu
 */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();

  console.log('\n=== 1) Cobertura outrasEspecificacoesDigitar_st (Coluna F) ===');
  const r1 = await pool.request().query(`
    SELECT
      COUNT(*) AS total_linhas,
      SUM(CASE WHEN outrasEspecificacoesDigitar_st IS NOT NULL
                AND LTRIM(RTRIM(outrasEspecificacoesDigitar_st)) <> '' THEN 1 ELSE 0 END) AS com_pacote,
      SUM(CASE WHEN descricao_st IS NOT NULL
                AND LTRIM(RTRIM(descricao_st)) <> '' THEN 1 ELSE 0 END) AS com_descricao
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
  `);
  console.table(r1.recordset);

  console.log('\n=== 2) Amostra de outrasEspecificacoesDigitar_st preenchidos (TOP 10) ===');
  const r2 = await pool.request().query(`
    SELECT TOP 10
      planoMidiaImportFile_pk AS file_pk,
      job_st,
      exibidor_st,
      formato_st,
      outrasEspecificacoesDigitar_st,
      descricao_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE outrasEspecificacoesDigitar_st IS NOT NULL
      AND LTRIM(RTRIM(outrasEspecificacoesDigitar_st)) <> ''
    ORDER BY pk DESC
  `);
  if (r2.recordset.length === 0) {
    console.log('(nenhuma linha com outrasEspecificacoesDigitar_st preenchido)');
  } else {
    console.table(r2.recordset);
  }

  console.log('\n=== 3) Amostra de descricao_st que contém "Pacote" (TOP 10) ===');
  const r3 = await pool.request().query(`
    SELECT TOP 10
      planoMidiaImportFile_pk AS file_pk,
      job_st,
      exibidor_st,
      formato_st,
      outrasEspecificacoesDigitar_st,
      descricao_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE descricao_st LIKE '%Pacote%'
       OR descricao_st LIKE '%PACOTE%'
       OR descricao_st LIKE '%pacote%'
    ORDER BY pk DESC
  `);
  if (r3.recordset.length === 0) {
    console.log('(nenhuma descricao_st contém "Pacote")');
  } else {
    console.table(r3.recordset);
  }

  console.log('\n=== 4) Arquivos importados mais recentes ===');
  const r4 = await pool.request().query(`
    SELECT TOP 10
      f.pk,
      f.planoMidiaGrupo_pk,
      f.filename_st,
      f.date_dh,
      f.ativo_bl,
      (SELECT COUNT(*) FROM [serv_product_be180].[planoMidiaImport_ft_vw] WHERE planoMidiaImportFile_pk = f.pk) AS qtd_linhas,
      (SELECT COUNT(*) FROM [serv_product_be180].[planoMidiaImport_ft_vw] WHERE planoMidiaImportFile_pk = f.pk
        AND outrasEspecificacoesDigitar_st IS NOT NULL AND LTRIM(RTRIM(outrasEspecificacoesDigitar_st)) <> '') AS com_pacote
    FROM [serv_product_be180].[planoMidiaImportFile_dm] f
    ORDER BY f.pk DESC
  `);
  console.table(r4.recordset);

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
