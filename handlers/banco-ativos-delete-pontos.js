const { authMiddleware, requireInternalUser, requireAdmin } = require('./auth-middleware');
const { getPostgresPool } = require('./banco-ativos-passantes');

async function handleDelete(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!requireInternalUser(req, res)) return;
  if (!requireAdmin(req, res)) return;

  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um ponto para excluir (ids)' });
    }

    const numericIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (numericIds.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const pool = await getPostgresPool();
    const result = await pool.query(
      `
        UPDATE media_points
        SET is_deleted = true,
            is_active = false
        WHERE id = ANY($1::int[])
          AND is_deleted = false
        RETURNING id
      `,
      [numericIds]
    );

    const deletedIds = result.rows.map((row) => row.id);

    console.log(
      `[banco-ativos-delete-pontos] ${deletedIds.length} ponto(s) excluído(s) por ${req.user?.email || 'desconhecido'}`
    );

    return res.status(200).json({
      success: true,
      deleted: deletedIds.length,
      ids: deletedIds,
    });
  } catch (error) {
    console.error('[banco-ativos-delete-pontos] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao excluir pontos de mídia',
      message: error.message,
    });
  }
}

module.exports = (req, res) => {
  authMiddleware(req, res, () => handleDelete(req, res));
};
