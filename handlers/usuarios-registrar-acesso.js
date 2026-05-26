const { sql, getPool } = require('./db');

/**
 * Registra o acesso de um usuário ao sistema.
 *
 * POST /api/admin?action=usuarios-registrar-acesso
 * Body: { email: string, auth0_sub?: string }
 *
 * - Sempre atualiza ultimoAcesso_dh = GETDATE()
 * - Define primeiroAcesso_dh apenas na primeira vez (COALESCE)
 * - Sincroniza auth0_id_st se ainda estiver NULL
 *
 * O endpoint é silencioso: nunca retorna 4xx que possa quebrar o fluxo de
 * login. É chamado em fire-and-forget pelo AuthContext.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const auth0Sub = req.body?.auth0_sub ? String(req.body.auth0_sub).trim() : null;

    if (!email || !email.includes('@')) {
      return res.status(200).json({ success: false, reason: 'email_invalido' });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('sub', sql.NVarChar(255), auth0Sub)
      .query(`
        UPDATE [serv_product_be180].[usuario_dm]
        SET ultimoAcesso_dh    = SYSUTCDATETIME(),
            primeiroAcesso_dh  = COALESCE(primeiroAcesso_dh, SYSUTCDATETIME()),
            auth0_id_st        = COALESCE(auth0_id_st, @sub)
        WHERE LOWER(email_st) = @email
          AND ativo_bl = 1
      `);

    const rowsAffected = result.rowsAffected?.[0] || 0;

    return res.status(200).json({
      success: rowsAffected > 0,
      rowsAffected,
    });
  } catch (error) {
    console.error('[usuarios-registrar-acesso] erro:', error.message);
    // Não propaga erro — não pode bloquear login
    return res.status(200).json({ success: false, error: 'internal' });
  }
};
