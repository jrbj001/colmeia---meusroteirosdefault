const { sql, getPool } = require('./db');

/**
 * Resolução automática de exibidor por domínio de e-mail.
 *
 * GET /referencia?action=exibidor-resolve-domain&email=ze@pixelpulselab.dev
 *
 * Fluxo:
 *  1. Extrai domínio do e-mail informado.
 *  2. Busca exibidor_dm cujo dominio_st corresponde.
 *  3. Se houver match, verifica se já existe usuário com esse e-mail.
 *     - Existe → retorna dados enriquecidos (com exibidor_fk).
 *     - Não existe → cria automaticamente com perfil Exibidor + exibidor_fk.
 *  4. Se não houver match de domínio → 404.
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'E-mail inválido' });
  }

  const domain = email.split('@')[1];

  try {
    const pool = await getPool();

    // 1. Busca exibidor pelo domínio
    //    Estratégia: prioriza tabela 1:N (exibidor_dominio_dm) e cai no fallback legado em exibidor_dm.dominio_st
    const exibidorResult = await pool.request()
      .input('dominio', sql.NVarChar(150), domain)
      .query(`
        SELECT TOP 1
          e.exibidor_pk,
          e.nome_st,
          e.nome_fantasia_st,
          d.dominio_st
        FROM [serv_product_be180].[exibidor_dominio_dm] d
        JOIN [serv_product_be180].[exibidor_dm] e
          ON e.exibidor_pk = d.exibidor_fk
         AND e.delete_bl = 0
         AND e.active_bl = 1
        WHERE d.delete_bl = 0
          AND d.active_bl = 1
          AND LOWER(d.dominio_st) = @dominio

        UNION ALL

        SELECT TOP 1
          e.exibidor_pk, e.nome_st, e.nome_fantasia_st, e.dominio_st
        FROM [serv_product_be180].[exibidor_dm] e
        WHERE e.delete_bl = 0
          AND e.active_bl = 1
          AND LOWER(e.dominio_st) = @dominio
          AND NOT EXISTS (
            SELECT 1 FROM [serv_product_be180].[exibidor_dominio_dm] d2
            WHERE d2.exibidor_fk = e.exibidor_pk AND d2.delete_bl = 0
          )
      `);

    if (exibidorResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Domínio não associado a nenhum exibidor' });
    }

    const exibidor = exibidorResult.recordset[0];

    // 2. Verifica se já existe usuário com esse e-mail
    const usuarioResult = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT TOP 1
          u.pk           AS usuario_pk,
          u.nome_st      AS usuario_nome,
          u.email_st     AS usuario_email,
          u.ativo_bl     AS usuario_ativo,
          u.perfil_pk,
          p.nome_st      AS perfil_nome,
          u.empresa_pk,
          u.exibidor_fk
        FROM [serv_product_be180].[usuario_dm] u
        JOIN [serv_product_be180].[perfil_dm] p ON p.perfil_pk = u.perfil_pk
        WHERE LOWER(u.email_st) = @email
      `);

    if (usuarioResult.recordset.length > 0) {
      const u = usuarioResult.recordset[0];
      if (!u.usuario_ativo) {
        return res.status(403).json({ success: false, error: 'Usuário desativado' });
      }
      return res.status(200).json({
        success: true,
        source: 'existing',
        usuario: { ...u, exibidor_fk: u.exibidor_fk ?? exibidor.exibidor_pk },
        exibidor,
      });
    }

    // 3. Usuário não existe — auto-provisionamento com perfil Exibidor
    const perfilResult = await pool.request().query(`
      SELECT TOP 1 perfil_pk
      FROM [serv_product_be180].[perfil_dm]
      WHERE LOWER(nome_st) LIKE '%exibidor%'
      ORDER BY perfil_pk
    `);

    if (perfilResult.recordset.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'Perfil Exibidor não encontrado no banco. Execute o script ongoing/09_SEED_perfil_exibidor_teste.sql.',
      });
    }

    const perfilPk = perfilResult.recordset[0].perfil_pk;
    const nomeDisplay = email.split('@')[0];

    const insertResult = await pool.request()
      .input('nome_st', sql.NVarChar(255), nomeDisplay)
      .input('email_st', sql.NVarChar(255), email)
      .input('perfil_pk', sql.Int, perfilPk)
      .input('exibidor_fk', sql.Int, exibidor.exibidor_pk)
      .query(`
        INSERT INTO [serv_product_be180].[usuario_dm]
          (nome_st, email_st, perfil_pk, exibidor_fk, ativo_bl, date_dh, date_dt)
        OUTPUT
          INSERTED.pk AS usuario_pk,
          INSERTED.nome_st AS usuario_nome,
          INSERTED.email_st AS usuario_email,
          INSERTED.perfil_pk,
          INSERTED.exibidor_fk
        VALUES
          (@nome_st, @email_st, @perfil_pk, @exibidor_fk, 1, GETDATE(), CAST(GETDATE() AS DATE))
      `);

    const newUser = insertResult.recordset[0];

    return res.status(201).json({
      success: true,
      source: 'auto_provisioned',
      usuario: {
        ...newUser,
        perfil_nome: 'Exibidor',
        usuario_ativo: true,
        empresa_pk: null,
      },
      exibidor,
    });

  } catch (error) {
    console.error('[exibidor-resolve-domain]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao resolver domínio de exibidor',
      message: error.message,
    });
  }
};
