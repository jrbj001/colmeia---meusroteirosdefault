const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk } = req.body;
    
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório' });
    }

    const pool = await getPool();
    const empresaPk = req.user?.empresa_pk ?? null;

    const agenciaFilter = empresaPk
      ? 'AND agencia_pk = @empresaPk AND liberadoAgencia_bl = 1'
      : '';

    const request = pool.request().input('planoMidiaGrupo_pk', planoMidiaGrupo_pk);
    if (empresaPk) request.input('empresaPk', empresaPk);

    const result = await request.query(`
      SELECT TOP 1 *
      FROM serv_product_be180.planoMidiaGrupo_dm_vw
      WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk ${agenciaFilter}
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Roteiro não encontrado' });
    }

    res.status(200).json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Erro ao buscar roteiro completo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
