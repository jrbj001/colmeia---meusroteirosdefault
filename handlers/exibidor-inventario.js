const { sql, getPool } = require('./db');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const cleaned = String(value)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

async function ensureSchema(pool) {
  await pool.request().query(`
    IF OBJECT_ID(N'[serv_product_be180].[exibidor_inventario_upload_lote_dm]', N'U') IS NULL
    BEGIN
      CREATE TABLE [serv_product_be180].[exibidor_inventario_upload_lote_dm] (
        [lote_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [arquivo_st] NVARCHAR(300) NOT NULL,
        [uploadedBy_st] NVARCHAR(255) NULL,
        [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_lote_status] DEFAULT ('EM_ANALISE'),
        [totalRegistros_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_total] DEFAULT (0),
        [processados_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_proc] DEFAULT (0),
        [pendentes_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_pend] DEFAULT (0),
        [rejeitados_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_rej] DEFAULT (0),
        [observacao_st] NVARCHAR(2000) NULL,
        [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_lote_criacao] DEFAULT (SYSDATETIME()),
        [dataAtualizacao_dh] DATETIME2(0) NULL
      );
    END
  `);

  await pool.request().query(`
    IF OBJECT_ID(N'[serv_product_be180].[exibidor_midia_depara_dm]', N'U') IS NULL
    BEGIN
      CREATE TABLE [serv_product_be180].[exibidor_midia_depara_dm] (
        [depara_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [sourceAmbiente_st] NVARCHAR(150) NULL,
        [sourceFormato_st] NVARCHAR(150) NULL,
        [sourceTipo_st] NVARCHAR(150) NULL,
        [aliases_st] NVARCHAR(1000) NULL,
        [mappedAmbiente_st] NVARCHAR(150) NULL,
        [mappedFormato_st] NVARCHAR(150) NULL,
        [mappedTipo_st] NVARCHAR(150) NULL,
        [active_bl] BIT NOT NULL CONSTRAINT [DF_exib_depara_active] DEFAULT (1),
        [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_depara_criacao] DEFAULT (SYSDATETIME()),
        [dataAtualizacao_dh] DATETIME2(0) NULL
      );
    END
  `);

  await pool.request().query(`
    IF OBJECT_ID(N'[serv_product_be180].[exibidor_inventario_item_dm]', N'U') IS NULL
    BEGIN
      CREATE TABLE [serv_product_be180].[exibidor_inventario_item_dm] (
        [item_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [lote_fk] INT NOT NULL,
        [linhaArquivo_vl] INT NOT NULL,
        [codigo_ativo_st] NVARCHAR(100) NOT NULL,
        [latitude_vl] DECIMAL(12,8) NULL,
        [longitude_vl] DECIMAL(12,8) NULL,
        [ambiente_st] NVARCHAR(150) NULL,
        [formato_midia_st] NVARCHAR(150) NULL,
        [tipo_midia_st] NVARCHAR(150) NULL,
        [tipo_ambiente_indoor_st] NVARCHAR(150) NULL,
        [nome_fantasia_st] NVARCHAR(255) NULL,
        [valor_tabela_vl] DECIMAL(18,2) NULL,
        [periodo_tabela_st] NVARCHAR(100) NULL,
        [area_total_largura_vl] DECIMAL(18,4) NULL,
        [area_total_altura_vl] DECIMAL(18,4) NULL,
        [area_total_unidade_st] NVARCHAR(20) NULL,
        [area_visual_largura_vl] DECIMAL(18,4) NULL,
        [area_visual_altura_vl] DECIMAL(18,4) NULL,
        [area_visual_unidade_st] NVARCHAR(20) NULL,
        [substrato_st] NVARCHAR(255) NULL,
        [especificacoes_st] NVARCHAR(1000) NULL,
        [secundagem_st] NVARCHAR(100) NULL,
        [observacoes_st] NVARCHAR(2000) NULL,
        [mapped_ambiente_st] NVARCHAR(150) NULL,
        [mapped_formato_st] NVARCHAR(150) NULL,
        [mapped_tipo_st] NVARCHAR(150) NULL,
        [mapped_bl] BIT NOT NULL CONSTRAINT [DF_exib_item_mapped] DEFAULT (0),
        [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_item_status] DEFAULT ('EM_ANALISE'),
        [erroValidacao_st] NVARCHAR(500) NULL,
        [delete_bl] BIT NOT NULL CONSTRAINT [DF_exib_item_delete] DEFAULT (0),
        [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_item_criacao] DEFAULT (SYSDATETIME()),
        [dataAtualizacao_dh] DATETIME2(0) NULL,
        CONSTRAINT [FK_exib_item_lote] FOREIGN KEY ([lote_fk]) REFERENCES [serv_product_be180].[exibidor_inventario_upload_lote_dm]([lote_pk])
      );
      CREATE NONCLUSTERED INDEX [IX_exib_item_lote] ON [serv_product_be180].[exibidor_inventario_item_dm]([lote_fk], [delete_bl], [status_st]);
      CREATE NONCLUSTERED INDEX [IX_exib_item_codigo] ON [serv_product_be180].[exibidor_inventario_item_dm]([codigo_ativo_st]);
    END
  `);

  await pool.request().query(`
    IF OBJECT_ID(N'[serv_product_be180].[exibidor_solicitacao_comentario_dm]', N'U') IS NULL
    BEGIN
      CREATE TABLE [serv_product_be180].[exibidor_solicitacao_comentario_dm] (
        [comentario_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [lote_fk] INT NOT NULL,
        [autor_st] NVARCHAR(255) NOT NULL,
        [mensagem_st] NVARCHAR(2000) NOT NULL,
        [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_comentario_criacao] DEFAULT (SYSDATETIME()),
        CONSTRAINT [FK_exib_comentario_lote] FOREIGN KEY ([lote_fk]) REFERENCES [serv_product_be180].[exibidor_inventario_upload_lote_dm]([lote_pk])
      );
    END
  `);

  await pool.request().query(`
    IF OBJECT_ID(N'[serv_product_be180].[exibidor_places_enriquecimento_dm]', N'U') IS NULL
    BEGIN
      CREATE TABLE [serv_product_be180].[exibidor_places_enriquecimento_dm] (
        [enriquecimento_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [item_fk] INT NOT NULL,
        [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_places_status] DEFAULT ('PENDENTE'),
        [place_id_st] NVARCHAR(255) NULL,
        [tipos_st] NVARCHAR(1000) NULL,
        [payload_st] NVARCHAR(MAX) NULL,
        [tentativas_vl] INT NOT NULL CONSTRAINT [DF_exib_places_tentativas] DEFAULT (0),
        [processarApos_dh] DATETIME2(0) NULL,
        [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_places_criacao] DEFAULT (SYSDATETIME()),
        [dataAtualizacao_dh] DATETIME2(0) NULL,
        CONSTRAINT [FK_exib_places_item] FOREIGN KEY ([item_fk]) REFERENCES [serv_product_be180].[exibidor_inventario_item_dm]([item_pk])
      );
      CREATE NONCLUSTERED INDEX [IX_exib_places_status] ON [serv_product_be180].[exibidor_places_enriquecimento_dm]([status_st], [processarApos_dh]);
    END
  `);

  // Adiciona exibidor_fk na tabela de lotes (migração idempotente)
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'[serv_product_be180].[exibidor_inventario_upload_lote_dm]')
        AND name = 'exibidor_fk'
    )
    BEGIN
      ALTER TABLE [serv_product_be180].[exibidor_inventario_upload_lote_dm]
        ADD [exibidor_fk] INT NULL;
    END
  `);
}

async function loadDePara(pool) {
  const result = await pool.request().query(`
    SELECT
      depara_pk,
      sourceAmbiente_st,
      sourceFormato_st,
      sourceTipo_st,
      aliases_st,
      mappedAmbiente_st,
      mappedFormato_st,
      mappedTipo_st
    FROM [serv_product_be180].[exibidor_midia_depara_dm]
    WHERE active_bl = 1
  `);

  return result.recordset.map((row) => {
    const aliases = String(row.aliases_st || '')
      .split(',')
      .map((s) => normalizeText(s))
      .filter(Boolean);
    return {
      ...row,
      sourceAmbienteNorm: normalizeText(row.sourceAmbiente_st),
      sourceFormatoNorm: normalizeText(row.sourceFormato_st),
      sourceTipoNorm: normalizeText(row.sourceTipo_st),
      aliasesNorm: aliases,
    };
  });
}

function matchDePara(item, mappings) {
  const ambiente = normalizeText(item.ambiente);
  const formato = normalizeText(item.formato_midia);
  const tipo = normalizeText(item.tipo_midia);

  const exact = mappings.find((m) => {
    const okAmbiente = !m.sourceAmbienteNorm || m.sourceAmbienteNorm === ambiente;
    const okFormato = !m.sourceFormatoNorm || m.sourceFormatoNorm === formato;
    const okTipo = !m.sourceTipoNorm || m.sourceTipoNorm === tipo;
    return okAmbiente && okFormato && okTipo;
  });

  if (exact) {
    return {
      mappedAmbiente: exact.mappedAmbiente_st || item.ambiente || null,
      mappedFormato: exact.mappedFormato_st || item.formato_midia || null,
      mappedTipo: exact.mappedTipo_st || item.tipo_midia || null,
      mapped: true,
    };
  }

  const terms = [ambiente, formato, tipo].filter(Boolean);
  const aliasMatch = mappings.find((m) => m.aliasesNorm.some((alias) => terms.includes(alias)));
  if (aliasMatch) {
    return {
      mappedAmbiente: aliasMatch.mappedAmbiente_st || item.ambiente || null,
      mappedFormato: aliasMatch.mappedFormato_st || item.formato_midia || null,
      mappedTipo: aliasMatch.mappedTipo_st || item.tipo_midia || null,
      mapped: true,
    };
  }

  return {
    mappedAmbiente: null,
    mappedFormato: null,
    mappedTipo: null,
    mapped: false,
  };
}

function parsePayloadRow(row, lineNumber) {
  return {
    linhaArquivo: lineNumber,
    codigo_ativo: parseString(row.codigo_ativo),
    latitude: parseNumber(row.latitude),
    longitude: parseNumber(row.longitude),
    ambiente: parseString(row.ambiente),
    formato_midia: parseString(row.formato_midia),
    tipo_midia: parseString(row.tipo_midia),
    tipo_ambiente_indoor: parseString(row.tipo_ambiente_indoor),
    nome_fantasia: parseString(row.nome_fantasia),
    valor_tabela: parseNumber(row.valor_tabela),
    periodo_tabela: parseString(row.periodo_tabela),
    area_total_largura: parseNumber(row.area_total_largura),
    area_total_altura: parseNumber(row.area_total_altura),
    area_total_unidade: parseString(row.area_total_unidade),
    area_visual_largura: parseNumber(row.area_visual_largura),
    area_visual_altura: parseNumber(row.area_visual_altura),
    area_visual_unidade: parseString(row.area_visual_unidade),
    substrato: parseString(row.substrato),
    especificacoes: parseString(row.especificacoes),
    secundagem: parseString(row.secundagem),
    observacoes: parseString(row.observacoes),
  };
}

async function insertUpload(req, res, pool) {
  const { arquivo, registros, observacao, uploadedBy } = req.body || {};
  if (!arquivo || !Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Payload inválido. Informe arquivo e registros.',
    });
  }

  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;

  const loteInsert = await pool.request()
    .input('arquivo_st', sql.NVarChar(300), String(arquivo))
    .input('uploadedBy_st', sql.NVarChar(255), parseString(uploadedBy) || parseString(req.headers['x-user-email']) || null)
    .input('observacao_st', sql.NVarChar(2000), parseString(observacao))
    .input('exibidor_fk', sql.Int, exibidorFk)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_inventario_upload_lote_dm] (arquivo_st, uploadedBy_st, observacao_st, exibidor_fk)
      OUTPUT INSERTED.lote_pk
      VALUES (@arquivo_st, @uploadedBy_st, @observacao_st, @exibidor_fk)
    `);

  const lotePk = loteInsert.recordset[0].lote_pk;
  const mappings = await loadDePara(pool);

  let processados = 0;
  let pendentes = 0;
  let rejeitados = 0;
  const errors = [];

  for (let i = 0; i < registros.length; i += 1) {
    const source = parsePayloadRow(registros[i], i + 2);
    let status = 'EM_ANALISE';
    let erro = null;

    if (!source.codigo_ativo) {
      rejeitados += 1;
      status = 'PARA_CORRIGIR';
      erro = 'Campo obrigatório ausente: codigo_ativo';
      errors.push({ linha: source.linhaArquivo, erro });
    }

    const mapResult = matchDePara(source, mappings);
    if (!mapResult.mapped && status !== 'PARA_CORRIGIR') {
      pendentes += 1;
      status = 'PARA_CORRIGIR';
      erro = 'Midia sem de-para cadastrado';
    }

    await pool.request()
      .input('lote_fk', sql.Int, lotePk)
      .input('linhaArquivo_vl', sql.Int, source.linhaArquivo)
      .input('codigo_ativo_st', sql.NVarChar(100), source.codigo_ativo || `SEM_CODIGO_${i + 1}`)
      .input('latitude_vl', sql.Decimal(12, 8), source.latitude)
      .input('longitude_vl', sql.Decimal(12, 8), source.longitude)
      .input('ambiente_st', sql.NVarChar(150), source.ambiente)
      .input('formato_midia_st', sql.NVarChar(150), source.formato_midia)
      .input('tipo_midia_st', sql.NVarChar(150), source.tipo_midia)
      .input('tipo_ambiente_indoor_st', sql.NVarChar(150), source.tipo_ambiente_indoor)
      .input('nome_fantasia_st', sql.NVarChar(255), source.nome_fantasia)
      .input('valor_tabela_vl', sql.Decimal(18, 2), source.valor_tabela)
      .input('periodo_tabela_st', sql.NVarChar(100), source.periodo_tabela)
      .input('area_total_largura_vl', sql.Decimal(18, 4), source.area_total_largura)
      .input('area_total_altura_vl', sql.Decimal(18, 4), source.area_total_altura)
      .input('area_total_unidade_st', sql.NVarChar(20), source.area_total_unidade)
      .input('area_visual_largura_vl', sql.Decimal(18, 4), source.area_visual_largura)
      .input('area_visual_altura_vl', sql.Decimal(18, 4), source.area_visual_altura)
      .input('area_visual_unidade_st', sql.NVarChar(20), source.area_visual_unidade)
      .input('substrato_st', sql.NVarChar(255), source.substrato)
      .input('especificacoes_st', sql.NVarChar(1000), source.especificacoes)
      .input('secundagem_st', sql.NVarChar(100), source.secundagem)
      .input('observacoes_st', sql.NVarChar(2000), source.observacoes)
      .input('mapped_ambiente_st', sql.NVarChar(150), mapResult.mappedAmbiente)
      .input('mapped_formato_st', sql.NVarChar(150), mapResult.mappedFormato)
      .input('mapped_tipo_st', sql.NVarChar(150), mapResult.mappedTipo)
      .input('mapped_bl', sql.Bit, mapResult.mapped ? 1 : 0)
      .input('status_st', sql.NVarChar(40), status)
      .input('erroValidacao_st', sql.NVarChar(500), erro)
      .query(`
        INSERT INTO [serv_product_be180].[exibidor_inventario_item_dm] (
          lote_fk, linhaArquivo_vl, codigo_ativo_st, latitude_vl, longitude_vl,
          ambiente_st, formato_midia_st, tipo_midia_st, tipo_ambiente_indoor_st,
          nome_fantasia_st, valor_tabela_vl, periodo_tabela_st, area_total_largura_vl,
          area_total_altura_vl, area_total_unidade_st, area_visual_largura_vl,
          area_visual_altura_vl, area_visual_unidade_st, substrato_st, especificacoes_st,
          secundagem_st, observacoes_st, mapped_ambiente_st, mapped_formato_st,
          mapped_tipo_st, mapped_bl, status_st, erroValidacao_st
        ) VALUES (
          @lote_fk, @linhaArquivo_vl, @codigo_ativo_st, @latitude_vl, @longitude_vl,
          @ambiente_st, @formato_midia_st, @tipo_midia_st, @tipo_ambiente_indoor_st,
          @nome_fantasia_st, @valor_tabela_vl, @periodo_tabela_st, @area_total_largura_vl,
          @area_total_altura_vl, @area_total_unidade_st, @area_visual_largura_vl,
          @area_visual_altura_vl, @area_visual_unidade_st, @substrato_st, @especificacoes_st,
          @secundagem_st, @observacoes_st, @mapped_ambiente_st, @mapped_formato_st,
          @mapped_tipo_st, @mapped_bl, @status_st, @erroValidacao_st
        )
      `);

    processados += 1;
  }

  const statusLote = rejeitados > 0 || pendentes > 0 ? 'PARA_CORRIGIR' : 'APROVADO';
  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('status_st', sql.NVarChar(40), statusLote)
    .input('totalRegistros_vl', sql.Int, registros.length)
    .input('processados_vl', sql.Int, processados)
    .input('pendentes_vl', sql.Int, pendentes)
    .input('rejeitados_vl', sql.Int, rejeitados)
    .query(`
      UPDATE [serv_product_be180].[exibidor_inventario_upload_lote_dm]
      SET
        status_st = @status_st,
        totalRegistros_vl = @totalRegistros_vl,
        processados_vl = @processados_vl,
        pendentes_vl = @pendentes_vl,
        rejeitados_vl = @rejeitados_vl,
        dataAtualizacao_dh = SYSDATETIME()
      WHERE lote_pk = @lote_pk
    `);

  return res.status(201).json({
    success: true,
    lote_pk: lotePk,
    status: statusLote,
    total: registros.length,
    processados,
    pendentes,
    rejeitados,
    erros: errors.slice(0, 100),
  });
}

async function listSolicitacoes(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  const request = pool.request();
  let where = '';
  if (exibidorFk) {
    request.input('exibidor_fk', sql.Int, exibidorFk);
    where = 'WHERE exibidor_fk = @exibidor_fk';
  }
  const result = await request.query(`
    SELECT TOP 200
      lote_pk,
      arquivo_st,
      uploadedBy_st,
      status_st,
      totalRegistros_vl,
      processados_vl,
      pendentes_vl,
      rejeitados_vl,
      dataCriacao_dh,
      dataAtualizacao_dh
    FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm]
    ${where}
    ORDER BY lote_pk DESC
  `);

  return res.status(200).json({ success: true, data: result.recordset });
}

async function listItens(req, res, pool) {
  const lotePk = Number(req.query.lote_pk || 0);
  const search = parseString(req.query.search);
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  const request = pool.request();

  const whereParts = ['i.delete_bl = 0'];
  if (lotePk > 0) {
    request.input('lote_pk', sql.Int, lotePk);
    whereParts.push('i.lote_fk = @lote_pk');
  }
  if (search) {
    request.input('search', sql.NVarChar(255), `%${search}%`);
    whereParts.push('(i.codigo_ativo_st LIKE @search OR i.nome_fantasia_st LIKE @search OR i.formato_midia_st LIKE @search)');
  }
  if (exibidorFk) {
    request.input('exibidor_fk', sql.Int, exibidorFk);
    whereParts.push('l.exibidor_fk = @exibidor_fk');
  }

  const where = whereParts.join(' AND ');
  const result = await request.query(`
    SELECT TOP 1000
      i.item_pk,
      i.lote_fk,
      i.linhaArquivo_vl,
      i.codigo_ativo_st,
      i.latitude_vl,
      i.longitude_vl,
      i.ambiente_st,
      i.formato_midia_st,
      i.tipo_midia_st,
      i.tipo_ambiente_indoor_st,
      i.nome_fantasia_st,
      i.valor_tabela_vl,
      i.periodo_tabela_st,
      i.mapped_ambiente_st,
      i.mapped_formato_st,
      i.mapped_tipo_st,
      i.mapped_bl,
      i.status_st,
      i.erroValidacao_st,
      i.dataCriacao_dh
    FROM [serv_product_be180].[exibidor_inventario_item_dm] i
    JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l ON l.lote_pk = i.lote_fk
    WHERE ${where}
    ORDER BY i.item_pk DESC
  `);
  return res.status(200).json({ success: true, data: result.recordset });
}

async function getSolicitacaoDetalhe(req, res, pool) {
  const lotePk = Number(req.query.lote_pk || 0);
  if (!lotePk) {
    return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });
  }

  const lote = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT lote_pk, arquivo_st, uploadedBy_st, status_st, totalRegistros_vl, processados_vl, pendentes_vl, rejeitados_vl, dataCriacao_dh
      FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm]
      WHERE lote_pk = @lote_pk
    `);

  const comentarios = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 200 comentario_pk, lote_fk, autor_st, mensagem_st, dataCriacao_dh
      FROM [serv_product_be180].[exibidor_solicitacao_comentario_dm]
      WHERE lote_fk = @lote_pk
      ORDER BY comentario_pk ASC
    `);

  const itens = await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      SELECT TOP 300
        item_pk,
        codigo_ativo_st,
        ambiente_st,
        formato_midia_st,
        tipo_midia_st,
        mapped_bl,
        status_st,
        erroValidacao_st
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk AND delete_bl = 0
      ORDER BY item_pk DESC
    `);

  return res.status(200).json({
    success: true,
    lote: lote.recordset[0] || null,
    comentarios: comentarios.recordset,
    itens: itens.recordset,
  });
}

async function getDashboard(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;

  // Métricas do legado (bancoAtivosJoin_ft) — base consolidada do exibidor
  const reqLegado = pool.request();
  let legadoWhere = 'WHERE b.valid_bl = 1';
  if (exibidorFk) {
    reqLegado.input('exibidor_fk', sql.Int, exibidorFk);
    legadoWhere += ' AND b.exibidor_fk = @exibidor_fk';
  }
  const legado = await reqLegado.query(`
    SELECT
      COUNT(1)                                                         AS totalPontosLegado_vl,
      COUNT(DISTINCT ISNULL(NULLIF(LTRIM(RTRIM(b.cidade_st)),''),'X')) AS pracasLegado_vl,
      SUM(CASE WHEN LOWER(b.environment_st) LIKE '%public%' THEN 1 ELSE 0 END) AS viasPublicasLegado_vl,
      SUM(CASE WHEN LOWER(b.environment_st) LIKE '%indoor%' THEN 1 ELSE 0 END) AS indoorLegado_vl
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    ${legadoWhere}
  `);

  // Métricas do novo (uploads do exibidor)
  const reqNovo = pool.request();
  let loteFilter = '';
  let loteFilterStandalone = '';
  if (exibidorFk) {
    reqNovo.input('exibidor_fk', sql.Int, exibidorFk);
    loteFilter = 'AND i.lote_fk IN (SELECT lote_pk FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] WHERE exibidor_fk = @exibidor_fk)';
    loteFilterStandalone = 'AND exibidor_fk = @exibidor_fk';
  }
  const novo = await reqNovo.query(`
    SELECT
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_item_dm] i WHERE i.delete_bl = 0 ${loteFilter}) AS totalPontosNovo_vl,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_item_dm] i WHERE i.delete_bl = 0 AND i.status_st = 'APROVADO' ${loteFilter}) AS aprovadosNovo_vl,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] WHERE status_st = 'EM_ANALISE' ${loteFilterStandalone}) AS emAnalise_vl,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] WHERE status_st = 'PARA_CORRIGIR' ${loteFilterStandalone}) AS revisaoPendente_vl,
      (SELECT MAX(dataAtualizacao_dh) FROM [serv_product_be180].[exibidor_inventario_upload_lote_dm] WHERE 1=1 ${loteFilterStandalone}) AS ultimaAtualizacao_dh
  `);

  const l = legado.recordset[0] || {};
  const n = novo.recordset[0] || {};

  return res.status(200).json({
    success: true,
    data: {
      // consolidado = legado + novo aprovado
      totalPontos_vl: Number(l.totalPontosLegado_vl || 0) + Number(n.aprovadosNovo_vl || 0),
      pracas_vl: Number(l.pracasLegado_vl || 0),
      viasPublicas_vl: Number(l.viasPublicasLegado_vl || 0),
      indoor_vl: Number(l.indoorLegado_vl || 0),
      // breakdown por origem
      legado_vl: Number(l.totalPontosLegado_vl || 0),
      novoAprovado_vl: Number(n.aprovadosNovo_vl || 0),
      novoTotal_vl: Number(n.totalPontosNovo_vl || 0),
      // status de solicitações
      emAnalise_vl: Number(n.emAnalise_vl || 0),
      revisaoPendente_vl: Number(n.revisaoPendente_vl || 0),
      ultimaAtualizacao_dh: n.ultimaAtualizacao_dh || null,
    },
  });
}

// Pontos do exibidor para o mapa (legado + novo aprovado, com lat/long)
async function getMapa(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  if (!exibidorFk) {
    return res.status(400).json({ success: false, error: 'Exibidor não identificado' });
  }

  const origem = parseString(req.query.origem) || 'todos'; // todos | legado | exibidor
  const tipoAmbiente = parseString(req.query.tipo_ambiente); // indoor | vias_publicas | null

  const partes = [];

  if (origem === 'todos' || origem === 'legado') {
    const reqL = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
    let whereL = `WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk
                    AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                    AND CAST(b.latitude AS FLOAT) <> 0 AND CAST(b.longitude AS FLOAT) <> 0`;
    if (tipoAmbiente === 'indoor') whereL += " AND LOWER(b.environment_st) LIKE '%indoor%'";
    if (tipoAmbiente === 'vias_publicas') whereL += " AND LOWER(b.environment_st) LIKE '%public%'";

    const r = await reqL.query(`
      SELECT TOP 20000
        b.pk                                AS id,
        b.code                              AS code,
        CAST(b.latitude AS FLOAT)           AS latitude,
        CAST(b.longitude AS FLOAT)          AS longitude,
        b.cidade_st                         AS cidade,
        b.estado_st                         AS estado,
        b.district                          AS bairro,
        b.tipoMidia_st                      AS tipo_midia,
        b.environment_st                    AS ambiente,
        b.media_format_st                   AS formato,
        b.grupo_st                          AS grupo,
        b.exibidor_st                       AS exibidor,
        ISNULL(CAST(b.pedestrian_flow AS FLOAT), 0)    AS passantes,
        ISNULL(CAST(b.total_ipv_impact AS FLOAT), 0)   AS impactos_ipv,
        b.social_class_geo                  AS rating,
        'legado'                            AS origem
      FROM [serv_product_be180].[bancoAtivosJoin_ft] b
      ${whereL}
    `);
    partes.push(...r.recordset);
  }

  if (origem === 'todos' || origem === 'exibidor') {
    const reqE = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
    let whereE = `WHERE i.delete_bl = 0 AND i.status_st = 'APROVADO'
                    AND i.latitude_vl IS NOT NULL AND i.longitude_vl IS NOT NULL
                    AND l.exibidor_fk = @exibidor_fk`;
    if (tipoAmbiente === 'indoor') whereE += " AND LOWER(ISNULL(i.mapped_ambiente_st, i.ambiente_st)) LIKE '%indoor%'";
    if (tipoAmbiente === 'vias_publicas') whereE += " AND (LOWER(ISNULL(i.mapped_ambiente_st, i.ambiente_st)) LIKE '%public%' OR LOWER(ISNULL(i.mapped_ambiente_st, i.ambiente_st)) LIKE '%via%')";

    const r = await reqE.query(`
      SELECT TOP 20000
        i.item_pk                           AS id,
        i.codigo_ativo_st                   AS code,
        CAST(i.latitude_vl AS FLOAT)        AS latitude,
        CAST(i.longitude_vl AS FLOAT)       AS longitude,
        CAST(NULL AS NVARCHAR(150))         AS cidade,
        CAST(NULL AS NVARCHAR(10))          AS estado,
        CAST(NULL AS NVARCHAR(150))         AS bairro,
        ISNULL(i.mapped_tipo_st, i.tipo_midia_st)         AS tipo_midia,
        ISNULL(i.mapped_ambiente_st, i.ambiente_st)       AS ambiente,
        ISNULL(i.mapped_formato_st, i.formato_midia_st)   AS formato,
        CAST(NULL AS NVARCHAR(150))         AS grupo,
        CAST(NULL AS NVARCHAR(255))         AS exibidor,
        CAST(0 AS FLOAT)                    AS passantes,
        CAST(0 AS FLOAT)                    AS impactos_ipv,
        CAST(NULL AS NVARCHAR(20))          AS rating,
        'exibidor'                          AS origem
      FROM [serv_product_be180].[exibidor_inventario_item_dm] i
      JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l ON l.lote_pk = i.lote_fk
      ${whereE}
    `);
    partes.push(...r.recordset);
  }

  return res.status(200).json({
    success: true,
    total: partes.length,
    data: partes,
  });
}

// Visão consolidada (legado + novo aprovado) com paginação e filtros
async function getConsolidado(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  if (!exibidorFk) {
    return res.status(400).json({ success: false, error: 'Exibidor não identificado' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
  const offset = (page - 1) * limit;
  const search = parseString(req.query.search);
  const cidadeFiltro = parseString(req.query.cidade);
  const tipoFiltro = parseString(req.query.tipo);
  const origemFiltro = parseString(req.query.origem); // legado | exibidor | null

  // Construímos UNION ALL para legado + novo aprovado
  const reqUnion = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const filtrosLegado = ['b.valid_bl = 1', 'b.exibidor_fk = @exibidor_fk'];
  const filtrosNovo = ['i.delete_bl = 0', "i.status_st = 'APROVADO'", 'l.exibidor_fk = @exibidor_fk'];

  if (search) {
    reqUnion.input('search', sql.NVarChar(255), `%${search}%`);
    filtrosLegado.push('(b.code LIKE @search OR b.cidade_st LIKE @search OR b.tipoMidia_st LIKE @search)');
    filtrosNovo.push('(i.codigo_ativo_st LIKE @search OR i.tipo_midia_st LIKE @search OR i.nome_fantasia_st LIKE @search)');
  }
  if (cidadeFiltro) {
    reqUnion.input('cidade', sql.NVarChar(150), cidadeFiltro);
    filtrosLegado.push('b.cidade_st = @cidade');
    // novo não tem cidade ainda — exclui por filtro
    filtrosNovo.push('1 = 0');
  }
  if (tipoFiltro) {
    reqUnion.input('tipo', sql.NVarChar(150), tipoFiltro);
    filtrosLegado.push('b.tipoMidia_st = @tipo');
    filtrosNovo.push('ISNULL(i.mapped_tipo_st, i.tipo_midia_st) = @tipo');
  }

  const sqlLegado = `
    SELECT
      CONCAT('L_', b.pk)                  AS row_id,
      b.pk                                AS pk,
      'legado'                            AS origem,
      b.code                              AS code,
      b.cidade_st                         AS cidade,
      b.estado_st                         AS estado,
      b.tipoMidia_st                      AS tipo_midia,
      b.environment_st                    AS ambiente,
      b.media_format_st                   AS formato,
      b.grupo_st                          AS grupo,
      CAST(b.latitude AS FLOAT)           AS latitude,
      CAST(b.longitude AS FLOAT)          AS longitude
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    WHERE ${filtrosLegado.join(' AND ')}
  `;
  const sqlNovo = `
    SELECT
      CONCAT('N_', i.item_pk)             AS row_id,
      i.item_pk                           AS pk,
      'exibidor'                          AS origem,
      i.codigo_ativo_st                   AS code,
      CAST(NULL AS NVARCHAR(150))         AS cidade,
      CAST(NULL AS NVARCHAR(10))          AS estado,
      ISNULL(i.mapped_tipo_st, i.tipo_midia_st)         AS tipo_midia,
      ISNULL(i.mapped_ambiente_st, i.ambiente_st)       AS ambiente,
      ISNULL(i.mapped_formato_st, i.formato_midia_st)   AS formato,
      CAST(NULL AS NVARCHAR(150))         AS grupo,
      CAST(i.latitude_vl AS FLOAT)        AS latitude,
      CAST(i.longitude_vl AS FLOAT)       AS longitude
    FROM [serv_product_be180].[exibidor_inventario_item_dm] i
    JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l ON l.lote_pk = i.lote_fk
    WHERE ${filtrosNovo.join(' AND ')}
  `;

  let unionQuery;
  if (origemFiltro === 'legado') unionQuery = sqlLegado;
  else if (origemFiltro === 'exibidor') unionQuery = sqlNovo;
  else unionQuery = `${sqlLegado} UNION ALL ${sqlNovo}`;

  reqUnion.input('offset', sql.Int, offset).input('limit', sql.Int, limit);

  const totalRes = await reqUnion.query(`SELECT COUNT(1) AS total FROM (${unionQuery}) u`);
  const total = totalRes.recordset[0]?.total || 0;

  const dataRes = await reqUnion.query(`
    SELECT *
    FROM (${unionQuery}) u
    ORDER BY u.cidade, u.code
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  // Stats agregadas (sem paginação)
  const reqStats = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const stats = await reqStats.query(`
    SELECT
      (SELECT COUNT(1) FROM [serv_product_be180].[bancoAtivosJoin_ft] b WHERE b.valid_bl=1 AND b.exibidor_fk=@exibidor_fk) AS legado_vl,
      (SELECT COUNT(1) FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l ON l.lote_pk=i.lote_fk
        WHERE i.delete_bl=0 AND i.status_st='APROVADO' AND l.exibidor_fk=@exibidor_fk) AS exibidor_vl
  `);

  return res.status(200).json({
    success: true,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: stats.recordset[0] || { legado_vl: 0, exibidor_vl: 0 },
    data: dataRes.recordset,
  });
}

// Detalhe completo de um ponto (legado ou exibidor)
async function getDetalhePonto(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  if (!exibidorFk) {
    return res.status(400).json({ success: false, error: 'Exibidor não identificado' });
  }
  const origem = parseString(req.query.origem); // legado | exibidor
  const pk = Number(req.query.pk || 0);
  if (!origem || !pk) {
    return res.status(400).json({ success: false, error: 'Informe origem e pk' });
  }

  if (origem === 'legado') {
    const r = await pool.request()
      .input('pk', sql.Int, pk)
      .input('exibidor_fk', sql.Int, exibidorFk)
      .query(`
        SELECT TOP 1
          b.pk, b.code, b.cidade_st, b.estado_st, b.district AS bairro_st,
          b.exibidor_st, b.tipoMidia_st, b.environment_st, b.media_format_st,
          b.grupo_st, b.grupoSub_st, b.categoria_st,
          CAST(b.latitude AS FLOAT) AS latitude, CAST(b.longitude AS FLOAT) AS longitude,
          ISNULL(CAST(b.pedestrian_flow AS FLOAT), 0)  AS passantes_vl,
          ISNULL(CAST(b.total_ipv_impact AS FLOAT), 0) AS impactos_vl,
          b.social_class_geo AS rating_st
        FROM [serv_product_be180].[bancoAtivosJoin_ft] b
        WHERE b.pk = @pk AND b.exibidor_fk = @exibidor_fk AND b.valid_bl = 1
      `);
    if (!r.recordset[0]) return res.status(404).json({ success: false, error: 'Ponto não encontrado' });
    return res.status(200).json({ success: true, origem: 'legado', data: r.recordset[0] });
  }

  if (origem === 'exibidor') {
    const r = await pool.request()
      .input('pk', sql.Int, pk)
      .input('exibidor_fk', sql.Int, exibidorFk)
      .query(`
        SELECT TOP 1
          i.item_pk AS pk, i.codigo_ativo_st AS code, i.nome_fantasia_st,
          CAST(i.latitude_vl AS FLOAT) AS latitude, CAST(i.longitude_vl AS FLOAT) AS longitude,
          i.ambiente_st, i.formato_midia_st, i.tipo_midia_st,
          i.mapped_ambiente_st, i.mapped_formato_st, i.mapped_tipo_st, i.mapped_bl,
          i.valor_tabela_vl, i.periodo_tabela_st,
          i.area_total_largura_vl, i.area_total_altura_vl, i.area_total_unidade_st,
          i.area_visual_largura_vl, i.area_visual_altura_vl, i.area_visual_unidade_st,
          i.substrato_st, i.especificacoes_st, i.secundagem_st, i.observacoes_st,
          i.status_st, i.erroValidacao_st,
          l.lote_pk AS lote_pk, l.arquivo_st AS lote_arquivo_st, l.dataCriacao_dh AS lote_dataCriacao_dh
        FROM [serv_product_be180].[exibidor_inventario_item_dm] i
        JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l ON l.lote_pk = i.lote_fk
        WHERE i.item_pk = @pk AND l.exibidor_fk = @exibidor_fk AND i.delete_bl = 0
      `);
    if (!r.recordset[0]) return res.status(404).json({ success: false, error: 'Ponto não encontrado' });
    return res.status(200).json({ success: true, origem: 'exibidor', data: r.recordset[0] });
  }

  return res.status(400).json({ success: false, error: 'Origem inválida' });
}

async function getLegado(req, res, pool) {
  const exibidorFk = Number(req.headers['x-user-exibidor-fk'] || 0) || null;
  if (!exibidorFk) {
    return res.status(400).json({ success: false, error: 'Exibidor não identificado' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
  const offset = (page - 1) * limit;
  const search = parseString(req.query.search);
  const cidadeFiltro = parseString(req.query.cidade);
  const tipoFiltro = parseString(req.query.tipo);

  const reqCount = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const reqData  = pool.request().input('exibidor_fk', sql.Int, exibidorFk);

  let where = 'WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk';

  if (search) {
    reqCount.input('search', sql.NVarChar(255), `%${search}%`);
    reqData.input('search', sql.NVarChar(255), `%${search}%`);
    where += ' AND (b.code LIKE @search OR b.cidade_st LIKE @search OR b.tipoMidia_st LIKE @search)';
  }
  if (cidadeFiltro) {
    reqCount.input('cidade', sql.NVarChar(150), cidadeFiltro);
    reqData.input('cidade', sql.NVarChar(150), cidadeFiltro);
    where += ' AND b.cidade_st = @cidade';
  }
  if (tipoFiltro) {
    reqCount.input('tipo', sql.NVarChar(150), tipoFiltro);
    reqData.input('tipo', sql.NVarChar(150), tipoFiltro);
    where += ' AND b.tipoMidia_st = @tipo';
  }

  // Stats
  const statsReq = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const stats = await statsReq.query(`
    SELECT
      COUNT(1)                                      AS totalPontos_vl,
      COUNT(DISTINCT ISNULL(NULLIF(LTRIM(RTRIM(b.cidade_st)),''),'SEM_CIDADE'))
                                                    AS pracas_vl,
      COUNT(CASE WHEN LOWER(b.environment_st) LIKE '%public%' THEN 1 END)
                                                    AS viasPublicas_vl,
      COUNT(CASE WHEN LOWER(b.environment_st) LIKE '%indoor%' THEN 1 END)
                                                    AS indoor_vl
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk
  `);

  // Tipos disponíveis para filtro
  const tiposReq = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const tipos = await tiposReq.query(`
    SELECT DISTINCT b.tipoMidia_st, COUNT(1) AS qtd
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk
      AND b.tipoMidia_st IS NOT NULL AND LTRIM(RTRIM(b.tipoMidia_st)) <> ''
    GROUP BY b.tipoMidia_st
    ORDER BY qtd DESC
  `);

  // Cidades disponíveis para filtro
  const cidadesReq = pool.request().input('exibidor_fk', sql.Int, exibidorFk);
  const cidades = await cidadesReq.query(`
    SELECT TOP 100 b.cidade_st, b.estado_st, COUNT(1) AS qtd
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    WHERE b.valid_bl = 1 AND b.exibidor_fk = @exibidor_fk
      AND b.cidade_st IS NOT NULL AND LTRIM(RTRIM(b.cidade_st)) <> ''
    GROUP BY b.cidade_st, b.estado_st
    ORDER BY qtd DESC
  `);

  // Total filtrado
  const totalResult = await reqCount.query(
    `SELECT COUNT(1) AS total FROM [serv_product_be180].[bancoAtivosJoin_ft] b ${where}`
  );
  const total = totalResult.recordset[0]?.total || 0;

  // Dados paginados
  reqData.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  const data = await reqData.query(`
    SELECT
      b.pk,
      b.code,
      b.latitude,
      b.longitude,
      b.cidade_st,
      b.estado_st,
      b.exibidor_st,
      b.tipoMidia_st,
      b.environment_st,
      b.media_format_st,
      b.grupo_st,
      b.grupoSub_st
    FROM [serv_product_be180].[bancoAtivosJoin_ft] b
    ${where}
    ORDER BY b.cidade_st, b.code
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  return res.status(200).json({
    success: true,
    stats: stats.recordset[0] || {},
    tipos: tipos.recordset,
    cidades: cidades.recordset,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: data.recordset,
  });
}

async function addComentario(req, res, pool) {
  const lotePk = Number(req.body?.lote_pk || 0);
  const autor = parseString(req.body?.autor) || 'Usuário';
  const mensagem = parseString(req.body?.mensagem);
  if (!lotePk || !mensagem) {
    return res.status(400).json({ success: false, error: 'lote_pk e mensagem são obrigatórios' });
  }

  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .input('autor_st', sql.NVarChar(255), autor)
    .input('mensagem_st', sql.NVarChar(2000), mensagem)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_solicitacao_comentario_dm] (lote_fk, autor_st, mensagem_st)
      VALUES (@lote_pk, @autor_st, @mensagem_st)
    `);

  return res.status(201).json({ success: true });
}

async function updateItem(req, res, pool) {
  const itemPk = Number(req.body?.item_pk || 0);
  if (!itemPk) {
    return res.status(400).json({ success: false, error: 'item_pk é obrigatório' });
  }

  const ambiente = parseString(req.body?.ambiente_st);
  const formato = parseString(req.body?.formato_midia_st);
  const tipo = parseString(req.body?.tipo_midia_st);
  const nomeFantasia = parseString(req.body?.nome_fantasia_st);
  const valorTabela = parseNumber(req.body?.valor_tabela_vl);

  await pool.request()
    .input('item_pk', sql.Int, itemPk)
    .input('ambiente_st', sql.NVarChar(150), ambiente)
    .input('formato_midia_st', sql.NVarChar(150), formato)
    .input('tipo_midia_st', sql.NVarChar(150), tipo)
    .input('nome_fantasia_st', sql.NVarChar(255), nomeFantasia)
    .input('valor_tabela_vl', sql.Decimal(18, 2), valorTabela)
    .query(`
      UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
      SET
        ambiente_st = COALESCE(@ambiente_st, ambiente_st),
        formato_midia_st = COALESCE(@formato_midia_st, formato_midia_st),
        tipo_midia_st = COALESCE(@tipo_midia_st, tipo_midia_st),
        nome_fantasia_st = COALESCE(@nome_fantasia_st, nome_fantasia_st),
        valor_tabela_vl = COALESCE(@valor_tabela_vl, valor_tabela_vl),
        status_st = 'EM_ANALISE',
        dataAtualizacao_dh = SYSDATETIME()
      WHERE item_pk = @item_pk
    `);

  return res.status(200).json({ success: true });
}

async function deleteItems(req, res, pool) {
  const itemPks = Array.isArray(req.body?.item_pks) ? req.body.item_pks.map((v) => Number(v)).filter((v) => v > 0) : [];
  if (itemPks.length === 0) {
    return res.status(400).json({ success: false, error: 'Informe ao menos um item para excluir' });
  }

  const idsCsv = itemPks.join(',');
  await pool.request().query(`
    UPDATE [serv_product_be180].[exibidor_inventario_item_dm]
    SET delete_bl = 1, dataAtualizacao_dh = SYSDATETIME()
    WHERE item_pk IN (${idsCsv})
  `);

  return res.status(200).json({ success: true, removidos: itemPks.length });
}

async function upsertDePara(req, res, pool) {
  const sourceAmbiente = parseString(req.body?.sourceAmbiente_st);
  const sourceFormato = parseString(req.body?.sourceFormato_st);
  const sourceTipo = parseString(req.body?.sourceTipo_st);
  const mappedAmbiente = parseString(req.body?.mappedAmbiente_st);
  const mappedFormato = parseString(req.body?.mappedFormato_st);
  const mappedTipo = parseString(req.body?.mappedTipo_st);
  const aliases = parseString(req.body?.aliases_st);

  if (!sourceFormato && !sourceTipo && !sourceAmbiente) {
    return res.status(400).json({ success: false, error: 'Informe ao menos um campo de origem para o de-para' });
  }

  await pool.request()
    .input('sourceAmbiente_st', sql.NVarChar(150), sourceAmbiente)
    .input('sourceFormato_st', sql.NVarChar(150), sourceFormato)
    .input('sourceTipo_st', sql.NVarChar(150), sourceTipo)
    .input('aliases_st', sql.NVarChar(1000), aliases)
    .input('mappedAmbiente_st', sql.NVarChar(150), mappedAmbiente)
    .input('mappedFormato_st', sql.NVarChar(150), mappedFormato)
    .input('mappedTipo_st', sql.NVarChar(150), mappedTipo)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_midia_depara_dm] (
        sourceAmbiente_st, sourceFormato_st, sourceTipo_st, aliases_st,
        mappedAmbiente_st, mappedFormato_st, mappedTipo_st, active_bl
      )
      VALUES (
        @sourceAmbiente_st, @sourceFormato_st, @sourceTipo_st, @aliases_st,
        @mappedAmbiente_st, @mappedFormato_st, @mappedTipo_st, 1
      )
    `);

  return res.status(201).json({ success: true });
}

async function enqueuePlaces(req, res, pool) {
  const lotePk = Number(req.body?.lote_pk || 0);
  if (!lotePk) return res.status(400).json({ success: false, error: 'lote_pk é obrigatório' });

  await pool.request()
    .input('lote_pk', sql.Int, lotePk)
    .query(`
      INSERT INTO [serv_product_be180].[exibidor_places_enriquecimento_dm] (item_fk, status_st, processarApos_dh)
      SELECT item_pk, 'PENDENTE', DATEADD(MINUTE, 1, SYSDATETIME())
      FROM [serv_product_be180].[exibidor_inventario_item_dm]
      WHERE lote_fk = @lote_pk
        AND delete_bl = 0
        AND item_pk NOT IN (
          SELECT item_fk FROM [serv_product_be180].[exibidor_places_enriquecimento_dm]
        )
    `);

  return res.status(200).json({ success: true });
}

async function listPlacesQueue(res, pool) {
  const result = await pool.request().query(`
    SELECT TOP 200
      enriquecimento_pk,
      item_fk,
      status_st,
      place_id_st,
      tentativas_vl,
      processarApos_dh,
      dataCriacao_dh
    FROM [serv_product_be180].[exibidor_places_enriquecimento_dm]
    ORDER BY enriquecimento_pk DESC
  `);
  return res.status(200).json({ success: true, data: result.recordset });
}

module.exports = async (req, res) => {
  try {
    const pool = await getPool();
    await ensureSchema(pool);

    if (req.method === 'GET') {
      const mode = String(req.query.mode || 'items');
      if (mode === 'solicitacoes') return listSolicitacoes(req, res, pool);
      if (mode === 'solicitacao-detalhe') return getSolicitacaoDetalhe(req, res, pool);
      if (mode === 'dashboard') return getDashboard(req, res, pool);
      if (mode === 'places-queue') return listPlacesQueue(res, pool);
      if (mode === 'legado') return getLegado(req, res, pool);
      if (mode === 'mapa') return getMapa(req, res, pool);
      if (mode === 'consolidado') return getConsolidado(req, res, pool);
      if (mode === 'detalhe-ponto') return getDetalhePonto(req, res, pool);
      return listItens(req, res, pool);
    }

    if (req.method === 'POST') {
      const op = String(req.body?.op || '');
      if (op === 'upload') return insertUpload(req, res, pool);
      if (op === 'comentario') return addComentario(req, res, pool);
      if (op === 'delete-items') return deleteItems(req, res, pool);
      if (op === 'upsert-depara') return upsertDePara(req, res, pool);
      if (op === 'queue-places') return enqueuePlaces(req, res, pool);
      return res.status(400).json({ success: false, error: 'Operação POST inválida' });
    }

    if (req.method === 'PUT') {
      return updateItem(req, res, pool);
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('[exibidor-inventario] Erro:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar inventário de exibidor',
      message: error.message,
    });
  }
};
