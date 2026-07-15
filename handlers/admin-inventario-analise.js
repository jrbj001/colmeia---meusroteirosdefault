const { sql, getPool } = require('./db');

function pct(parte, total) {
  if (!total) return 0;
  return Number(((parte / total) * 100).toFixed(2));
}

// ───────────────────────────────────────────────────────────────────────────
// Lista todos os lotes (visão admin) com indicadores de qualidade resumidos
// ───────────────────────────────────────────────────────────────────────────
async function listarLotes(req, res, pool) {
  const status = String(req.query.status || '').trim();
  const exibidorFk = Number(req.query.exibidor_fk || 0) || null;

  const request = pool.request();
  const filtros = [];
  if (status) {
    request.input('status', sql.NVarChar(40), status);
    filtros.push('l.status_st = @status');
  }
  if (exibidorFk) {
    request.input('exibidor_fk', sql.Int, exibidorFk);
    filtros.push('l.exibidor_fk = @exibidor_fk');
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const result = await request.query(`
    SELECT
      l.lote_pk,
      l.exibidor_fk,
      e.nome_st                     AS exibidor_nome_st,
      e.nome_fantasia_st            AS exibidor_fantasia_st,
      l.arquivo_st,
      l.uploadedBy_st,
      l.status_st,
      l.totalRegistros_vl,
      l.processados_vl,
      l.dataCriacao_dh,
      l.dataAtualizacao_dh,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0
      ) AS itensAtivos_vl,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0
          AND i.latitude_vl IS NOT NULL AND i.longitude_vl IS NOT NULL
          AND CAST(i.latitude_vl AS FLOAT) <> 0 AND CAST(i.longitude_vl AS FLOAT) <> 0
      ) AS comGeo_vl,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0 AND i.mapped_bl = 1
      ) AS comDePara_vl,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0
          AND (i.codigo_ativo_st IS NULL OR i.codigo_ativo_st LIKE 'LINHA[_]%')
      ) AS semCodigo_vl,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0 AND i.valor_tabela_vl IS NULL
      ) AS semValor_vl,
      (
        SELECT COUNT(1)
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        WHERE i.lote_fk = l.lote_pk AND i.delete_bl = 0
          AND i.erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(i.erroValidacao_st)) <> ''
      ) AS comErro_vl
    FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] l
    LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
    ${where}
    ORDER BY l.lote_pk DESC
  `);

  const data = result.recordset.map((r) => {
    const ativos = r.itensAtivos_vl || 0;
    return {
      ...r,
      qualidade: {
        geo_pct: pct(r.comGeo_vl, ativos),
        depara_pct: pct(r.comDePara_vl, ativos),
        sem_codigo_pct: pct(r.semCodigo_vl, ativos),
        sem_valor_pct: pct(r.semValor_vl, ativos),
        com_erro_pct: pct(r.comErro_vl, ativos),
      },
    };
  });

  return res.status(200).json({ success: true, data });
}

// ───────────────────────────────────────────────────────────────────────────
// Análise completa de um lote (espelha o script auditar-envio-exibidor.js)
// ───────────────────────────────────────────────────────────────────────────
async function analisarLote(req, res, pool) {
  const lotePk = Number(req.query.lote_pk || 0);
  if (!lotePk) {
    return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });
  }

  // 1. Lote + exibidor
  const loteRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT
        l.lote_pk, l.exibidor_fk, l.arquivo_st, l.uploadedBy_st, l.status_st,
        l.totalRegistros_vl, l.processados_vl, l.pendentes_vl, l.rejeitados_vl,
        l.observacao_st, l.dataCriacao_dh, l.dataAtualizacao_dh,
        e.nome_st AS exibidor_nome_st, e.nome_fantasia_st AS exibidor_fantasia_st,
        e.codigo_st AS exibidor_codigo_st, e.cnpj_st AS exibidor_cnpj_st,
        (SELECT TOP 1 d.dominio_st
         FROM [serv_product_be180].[exibidor_dominio_dm] d
         WHERE d.exibidor_fk = e.exibidor_pk AND d.delete_bl = 0
         ORDER BY d.primario_bl DESC, d.dominio_pk ASC) AS exibidor_dominio_st
      FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] l
      LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
      WHERE l.lote_pk = @lote_pk
    `);

  const lote = loteRes.recordset[0];
  if (!lote) {
    return res.status(404).json({ success: false, error: 'Lote não encontrado' });
  }

  const exibidorFk = lote.exibidor_fk;

  // 2. Visão geral dos itens (qualidade)
  const visaoRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT
        COUNT(1)                                                                           AS total,
        SUM(CASE WHEN delete_bl = 1 THEN 1 ELSE 0 END)                                     AS excluidos,
        SUM(CASE WHEN delete_bl = 0 THEN 1 ELSE 0 END)                                     AS ativos,
        SUM(CASE WHEN delete_bl = 0 AND status_st = 'EM_ANALISE'    THEN 1 ELSE 0 END)     AS em_analise,
        SUM(CASE WHEN delete_bl = 0 AND status_st = 'APROVADO'      THEN 1 ELSE 0 END)     AS aprovados,
        SUM(CASE WHEN delete_bl = 0 AND status_st = 'PARA_CORRIGIR' THEN 1 ELSE 0 END)     AS para_corrigir,
        SUM(CASE WHEN delete_bl = 0 AND status_st = 'REJEITADO'     THEN 1 ELSE 0 END)     AS rejeitados,
        SUM(CASE WHEN delete_bl = 0 AND mapped_bl = 1 THEN 1 ELSE 0 END)                   AS com_depara,
        SUM(CASE WHEN delete_bl = 0 AND mapped_bl = 0 THEN 1 ELSE 0 END)                   AS sem_depara,
        SUM(CASE WHEN delete_bl = 0
                  AND latitude_vl IS NOT NULL AND longitude_vl IS NOT NULL
                  AND CAST(latitude_vl AS FLOAT) <> 0 AND CAST(longitude_vl AS FLOAT) <> 0 THEN 1 ELSE 0 END) AS com_geo,
        SUM(CASE WHEN delete_bl = 0
                  AND (latitude_vl IS NULL OR longitude_vl IS NULL
                    OR CAST(latitude_vl AS FLOAT) = 0 OR CAST(longitude_vl AS FLOAT) = 0) THEN 1 ELSE 0 END)  AS sem_geo,
        SUM(CASE WHEN delete_bl = 0
                  AND (codigo_ativo_st IS NULL OR LTRIM(RTRIM(codigo_ativo_st)) = '' OR codigo_ativo_st LIKE 'LINHA[_]%') THEN 1 ELSE 0 END) AS sem_codigo,
        SUM(CASE WHEN delete_bl = 0 AND (praca_st IS NULL OR LTRIM(RTRIM(praca_st)) = '') THEN 1 ELSE 0 END)         AS sem_praca,
        SUM(CASE WHEN delete_bl = 0 AND (uf_st IS NULL OR LTRIM(RTRIM(uf_st)) = '') THEN 1 ELSE 0 END)               AS sem_uf,
        SUM(CASE WHEN delete_bl = 0 AND (ambiente_st IS NULL OR LTRIM(RTRIM(ambiente_st)) = '') THEN 1 ELSE 0 END)   AS sem_ambiente,
        SUM(CASE WHEN delete_bl = 0 AND (formato_midia_st IS NULL OR LTRIM(RTRIM(formato_midia_st)) = '') THEN 1 ELSE 0 END) AS sem_formato,
        SUM(CASE WHEN delete_bl = 0 AND (tipo_midia_st IS NULL OR LTRIM(RTRIM(tipo_midia_st)) = '') THEN 1 ELSE 0 END) AS sem_tipo,
        SUM(CASE WHEN delete_bl = 0 AND valor_tabela_vl IS NULL THEN 1 ELSE 0 END)                                  AS sem_valor,
        SUM(CASE WHEN delete_bl = 0
                  AND erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(erroValidacao_st)) <> '' THEN 1 ELSE 0 END)      AS com_erro
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk
    `);
  const visao = visaoRes.recordset[0] || {};

  // 3. Distribuições
  const ufsRes = await pool.request()
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

  const pracasRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 50
        ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)') AS praca,
        ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'') AS uf,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)'), ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'')
      ORDER BY qtd DESC
    `);

  const ambientesRes = await pool.request()
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

  const formatosRes = await pool.request()
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

  const tiposRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 30
        REPLACE(REPLACE(ISNULL(tipo_midia_st, '(vazio)'), CHAR(13), ' '), CHAR(10), ' ') AS tipo,
        COUNT(1) AS qtd,
        SUM(CASE WHEN mapped_bl = 1 THEN 1 ELSE 0 END) AS mapeados
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY tipo_midia_st
      ORDER BY qtd DESC
    `);

  // 4. Duplicidades de código
  const dupsRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 20 codigo_ativo_st, COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      GROUP BY codigo_ativo_st
      HAVING COUNT(1) > 1
      ORDER BY qtd DESC
    `);

  // 5. Erros de validação
  const errosRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 30 item_pk, codigo_ativo_st, status_st, erroValidacao_st
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
        AND erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(erroValidacao_st)) <> ''
    `);

  // 6. Combinações sem de-para
  const semDeparaRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 30
        REPLACE(REPLACE(ISNULL(NULLIF(LTRIM(RTRIM(ambiente_st)),''),'(vazio)'), CHAR(13),' '), CHAR(10),' ') AS ambiente,
        REPLACE(REPLACE(ISNULL(NULLIF(LTRIM(RTRIM(formato_midia_st)),''),'(vazio)'), CHAR(13),' '), CHAR(10),' ') AS formato,
        REPLACE(REPLACE(ISNULL(NULLIF(LTRIM(RTRIM(tipo_midia_st)),''),'(vazio)'), CHAR(13),' '), CHAR(10),' ') AS tipo,
        COUNT(1) AS qtd
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0 AND mapped_bl = 0
      GROUP BY ambiente_st, formato_midia_st, tipo_midia_st
      ORDER BY qtd DESC
    `);

  // 7. Amostra (10 primeiros itens)
  const amostraRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 10
        item_pk, codigo_ativo_st, praca_st, uf_st,
        ambiente_st, formato_midia_st, tipo_midia_st,
        CAST(latitude_vl AS FLOAT)  AS latitude,
        CAST(longitude_vl AS FLOAT) AS longitude,
        valor_tabela_vl, status_st, mapped_bl
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      ORDER BY item_pk ASC
    `);

  // 8. Comparativo com legado (bancoAtivosJoin_ft)
  let legado = null;
  let comparativoTipos = [];
  let pracasReconciliacao = [];
  if (exibidorFk) {
    const reqL = pool.request()
      .input('exibidor_fk', sql.Int, exibidorFk)
      .input('lote_pk', sql.Int, lotePk);

    const lc = await reqL.query(`
      SELECT
        COUNT(CASE WHEN exibidor_fk = @exibidor_fk AND valid_bl = 1 THEN 1 END) AS legado_validos,
        COUNT(DISTINCT CASE WHEN exibidor_fk = @exibidor_fk AND valid_bl = 1 THEN cidade_st END) AS legado_pracas
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
    `);

    const ov = await reqL.query(`
      SELECT
        COUNT(DISTINCT i.codigo_ativo_st) AS codigos_lote,
        COUNT(DISTINCT CASE WHEN b.code IS NOT NULL THEN i.codigo_ativo_st END) AS codigos_match
      FROM [serv_product_be180].[exibidor_inventario_item_dm] i
      LEFT JOIN [serv_product_be180].[bancoAtivosJoin_ft] b
        ON b.code = i.codigo_ativo_st AND b.exibidor_fk = @exibidor_fk AND b.valid_bl = 1
      WHERE i.lote_fk = @lote_pk AND i.delete_bl = 0
    `);

    const inter = await reqL.query(`
      WITH cidNovo AS (
        SELECT DISTINCT LOWER(LTRIM(RTRIM(praca_st))) AS cidade
        FROM [serv_product_be180].[exibidor_inventario_item_dm]
        WHERE lote_fk = @lote_pk AND delete_bl = 0 AND praca_st IS NOT NULL
      ),
      cidLeg AS (
        SELECT DISTINCT LOWER(LTRIM(RTRIM(cidade_st))) AS cidade
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1 AND exibidor_fk = @exibidor_fk AND cidade_st IS NOT NULL
      )
      SELECT
        (SELECT COUNT(1) FROM cidNovo) AS novo_cidades,
        (SELECT COUNT(1) FROM cidLeg)  AS legado_cidades,
        (SELECT COUNT(1) FROM cidNovo n INNER JOIN cidLeg l ON l.cidade = n.cidade) AS comum,
        (SELECT COUNT(1) FROM cidNovo n WHERE NOT EXISTS (SELECT 1 FROM cidLeg l WHERE l.cidade = n.cidade)) AS apenas_novo,
        (SELECT COUNT(1) FROM cidLeg  l WHERE NOT EXISTS (SELECT 1 FROM cidNovo n WHERE n.cidade = l.cidade)) AS apenas_legado
    `);

    const faltaRes = await reqL.query(`
      SELECT TOP 30 b.cidade_st, b.estado_st, COUNT(1) AS qtd
      FROM [serv_product_be180].[bancoAtivosJoin_ft] b
      WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk
        AND b.cidade_st IS NOT NULL AND LTRIM(RTRIM(b.cidade_st)) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM [serv_product_be180].[exibidor_inventario_item_dm] i
          WHERE i.lote_fk = @lote_pk AND i.delete_bl = 0
            AND LOWER(LTRIM(RTRIM(i.praca_st))) = LOWER(LTRIM(RTRIM(b.cidade_st)))
        )
      GROUP BY b.cidade_st, b.estado_st
      ORDER BY qtd DESC
    `);

    legado = {
      validos: Number(lc.recordset[0]?.legado_validos || 0),
      pracas: Number(lc.recordset[0]?.legado_pracas || 0),
      codigos_lote: Number(ov.recordset[0]?.codigos_lote || 0),
      codigos_match: Number(ov.recordset[0]?.codigos_match || 0),
      cidades: inter.recordset[0] || {},
      cidades_faltantes: faltaRes.recordset,
    };

    // 8b. Tipos de mídia já cadastrados no banco de ativos atual (para comparativo lado a lado).
    // IMPORTANTE: não filtra por exibidor_fk — o tipo importado deve ser comparado ao cadastro
    // (catálogo de tipos usado por todos os exibidores), não apenas ao histórico deste exibidor.
    // Se comparássemos só com o legado dele, um exibidor sem pontos anteriores (ou novo) teria
    // 100% dos tipos marcados como "sem equivalente — tipo novo", mesmo que sejam tipos padrão
    // (ex.: "Frontlight", "Painel de LED") já usados por outros exibidores no cadastro.
    const tiposCadastroRes = await pool.request().query(`
      SELECT tipoMidia_st AS tipo, COUNT(1) AS qtd
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE valid_bl = 1
        AND tipoMidia_st IS NOT NULL AND LTRIM(RTRIM(tipoMidia_st)) <> ''
      GROUP BY tipoMidia_st
      ORDER BY qtd DESC
    `);
    const tiposCadastro = tiposCadastroRes.recordset;

    // Heurística: para cada tipo do novo, encontrar o tipo do cadastro mais similar
    // (matching por palavras-chave normalizadas — tira acento, baixa caixa, splita por espaço/-)
    const norm = (s) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    comparativoTipos = tiposRes.recordset.map((novo) => {
      const tokensNovo = new Set(norm(novo.tipo));
      const candidatos = tiposCadastro
        .map((cad) => {
          const tokensCad = norm(cad.tipo);
          const matches = tokensCad.filter((t) => tokensNovo.has(t)).length;
          return { tipo: cad.tipo, qtd: cad.qtd, score: matches };
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score || b.qtd - a.qtd);
      const sugestao = candidatos[0] || null;
      return {
        tipo_novo: novo.tipo,
        qtd_novo: novo.qtd,
        mapeados_novo: novo.mapeados,
        sugestao_cadastro: sugestao ? { tipo: sugestao.tipo, qtd: sugestao.qtd } : null,
      };
    });

    // 8c. Reconciliação de praças: para cada praça do novo que não bate exatamente,
    // encontrar a cidade do legado mais parecida (substring match, sem acento)
    const pracasNovasRes = await pool.request()
      .input('lote_pk', sql.Int, lotePk)
      .query(`
        SELECT
          ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)') AS praca,
          ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'') AS uf,
          COUNT(1) AS qtd
        FROM [serv_product_be180].[exibidor_inventario_item_dm]
        WHERE lote_fk = @lote_pk AND delete_bl = 0
        GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(praca_st)),''),'(vazio)'), ISNULL(NULLIF(LTRIM(RTRIM(uf_st)),''),'')
      `);
    // Compara contra o banco GLOBAL (todas as cidades canônicas da Colmeia),
    // não apenas o legado deste exibidor — assim praças corretas mas novas
    // para o exibidor não aparecem como "NOVA" após correção.
    const cidadesLegadoRes = await pool.request()
      .query(`
        SELECT cidade_st AS cidade, estado_st AS uf, COUNT(1) AS qtd
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1
          AND cidade_st IS NOT NULL AND LTRIM(RTRIM(cidade_st)) <> ''
        GROUP BY cidade_st, estado_st
      `);
    const normStr = (s) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s*\([^)]+\)\s*/g, ' ')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cidadesLegado = cidadesLegadoRes.recordset.map((c) => ({ ...c, _norm: normStr(c.cidade) }));

    pracasReconciliacao = pracasNovasRes.recordset
      .map((p) => {
        const pn = normStr(p.praca);
        const exato = cidadesLegado.find((c) => c._norm === pn);
        if (exato) {
          return { praca_novo: p.praca, uf_novo: p.uf, qtd_novo: p.qtd, status: 'match', cidade_legado: exato.cidade, qtd_legado: exato.qtd };
        }
        // tenta parecida (uma contém a outra)
        const parecida = cidadesLegado.find((c) => {
          if (!c._norm || !pn) return false;
          if (c.uf && p.uf && c.uf !== p.uf) return false;
          return c._norm.includes(pn) || pn.includes(c._norm);
        });
        if (parecida) {
          return { praca_novo: p.praca, uf_novo: p.uf, qtd_novo: p.qtd, status: 'parecida', cidade_legado: parecida.cidade, qtd_legado: parecida.qtd };
        }
        return { praca_novo: p.praca, uf_novo: p.uf, qtd_novo: p.qtd, status: 'nova', cidade_legado: null, qtd_legado: null };
      })
      .sort((a, b) => {
        const ord = { parecida: 0, nova: 1, match: 2 };
        return (ord[a.status] - ord[b.status]) || (b.qtd_novo - a.qtd_novo);
      });
  }

  // 9. Places enriquecimento
  const placesRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN p.status_st = 'PENDENTE'    THEN 1 ELSE 0 END) AS pendente,
        SUM(CASE WHEN p.status_st = 'PROCESSANDO' THEN 1 ELSE 0 END) AS processando,
        SUM(CASE WHEN p.status_st = 'CONCLUIDO'   THEN 1 ELSE 0 END) AS concluido,
        SUM(CASE WHEN p.status_st = 'ERRO'        THEN 1 ELSE 0 END) AS erro
      FROM [serv_product_be180].[exibidor_places_enriquecimento_dm] p
      JOIN [serv_product_be180].[exibidor_inventario_item_dm] i ON i.item_pk = p.item_fk
      WHERE i.lote_fk = @lote_pk
    `);

  // 10. Comentários (histórico de feedback admin↔exibidor)
  const comentariosRes = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT comentario_pk, autor_st, mensagem_st, dataCriacao_dh
      FROM [serv_product_be180].[exibidor_solicitacao_comentario_dm]
      WHERE lote_fk = @lote_pk
      ORDER BY comentario_pk ASC
    `);

  // 11. Diagnósticos ricos: cada flag tem mensagem + causa provável + ação concreta
  const ativos = Number(visao.ativos || 0);
  const flags = [];
  const positivos = [];
  const diagnosticos = [];

  // Lat/Long
  if (ativos > 0 && Number(visao.com_geo || 0) === ativos) {
    positivos.push('100% dos itens têm lat/long');
  } else if (Number(visao.sem_geo || 0) > 0) {
    flags.push({ tipo: 'critico', mensagem: `${visao.sem_geo} itens (${pct(visao.sem_geo, ativos)}%) sem lat/long` });
    diagnosticos.push({
      tipo: 'critico',
      titulo: `${visao.sem_geo} itens sem lat/long`,
      causa: 'A planilha foi enviada com células de latitude/longitude vazias ou zeradas. Sem geolocalização os pontos não podem aparecer no mapa nem ser usados em roteiros.',
      acao: 'Pedir ao exibidor que reenvie o arquivo preenchendo lat/long em todos os pontos.',
      responsavel: 'EXIBIDOR',
      bloqueia: true,
    });
  }

  // De-para
  if (ativos > 0 && Number(visao.com_depara || 0) === ativos) {
    positivos.push('100% dos itens têm de-para mapeado');
  } else if (Number(visao.sem_depara || 0) > 0) {
    flags.push({ tipo: 'critico', mensagem: `${visao.sem_depara} itens (${pct(visao.sem_depara, ativos)}%) sem de-para` });
    const combinacoesUnicas = semDeparaRes.recordset.length;
    diagnosticos.push({
      tipo: 'critico',
      titulo: `${visao.sem_depara} itens sem regra de-para`,
      causa: `Os tipos de mídia do template 2026 ainda não estão mapeados para a nomenclatura padrão do produto. Existem ${combinacoesUnicas} combinações distintas (ambiente / formato / tipo) sem regra cadastrada — sem isso, os pontos não podem ser usados em roteiros pois o produto não sabe a que categoria eles pertencem.`,
      acao: `Cadastrar ${combinacoesUnicas} regras de-para na tabela exibidor_midia_depara_dm. Use a seção "Comparativo de tipos vs legado" abaixo como referência para o mapeamento.`,
      responsavel: 'BE180',
      bloqueia: true,
    });
  }

  // Erros de validação
  if (Number(visao.com_erro || 0) > 0) {
    flags.push({ tipo: 'critico', mensagem: `${visao.com_erro} itens com erro de validação` });
    diagnosticos.push({
      tipo: 'critico',
      titulo: `${visao.com_erro} itens com erro de validação`,
      causa: 'Itens marcados com erroValidacao_st preenchido durante o processamento.',
      acao: 'Revisar individualmente cada item na seção "Erros de validação" abaixo e decidir entre exigir correção do exibidor ou rejeitar os itens.',
      responsavel: 'BE180',
      bloqueia: true,
    });
  } else {
    positivos.push('Sem erros de validação');
  }

  // Sem código
  if (Number(visao.sem_codigo || 0) > 0) {
    flags.push({ tipo: 'atencao', mensagem: `${visao.sem_codigo} itens sem código de ativo` });
    diagnosticos.push({
      tipo: 'atencao',
      titulo: `${visao.sem_codigo} itens sem código de ativo`,
      causa: 'A coluna "codigo_ativo" da planilha não foi preenchida. O sistema gerou códigos automáticos ("LINHA_1", "LINHA_2", etc) para não quebrar a importação, mas isso impede o match com o legado e o controle de duplicidade entre envios futuros.',
      acao: 'Pedir ao exibidor que preencha a coluna de código identificador único de cada ponto (geralmente é um SKU/ID interno do exibidor) e reenvie o arquivo.',
      responsavel: 'EXIBIDOR',
      bloqueia: false,
    });
  }

  // Sem valor de tabela
  if (Number(visao.sem_valor || 0) > 0) {
    flags.push({ tipo: 'atencao', mensagem: `${visao.sem_valor} itens sem valor de tabela` });
    diagnosticos.push({
      tipo: 'atencao',
      titulo: `${visao.sem_valor} itens sem valor de tabela`,
      causa: 'A coluna "valor_tabela" não foi preenchida. Sem isso, não é possível calcular o valor comercial dos roteiros que incluírem estes pontos.',
      acao: 'Pedir ao exibidor que preencha o valor_tabela (em R$) de cada ponto.',
      responsavel: 'EXIBIDOR',
      bloqueia: false,
    });
  }

  if (Number(visao.sem_praca || 0) > 0) flags.push({ tipo: 'atencao', mensagem: `${visao.sem_praca} itens sem praça` });
  if (Number(visao.sem_uf || 0) > 0)    flags.push({ tipo: 'atencao', mensagem: `${visao.sem_uf} itens sem UF` });

  // Duplicidades
  if (dupsRes.recordset.length > 0) {
    flags.push({ tipo: 'atencao', mensagem: `${dupsRes.recordset.length} códigos duplicados` });
    diagnosticos.push({
      tipo: 'atencao',
      titulo: `${dupsRes.recordset.length} códigos de ativo duplicados`,
      causa: 'O mesmo codigo_ativo aparece em mais de uma linha do arquivo, o que indica duplicidade de cadastro.',
      acao: 'Pedir ao exibidor para revisar os códigos repetidos e enviar uma versão corrigida.',
      responsavel: 'EXIBIDOR',
      bloqueia: false,
    });
  }

  // Volume vs legado
  if (legado && legado.validos > 0) {
    const delta = ativos - legado.validos;
    const perdaPct = legado.validos > 0 ? Math.abs(delta) / legado.validos : 0;
    if (delta < 0 && perdaPct > 0.1) {
      diagnosticos.push({
        tipo: 'atencao',
        titulo: `Volume ${perdaPct >= 0.3 ? 'muito ' : ''}menor que o legado`,
        causa: `O envio tem ${ativos} pontos contra ${legado.validos} no banco atual (${(perdaPct * 100).toFixed(1)}% a menos). Isto pode ser intencional (descontinuação de pontos) ou um upload incompleto. Há ${legado.cidades?.apenas_legado || 0} cidades inteiras do legado que não vieram.`,
        acao: 'Confirmar com o exibidor se a redução é intencional. Se sim, pedir uma lista dos códigos descontinuados; se não, pedir reenvio com a base completa.',
        responsavel: 'BE180',
        bloqueia: false,
      });
    }
  }

  // Praças com nomenclatura inconsistente
  const pracasParecidas = pracasReconciliacao.filter((p) => p.status === 'parecida');
  if (pracasParecidas.length > 0) {
    diagnosticos.push({
      tipo: 'atencao',
      titulo: `${pracasParecidas.length} praças com nomenclatura diferente do legado`,
      causa: 'Algumas praças do envio parecem se referir a cidades já existentes no legado, mas com nome ligeiramente diferente (ex: "Brasília Relógio" vs "Brasília", "Rio de Janeiro (Banca)" vs "Rio de Janeiro"). Isso impede a contagem correta de cobertura geográfica.',
      acao: 'Decidir com o exibidor: ou padronizar para o nome canônico (cidade) ou registrar como subdivisões intencionais (subpraça). Ver tabela "Reconciliação de praças" abaixo.',
      responsavel: 'BE180',
      bloqueia: false,
    });
  }

  // Rastreabilidade do upload
  if (!lote.uploadedBy_st) {
    diagnosticos.push({
      tipo: 'atencao',
      titulo: 'Lote sem identificação do remetente',
      causa: 'O campo uploadedBy_st está vazio — perdemos rastreabilidade de qual usuário do exibidor enviou o arquivo.',
      acao: 'Bug do front: o header x-user-email não está sendo enviado no upload. Corrigir no fluxo de importação do exibidor.',
      responsavel: 'BE180',
      bloqueia: false,
    });
  }

  let recomendacao = 'verde';
  let recomendacaoTexto = 'Pronto — todos os indicadores positivos, pode-se aprovar.';
  const bloqueadores = diagnosticos.filter((d) => d.bloqueia).length;
  if (bloqueadores > 0) {
    recomendacao = 'vermelho';
    recomendacaoTexto = `${bloqueadores} bloqueador${bloqueadores > 1 ? 'es' : ''} crítico${bloqueadores > 1 ? 's' : ''} antes da aprovação.`;
  } else if (diagnosticos.length > 0) {
    recomendacao = 'amarelo';
    recomendacaoTexto = 'Qualidade aceitável, mas há pontos de revisão antes de aprovar.';
  }

  return res.status(200).json({
    success: true,
    lote,
    visao,
    qualidade: {
      geo_pct: pct(visao.com_geo, ativos),
      depara_pct: pct(visao.com_depara, ativos),
      sem_codigo_pct: pct(visao.sem_codigo, ativos),
      sem_valor_pct: pct(visao.sem_valor, ativos),
      com_erro_pct: pct(visao.com_erro, ativos),
    },
    distribuicao: {
      ufs: ufsRes.recordset,
      pracas: pracasRes.recordset,
      ambientes: ambientesRes.recordset,
      formatos: formatosRes.recordset,
      tipos: tiposRes.recordset,
    },
    duplicidades: dupsRes.recordset,
    erros: errosRes.recordset,
    sem_depara: semDeparaRes.recordset,
    comparativo_tipos: comparativoTipos,
    pracas_reconciliacao: pracasReconciliacao,
    amostra: amostraRes.recordset,
    legado,
    places: placesRes.recordset[0] || { total: 0, pendente: 0, processando: 0, concluido: 0, erro: 0 },
    comentarios: comentariosRes.recordset,
    veredito: {
      recomendacao,
      recomendacao_texto: recomendacaoTexto,
      flags,
      positivos,
      diagnosticos,
    },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Formata o plano de correção detalhado para enviar ao exibidor no chat
// ───────────────────────────────────────────────────────────────────────────
function formatarPlanoCorrecao(diagnosticos) {
  if (!Array.isArray(diagnosticos) || diagnosticos.length === 0) return '';

  const total = diagnosticos.length;
  const bloqueadores = diagnosticos.filter((d) => d.bloqueia).length;

  let txt = '\n\n— PLANO DE CORREÇÃO DETALHADO —\n';
  txt += `Identificamos ${total} ${total === 1 ? 'ponto' : 'pontos'} no envio`;
  if (bloqueadores > 0) {
    txt += ` (${bloqueadores} ${bloqueadores === 1 ? 'bloqueia' : 'bloqueiam'} a aprovação)`;
  }
  txt += '.\n\n';

  diagnosticos.forEach((d, i) => {
    const tags = [];
    if (d.bloqueia) tags.push('BLOQUEIA APROVAÇÃO');
    if (d.responsavel === 'EXIBIDOR') tags.push('Você precisa agir');
    else if (d.responsavel === 'BE180') tags.push('Ação do time BE180');

    txt += `${i + 1}. ${d.titulo || 'Item'}`;
    if (tags.length > 0) txt += `  [${tags.join(' · ')}]`;
    txt += '\n';
    if (d.causa) txt += `   • Causa: ${d.causa}\n`;
    if (d.acao)  txt += `   • O que fazer: ${d.acao}\n`;
    txt += '\n';
  });

  txt += 'Quando concluir os ajustes, faça um novo upload da planilha que voltaremos a analisar. ';
  txt += 'Em caso de dúvida, responda aqui mesmo neste chat.';
  return txt;
}

// ───────────────────────────────────────────────────────────────────────────
// Decisão (aprovar / rejeitar / pedir-correcao) com mensagem opcional
// ───────────────────────────────────────────────────────────────────────────
async function decidir(req, res, pool) {
  const op = String(req.body?.op || '');
  const lotePk = Number(req.body?.lote_pk || 0);
  const autor = String(req.body?.autor || 'BE180').trim() || 'BE180';
  const mensagem = String(req.body?.mensagem || '').trim();
  const diagnosticos = Array.isArray(req.body?.diagnosticos) ? req.body.diagnosticos : [];

  if (!lotePk) return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });

  const map = {
    'aprovar-lote': 'APROVADO',
    'rejeitar-lote': 'REJEITADO',
    'pedir-correcao': 'PARA_CORRIGIR',
  };
  const statusFinal = map[op];
  if (!statusFinal) return res.status(400).json({ success: false, error: `Operação inválida: ${op}` });

  if ((statusFinal === 'REJEITADO' || statusFinal === 'PARA_CORRIGIR') && !mensagem) {
    return res.status(400).json({ success: false, error: 'É obrigatório enviar uma mensagem ao exibidor para essa decisão.' });
  }

  // Atualiza o lote
  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('status_st', sql.NVarChar(40), statusFinal)
    .query(`
      UPDATE [serv_product_be180].[exibidor_inventario_upload_lote_dm]
      SET status_st = @status_st, dataAtualizacao_dh = SYSDATETIME()
      WHERE lote_pk = @lote_pk
    `);

  // Quando aprovado, todos os itens ativos passam a APROVADO também
  if (statusFinal === 'APROVADO') {
    await pool.request()
      .input('lote_pk', sql.Int, lotePk)
      .query(`
        UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
        SET status_st = 'APROVADO', dataAtualizacao_dh = SYSDATETIME()
        WHERE lote_fk = @lote_pk AND delete_bl = 0
      `);
  }

  // Comentário automático de auditoria — SEMPRE registrado, com ou sem mensagem.
  // Garante que o exibidor veja no chat dele a decisão tomada e quem decidiu.
  const prefixo =
    statusFinal === 'APROVADO'      ? '[Lote aprovado]'
    : statusFinal === 'REJEITADO'    ? '[Lote rejeitado]'
    :                                  '[Pedido de correção]';
  let mensagemFinal = mensagem
    ? `${prefixo} ${mensagem}`
    : statusFinal === 'APROVADO'
      ? `${prefixo} Sem comentários adicionais.`
      : prefixo;

  // Quando pedimos correção, anexa o plano detalhado para o exibidor saber
  // exatamente o que precisa fazer antes do reenvio.
  if (statusFinal === 'PARA_CORRIGIR' && diagnosticos.length > 0) {
    mensagemFinal += formatarPlanoCorrecao(diagnosticos);
  }

  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('autor_st', sql.NVarChar(255), autor)
    .input('mensagem_st', sql.NVarChar(sql.MAX), mensagemFinal)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_solicitacao_comentario_dm]
        (lote_fk, autor_st, mensagem_st)
      VALUES (@lote_pk, @autor_st, @mensagem_st)
    `);

  return res.status(200).json({ success: true, status: statusFinal });
}

// ───────────────────────────────────────────────────────────────────────────
// Lista TODOS os itens do lote com paginação, busca e filtros rápidos
// (visão de inventário completo no dashboard admin)
// ───────────────────────────────────────────────────────────────────────────
async function listarItens(req, res, pool) {
  const lotePk = Number(req.query.lote_pk || 0);
  if (!lotePk) return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });

  const page  = Math.max(1, Number(req.query.page  || 1));
  const limit = Math.min(500, Math.max(10, Number(req.query.limit || 50)));
  const offset = (page - 1) * limit;
  const busca = String(req.query.busca || '').trim();
  const filtro = String(req.query.filtro || ''); // '' | 'sem_geo' | 'sem_depara' | 'com_erro' | 'sem_codigo' | 'sem_valor'

  const filtros = ['lote_fk = @lote_pk', 'delete_bl = 0'];
  const request = pool.request().input('lote_pk', sql.Int, lotePk);

  if (busca) {
    filtros.push(`(
      codigo_ativo_st LIKE @busca OR
      praca_st        LIKE @busca OR
      uf_st           LIKE @busca OR
      ambiente_st     LIKE @busca OR
      formato_midia_st LIKE @busca OR
      tipo_midia_st   LIKE @busca OR
      nome_fantasia_st LIKE @busca OR
      observacoes_st  LIKE @busca
    )`);
    request.input('busca', sql.NVarChar(200), `%${busca}%`);
  }

  if (filtro === 'sem_geo') {
    filtros.push(`(latitude_vl IS NULL OR longitude_vl IS NULL OR CAST(latitude_vl AS FLOAT)=0 OR CAST(longitude_vl AS FLOAT)=0)`);
  } else if (filtro === 'sem_depara') {
    filtros.push(`mapped_bl = 0`);
  } else if (filtro === 'com_erro') {
    filtros.push(`(erroValidacao_st IS NOT NULL AND LTRIM(RTRIM(erroValidacao_st)) <> '')`);
  } else if (filtro === 'sem_codigo') {
    filtros.push(`(codigo_ativo_st IS NULL OR LTRIM(RTRIM(codigo_ativo_st)) = '')`);
  } else if (filtro === 'sem_valor') {
    filtros.push(`(valor_tabela_vl IS NULL OR valor_tabela_vl = 0)`);
  }

  const where = `WHERE ${filtros.join(' AND ')}`;

  const totalRes = await request.query(`
    SELECT COUNT(1) AS total FROM [serv_product_be180].[exibidor_inventario_item_dm] ${where}
  `);
  const total = Number(totalRes.recordset[0]?.total || 0);

  const dataReq = pool.request().input('lote_pk', sql.Int, lotePk);
  if (busca) dataReq.input('busca', sql.NVarChar(200), `%${busca}%`);
  dataReq.input('offset', sql.Int, offset);
  dataReq.input('limit',  sql.Int, limit);

  const dataRes = await dataReq.query(`
    SELECT
      item_pk,
      linhaArquivo_vl,
      codigo_ativo_st,
      praca_st,
      uf_st,
      ambiente_st,
      formato_midia_st,
      tipo_midia_st,
      tipo_ambiente_indoor_st,
      nome_fantasia_st,
      CAST(latitude_vl AS FLOAT)  AS latitude,
      CAST(longitude_vl AS FLOAT) AS longitude,
      valor_tabela_vl,
      periodo_tabela_st,
      mapped_ambiente_st,
      mapped_formato_st,
      mapped_tipo_st,
      mapped_bl,
      status_st,
      erroValidacao_st,
      observacoes_st
    FROM [serv_product_be180].[exibidor_inventario_item_dm]
    ${where}
    ORDER BY linhaArquivo_vl ASC, item_pk ASC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  return res.status(200).json({
    success: true,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    data: dataRes.recordset,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Lista tipos de mídia canônicos do banco de ativos (para dropdown de correção)
// ───────────────────────────────────────────────────────────────────────────
async function tiposCanonicos(req, res, pool) {
  const result = await pool.request().query(`
    SELECT DISTINCT
      LTRIM(RTRIM(tipoMidia_st))     AS tipo,
      LTRIM(RTRIM(environment_st))   AS ambiente,
      LTRIM(RTRIM(media_format_st))  AS formato,
      COUNT(1) OVER (PARTITION BY LTRIM(RTRIM(tipoMidia_st))) AS qtd
    FROM [serv_product_be180].[bancoAtivosJoin_ft]
    WHERE valid_bl = 1
      AND tipoMidia_st IS NOT NULL
      AND LTRIM(RTRIM(tipoMidia_st)) <> ''
    ORDER BY tipo ASC
  `);

  const vistos = new Set();
  const tipos = [];
  for (const r of result.recordset) {
    if (!vistos.has(r.tipo)) {
      vistos.add(r.tipo);
      tipos.push({ tipo: r.tipo, ambiente: r.ambiente || '', formato: r.formato || '', qtd: r.qtd });
    }
  }
  return res.json({ success: true, data: tipos });
}

// ───────────────────────────────────────────────────────────────────────────
// Corrige praça de itens do lote (admin renomeia praca_novo → praca_correta)
// ───────────────────────────────────────────────────────────────────────────
async function corrigirPraca(req, res, pool) {
  const lotePk     = Number(req.body?.lote_pk || 0);
  const pracaNovo  = String(req.body?.praca_novo  || '').trim();
  const pracaCorreta = String(req.body?.praca_correta || '').trim();

  if (!lotePk || !pracaNovo || !pracaCorreta) {
    return res.status(400).json({ success: false, error: 'lote_pk, praca_novo e praca_correta são obrigatórios' });
  }

  const result = await pool.request()
    .input('lote_pk',      sql.Int,        lotePk)
    .input('praca_novo',   sql.NVarChar(200), pracaNovo)
    .input('praca_correta', sql.NVarChar(200), pracaCorreta)
    .query(`
      UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
      SET praca_st = @praca_correta
      WHERE lote_fk = @lote_pk
        AND praca_st = @praca_novo
        AND delete_bl = 0
    `);

  return res.json({ success: true, rowsAffected: result.rowsAffected?.[0] ?? 0 });
}

// ───────────────────────────────────────────────────────────────────────────
// Corrige tipo de mídia — cadastra/atualiza regra de-para e re-aplica nos itens
// Colunas reais: sourceAmbiente_st / sourceFormato_st / sourceTipo_st
//                mappedAmbiente_st / mappedFormato_st / mappedTipo_st
// ───────────────────────────────────────────────────────────────────────────
async function corrigirTipo(req, res, pool) {
  const lotePk         = Number(req.body?.lote_pk || 0);
  const ambienteNovo   = String(req.body?.ambiente_novo  || '').trim();
  const formatoNovo    = String(req.body?.formato_novo   || '').trim();
  const tipoNovo       = String(req.body?.tipo_novo      || '').trim();
  const mappedAmbiente = String(req.body?.mapped_ambiente || '').trim();
  const mappedFormato  = String(req.body?.mapped_formato  || '').trim();
  const mappedTipo     = String(req.body?.mapped_tipo     || '').trim();

  if (!lotePk) {
    return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });
  }
  if (!mappedTipo) {
    return res.status(400).json({ success: false, error: 'mapped_tipo é obrigatório' });
  }

  // Upsert da regra de-para — colunas corretas: sourceAmbiente_st, sourceFormato_st, sourceTipo_st
  await pool.request()
    .input('sourceAmbiente_st',  sql.NVarChar(150), ambienteNovo)
    .input('sourceFormato_st',   sql.NVarChar(150), formatoNovo)
    .input('sourceTipo_st',      sql.NVarChar(150), tipoNovo)
    .input('mappedAmbiente_st',  sql.NVarChar(150), mappedAmbiente || ambienteNovo)
    .input('mappedFormato_st',   sql.NVarChar(150), mappedFormato  || formatoNovo)
    .input('mappedTipo_st',      sql.NVarChar(150), mappedTipo)
    .query(`
      MERGE [serv_product_be180].[exibidor_midia_depara_dm] AS target
      USING (
        SELECT
          @sourceAmbiente_st AS sourceAmbiente_st,
          @sourceFormato_st  AS sourceFormato_st,
          @sourceTipo_st     AS sourceTipo_st
      ) AS src
        ON LOWER(LTRIM(RTRIM(target.sourceAmbiente_st))) = LOWER(LTRIM(RTRIM(src.sourceAmbiente_st)))
       AND LOWER(LTRIM(RTRIM(target.sourceFormato_st)))  = LOWER(LTRIM(RTRIM(src.sourceFormato_st)))
       AND LOWER(LTRIM(RTRIM(target.sourceTipo_st)))     = LOWER(LTRIM(RTRIM(src.sourceTipo_st)))
      WHEN MATCHED THEN
        UPDATE SET
          mappedAmbiente_st = @mappedAmbiente_st,
          mappedFormato_st  = @mappedFormato_st,
          mappedTipo_st     = @mappedTipo_st
      WHEN NOT MATCHED THEN
        INSERT (sourceAmbiente_st, sourceFormato_st, sourceTipo_st,
                mappedAmbiente_st, mappedFormato_st, mappedTipo_st)
        VALUES (@sourceAmbiente_st, @sourceFormato_st, @sourceTipo_st,
                @mappedAmbiente_st, @mappedFormato_st, @mappedTipo_st);
    `);

  // Re-aplica o mapeamento nos itens do lote afetados
  // Colunas corretas na tabela de itens: ambiente_st, formato_midia_st, tipo_midia_st
  await pool.request()
    .input('lote_pk',            sql.Int,           lotePk)
    .input('ambiente_st',        sql.NVarChar(150), ambienteNovo)
    .input('formato_midia_st',   sql.NVarChar(150), formatoNovo)
    .input('tipo_midia_st',      sql.NVarChar(150), tipoNovo)
    .input('mapped_ambiente_st', sql.NVarChar(150), mappedAmbiente || ambienteNovo)
    .input('mapped_formato_st',  sql.NVarChar(150), mappedFormato  || formatoNovo)
    .input('mapped_tipo_st',     sql.NVarChar(150), mappedTipo)
    .query(`
      UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
      SET
        mapped_ambiente_st = @mapped_ambiente_st,
        mapped_formato_st  = @mapped_formato_st,
        mapped_tipo_st     = @mapped_tipo_st,
        mapped_bl          = 1
      WHERE lote_fk          = @lote_pk
        AND delete_bl        = 0
        AND LOWER(LTRIM(RTRIM(ambiente_st)))      = LOWER(LTRIM(RTRIM(@ambiente_st)))
        AND LOWER(LTRIM(RTRIM(formato_midia_st))) = LOWER(LTRIM(RTRIM(@formato_midia_st)))
        AND LOWER(LTRIM(RTRIM(tipo_midia_st)))    = LOWER(LTRIM(RTRIM(@tipo_midia_st)))
    `);

  return res.json({ success: true });
}

// ───────────────────────────────────────────────────────────────────────────
// Comentário admin (mesmo do exibidor, mas autor padrão BE180)
// ───────────────────────────────────────────────────────────────────────────
async function adicionarComentario(req, res, pool) {
  const lotePk = Number(req.body?.lote_pk || 0);
  const autor = String(req.body?.autor || 'BE180').trim() || 'BE180';
  const mensagem = String(req.body?.mensagem || '').trim();
  if (!lotePk || !mensagem) {
    return res.status(400).json({ success: false, error: 'lote_pk e mensagem são obrigatórios' });
  }
  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('autor_st', sql.NVarChar(255), autor)
    .input('mensagem_st', sql.NVarChar(2000), mensagem)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_solicitacao_comentario_dm]
        (lote_fk, autor_st, mensagem_st)
      VALUES (@lote_pk, @autor_st, @mensagem_st)
    `);
  return res.status(201).json({ success: true });
}

module.exports = async (req, res) => {
  try {
    const pool = await getPool();

    if (req.method === 'GET') {
      const mode = String(req.query.mode || 'lista');
      if (mode === 'analise')         return analisarLote(req, res, pool);
      if (mode === 'itens')           return listarItens(req, res, pool);
      if (mode === 'tipos-canonicos') return tiposCanonicos(req, res, pool);
      return listarLotes(req, res, pool);
    }

    if (req.method === 'POST') {
      const op = String(req.body?.op || '');
      if (op === 'comentario') return adicionarComentario(req, res, pool);
      if (op === 'corrigir-praca') return corrigirPraca(req, res, pool);
      if (op === 'corrigir-tipo')  return corrigirTipo(req, res, pool);
      if (['aprovar-lote', 'rejeitar-lote', 'pedir-correcao'].includes(op)) return decidir(req, res, pool);
      return res.status(400).json({ success: false, error: `Operação inválida: ${op}` });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err) {
    console.error('[admin-inventario-analise] Erro:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao processar análise', message: err.message });
  }
};
