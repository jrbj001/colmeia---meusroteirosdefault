const { getPool } = require('./db');
const { requireInternalUser } = require('./auth-middleware');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Apenas usuários internos BE (empresa_pk = null) podem trocar status
  if (!requireInternalUser(req, res)) return;

  try {
    const { planoMidiaGrupo_pk, planoMidiaStatus_pk } = req.body;

    if (!planoMidiaGrupo_pk || !Number.isInteger(Number(planoMidiaGrupo_pk)) || Number(planoMidiaGrupo_pk) <= 0) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk deve ser um inteiro positivo' });
    }

    if (!planoMidiaStatus_pk || !Number.isInteger(Number(planoMidiaStatus_pk)) || Number(planoMidiaStatus_pk) <= 0) {
      return res.status(400).json({ error: 'planoMidiaStatus_pk deve ser um inteiro positivo' });
    }

    const pool = await getPool();

    try {
      await pool.request()
        .input('planoMidiaGrupo_pk', Number(planoMidiaGrupo_pk))
        .input('planoMidiaStatus_pk', Number(planoMidiaStatus_pk))
        .execute('serv_product_be180.sp_planoMidiaGrupoUpdateStatus');
    } catch (spErr) {
      // RAISERROR do SP → HTTP 400 com a mensagem original
      const msg = spErr?.message || 'Status inválido ou inativo';
      return res.status(400).json({ error: msg });
    }

    res.json({
      success: true,
      planoMidiaGrupo_pk: Number(planoMidiaGrupo_pk),
      planoMidiaStatus_pk: Number(planoMidiaStatus_pk),
    });
  } catch (err) {
    console.error('Erro ao atualizar status do roteiro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
