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
      SELECT DISTINCT cidadeUpper_st, planoMidiaGrupo_st
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
      ORDER BY cidadeUpper_st
    `);
    const cidades = result.recordset.map(r => r.cidadeUpper_st);
    const nomeGrupo = result.recordset.length > 0 ? result.recordset[0].planoMidiaGrupo_st : null;
    res.json({ cidades, nomeGrupo });
  } catch (err) {
    console.error('Erro na API /api/cidades:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 