const { sql, getPool } = require('./db');

/**
 * API de Gestão de Exibidores
 *
 * Listagem unificada de:
 *  - Exibidores cadastrados em [exibidor_dm]
 *  - Exibidores presentes apenas no legado [bancoAtivosJoin_ft.exibidor_st]
 *
 * Suporta:
 *  - GET /referencia?action=exibidor-gestao&mode=list             → listagem unificada
 *  - GET /referencia?action=exibidor-gestao&mode=detalhe&id=N     → detalhe + domínios + ativos legado
 *  - POST /referencia?action=exibidor-gestao  body: { op:'cadastrar-do-legado', nome_legado, ...dados, dominios:[...] }
 *  - POST /referencia?action=exibidor-gestao  body: { op:'cadastrar-novo', ...dados, dominios:[...] }
 *  - POST /referencia?action=exibidor-gestao  body: { op:'editar', exibidor_pk, ...dados }
 *  - POST /referencia?action=exibidor-gestao  body: { op:'add-dominio', exibidor_pk, dominio_st, primario_bl? }
 *  - POST /referencia?action=exibidor-gestao  body: { op:'remove-dominio', dominio_pk }
 *  - DELETE /referencia?action=exibidor-gestao&id=N  → soft delete
 */

function normalizarDominio(s) {
  return String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

function normalizarNomeLegado(s) {
  return String(s || '').trim().toUpperCase();
}

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

async function listarUnificado(req, res, pool) {
  const incluirSandbox = String(req.query.incluir_sandbox || '0') === '1';
  const search = String(req.query.search || '').trim();

  const sandboxFilter = incluirSandbox ? '' : 'AND e.sandbox_bl = 0';
  const searchFilter = search ? `AND (e.nome_st LIKE @search OR e.nome_fantasia_st LIKE @search OR e.codigo_st LIKE @search)` : '';
  const searchFilterLegado = search ? `AND b.exibidor_st LIKE @search` : '';

  const reqDb = pool.request();
  if (search) reqDb.input('search', sql.NVarChar, `%${search}%`);

  const result = await reqDb.query(`
    -- 1. Exibidores cadastrados em exibidor_dm (com link opcional ao legado)
    SELECT
      e.exibidor_pk,
      e.nome_st,
      e.nome_fantasia_st,
      e.codigo_st,
      e.cnpj_st,
      e.cidade_st,
      e.estado_st,
      e.active_bl,
      e.sandbox_bl,
      'CADASTRADO' AS origem_st,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_dominio_dm] d
        WHERE d.exibidor_fk = e.exibidor_pk AND d.delete_bl = 0) AS qtd_dominios,
      (SELECT COUNT(1) FROM [serv_product_be180].[usuario_dm] u
        WHERE u.exibidor_fk = e.exibidor_pk AND u.ativo_bl = 1) AS qtd_usuarios,
      (SELECT COUNT(1) FROM [serv_product_be180].[bancoAtivosJoin_ft] b
        WHERE b.exibidor_fk = e.exibidor_pk AND b.valid_bl = 1) AS qtd_ativos_linkados,
      (SELECT COUNT(DISTINCT b.exibidor_st) FROM [serv_product_be180].[bancoAtivosJoin_ft] b
        WHERE b.valid_bl = 1
          AND (UPPER(LTRIM(RTRIM(b.exibidor_st))) = UPPER(LTRIM(RTRIM(e.nome_st)))
            OR UPPER(LTRIM(RTRIM(b.exibidor_st))) = UPPER(LTRIM(RTRIM(e.nome_fantasia_st))))
      ) AS tem_legado
    FROM [serv_product_be180].[exibidor_dm] e
    WHERE e.delete_bl = 0
      ${sandboxFilter}
      ${searchFilter}

    UNION ALL

    -- 2. Exibidores que existem só no legado (não estão em exibidor_dm)
    SELECT
      NULL AS exibidor_pk,
      b.exibidor_st AS nome_st,
      NULL AS nome_fantasia_st,
      NULL AS codigo_st,
      NULL AS cnpj_st,
      NULL AS cidade_st,
      NULL AS estado_st,
      NULL AS active_bl,
      0 AS sandbox_bl,
      'PENDENTE' AS origem_st,
      0 AS qtd_dominios,
      0 AS qtd_usuarios,
      COUNT(*) AS qtd_ativos_linkados,
      1 AS tem_legado
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    WHERE b.valid_bl = 1
      AND b.exibidor_st IS NOT NULL
      AND LTRIM(RTRIM(b.exibidor_st)) <> ''
      ${searchFilterLegado}
      AND NOT EXISTS (
        SELECT 1 FROM [serv_product_be180].[exibidor_dm] e
        WHERE e.delete_bl = 0
          AND (
            UPPER(LTRIM(RTRIM(e.nome_st))) = UPPER(LTRIM(RTRIM(b.exibidor_st)))
            OR UPPER(LTRIM(RTRIM(e.nome_fantasia_st))) = UPPER(LTRIM(RTRIM(b.exibidor_st)))
          )
      )
    GROUP BY b.exibidor_st

    ORDER BY origem_st DESC, nome_st
  `);

  return res.status(200).json({
    success: true,
    data: result.recordset,
  });
}

async function detalhe(req, res, pool) {
  const id = Number(req.query.id || 0);
  if (!id) return res.status(400).json({ success: false, error: 'id é obrigatório' });

  const exib = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT * FROM [serv_product_be180].[exibidor_dm]
      WHERE exibidor_pk = @id AND delete_bl = 0
    `);
  if (!exib.recordset.length) return res.status(404).json({ success: false, error: 'Exibidor não encontrado' });

  const dominios = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT dominio_pk, exibidor_fk, dominio_st, primario_bl, active_bl, dataCriacao_dh
      FROM [serv_product_be180].[exibidor_dominio_dm]
      WHERE exibidor_fk = @id AND delete_bl = 0
      ORDER BY primario_bl DESC, dominio_st
    `);

  const usuarios = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT u.pk AS usuario_pk, u.nome_st, u.email_st, u.ativo_bl, p.nome_st AS perfil_nome
      FROM [serv_product_be180].[usuario_dm] u
      LEFT JOIN [serv_product_be180].[perfil_dm] p ON p.perfil_pk = u.perfil_pk
      WHERE u.exibidor_fk = @id
      ORDER BY u.nome_st
    `);

  const ativosLegado = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT TOP 50
        b.pk, b.code, b.cidade_st, b.estado_st, b.tipoMidia_st, b.environment_st, b.media_format_st
      FROM [serv_product_be180].[bancoAtivosJoin_ft] b
      WHERE b.exibidor_fk = @id AND b.valid_bl = 1
      ORDER BY b.cidade_st, b.code
    `);

  const totalAtivosLegado = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT COUNT(1) AS total
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE exibidor_fk = @id AND valid_bl = 1
    `);

  return res.status(200).json({
    success: true,
    exibidor: exib.recordset[0],
    dominios: dominios.recordset,
    usuarios: usuarios.recordset,
    ativosLegado: ativosLegado.recordset,
    totalAtivosLegado: totalAtivosLegado.recordset[0]?.total || 0,
  });
}

async function detalhePendente(req, res, pool) {
  const nome = String(req.query.nome_legado || '').trim();
  if (!nome) return res.status(400).json({ success: false, error: 'nome_legado é obrigatório' });

  const makeReq = () => pool.request().input('nome', sql.NVarChar(255), nome);
  const filtro = `j.valid_bl = 1 AND UPPER(LTRIM(RTRIM(j.exibidor_st))) = UPPER(LTRIM(RTRIM(@nome)))`;

  const [ativos, total, cidadeTop, empresa] = await Promise.all([
    // Amostra de pontos
    makeReq().query(`
      SELECT TOP 50 j.pk, j.code, j.cidade_st, j.estado_st, j.tipoMidia_st, j.environment_st, j.media_format_st
      FROM [serv_product_be180].[bancoAtivosJoin_ft] j
      WHERE ${filtro}
      ORDER BY j.cidade_st, j.code
    `),
    // Total de pontos
    makeReq().query(`
      SELECT COUNT(1) AS total
      FROM [serv_product_be180].[bancoAtivosJoin_ft] j
      WHERE ${filtro}
    `),
    // Cidade e UF com mais pontos (fallback)
    makeReq().query(`
      SELECT TOP 1 j.cidade_st, j.estado_st
      FROM [serv_product_be180].[bancoAtivosJoin_ft] j
      WHERE ${filtro}
        AND j.cidade_st IS NOT NULL AND LTRIM(RTRIM(j.cidade_st)) <> ''
        AND j.estado_st IS NOT NULL AND LTRIM(RTRIM(j.estado_st)) <> ''
      GROUP BY j.cidade_st, j.estado_st
      ORDER BY COUNT(1) DESC
    `),
    // Dados completos da empresa: direto em bancoAtivosExibidor_dm → bancoAtivosExibidorEmpresa_dm
    // (sem tocar em bancoAtivosJoin_ft para evitar full scan na tabela fato)
    makeReq().query(`
      SELECT TOP 1
        emp.empresa_st,
        emp.cnpj_st,
        emp.contatoNome_st,
        emp.contatoEmail_st,
        emp.contatoTelefone_st,
        emp.cep_st,
        emp.endereco_st,
        emp.complemento_st,
        emp.bairro_st
      FROM [serv_product_be180].[bancoAtivosExibidor_dm] ex
      JOIN [serv_product_be180].[bancoAtivosExibidorEmpresa_dm] emp
        ON emp.media_exhibitor_id = ex.media_exhibitor_id
      WHERE UPPER(LTRIM(RTRIM(ex.exibidor_st))) = UPPER(LTRIM(RTRIM(@nome)))
      ORDER BY emp.pk
    `),
  ]);

  const cidade1 = cidadeTop.recordset[0] || null;
  const emp     = empresa.recordset[0]   || null;

  return res.status(200).json({
    success: true,
    nome_legado: nome,
    ativosLegado: ativos.recordset,
    totalAtivosLegado: total.recordset[0]?.total || 0,
    // Dados de empresa para pré-preenchimento
    empresa_st:         emp?.empresa_st         || null,
    cnpj_st:            emp?.cnpj_st            || null,
    contatoNome_st:     emp?.contatoNome_st     || null,
    contatoEmail_st:    emp?.contatoEmail_st    || null,
    contatoTelefone_st: emp?.contatoTelefone_st || null,
    cep_st:             emp?.cep_st             || null,
    endereco_st:        emp?.endereco_st        || null,
    complemento_st:     emp?.complemento_st     || null,
    bairro_st:          emp?.bairro_st          || null,
    // Cidade/UF dos pontos (usados se empresa não tiver endereço)
    cidadePrincipal_st: cidade1?.cidade_st || null,
    estadoPrincipal_st: cidade1?.estado_st || null,
  });
}

async function inserirExibidor(pool, dados) {
  const cnpjLimpo = dados.cnpj_st ? onlyDigits(dados.cnpj_st) : null;
  if (cnpjLimpo && cnpjLimpo.length !== 14) {
    throw Object.assign(new Error('CNPJ inválido (14 dígitos)'), { http: 400 });
  }

  const dup = await pool.request()
    .input('nome', sql.NVarChar(255), dados.nome_st)
    .query(`
      SELECT exibidor_pk FROM [serv_product_be180].[exibidor_dm]
      WHERE delete_bl = 0 AND LOWER(nome_st) = LOWER(@nome)
    `);
  if (dup.recordset.length) {
    throw Object.assign(new Error('Já existe um exibidor com este nome'), { http: 409, exibidor_pk: dup.recordset[0].exibidor_pk });
  }

  const ins = await pool.request()
    .input('nome_st', sql.NVarChar(255), dados.nome_st)
    .input('nome_fantasia_st', sql.NVarChar(255), dados.nome_fantasia_st || null)
    .input('codigo_st', sql.NVarChar(100), dados.codigo_st || null)
    .input('cnpj_st', sql.NVarChar(18), cnpjLimpo)
    .input('site_st', sql.NVarChar(500), dados.site_st || null)
    .input('email_st', sql.NVarChar(255), dados.email_st || null)
    .input('telefone_st', sql.NVarChar(50), dados.telefone_st || null)
    .input('cep_st', sql.NVarChar(20), dados.cep_st || null)
    .input('logradouro_st', sql.NVarChar(500), dados.logradouro_st || null)
    .input('numero_st', sql.NVarChar(50), dados.numero_st || null)
    .input('complemento_st', sql.NVarChar(200), dados.complemento_st || null)
    .input('bairro_st', sql.NVarChar(200), dados.bairro_st || null)
    .input('cidade_st', sql.NVarChar(200), dados.cidade_st || null)
    .input('estado_st', sql.NVarChar(2), (dados.estado_st || '').toUpperCase().slice(0, 2) || null)
    .input('observacao_st', sql.NVarChar(2000), dados.observacao_st || null)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_dm] (
        nome_st, nome_fantasia_st, codigo_st, cnpj_st, site_st, email_st, telefone_st,
        cep_st, logradouro_st, numero_st, complemento_st, bairro_st, cidade_st, estado_st,
        observacao_st, active_bl, delete_bl, sandbox_bl
      )
      OUTPUT INSERTED.exibidor_pk, INSERTED.nome_st
      VALUES (
        @nome_st, @nome_fantasia_st, @codigo_st, @cnpj_st, @site_st, @email_st, @telefone_st,
        @cep_st, @logradouro_st, @numero_st, @complemento_st, @bairro_st, @cidade_st, @estado_st,
        @observacao_st, 1, 0, 0
      )
    `);

  return ins.recordset[0];
}

async function inserirDominios(pool, exibidorPk, dominios) {
  const lista = (dominios || [])
    .map((d) => (typeof d === 'string' ? { dominio_st: d } : d))
    .map((d) => ({ ...d, dominio_st: normalizarDominio(d.dominio_st) }))
    .filter((d) => d.dominio_st);

  if (!lista.length) return { adicionados: 0, ignorados: 0 };

  let primarioJaSetado = false;
  let adicionados = 0;
  let ignorados = 0;

  for (const d of lista) {
    const dup = await pool.request()
      .input('dom', sql.NVarChar(150), d.dominio_st)
      .query(`
        SELECT dominio_pk FROM [serv_product_be180].[exibidor_dominio_dm]
        WHERE LOWER(dominio_st) = @dom AND delete_bl = 0 AND active_bl = 1
      `);
    if (dup.recordset.length) {
      ignorados += 1;
      continue;
    }

    const primario = !primarioJaSetado && (d.primario_bl || lista.length === 1) ? 1 : 0;
    if (primario) primarioJaSetado = true;

    await pool.request()
      .input('exibidor_fk', sql.Int, exibidorPk)
      .input('dom', sql.NVarChar(150), d.dominio_st)
      .input('primario_bl', sql.Bit, primario)
      .query(`
        INSERT INTO [serv_product_be180].[exibidor_dominio_dm] (exibidor_fk, dominio_st, primario_bl, active_bl, delete_bl)
        VALUES (@exibidor_fk, @dom, @primario_bl, 1, 0)
      `);
    adicionados += 1;
  }

  return { adicionados, ignorados };
}

async function autoLinkarLegado(pool, exibidorPk, nomesParaMatch) {
  const nomes = (nomesParaMatch || []).map(normalizarNomeLegado).filter(Boolean);
  if (!nomes.length) return 0;

  const placeholders = nomes.map((_, i) => `@n${i}`).join(',');
  const reqDb = pool.request().input('id', sql.Int, exibidorPk);
  nomes.forEach((n, i) => reqDb.input(`n${i}`, sql.NVarChar(255), n));

  const r = await reqDb.query(`
    UPDATE [serv_product_be180].[bancoAtivosJoin_ft]
    SET exibidor_fk = @id
    WHERE valid_bl = 1
      AND exibidor_fk IS NULL
      AND UPPER(LTRIM(RTRIM(exibidor_st))) IN (${placeholders});
    SELECT @@ROWCOUNT AS atualizados
  `);
  return r.recordset[0]?.atualizados || 0;
}

async function cadastrarDoLegado(req, res, pool) {
  const body = req.body || {};
  const nomeLegado = String(body.nome_legado || '').trim();
  if (!nomeLegado) return res.status(400).json({ success: false, error: 'nome_legado é obrigatório' });

  const dados = {
    nome_st: body.nome_st || nomeLegado,
    nome_fantasia_st: body.nome_fantasia_st,
    codigo_st: body.codigo_st,
    cnpj_st: body.cnpj_st,
    site_st: body.site_st,
    email_st: body.email_st,
    telefone_st: body.telefone_st,
    cep_st: body.cep_st,
    logradouro_st: body.logradouro_st,
    numero_st: body.numero_st,
    complemento_st: body.complemento_st,
    bairro_st: body.bairro_st,
    cidade_st: body.cidade_st,
    estado_st: body.estado_st,
    observacao_st: body.observacao_st,
  };

  if (!dados.nome_st) return res.status(400).json({ success: false, error: 'nome_st é obrigatório' });

  try {
    const exibidor = await inserirExibidor(pool, dados);
    const dominiosResult = await inserirDominios(pool, exibidor.exibidor_pk, body.dominios || []);
    const linkados = await autoLinkarLegado(pool, exibidor.exibidor_pk, [nomeLegado, dados.nome_st, dados.nome_fantasia_st]);

    return res.status(201).json({
      success: true,
      message: 'Exibidor cadastrado e vinculado ao legado',
      exibidor,
      dominios: dominiosResult,
      ativos_linkados: linkados,
    });
  } catch (err) {
    if (err.http) {
      return res.status(err.http).json({ success: false, error: err.message, ...(err.exibidor_pk ? { exibidor_pk: err.exibidor_pk } : {}) });
    }
    throw err;
  }
}

async function cadastrarNovo(req, res, pool) {
  const body = req.body || {};
  if (!body.nome_st) return res.status(400).json({ success: false, error: 'nome_st é obrigatório' });

  try {
    const exibidor = await inserirExibidor(pool, body);
    const dominiosResult = await inserirDominios(pool, exibidor.exibidor_pk, body.dominios || []);
    const linkados = body.tentar_linkar_legado === false
      ? 0
      : await autoLinkarLegado(pool, exibidor.exibidor_pk, [body.nome_st, body.nome_fantasia_st]);

    return res.status(201).json({
      success: true,
      message: 'Exibidor cadastrado',
      exibidor,
      dominios: dominiosResult,
      ativos_linkados: linkados,
    });
  } catch (err) {
    if (err.http) {
      return res.status(err.http).json({ success: false, error: err.message, ...(err.exibidor_pk ? { exibidor_pk: err.exibidor_pk } : {}) });
    }
    throw err;
  }
}

async function editar(req, res, pool) {
  const body = req.body || {};
  const id = Number(body.exibidor_pk || 0);
  if (!id) return res.status(400).json({ success: false, error: 'exibidor_pk é obrigatório' });

  const cnpjLimpo = body.cnpj_st ? onlyDigits(body.cnpj_st) : null;
  if (cnpjLimpo && cnpjLimpo.length !== 14) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  await pool.request()
    .input('id', sql.Int, id)
    .input('nome_st', sql.NVarChar(255), body.nome_st)
    .input('nome_fantasia_st', sql.NVarChar(255), body.nome_fantasia_st || null)
    .input('codigo_st', sql.NVarChar(100), body.codigo_st || null)
    .input('cnpj_st', sql.NVarChar(18), cnpjLimpo)
    .input('site_st', sql.NVarChar(500), body.site_st || null)
    .input('email_st', sql.NVarChar(255), body.email_st || null)
    .input('telefone_st', sql.NVarChar(50), body.telefone_st || null)
    .input('cep_st', sql.NVarChar(20), body.cep_st || null)
    .input('logradouro_st', sql.NVarChar(500), body.logradouro_st || null)
    .input('numero_st', sql.NVarChar(50), body.numero_st || null)
    .input('complemento_st', sql.NVarChar(200), body.complemento_st || null)
    .input('bairro_st', sql.NVarChar(200), body.bairro_st || null)
    .input('cidade_st', sql.NVarChar(200), body.cidade_st || null)
    .input('estado_st', sql.NVarChar(2), (body.estado_st || '').toUpperCase().slice(0, 2) || null)
    .input('observacao_st', sql.NVarChar(2000), body.observacao_st || null)
    .input('active_bl', sql.Bit, body.active_bl == null ? 1 : (body.active_bl ? 1 : 0))
    .query(`
      UPDATE [serv_product_be180].[exibidor_dm]
      SET
        nome_st = COALESCE(@nome_st, nome_st),
        nome_fantasia_st = @nome_fantasia_st,
        codigo_st = @codigo_st,
        cnpj_st = @cnpj_st,
        site_st = @site_st,
        email_st = @email_st,
        telefone_st = @telefone_st,
        cep_st = @cep_st,
        logradouro_st = @logradouro_st,
        numero_st = @numero_st,
        complemento_st = @complemento_st,
        bairro_st = @bairro_st,
        cidade_st = @cidade_st,
        estado_st = @estado_st,
        observacao_st = @observacao_st,
        active_bl = @active_bl,
        dataAtualizacao_dh = SYSDATETIME()
      WHERE exibidor_pk = @id AND delete_bl = 0
    `);

  return res.status(200).json({ success: true, message: 'Exibidor atualizado' });
}

async function addDominio(req, res, pool) {
  const body = req.body || {};
  const id = Number(body.exibidor_pk || 0);
  const dominio = normalizarDominio(body.dominio_st);
  if (!id) return res.status(400).json({ success: false, error: 'exibidor_pk é obrigatório' });
  if (!dominio) return res.status(400).json({ success: false, error: 'dominio_st é obrigatório' });

  const dup = await pool.request()
    .input('dom', sql.NVarChar(150), dominio)
    .query(`
      SELECT d.dominio_pk, d.exibidor_fk, e.nome_st
      FROM [serv_product_be180].[exibidor_dominio_dm] d
      JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = d.exibidor_fk
      WHERE LOWER(d.dominio_st) = @dom AND d.delete_bl = 0 AND d.active_bl = 1
    `);
  if (dup.recordset.length) {
    return res.status(409).json({
      success: false,
      error: `Domínio já cadastrado para "${dup.recordset[0].nome_st}"`,
      ...dup.recordset[0],
    });
  }

  const primario = body.primario_bl ? 1 : 0;
  if (primario) {
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE [serv_product_be180].[exibidor_dominio_dm] SET primario_bl = 0 WHERE exibidor_fk = @id`);
  }

  const ins = await pool.request()
    .input('id', sql.Int, id)
    .input('dom', sql.NVarChar(150), dominio)
    .input('primario_bl', sql.Bit, primario)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_dominio_dm] (exibidor_fk, dominio_st, primario_bl, active_bl, delete_bl)
      OUTPUT INSERTED.dominio_pk, INSERTED.dominio_st, INSERTED.primario_bl
      VALUES (@id, @dom, @primario_bl, 1, 0)
    `);

  return res.status(201).json({ success: true, dominio: ins.recordset[0] });
}

async function removeDominio(req, res, pool) {
  const body = req.body || {};
  const id = Number(body.dominio_pk || 0);
  if (!id) return res.status(400).json({ success: false, error: 'dominio_pk é obrigatório' });

  await pool.request()
    .input('id', sql.Int, id)
    .query(`
      UPDATE [serv_product_be180].[exibidor_dominio_dm]
      SET delete_bl = 1, dataAtualizacao_dh = SYSDATETIME()
      WHERE dominio_pk = @id
    `);

  return res.status(200).json({ success: true });
}

async function softDelete(req, res, pool) {
  const id = Number(req.query.id || 0);
  if (!id) return res.status(400).json({ success: false, error: 'id é obrigatório' });

  await pool.request()
    .input('id', sql.Int, id)
    .query(`
      UPDATE [serv_product_be180].[exibidor_dm]
      SET delete_bl = 1, active_bl = 0, dataAtualizacao_dh = SYSDATETIME()
      WHERE exibidor_pk = @id;

      UPDATE [serv_product_be180].[exibidor_dominio_dm]
      SET delete_bl = 1, dataAtualizacao_dh = SYSDATETIME()
      WHERE exibidor_fk = @id;

      UPDATE [serv_product_be180].[bancoAtivosJoin_ft]
      SET exibidor_fk = NULL
      WHERE exibidor_fk = @id;
    `);

  return res.status(200).json({ success: true });
}

/**
 * Preview do merge: retorna quantidades que serão migradas de origem → destino.
 * GET ?mode=preview-merge&origem=N&destino=M
 */
async function previewMerge(req, res, pool) {
  const origem  = Number(req.query.origem  || 0);
  const destino = Number(req.query.destino || 0);
  if (!origem || !destino) return res.status(400).json({ success: false, error: 'origem e destino são obrigatórios' });
  if (origem === destino)  return res.status(400).json({ success: false, error: 'origem e destino não podem ser o mesmo exibidor' });

  const result = await pool.request()
    .input('origem',  sql.Int, origem)
    .input('destino', sql.Int, destino)
    .query(`
      SELECT
        (SELECT nome_st FROM [serv_product_be180].[exibidor_dm] WHERE exibidor_pk = @origem)  AS origem_nome,
        (SELECT nome_st FROM [serv_product_be180].[exibidor_dm] WHERE exibidor_pk = @destino) AS destino_nome,
        (SELECT COUNT(1) FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE exibidor_fk = @origem)                                                        AS qtd_ativos_legado,
        (SELECT COUNT(1) FROM [serv_product_be180].[usuario_dm]
          WHERE exibidor_fk = @origem AND ativo_bl = 1)                                       AS qtd_usuarios,
        (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm]
          WHERE exibidor_fk = @origem)                                                        AS qtd_lotes,
        (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_item_dm] i
          JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l
            ON l.lote_pk = i.lote_fk
          WHERE l.exibidor_fk = @origem AND i.delete_bl = 0)                                  AS qtd_itens_inventario
    `);

  return res.json({ success: true, preview: result.recordset[0] });
}

/**
 * Merge: transfere todos os dados de origem → destino, depois soft-deleta origem.
 * POST body: { op: 'merge', origem_pk: N, destino_pk: M }
 */
async function mergeExibidor(req, res, pool) {
  const origem  = Number(req.body?.origem_pk  || 0);
  const destino = Number(req.body?.destino_pk || 0);
  if (!origem || !destino) return res.status(400).json({ success: false, error: 'origem_pk e destino_pk são obrigatórios' });
  if (origem === destino)  return res.status(400).json({ success: false, error: 'origem e destino não podem ser o mesmo exibidor' });

  // Confirma que ambos existem e não estão deletados
  const check = await pool.request()
    .input('origem',  sql.Int, origem)
    .input('destino', sql.Int, destino)
    .query(`
      SELECT exibidor_pk, nome_st, delete_bl FROM [serv_product_be180].[exibidor_dm]
      WHERE exibidor_pk IN (@origem, @destino)
    `);
  if (check.recordset.length < 2) return res.status(404).json({ success: false, error: 'Um ou ambos os exibidores não foram encontrados' });
  const deletado = check.recordset.find(r => r.delete_bl);
  if (deletado) return res.status(400).json({ success: false, error: `O exibidor "${deletado.nome_st}" já foi excluído` });

  await pool.request()
    .input('origem',  sql.Int, origem)
    .input('destino', sql.Int, destino)
    .query(`
      -- 1. Migra ativos do banco legado
      UPDATE [serv_product_be180].[bancoAtivosJoin_ft]
        SET exibidor_fk = @destino
        WHERE exibidor_fk = @origem;

      -- 2. Migra usuários
      UPDATE [serv_product_be180].[usuario_dm]
        SET exibidor_fk = @destino
        WHERE exibidor_fk = @origem;

      -- 3. Migra lotes de inventário
      UPDATE [serv_product_be180].[exibidor_inventario_upload_lote_dm]
        SET exibidor_fk = @destino
        WHERE exibidor_fk = @origem;

      -- 4. Soft-delete da origem (domínios + exibidor)
      UPDATE [serv_product_be180].[exibidor_dominio_dm]
        SET delete_bl = 1, dataAtualizacao_dh = SYSDATETIME()
        WHERE exibidor_fk = @origem;

      UPDATE [serv_product_be180].[exibidor_dm]
        SET delete_bl = 1, active_bl = 0, dataAtualizacao_dh = SYSDATETIME()
        WHERE exibidor_pk = @origem;
    `);

  return res.status(200).json({ success: true });
}

module.exports = async (req, res) => {
  try {
    const pool = await getPool();

    if (req.method === 'GET') {
      const mode = String(req.query.mode || 'list');
      if (mode === 'detalhe') return detalhe(req, res, pool);
      if (mode === 'detalhe-pendente') return detalhePendente(req, res, pool);
      if (mode === 'preview-merge') return previewMerge(req, res, pool);
      return listarUnificado(req, res, pool);
    }

    if (req.method === 'POST') {
      const op = String(req.body?.op || '');
      if (op === 'cadastrar-do-legado') return cadastrarDoLegado(req, res, pool);
      if (op === 'cadastrar-novo') return cadastrarNovo(req, res, pool);
      if (op === 'editar') return editar(req, res, pool);
      if (op === 'add-dominio') return addDominio(req, res, pool);
      if (op === 'remove-dominio') return removeDominio(req, res, pool);
      if (op === 'merge') return mergeExibidor(req, res, pool);
      return res.status(400).json({ success: false, error: 'Operação POST inválida' });
    }

    if (req.method === 'DELETE') return softDelete(req, res, pool);

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('[exibidor-gestao] Erro:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar gestão de exibidores',
      message: error.message,
    });
  }
};
