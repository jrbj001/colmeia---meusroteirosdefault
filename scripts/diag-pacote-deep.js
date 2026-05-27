/* eslint-disable no-console */
require('dotenv').config();
const { sql, getPool } = require('../handlers/db');

(async () => {
  const pool = await getPool();

  // Inspeciona se existe tabela stage com os dados crus do upload (antes da SP)
  console.log('=== Tabelas relacionadas a planoMidia / empilha ===');
  const r0 = await pool.request().query(`
    SELECT s.name + '.' + t.name AS tabela
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'serv_product_be180'
      AND (t.name LIKE '%planoMidia%' OR t.name LIKE '%P1aEmp%' OR t.name LIKE '%empilha%')
    ORDER BY t.name
  `);
  console.table(r0.recordset);

  console.log('\n=== file_pk 184 (J4289 - HORA ZÉ FUTEBOL): valores das colunas relevantes ===');
  const r1 = await pool.request().query(`
    SELECT TOP 5
      job_st,
      campanha_st,
      tipoNegociacao_st,
      outrasEspecificacoesDigitar_st AS coluna_F,
      especificacoes_st AS coluna_R,
      descricao_st AS coluna_M,
      exibidor_st,
      formato_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE planoMidiaImportFile_pk = 184
  `);
  console.table(r1.recordset);

  console.log('\n=== file_pk 187 (J4394 - MICHELOB MARATONA RJ) ===');
  const r2 = await pool.request().query(`
    SELECT TOP 5
      job_st,
      campanha_st,
      tipoNegociacao_st,
      outrasEspecificacoesDigitar_st AS coluna_F,
      especificacoes_st AS coluna_R,
      descricao_st AS coluna_M,
      exibidor_st,
      formato_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE planoMidiaImportFile_pk = 187
  `);
  console.table(r2.recordset);

  console.log('\n=== Distintos valores de descricao_st em todos os imports recentes que contêm "Pacote" ===');
  const r3 = await pool.request().query(`
    SELECT DISTINCT planoMidiaImportFile_pk AS file_pk, descricao_st
    FROM [serv_product_be180].[planoMidiaImport_ft_vw]
    WHERE descricao_st LIKE '%[Pp]acote%'
      AND planoMidiaImportFile_pk >= 180
    ORDER BY planoMidiaImportFile_pk DESC
  `);
  console.table(r3.recordset);

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
