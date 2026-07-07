const { sql, getPool } = require('./db');

/**
 * API de administração de praças canônicas.
 *
 * GET  ?mode=pendentes   — praças submetidas por exibidores que não constam no IBGE/legado
 * GET  ?mode=list        — lista de praças customizadas cadastradas pelo admin
 * POST op=criar          — cadastra nova praça customizada { nome_st, uf_st }
 * POST op=criar-tabela   — garante que praca_canonica_dm existe (migration idempotente)
 * DELETE ?pk=N           — soft-delete de praça customizada
 */
module.exports = async (req, res) => {
  try {
    const pool = await getPool();

    // ── GET ───────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const mode   = String(req.query.mode || 'pendentes');
      const search = (req.query.search || '').trim();

      if (mode === 'pendentes') {
        // Praças dos exibidores que não existem nem no IBGE nem no legado
        const req_ = pool.request();
        let searchWhere = '';
        if (search) {
          req_.input('search', sql.NVarChar, `%${search}%`);
          searchWhere = 'AND (UPPER(i.praca_st) LIKE @search OR i.uf_st LIKE @search)';
        }
        const result = await req_.query(`
          SELECT
            UPPER(LTRIM(RTRIM(i.praca_st))) AS praca_st,
            UPPER(LTRIM(RTRIM(i.uf_st)))    AS uf_st,
            COUNT(DISTINCT i.lote_fk)        AS qtd_lotes,
            COUNT(1)                         AS qtd_itens,
            MAX(e.nome_st)                   AS exibidor_nome
          FROM [serv_product_be180].[exibidor_inventario_item_dm] i
          JOIN [serv_product_be180].[exibidor_inventario_upload_lote_dm] l
            ON l.lote_pk = i.lote_fk
          JOIN [serv_product_be180].[exibidor_dm] e
            ON e.exibidor_pk = l.exibidor_fk
          WHERE i.delete_bl = 0
            AND i.praca_st IS NOT NULL
            AND LTRIM(RTRIM(i.praca_st)) <> ''
            ${searchWhere}
            AND NOT EXISTS (
              SELECT 1 FROM [serv_product_be180].[cidadeIbge_dm] c
              WHERE UPPER(LTRIM(RTRIM(c.cidade_st))) = UPPER(LTRIM(RTRIM(i.praca_st)))
            )
            AND NOT EXISTS (
              SELECT 1 FROM [serv_product_be180].[bancoAtivosJoin_ft] b
              WHERE UPPER(LTRIM(RTRIM(b.cidade_st))) = UPPER(LTRIM(RTRIM(i.praca_st)))
                AND b.valid_bl = 1
            )
          GROUP BY UPPER(LTRIM(RTRIM(i.praca_st))), UPPER(LTRIM(RTRIM(i.uf_st)))
          ORDER BY qtd_itens DESC
        `);
        return res.json({ success: true, data: result.recordset });
      }

      if (mode === 'list') {
        const hasTable = await pool.request().query(`
          SELECT 1 AS ok FROM sys.tables t
          JOIN sys.schemas s ON s.schema_id = t.schema_id
          WHERE s.name = 'serv_product_be180' AND t.name = 'praca_canonica_dm'
        `);
        if (!hasTable.recordset.length) {
          return res.json({ success: true, data: [] });
        }
        const req_ = pool.request();
        let where = 'WHERE delete_bl = 0';
        if (search) {
          req_.input('search', sql.NVarChar, `%${search}%`);
          where += ' AND (nome_st LIKE @search OR uf_st LIKE @search)';
        }
        const result = await req_.query(`
          SELECT praca_pk, nome_st, uf_st, dataCriacao_dh, criadoPor_st
          FROM [serv_product_be180].[praca_canonica_dm]
          ${where}
          ORDER BY nome_st
        `);
        return res.json({ success: true, data: result.recordset });
      }

      return res.status(400).json({ error: 'mode inválido. Use: pendentes | list' });
    }

    // ── POST ──────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { op, nome_st, uf_st } = req.body || {};

      // Garante que a tabela existe (migration idempotente)
      if (op === 'criar-tabela') {
        const hasTable = await pool.request().query(`
          SELECT 1 AS ok FROM sys.tables t
          JOIN sys.schemas s ON s.schema_id = t.schema_id
          WHERE s.name = 'serv_product_be180' AND t.name = 'praca_canonica_dm'
        `);
        if (!hasTable.recordset.length) {
          await pool.request().query(`
            CREATE TABLE [serv_product_be180].[praca_canonica_dm] (
              praca_pk       INT IDENTITY(1,1) PRIMARY KEY,
              nome_st        NVARCHAR(200) NOT NULL,
              uf_st          NVARCHAR(2)   NULL,
              delete_bl      BIT           NOT NULL DEFAULT 0,
              dataCriacao_dh DATETIME      NOT NULL DEFAULT GETDATE(),
              criadoPor_st   NVARCHAR(255) NULL,
              CONSTRAINT UQ_praca_canonica UNIQUE (nome_st, uf_st)
            )
          `);
          return res.json({ success: true, created: true, message: 'Tabela praca_canonica_dm criada com sucesso.' });
        }
        return res.json({ success: true, created: false, message: 'Tabela já existe.' });
      }

      if (op === 'criar') {
        const nome = String(nome_st || '').trim().toUpperCase();
        const uf   = String(uf_st   || '').trim().toUpperCase();
        if (!nome) return res.status(400).json({ error: 'nome_st é obrigatório' });

        // Garante tabela
        const hasTable = await pool.request().query(`
          SELECT 1 AS ok FROM sys.tables t
          JOIN sys.schemas s ON s.schema_id = t.schema_id
          WHERE s.name = 'serv_product_be180' AND t.name = 'praca_canonica_dm'
        `);
        if (!hasTable.recordset.length) {
          await pool.request().query(`
            CREATE TABLE [serv_product_be180].[praca_canonica_dm] (
              praca_pk       INT IDENTITY(1,1) PRIMARY KEY,
              nome_st        NVARCHAR(200) NOT NULL,
              uf_st          NVARCHAR(2)   NULL,
              delete_bl      BIT           NOT NULL DEFAULT 0,
              dataCriacao_dh DATETIME      NOT NULL DEFAULT GETDATE(),
              criadoPor_st   NVARCHAR(255) NULL,
              CONSTRAINT UQ_praca_canonica UNIQUE (nome_st, uf_st)
            )
          `);
        }

        const ins = await pool.request()
          .input('nome', sql.NVarChar(200), nome)
          .input('uf',   sql.NVarChar(2),   uf || null)
          .input('who',  sql.NVarChar(255),  req.user?.email || null)
          .query(`
            MERGE [serv_product_be180].[praca_canonica_dm] AS tgt
            USING (SELECT @nome AS nome_st, @uf AS uf_st) AS src
              ON tgt.nome_st = src.nome_st AND tgt.uf_st = src.uf_st
            WHEN MATCHED AND tgt.delete_bl = 1 THEN
              UPDATE SET tgt.delete_bl = 0, tgt.dataCriacao_dh = GETDATE(), tgt.criadoPor_st = @who
            WHEN NOT MATCHED THEN
              INSERT (nome_st, uf_st, criadoPor_st) VALUES (@nome, @uf, @who);

            SELECT TOP 1 praca_pk, nome_st, uf_st
            FROM [serv_product_be180].[praca_canonica_dm]
            WHERE nome_st = @nome AND (uf_st = @uf OR (@uf IS NULL AND uf_st IS NULL))
          `);

        return res.status(201).json({ success: true, praca: ins.recordset[0] });
      }

      return res.status(400).json({ error: 'op inválido. Use: criar | criar-tabela' });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const pk = Number(req.query.pk || 0);
      if (!pk) return res.status(400).json({ error: 'pk é obrigatório' });
      await pool.request()
        .input('pk', sql.Int, pk)
        .query(`UPDATE [serv_product_be180].[praca_canonica_dm] SET delete_bl = 1 WHERE praca_pk = @pk`);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('[pracas-admin]', err.message);
    return res.status(500).json({ error: 'Erro interno', message: err.message });
  }
};
