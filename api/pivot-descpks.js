const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT cidadeUpper_st, planoMidiaDesc_pk
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
    `);
    const descPks = {};
    result.recordset.forEach(r => {
      descPks[r.cidadeUpper_st] = r.planoMidiaDesc_pk;
    });
    res.json({ descPks });
  } catch (err) {
    console.error('Erro na API /api/pivot-descpks:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 