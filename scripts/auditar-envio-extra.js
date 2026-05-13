/**
 * Investigação complementar do envio Weooh / lote #5.
 * - Identifica usuário "Gabriel" no exibidor
 * - Compara cidades novo vs legado
 * - Verifica se os tipos de mídia já existem no legado (gap de de-para)
 * - Lista praças do novo
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: { encrypt: true, trustServerCertificate: true, connectTimeout: 60000, requestTimeout: 120000 },
};

const EXIBIDOR_FK = 4;
const LOTE_PK = 5;

function fmt(n) { return n === null || n === undefined ? '—' : (typeof n === 'number' ? n.toLocaleString('pt-BR') : String(n)); }

async function main() {
  const pool = await sql.connect(config);

  console.log('\n═══ USUÁRIOS VINCULADOS AO EXIBIDOR WEOOH (exibidor_fk=4) ═══\n');
  // Tenta diferentes tabelas/campos que podem ligar usuário ao exibidor
  try {
    const u = await pool.request()
      .input('exibidor_fk', sql.Int, EXIBIDOR_FK)
      .query(`
        SELECT u.* FROM [serv_product_be180].[usuario_dm] u
        WHERE u.exibidor_fk = @exibidor_fk OR u.delete_bl = 0
      `);
    console.log(`  usuario_dm → ${u.recordset.length} linhas`);
    u.recordset.slice(0, 20).forEach((r) => {
      const colsInteresse = ['usuario_pk','nome_st','email_st','exibidor_fk','perfil_st','active_bl'];
      const linha = colsInteresse.map((c) => r[c] !== undefined ? `${c}=${r[c]}` : '').filter(Boolean).join(' | ');
      console.log(`    ${linha}`);
    });
  } catch (e) {
    console.log(`  usuario_dm não acessível: ${e.message.split('\n')[0]}`);
  }

  console.log('\n═══ BUSCA POR "GABRIEL" EM TABELAS DE USUÁRIO ═══\n');
  try {
    const tabs = await pool.request().query(`
      SELECT name FROM sys.tables
      WHERE schema_id = SCHEMA_ID('serv_product_be180')
        AND (name LIKE '%usuario%' OR name LIKE '%user%')
    `);
    console.log('  Tabelas encontradas:');
    tabs.recordset.forEach(t => console.log(`    - ${t.name}`));

    for (const t of tabs.recordset) {
      try {
        const cols = await pool.request().query(`
          SELECT name FROM sys.columns
          WHERE object_id = OBJECT_ID('serv_product_be180.${t.name}')
            AND (name LIKE '%nome%' OR name LIKE '%name%' OR name LIKE '%email%')
        `);
        const nameCol = cols.recordset.find((c) => /nome|name/i.test(c.name))?.name;
        if (!nameCol) continue;
        const r = await pool.request()
          .input('q', sql.NVarChar, '%Gabriel%')
          .query(`SELECT TOP 5 * FROM [serv_product_be180].[${t.name}] WHERE ${nameCol} LIKE @q`);
        if (r.recordset.length > 0) {
          console.log(`\n  ✔ Encontrado em ${t.name}:`);
          r.recordset.forEach((row) => {
            const interesse = ['usuario_pk','user_pk','pk','nome_st','name_st','email_st','exibidor_fk','perfil_st','perfil_fk','active_bl','dataCriacao_dh'];
            console.log('    ' + interesse.filter(c => row[c] !== undefined).map(c => `${c}=${row[c]}`).join(' | '));
          });
        }
      } catch {}
    }
  } catch (e) {
    console.log(`  erro: ${e.message.split('\n')[0]}`);
  }

  console.log('\n═══ CIDADES DO LOTE #5 ═══\n');
  const cidLote = await pool.request()
    .input('lote_pk', sql.Int, LOTE_PK)
    .query(`
      SELECT
        ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)') AS praca,
        uf_st,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)'), uf_st
      ORDER BY qtd DESC
    `);
  console.log('  praça/uf'.padEnd(50) + 'qtd');
  cidLote.recordset.forEach(r => {
    console.log(`  ${(r.praca + ' / ' + (r.uf_st||'')).padEnd(48)} ${fmt(r.qtd)}`);
  });

  console.log('\n═══ CIDADES DO LEGADO Weooh (exibidor_fk=4) ═══\n');
  const cidLeg = await pool.request()
    .input('fk', sql.Int, EXIBIDOR_FK)
    .query(`
      SELECT TOP 50
        ISNULL(NULLIF(LTRIM(RTRIM(cidade_st)),''),'(vazio)') AS cidade,
        estado_st,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE valid_bl = 1 AND exibidor_fk = @fk
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(cidade_st)),''),'(vazio)'), estado_st
      ORDER BY qtd DESC
    `);
  console.log('  cidade/uf'.padEnd(50) + 'qtd');
  cidLeg.recordset.forEach(r => {
    console.log(`  ${(r.cidade + ' / ' + (r.estado_st||'')).padEnd(48)} ${fmt(r.qtd)}`);
  });

  console.log('\n═══ TIPOS DE MÍDIA NO LEGADO Weooh ═══\n');
  const tipos = await pool.request()
    .input('fk', sql.Int, EXIBIDOR_FK)
    .query(`
      SELECT TOP 30 tipoMidia_st, COUNT(1) AS qtd
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE valid_bl = 1 AND exibidor_fk = @fk
        AND tipoMidia_st IS NOT NULL AND LTRIM(RTRIM(tipoMidia_st)) <> ''
      GROUP BY tipoMidia_st
      ORDER BY qtd DESC
    `);
  console.log('  tipoMidia_st'.padEnd(60) + 'qtd');
  tipos.recordset.forEach(r => {
    console.log(`  ${String(r.tipoMidia_st).padEnd(58)} ${fmt(r.qtd)}`);
  });

  console.log('\n═══ DE-PARA CADASTRADOS (geral) ═══\n');
  const dp = await pool.request().query(`
    SELECT depara_pk, sourceAmbiente_st, sourceFormato_st, sourceTipo_st, mappedTipo_st, active_bl
    FROM [serv_product_be180].[exibidor_midia_depara_dm]
    WHERE active_bl = 1
    ORDER BY depara_pk
  `);
  console.log(`  Total: ${dp.recordset.length} regras de-para ativas`);
  dp.recordset.slice(0, 30).forEach(r => {
    console.log(`    #${r.depara_pk} ambiente="${r.sourceAmbiente_st||''}" formato="${r.sourceFormato_st||''}" tipo="${r.sourceTipo_st||''}" → mapped="${r.mappedTipo_st||''}"`);
  });

  console.log('\n═══ TODOS OS TIPOS DO LOTE #5 ═══\n');
  const tiposLote = await pool.request()
    .input('lote_pk', sql.Int, LOTE_PK)
    .query(`
      SELECT
        REPLACE(REPLACE(tipo_midia_st, CHAR(13), ' '), CHAR(10), ' ') AS tipo,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY tipo_midia_st
      ORDER BY qtd DESC
    `);
  console.log('  tipo'.padEnd(60) + 'qtd');
  tiposLote.recordset.forEach(r => {
    console.log(`  ${String(r.tipo || '(vazio)').padEnd(58)} ${fmt(r.qtd)}`);
  });

  console.log('\n═══ COBERTURA DE CIDADES — INTERSECÇÃO LEGADO vs NOVO ═══\n');
  const inter = await pool.request()
    .input('fk', sql.Int, EXIBIDOR_FK)
    .input('lote_pk', sql.Int, LOTE_PK)
    .query(`
      WITH cidNovo AS (
        SELECT DISTINCT LOWER(LTRIM(RTRIM(praca_st))) AS cidade
        FROM [serv_product_be180].[exibidor_inventario_item_dm]
        WHERE lote_fk = @lote_pk AND delete_bl = 0 AND praca_st IS NOT NULL
      ),
      cidLeg AS (
        SELECT DISTINCT LOWER(LTRIM(RTRIM(cidade_st))) AS cidade
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1 AND exibidor_fk = @fk AND cidade_st IS NOT NULL
      )
      SELECT
        (SELECT COUNT(1) FROM cidNovo) AS novo_total,
        (SELECT COUNT(1) FROM cidLeg) AS legado_total,
        (SELECT COUNT(1) FROM cidNovo n INNER JOIN cidLeg l ON l.cidade = n.cidade) AS intersect_,
        (SELECT COUNT(1) FROM cidNovo n WHERE NOT EXISTS (SELECT 1 FROM cidLeg l WHERE l.cidade = n.cidade)) AS apenas_novo,
        (SELECT COUNT(1) FROM cidLeg l WHERE NOT EXISTS (SELECT 1 FROM cidNovo n WHERE n.cidade = l.cidade)) AS apenas_legado
    `);
  const i = inter.recordset[0];
  console.log(`  Cidades distintas no novo:        ${fmt(i.novo_total)}`);
  console.log(`  Cidades distintas no legado:      ${fmt(i.legado_total)}`);
  console.log(`  Em comum (novo ∩ legado):         ${fmt(i.intersect_)}`);
  console.log(`  Apenas no novo:                   ${fmt(i.apenas_novo)}`);
  console.log(`  Apenas no legado (não vieram):    ${fmt(i.apenas_legado)}`);

  console.log('\n═══ CIDADES QUE EXISTIAM NO LEGADO E NÃO VIERAM NO NOVO ═══\n');
  const faltam = await pool.request()
    .input('fk', sql.Int, EXIBIDOR_FK)
    .input('lote_pk', sql.Int, LOTE_PK)
    .query(`
      SELECT TOP 30 b.cidade_st, b.estado_st, COUNT(1) AS qtd_legado
      FROM [serv_product_be180].[bancoAtivosJoin_ft] b
      WHERE b.valid_bl = 1 AND b.exibidor_fk = @fk
        AND b.cidade_st IS NOT NULL AND LTRIM(RTRIM(b.cidade_st)) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM [serv_product_be180].[exibidor_inventario_item_dm] i
          WHERE i.lote_fk = @lote_pk AND i.delete_bl = 0
            AND LOWER(LTRIM(RTRIM(i.praca_st))) = LOWER(LTRIM(RTRIM(b.cidade_st)))
        )
      GROUP BY b.cidade_st, b.estado_st
      ORDER BY qtd_legado DESC
    `);
  if (faltam.recordset.length === 0) {
    console.log('  ✔ Todas as cidades do legado vieram no novo.');
  } else {
    console.log('  cidade/uf'.padEnd(50) + 'qtd legado');
    faltam.recordset.forEach(r => {
      console.log(`  ${(r.cidade_st + ' / ' + (r.estado_st||'')).padEnd(48)} ${fmt(r.qtd_legado)}`);
    });
  }

  await pool.close();
}

main().catch(e => { console.error(e); process.exit(1); });
