const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const desc_pk = req.query.desc_pk;
    if (!desc_pk) {
      return res.status(400).json({ error: 'Parâmetro desc_pk é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT semanaInicial_vl, semanaFinal_vl
      FROM serv_product_be180.planoMidia_dm_vw
      WHERE planoMidiaDesc_vl = ${desc_pk}
    `);
    res.json({ semanas: result.recordset });
  } catch (err) {
    console.error('Erro na API /api/semanas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 