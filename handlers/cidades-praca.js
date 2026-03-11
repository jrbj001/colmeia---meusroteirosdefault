const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool   = await getPostgresPool();
    const search = req.query.search?.trim() || '';

    const params = search ? [`%${search}%`] : [];
    const where  = search ? 'AND (c.name ILIKE $1 OR COALESCE(s.acronym, s.name, \'\') ILIKE $1)' : '';

    // Fix Bug 1: usa cities.name (cidades reais), não district (bairros) do SQL Server
    const result = await pool.query(`
      SELECT DISTINCT
        c.id   AS id_cidade,
        c.name AS nome_cidade,
        COALESCE(s.acronym, s.name, '') AS nome_estado
      FROM cities c
      LEFT JOIN states s ON s.id = c.state_id
      WHERE EXISTS (
        SELECT 1 FROM media_points mp
        WHERE mp.city_id    = c.id
          AND mp.is_deleted = false
          AND mp.is_active  = true
      )
      ${where}
      ORDER BY c.name
      LIMIT 1000
    `, params);

    res.json(result.rows);
  } catch (error) {
    // Fallback sem join de states caso a coluna não exista
    if (error.message.includes('states') || error.message.includes('state_id')) {
      try {
        const pool   = await getPostgresPool();
        const search = req.query.search?.trim() || '';
        const params = search ? [`%${search}%`] : [];
        const where  = search ? 'AND c.name ILIKE $1' : '';

        const result = await pool.query(`
          SELECT DISTINCT
            c.id   AS id_cidade,
            c.name AS nome_cidade,
            ''     AS nome_estado
          FROM cities c
          WHERE EXISTS (
            SELECT 1 FROM media_points mp
            WHERE mp.city_id    = c.id
              AND mp.is_deleted = false
              AND mp.is_active  = true
          )
          ${where}
          ORDER BY c.name
          LIMIT 1000
        `, params);

        return res.json(result.rows);
      } catch (err2) {
        console.error('[cidades-praca] Fallback falhou:', err2.message);
      }
    }
    console.error('[cidades-praca] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar cidades' });
  }
};
