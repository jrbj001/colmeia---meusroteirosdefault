const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Apenas usuários Be (empresa_pk = null) podem liberar roteiros
  if (req.user?.empresa_pk) {
    return res.status(403).json({ error: 'Apenas usuários internos podem liberar roteiros para agências' });
  }

  try {
    const { planoMidiaGrupo_pk, liberadoAgencia_bl } = req.body;

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório' });
    }

    const valor = liberadoAgencia_bl ? 1 : 0;
    const pool = await getPool();

    await pool.request()
      .input('pk', planoMidiaGrupo_pk)
      .input('valor', valor)
      .query(`
        UPDATE serv_product_be180.planoMidiaGrupo_dm
        SET liberadoAgencia_bl = @valor
        WHERE pk = @pk
      `);

    res.json({
      success: true,
      planoMidiaGrupo_pk,
      liberadoAgencia_bl: valor,
    });
  } catch (err) {
    console.error('Erro ao liberar roteiro para agência:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
