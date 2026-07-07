const { sql, getPool } = require('./db');

/**
 * GET /api/exibidores-dashboard
 *
 * Dashboard de acompanhamento de exibidores para usuários internos.
 * Filtra:
 *   - exibidor_dm.sandbox_bl = 0  (empresas sandbox)
 *   - usuários cujo nome contém "sandbox" (case-insensitive)
 *   - usuários com email no domínio @pixelpulselab.dev
 *
 * Retorna:
 *   overview    — totais gerais
 *   acessaram   — usuários que já fizeram login (com atividade de inventário)
 *   inventario  — resumo por exibidor (só os que enviaram algo)
 *   statusLotes — distribuição por status dos lotes
 *   aguardando  — usuários que nunca acessaram (têm email)
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const S = 'serv_product_be180';

  // Fragmento SQL reutilizável: exclui usuários sandbox identificados por nome ou email
  const NAO_SANDBOX_USR = `
    AND LOWER(u.nome_st)  NOT LIKE '%sandbox%'
    AND LOWER(u.email_st) NOT LIKE '%pixelpulselab%'
  `;

  try {
    const pool = await getPool();

    // ── 1. Overview ─────────────────────────────────────────────────────────
    const ovResult = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM [${S}].[usuario_dm] u
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
         WHERE u.perfil_pk = 5 AND u.ativo_bl = 1 AND e.sandbox_bl = 0
           ${NAO_SANDBOX_USR}) AS total_usuarios,

        (SELECT COUNT(*) FROM [${S}].[usuario_dm] u
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
         WHERE u.perfil_pk = 5 AND u.ativo_bl = 1 AND e.sandbox_bl = 0
           AND u.primeiroAcesso_dh IS NOT NULL
           ${NAO_SANDBOX_USR}) AS acessaram,

        (SELECT COUNT(*) FROM [${S}].[usuario_dm] u
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
         WHERE u.perfil_pk = 5 AND u.ativo_bl = 1 AND e.sandbox_bl = 0
           AND u.primeiroAcesso_dh IS NULL
           ${NAO_SANDBOX_USR}) AS nunca_acessaram,

        (SELECT COUNT(DISTINCT l.exibidor_fk)
         FROM [${S}].[exibidor_inventario_upload_lote_dm] l
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
         WHERE e.sandbox_bl = 0) AS exibidores_com_lote,

        (SELECT COUNT(*)
         FROM [${S}].[exibidor_inventario_upload_lote_dm] l
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
         WHERE e.sandbox_bl = 0) AS total_lotes,

        (SELECT ISNULL(SUM(l.totalRegistros_vl), 0)
         FROM [${S}].[exibidor_inventario_upload_lote_dm] l
         JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
         WHERE e.sandbox_bl = 0) AS total_registros
    `);
    const overview = ovResult.recordset[0];

    // ── 2. Usuários que já acessaram ────────────────────────────────────────
    const accResult = await pool.request().query(`
      SELECT
        u.pk,
        LOWER(LTRIM(RTRIM(u.email_st)))  AS email,
        LTRIM(RTRIM(u.nome_st))          AS nome,
        u.exibidor_fk,
        LTRIM(RTRIM(e.nome_st))          AS exibidor,
        u.primeiroAcesso_dh,
        u.ultimoAcesso_dh,
        (SELECT COUNT(*) FROM [${S}].[exibidor_inventario_upload_lote_dm] l2
         WHERE l2.exibidor_fk = u.exibidor_fk) AS lotes_do_exibidor
      FROM [${S}].[usuario_dm] u
      JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
      WHERE u.perfil_pk = 5
        AND u.ativo_bl = 1
        AND e.sandbox_bl = 0
        AND u.primeiroAcesso_dh IS NOT NULL
        AND LOWER(u.nome_st)  NOT LIKE '%sandbox%'
        AND LOWER(u.email_st) NOT LIKE '%pixelpulselab%'
      ORDER BY u.ultimoAcesso_dh DESC
    `);

    // ── 3. Inventário por exibidor ──────────────────────────────────────────
    const invResult = await pool.request().query(`
      SELECT
        e.exibidor_pk,
        LTRIM(RTRIM(e.nome_st))             AS exibidor,
        COUNT(l.lote_pk)                    AS lotes,
        ISNULL(SUM(l.totalRegistros_vl), 0) AS total_registros,
        ISNULL(SUM(l.processados_vl), 0)    AS processados,
        ISNULL(SUM(l.rejeitados_vl), 0)     AS rejeitados,
        MIN(l.dataCriacao_dh)               AS primeiro_envio,
        MAX(l.dataCriacao_dh)               AS ultimo_envio
      FROM [${S}].[exibidor_inventario_upload_lote_dm] l
      JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
      WHERE e.sandbox_bl = 0
      GROUP BY e.exibidor_pk, e.nome_st
      ORDER BY COUNT(l.lote_pk) DESC, ISNULL(SUM(l.totalRegistros_vl), 0) DESC
    `);

    // ── 4. Status dos lotes ─────────────────────────────────────────────────
    const stResult = await pool.request().query(`
      SELECT
        l.status_st                         AS status,
        COUNT(*)                            AS qtd,
        ISNULL(SUM(l.totalRegistros_vl), 0) AS registros
      FROM [${S}].[exibidor_inventario_upload_lote_dm] l
      JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = l.exibidor_fk
      WHERE e.sandbox_bl = 0
      GROUP BY l.status_st
      ORDER BY qtd DESC
    `);

    // ── 5. Aguardando primeiro acesso (tem email) ───────────────────────────
    const aguResult = await pool.request().query(`
      SELECT TOP 200
        u.pk,
        LOWER(LTRIM(RTRIM(u.email_st))) AS email,
        LTRIM(RTRIM(u.nome_st))         AS nome,
        u.exibidor_fk,
        LTRIM(RTRIM(e.nome_st))         AS exibidor,
        u.date_dh                       AS data_cadastro
      FROM [${S}].[usuario_dm] u
      JOIN [${S}].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
      WHERE u.perfil_pk = 5
        AND u.ativo_bl = 1
        AND e.sandbox_bl = 0
        AND u.primeiroAcesso_dh IS NULL
        AND u.email_st IS NOT NULL
        AND LTRIM(RTRIM(u.email_st)) <> ''
        AND LOWER(u.nome_st)  NOT LIKE '%sandbox%'
        AND LOWER(u.email_st) NOT LIKE '%pixelpulselab%'
      ORDER BY u.date_dh DESC
    `);

    return res.status(200).json({
      success: true,
      geradoEm: new Date().toISOString(),
      overview,
      acessaram:    accResult.recordset,
      inventario:   invResult.recordset,
      statusLotes:  stResult.recordset,
      aguardando:   aguResult.recordset,
    });

  } catch (error) {
    console.error('[exibidores-dashboard]', error.message);
    return res.status(500).json({ success: false, error: 'Erro ao carregar dashboard', message: error.message });
  }
};
