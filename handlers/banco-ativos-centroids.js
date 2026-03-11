const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPostgresPool();
    const { tipo_ambiente } = req.query;

    let envFilter = '';
    if (tipo_ambiente === 'indoor') envFilter = "AND mt.environment = 'Indoor'";
    else if (tipo_ambiente === 'vias_publicas') envFilter = "AND mt.environment = 'Public'";

    const result = await pool.query(`
      SELECT
        c.name                          AS cidade,
        COALESCE(s.acronym, s.name, '') AS estado,
        AVG(CAST(mp.latitude  AS FLOAT)) AS lat,
        AVG(CAST(mp.longitude AS FLOAT)) AS lon,
        COUNT(*)                         AS total_pontos,
        SUM(COALESCE(mp.pedestrian_flow, 0))  AS total_passantes,
        SUM(COALESCE(mp.total_ipv_impact, 0)) AS total_impactos,
        COUNT(*) FILTER (WHERE mt.environment = 'Public') AS pontos_public,
        COUNT(*) FILTER (WHERE mt.environment = 'Indoor') AS pontos_indoor
      FROM media_points mp
      JOIN  cities c ON c.id = mp.city_id
      LEFT JOIN states s ON s.id = c.state_id
      LEFT JOIN media_types mt ON mt.id = mp.media_type_id
      WHERE mp.is_deleted = false
        AND mp.is_active  = true
        AND mp.latitude  IS NOT NULL AND mp.latitude  != 0
        AND mp.longitude IS NOT NULL AND mp.longitude != 0
        ${envFilter}
      GROUP BY c.name, s.acronym, s.name
      ORDER BY total_pontos DESC
    `);

    res.status(200).json({ success: true, data: result.rows });

  } catch (error) {
    if (error.message.includes('states') || error.message.includes('state_id')) {
      try {
        const pool = await getPostgresPool();
        const result = await pool.query(`
          SELECT
            c.name AS cidade, '' AS estado,
            AVG(CAST(mp.latitude AS FLOAT)) AS lat,
            AVG(CAST(mp.longitude AS FLOAT)) AS lon,
            COUNT(*) AS total_pontos,
            SUM(COALESCE(mp.pedestrian_flow, 0)) AS total_passantes,
            SUM(COALESCE(mp.total_ipv_impact, 0)) AS total_impactos,
            COUNT(*) FILTER (WHERE mt.environment = 'Public') AS pontos_public,
            COUNT(*) FILTER (WHERE mt.environment = 'Indoor') AS pontos_indoor
          FROM media_points mp
          JOIN cities c ON c.id = mp.city_id
          LEFT JOIN media_types mt ON mt.id = mp.media_type_id
          WHERE mp.is_deleted = false AND mp.is_active = true
            AND mp.latitude IS NOT NULL AND mp.latitude != 0
            AND mp.longitude IS NOT NULL AND mp.longitude != 0
          GROUP BY c.name
          ORDER BY total_pontos DESC
        `);
        return res.status(200).json({ success: true, data: result.rows });
      } catch (err2) {
        console.error('[banco-ativos-centroids] Fallback falhou:', err2.message);
      }
    }
    console.error('[banco-ativos-centroids] Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
