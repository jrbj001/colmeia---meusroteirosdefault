const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool   = await getPostgresPool();
    const search = req.query.search?.trim() || '';

    const params = search ? [`%${search}%`] : [];
    const where  = search ? 'AND me.name ILIKE $1' : '';

    // Fix Bug 2: lista media_exhibitors.name (empresas reais), não codes de pontos
    const result = await pool.query(`
      SELECT DISTINCT
        me.id   AS id_exibidor,
        me.name AS nome_exibidor,
        me.name AS codigo_exibidor
      FROM media_exhibitors me
      WHERE EXISTS (
        SELECT 1 FROM media_points mp
        WHERE mp.media_exhibitor_id = me.id
          AND mp.is_deleted = false
          AND mp.is_active  = true
      )
      ${where}
      ORDER BY me.name
      LIMIT 500
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('[exibidores-praca] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar exibidores' });
  }
};
