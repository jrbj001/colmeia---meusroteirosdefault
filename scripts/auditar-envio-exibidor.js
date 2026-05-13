/**
 * Auditoria de envio de inventário por exibidor.
 *
 * Uso:
 *   node scripts/auditar-envio-exibidor.js "Weooh"
 *   node scripts/auditar-envio-exibidor.js "Weooh" --usuario "Gabriel"
 *
 * Faz um relatório completo do(s) lote(s) enviado(s) por um exibidor:
 *   1. Identidade do exibidor (exibidor_dm)
 *   2. Lotes em [exibidor_inventario_upload_lote_dm]
 *   3. Itens em [exibidor_inventario_item_dm] — qualidade dos dados
 *   4. Comparação com o legado [bancoAtivosJoin_ft]
 *   5. Mapeamento (de-para) e Places enriquecimento
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

const args = process.argv.slice(2);
const nomeExibidorBusca = args[0] || 'Weooh';
const idxUsuario = args.indexOf('--usuario');
const filtroUsuario = idxUsuario >= 0 ? args[idxUsuario + 1] : null;

function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (typeof n === 'number') return n.toLocaleString('pt-BR');
  return String(n);
}

function pct(parte, total) {
  if (!total) return '0%';
  return `${((parte / total) * 100).toFixed(1)}%`;
}

function header(t) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  ${t}`);
  console.log('═'.repeat(80));
}

function sub(t) {
  console.log('\n' + '─'.repeat(80));
  console.log(`  ${t}`);
  console.log('─'.repeat(80));
}

async function main() {
  console.log(`\n🔎 Auditoria de envio do exibidor: "${nomeExibidorBusca}"`);
  if (filtroUsuario) console.log(`   Filtrando por usuário: ${filtroUsuario}`);
  console.log(`   ${new Date().toLocaleString('pt-BR')}\n`);

  const pool = await sql.connect(config);

  // ── 1. EXIBIDOR
  header('1. IDENTIFICAÇÃO DO EXIBIDOR');
  const exib = await pool.request()
    .input('nome', sql.NVarChar(255), `%${nomeExibidorBusca}%`)
    .query(`
      SELECT
        exibidor_pk,
        nome_st,
        nome_fantasia_st,
        codigo_st,
        cnpj_st,
        cidade_st,
        estado_st,
        active_bl,
        dataCriacao_dh,
        (SELECT TOP 1 d.dominio_st FROM [serv_product_be180].[exibidor_dominio_dm] d
         WHERE d.exibidor_fk = e.exibidor_pk AND d.delete_bl = 0
         ORDER BY d.primario_bl DESC, d.dominio_pk ASC) AS dominio_st
      FROM [serv_product_be180].[exibidor_dm] e
      WHERE delete_bl = 0
        AND (nome_st LIKE @nome OR nome_fantasia_st LIKE @nome OR codigo_st LIKE @nome)
    `);

  if (exib.recordset.length === 0) {
    console.log(`❌ Nenhum exibidor encontrado com o termo "${nomeExibidorBusca}".`);
    await pool.close();
    return;
  }

  const exibidor = exib.recordset[0];
  console.log(`  exibidor_pk:       ${exibidor.exibidor_pk}`);
  console.log(`  Nome:              ${exibidor.nome_st}`);
  console.log(`  Nome fantasia:     ${exibidor.nome_fantasia_st || '—'}`);
  console.log(`  Código:            ${exibidor.codigo_st || '—'}`);
  console.log(`  CNPJ:              ${exibidor.cnpj_st || '—'}`);
  console.log(`  Cidade/UF:         ${exibidor.cidade_st || '—'} / ${exibidor.estado_st || '—'}`);
  console.log(`  Domínio:           ${exibidor.dominio_st || '—'}`);
  console.log(`  Ativo:             ${exibidor.active_bl ? 'SIM' : 'NÃO'}`);
  console.log(`  Cadastrado em:     ${new Date(exibidor.dataCriacao_dh).toLocaleString('pt-BR')}`);

  if (exib.recordset.length > 1) {
    console.log(`\n  ⚠ ${exib.recordset.length} exibidores correspondentes — usando o primeiro acima.`);
    exib.recordset.slice(1).forEach((e) => console.log(`    • #${e.exibidor_pk} — ${e.nome_st}`));
  }

  const exibidorFk = exibidor.exibidor_pk;

  // ── 2. LOTES ENVIADOS
  header('2. LOTES DE INVENTÁRIO ENVIADOS');
  const reqLotes = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  let whereLotes = 'WHERE exibidor_fk = @exibidor_fk';
  if (filtroUsuario) {
    reqLotes.input('usuario', sql.NVarChar(255), `%${filtroUsuario}%`);
    whereLotes += ' AND uploadedBy_st LIKE @usuario';
  }

  const lotes = await reqLotes.query(`
    SELECT
      lote_pk,
      arquivo_st,
      uploadedBy_st,
      status_st,
      totalRegistros_vl,
      processados_vl,
      pendentes_vl,
      rejeitados_vl,
      observacao_st,
      dataCriacao_dh,
      dataAtualizacao_dh
    FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm]
    ${whereLotes}
    ORDER BY lote_pk DESC
  `);

  if (lotes.recordset.length === 0) {
    console.log(`\n  ❌ Nenhum lote encontrado para esse exibidor${filtroUsuario ? ` com usuário "${filtroUsuario}"` : ''}.`);
    await pool.close();
    return;
  }

  console.log(`\n  Total de lotes: ${lotes.recordset.length}\n`);
  lotes.recordset.forEach((l) => {
    console.log(`  ┌─ Lote #${l.lote_pk}`);
    console.log(`  │ Arquivo:        ${l.arquivo_st}`);
    console.log(`  │ Enviado por:    ${l.uploadedBy_st || '—'}`);
    console.log(`  │ Status:         ${l.status_st}`);
    console.log(`  │ Registros:      ${fmt(l.totalRegistros_vl)} (proc: ${fmt(l.processados_vl)}, pend: ${fmt(l.pendentes_vl)}, rej: ${fmt(l.rejeitados_vl)})`);
    console.log(`  │ Criado em:      ${new Date(l.dataCriacao_dh).toLocaleString('pt-BR')}`);
    if (l.dataAtualizacao_dh) {
      console.log(`  │ Atualizado em:  ${new Date(l.dataAtualizacao_dh).toLocaleString('pt-BR')}`);
    }
    if (l.observacao_st) console.log(`  │ Observação:     ${l.observacao_st}`);
    console.log(`  └─`);
  });

  // Pega o lote mais recente para análise detalhada
  const ultimoLote = lotes.recordset[0];
  const lotePk = ultimoLote.lote_pk;

  header(`3. QUALIDADE DOS DADOS — LOTE #${lotePk}`);

  // 3a. Estatísticas gerais
  sub('3a. Visão geral dos itens');
  const stat = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT
        COUNT(1)                                                                           AS total,
        SUM(CASE WHEN delete_bl = 1 THEN 1 ELSE 0 END)                                     AS excluidos,
        SUM(CASE WHEN delete_bl = 0 THEN 1 ELSE 0 END)                                     AS ativos,
        SUM(CASE WHEN status_st = 'EM_ANALISE' THEN 1 ELSE 0 END)                          AS em_analise,
        SUM(CASE WHEN status_st = 'APROVADO' THEN 1 ELSE 0 END)                            AS aprovados,
        SUM(CASE WHEN status_st = 'PARA_CORRIGIR' THEN 1 ELSE 0 END)                       AS para_corrigir,
        SUM(CASE WHEN status_st = 'REJEITADO' THEN 1 ELSE 0 END)                           AS rejeitados,
        SUM(CASE WHEN mapped_bl = 1 THEN 1 ELSE 0 END)                                     AS com_depara,
        SUM(CASE WHEN mapped_bl = 0 THEN 1 ELSE 0 END)                                     AS sem_depara,
        SUM(CASE WHEN latitude_vl IS NOT NULL AND longitude_vl IS NOT NULL
                  AND CAST(latitude_vl AS FLOAT) <> 0 AND CAST(longitude_vl AS FLOAT) <> 0 THEN 1 ELSE 0 END) AS com_geo,
        SUM(CASE WHEN latitude_vl IS NULL OR longitude_vl IS NULL
                  OR CAST(latitude_vl AS FLOAT) = 0 OR CAST(longitude_vl AS FLOAT) = 0 THEN 1 ELSE 0 END)     AS sem_geo,
        SUM(CASE WHEN codigo_ativo_st IS NULL OR LTRIM(RTRIM(codigo_ativo_st)) = '' OR codigo_ativo_st LIKE 'LINHA[_]%' THEN 1 ELSE 0 END) AS sem_codigo,
        SUM(CASE WHEN praca_st IS NULL OR LTRIM(RTRIM(praca_st)) = '' THEN 1 ELSE 0 END)   AS sem_praca,
        SUM(CASE WHEN uf_st IS NULL OR LTRIM(RTRIM(uf_st)) = '' THEN 1 ELSE 0 END)         AS sem_uf,
        SUM(CASE WHEN ambiente_st IS NULL OR LTRIM(RTRIM(ambiente_st)) = '' THEN 1 ELSE 0 END)            AS sem_ambiente,
        SUM(CASE WHEN formato_midia_st IS NULL OR LTRIM(RTRIM(formato_midia_st)) = '' THEN 1 ELSE 0 END)  AS sem_formato,
        SUM(CASE WHEN tipo_midia_st IS NULL OR LTRIM(RTRIM(tipo_midia_st)) = '' THEN 1 ELSE 0 END)        AS sem_tipo,
        SUM(CASE WHEN valor_tabela_vl IS NULL THEN 1 ELSE 0 END)                                          AS sem_valor,
        SUM(CASE WHEN erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(erroValidacao_st)) <> '' THEN 1 ELSE 0 END) AS com_erro
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk
    `);

  const s = stat.recordset[0];
  const total = s.total;
  const ativos = s.ativos;

  console.log(`  Total no banco:        ${fmt(total)}`);
  console.log(`  Ativos (não excluídos):${fmt(ativos)}  ${total ? `(${pct(ativos, total)})` : ''}`);
  console.log(`  Excluídos:             ${fmt(s.excluidos)}`);
  console.log('');
  console.log('  Status:');
  console.log(`    EM_ANALISE:          ${fmt(s.em_analise)} ${pct(s.em_analise, ativos)}`);
  console.log(`    APROVADO:            ${fmt(s.aprovados)} ${pct(s.aprovados, ativos)}`);
  console.log(`    PARA_CORRIGIR:       ${fmt(s.para_corrigir)} ${pct(s.para_corrigir, ativos)}`);
  console.log(`    REJEITADO:           ${fmt(s.rejeitados)} ${pct(s.rejeitados, ativos)}`);
  console.log('');
  console.log('  Qualidade:');
  console.log(`    Com lat/long:        ${fmt(s.com_geo)} ${pct(s.com_geo, ativos)}`);
  console.log(`    Sem lat/long:        ${fmt(s.sem_geo)} ${pct(s.sem_geo, ativos)}`);
  console.log(`    Com de-para mapeado: ${fmt(s.com_depara)} ${pct(s.com_depara, ativos)}`);
  console.log(`    Sem de-para:         ${fmt(s.sem_depara)} ${pct(s.sem_depara, ativos)}`);
  console.log(`    Com erro validação:  ${fmt(s.com_erro)} ${pct(s.com_erro, ativos)}`);
  console.log('');
  console.log('  Campos faltantes:');
  console.log(`    Sem código ativo:    ${fmt(s.sem_codigo)}`);
  console.log(`    Sem praça:           ${fmt(s.sem_praca)}`);
  console.log(`    Sem UF:              ${fmt(s.sem_uf)}`);
  console.log(`    Sem ambiente:        ${fmt(s.sem_ambiente)}`);
  console.log(`    Sem formato:         ${fmt(s.sem_formato)}`);
  console.log(`    Sem tipo:            ${fmt(s.sem_tipo)}`);
  console.log(`    Sem valor tabela:    ${fmt(s.sem_valor)}`);

  // 3b. Distribuição por UF/Praça
  sub('3b. Distribuição por UF e Praça');
  const ufs = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 30
        ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'(vazio)') AS uf,
        COUNT(1) AS qtd,
        COUNT(DISTINCT ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)')) AS pracas
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'(vazio)')
      ORDER BY qtd DESC
    `);
  console.log(`  UF                qtd     pracas`);
  ufs.recordset.forEach((r) => {
    console.log(`  ${String(r.uf).padEnd(18)}${String(fmt(r.qtd)).padStart(5)}    ${fmt(r.pracas)}`);
  });

  // 3c. Distribuição por ambiente / formato / tipo
  sub('3c. Distribuição por ambiente / formato / tipo de mídia');
  const ambientes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 20
        ISNULL(NULLIF(LTRIM(RTRIM(mapped_ambiente_st)), ''), ISNULL(NULLIF(LTRIM(RTRIM(ambiente_st)),''),'(vazio)')) AS ambiente,
        COUNT(1) AS qtd,
        SUM(CASE WHEN mapped_bl = 1 THEN 1 ELSE 0 END) AS mapeados
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(mapped_ambiente_st)), ''), ISNULL(NULLIF(LTRIM(RTRIM(ambiente_st)),''),'(vazio)'))
      ORDER BY qtd DESC
    `);
  console.log(`  Ambiente                              qtd  mapeados`);
  ambientes.recordset.forEach((r) => {
    console.log(`  ${String(r.ambiente).padEnd(38)} ${String(fmt(r.qtd)).padStart(5)}     ${fmt(r.mapeados)}`);
  });

  const formatos = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 30
        ISNULL(NULLIF(LTRIM(RTRIM(mapped_formato_st)), ''), ISNULL(NULLIF(LTRIM(RTRIM(formato_midia_st)),''),'(vazio)')) AS formato,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(mapped_formato_st)), ''), ISNULL(NULLIF(LTRIM(RTRIM(formato_midia_st)),''),'(vazio)'))
      ORDER BY qtd DESC
    `);
  console.log(`\n  Formato                               qtd`);
  formatos.recordset.forEach((r) => {
    console.log(`  ${String(r.formato).padEnd(38)} ${String(fmt(r.qtd)).padStart(5)}`);
  });

  // 3d. Códigos ativos duplicados dentro do lote
  sub('3d. Duplicidade de codigo_ativo_st dentro do lote');
  const dups = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 20
        codigo_ativo_st,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY codigo_ativo_st
      HAVING COUNT(1) > 1
      ORDER BY qtd DESC
    `);
  if (dups.recordset.length === 0) {
    console.log(`  ✔ Nenhum código duplicado dentro do lote.`);
  } else {
    console.log(`  ⚠ ${dups.recordset.length} códigos duplicados (top 20):`);
    dups.recordset.forEach((r) => {
      console.log(`    ${String(r.codigo_ativo_st).padEnd(50)} ${fmt(r.qtd)}`);
    });
  }

  // 3e. Itens com erro de validação
  sub('3e. Itens com erro de validação');
  const erros = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 10
        item_pk, codigo_ativo_st, status_st, erroValidacao_st
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
        AND erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(erroValidacao_st)) <> ''
    `);
  if (erros.recordset.length === 0) {
    console.log(`  ✔ Nenhum erro de validação registrado.`);
  } else {
    erros.recordset.forEach((r) => {
      console.log(`    #${r.item_pk} ${r.codigo_ativo_st} [${r.status_st}] → ${r.erroValidacao_st}`);
    });
  }

  // 3f. Amostra de 5 linhas para inspeção visual
  sub('3f. Amostra (5 primeiros itens)');
  const sample = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 5
        item_pk, codigo_ativo_st, praca_st, uf_st,
        ambiente_st, formato_midia_st, tipo_midia_st,
        latitude_vl, longitude_vl, valor_tabela_vl, status_st, mapped_bl
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      ORDER BY item_pk ASC
    `);
  sample.recordset.forEach((r) => {
    console.log(`\n  Item #${r.item_pk}`);
    console.log(`    codigo:    ${r.codigo_ativo_st}`);
    console.log(`    praça/uf:  ${r.praca_st || '—'} / ${r.uf_st || '—'}`);
    console.log(`    ambiente:  ${r.ambiente_st || '—'}`);
    console.log(`    formato:   ${r.formato_midia_st || '—'}`);
    console.log(`    tipo:      ${r.tipo_midia_st || '—'}`);
    console.log(`    geo:       ${r.latitude_vl || '—'}, ${r.longitude_vl || '—'}`);
    console.log(`    valor:     ${r.valor_tabela_vl ? `R$ ${Number(r.valor_tabela_vl).toFixed(2)}` : '—'}`);
    console.log(`    status:    ${r.status_st}  (mapeado: ${r.mapped_bl ? 'sim' : 'não'})`);
  });

  // ── 4. COMPARAÇÃO COM LEGADO (bancoAtivosJoin_ft)
  header(`4. COMPARAÇÃO COM LEGADO [bancoAtivosJoin_ft]`);

  // Tenta achar o exibidor no legado pelo nome (heurística — pois o legado tem exibidor_st)
  const legadoCount = await pool.request()
    .input('exibidor_fk', sql.Int, exibidorFk)
    .input('nome', sql.NVarChar(255), `%${exibidor.nome_fantasia_st || exibidor.nome_st}%`)
    .query(`
      SELECT
        COUNT(CASE WHEN exibidor_fk = @exibidor_fk THEN 1 END)               AS por_fk,
        COUNT(CASE WHEN exibidor_st LIKE @nome THEN 1 END)                   AS por_nome,
        COUNT(CASE WHEN valid_bl = 1 AND exibidor_fk = @exibidor_fk THEN 1 END) AS por_fk_validos,
        COUNT(DISTINCT CASE WHEN exibidor_fk = @exibidor_fk THEN cidade_st END) AS pracas_fk
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
    `);
  const lc = legadoCount.recordset[0];
  console.log(`  Pontos no legado pelo exibidor_fk = ${exibidorFk}:`);
  console.log(`    Total:               ${fmt(lc.por_fk)}`);
  console.log(`    Válidos (valid_bl=1):${fmt(lc.por_fk_validos)}`);
  console.log(`    Praças (cidades):    ${fmt(lc.pracas_fk)}`);
  console.log(`  Pontos no legado por nome (LIKE "${exibidor.nome_fantasia_st || exibidor.nome_st}"):`);
  console.log(`    Total:               ${fmt(lc.por_nome)}`);

  console.log('\n  Comparativo de tamanho:');
  console.log(`    Legado válido:       ${fmt(lc.por_fk_validos)}`);
  console.log(`    Novo (lote ativo):   ${fmt(ativos)}`);
  if (lc.por_fk_validos > 0 && ativos > 0) {
    const delta = ativos - lc.por_fk_validos;
    const sinal = delta >= 0 ? '+' : '';
    console.log(`    Delta:               ${sinal}${fmt(delta)} (${pct(Math.abs(delta), lc.por_fk_validos)})`);
  }

  // 4b. Códigos no novo que JÁ EXISTEM no legado
  sub('4b. Códigos do novo que já existem no legado');
  const overlap = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('exibidor_fk', sql.Int, exibidorFk)
    .query(`
      SELECT
        COUNT(DISTINCT i.codigo_ativo_st) AS codigos_no_lote,
        COUNT(DISTINCT b.code)            AS codigos_legado,
        COUNT(DISTINCT CASE WHEN b.code IS NOT NULL THEN i.codigo_ativo_st END) AS codigos_match
      FROM [serv_product_be180].[exibidor_inventario_item_dm] i
      LEFT JOIN [serv_product_be180].[bancoAtivosJoin_ft] b
        ON b.code = i.codigo_ativo_st
       AND b.exibidor_fk = @exibidor_fk
       AND b.valid_bl = 1
      WHERE i.lote_fk = @lote_pk AND i.delete_bl = 0
    `);
  const ov = overlap.recordset[0];
  console.log(`    Códigos distintos no lote:        ${fmt(ov.codigos_no_lote)}`);
  console.log(`    Códigos distintos no legado:      ${fmt(ov.codigos_legado)}`);
  console.log(`    Códigos do lote que match legado: ${fmt(ov.codigos_match)} ${pct(ov.codigos_match, ov.codigos_no_lote)}`);
  console.log(`    Códigos novos (não existem no legado): ${fmt(ov.codigos_no_lote - ov.codigos_match)}`);

  // ── 5. Mapeamentos (de-para) e Places enriquecimento
  header(`5. MAPEAMENTO (DE-PARA) E ENRIQUECIMENTO`);

  const semDeparaTop = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 15
        ISNULL(NULLIF(LTRIM(RTRIM(ambiente_st)),''),'(vazio)')      AS ambiente,
        ISNULL(NULLIF(LTRIM(RTRIM(formato_midia_st)),''),'(vazio)') AS formato,
        ISNULL(NULLIF(LTRIM(RTRIM(tipo_midia_st)),''),'(vazio)')    AS tipo,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0 AND mapped_bl = 0
      GROUP BY
        ISNULL(NULLIF(LTRIM(RTRIM(ambiente_st)),''),'(vazio)'),
        ISNULL(NULLIF(LTRIM(RTRIM(formato_midia_st)),''),'(vazio)'),
        ISNULL(NULLIF(LTRIM(RTRIM(tipo_midia_st)),''),'(vazio)')
      ORDER BY qtd DESC
    `);
  if (semDeparaTop.recordset.length === 0) {
    console.log(`  ✔ Todos os itens têm de-para mapeado.`);
  } else {
    console.log(`  Combinações sem de-para (top 15):\n`);
    console.log(`  ${'Ambiente'.padEnd(20)} ${'Formato'.padEnd(20)} ${'Tipo'.padEnd(20)} qtd`);
    semDeparaTop.recordset.forEach((r) => {
      console.log(`  ${String(r.ambiente).padEnd(20)} ${String(r.formato).padEnd(20)} ${String(r.tipo).padEnd(20)} ${fmt(r.qtd)}`);
    });
  }

  // 5b. Places enriquecimento
  sub('5b. Enriquecimento Google Places');
  const places = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT
        SUM(CASE WHEN p.status_st = 'PENDENTE' THEN 1 ELSE 0 END) AS pendente,
        SUM(CASE WHEN p.status_st = 'PROCESSANDO' THEN 1 ELSE 0 END) AS processando,
        SUM(CASE WHEN p.status_st = 'CONCLUIDO' THEN 1 ELSE 0 END) AS concluido,
        SUM(CASE WHEN p.status_st = 'ERRO' THEN 1 ELSE 0 END) AS erro,
        COUNT(1) AS total
      FROM [serv_product_be180].[exibidor_places_enriquecimento_dm] p
      JOIN [serv_product_be180].[exibidor_inventario_item_dm] i ON i.item_pk = p.item_fk
      WHERE i.lote_fk = @lote_pk
    `);
  const pl = places.recordset[0];
  if (!pl.total) {
    console.log(`  ⚠ Nenhum item enfileirado para enriquecimento Places.`);
  } else {
    console.log(`    Total enfileirados:  ${fmt(pl.total)}`);
    console.log(`    PENDENTE:            ${fmt(pl.pendente)}`);
    console.log(`    PROCESSANDO:         ${fmt(pl.processando)}`);
    console.log(`    CONCLUIDO:           ${fmt(pl.concluido)}`);
    console.log(`    ERRO:                ${fmt(pl.erro)}`);
  }

  // ── 6. COMENTÁRIOS NA SOLICITAÇÃO
  header(`6. HISTÓRICO DE COMENTÁRIOS`);
  const coms = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT autor_st, mensagem_st, dataCriacao_dh
      FROM [serv_product_be180].[exibidor_solicitacao_comentario_dm]
      WHERE lote_fk = @lote_pk
      ORDER BY comentario_pk ASC
    `);
  if (coms.recordset.length === 0) {
    console.log(`  Nenhum comentário registrado.`);
  } else {
    coms.recordset.forEach((c) => {
      console.log(`  • [${new Date(c.dataCriacao_dh).toLocaleString('pt-BR')}] ${c.autor_st}: ${c.mensagem_st}`);
    });
  }

  // ── 7. RESUMO / VEREDITO
  header(`7. RESUMO EXECUTIVO`);
  const flags = [];
  const ok = [];

  if (s.com_geo === ativos) ok.push('100% dos itens têm lat/long');
  else if (s.sem_geo > 0) flags.push(`${fmt(s.sem_geo)} itens (${pct(s.sem_geo, ativos)}) sem lat/long`);

  if (s.com_depara === ativos) ok.push('100% dos itens têm de-para mapeado');
  else if (s.sem_depara > 0) flags.push(`${fmt(s.sem_depara)} itens (${pct(s.sem_depara, ativos)}) sem de-para`);

  if (s.com_erro > 0) flags.push(`${fmt(s.com_erro)} itens com erro de validação`);
  else ok.push('Sem erros de validação');

  if (s.sem_codigo > 0) flags.push(`${fmt(s.sem_codigo)} itens sem código`);
  if (s.sem_praca > 0) flags.push(`${fmt(s.sem_praca)} itens sem praça`);
  if (s.sem_uf > 0) flags.push(`${fmt(s.sem_uf)} itens sem UF`);
  if (s.sem_valor > 0) flags.push(`${fmt(s.sem_valor)} itens sem valor de tabela`);
  if (dups.recordset.length > 0) flags.push(`${dups.recordset.length} códigos duplicados`);

  console.log('  Pontos positivos:');
  if (ok.length === 0) console.log('    (nenhum)');
  else ok.forEach((m) => console.log(`    ✔ ${m}`));

  console.log('\n  Pontos de atenção:');
  if (flags.length === 0) console.log('    ✔ Nada relevante.');
  else flags.forEach((m) => console.log(`    ⚠ ${m}`));

  console.log('\n  Comparação com legado:');
  console.log(`    Legado válido:    ${fmt(lc.por_fk_validos)}`);
  console.log(`    Novo (lote):      ${fmt(ativos)}`);
  console.log(`    Match com legado: ${fmt(ov.codigos_match)} códigos (${pct(ov.codigos_match, ov.codigos_no_lote)})`);

  console.log('\n  Recomendação para substituição do banco de ativos:');
  if (flags.length === 0 && s.com_geo === ativos && s.com_depara === ativos) {
    console.log('    🟢 PRONTO — todos os indicadores positivos, pode-se planejar a substituição.');
  } else if (s.sem_geo > ativos * 0.05 || s.sem_depara > ativos * 0.05 || s.com_erro > 0) {
    console.log('    🔴 NÃO PRONTO — há gaps de qualidade que precisam ser revisados antes da substituição.');
  } else {
    console.log('    🟡 ATENÇÃO — qualidade aceitável, mas há pontos de revisão antes de substituir o banco.');
  }

  console.log('\n');
  await pool.close();
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  console.error(err.stack);
  process.exit(1);
});
