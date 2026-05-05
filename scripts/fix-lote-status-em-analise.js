/**
 * Corrige lotes e itens que foram incorretamente marcados como PARA_CORRIGIR
 * pelo código antigo (quando "Midia sem de-para cadastrado" era auto-gerado).
 *
 * A regra agora é: uploads sempre entram como EM_ANALISE.
 * PARA_CORRIGIR só deve ser setado manualmente pela equipe BE180.
 *
 * Uso: node scripts/fix-lote-status-em-analise.js
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 60000,
    requestTimeout: 120000,
  },
};

async function main() {
  const pool = await sql.connect(config);
  console.log('Conectado ao banco.\n');

  // 1. Ver lotes afetados antes de corrigir
  const preview = await pool.request().query(`
    SELECT
      lote_pk,
      arquivo_st,
      status_st,
      totalRegistros_vl,
      dataCriacao_dh
    FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm]
    WHERE status_st = 'PARA_CORRIGIR'
    ORDER BY dataCriacao_dh DESC
  `);

  if (preview.recordset.length === 0) {
    console.log('Nenhum lote com PARA_CORRIGIR encontrado. Nada a fazer.');
    await pool.close();
    return;
  }

  console.log(`Lotes a corrigir (${preview.recordset.length}):`);
  preview.recordset.forEach((r) => {
    console.log(`  Lote #${r.lote_pk} | ${r.arquivo_st} | ${r.totalRegistros_vl} itens | ${new Date(r.dataCriacao_dh).toLocaleDateString('pt-BR')}`);
  });

  // 2. Corrigir status dos lotes → EM_ANALISE
  const resLote = await pool.request().query(`
    UPDATE [serv_product_be180].[exibidor_inventario_upload_lote_dm]
    SET
      status_st           = 'EM_ANALISE',
      pendentes_vl        = 0,
      rejeitados_vl       = 0,
      dataAtualizacao_dh  = SYSDATETIME()
    WHERE status_st = 'PARA_CORRIGIR'
  `);
  console.log(`\n✔ Lotes atualizados: ${resLote.rowsAffected[0]}`);

  // 3. Corrigir itens que foram auto-marcados por ausência de de-para → EM_ANALISE
  const resItem = await pool.request().query(`
    UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
    SET
      status_st          = 'EM_ANALISE',
      erroValidacao_st   = NULL,
      dataAtualizacao_dh = SYSDATETIME()
    WHERE status_st = 'PARA_CORRIGIR'
      AND erroValidacao_st = 'Midia sem de-para cadastrado'
  `);
  console.log(`✔ Itens atualizados:  ${resItem.rowsAffected[0]}`);

  console.log('\nPronto. Todos os lotes estão agora em EM_ANALISE.');
  await pool.close();
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
