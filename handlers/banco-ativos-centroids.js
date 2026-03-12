const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();
    const { tipo_ambiente } = req.query;

    let envFilter = '';
    if (tipo_ambiente === 'indoor')            envFilter = "AND UPPER(environment_st) = 'INDOOR'";
    else if (tipo_ambiente === 'vias_publicas') envFilter = "AND UPPER(environment_st) = 'PUBLIC'";

    const result = await pool.request().query(`
      SELECT
        cidade_st                                                    AS cidade,
        estado_st                                                    AS estado,
        AVG(CAST(latitude  AS FLOAT))                               AS lat,
        AVG(CAST(longitude AS FLOAT))                               AS lon,
        COUNT(*)                                                     AS total_pontos,
        SUM(ISNULL(CAST(pedestrian_flow  AS FLOAT), 0))             AS total_passantes,
        SUM(ISNULL(CAST(total_ipv_impact AS FLOAT), 0))             AS total_impactos,
        SUM(CASE WHEN UPPER(environment_st) = 'PUBLIC' THEN 1 ELSE 0 END) AS pontos_public,
        SUM(CASE WHEN UPPER(environment_st) = 'INDOOR' THEN 1 ELSE 0 END) AS pontos_indoor
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE valid_bl = 1
        AND latitude  IS NOT NULL AND CAST(latitude  AS FLOAT) != 0
        AND longitude IS NOT NULL AND CAST(longitude AS FLOAT) != 0
        AND cidade_st IS NOT NULL
        ${envFilter}
      GROUP BY cidade_st, estado_st
      ORDER BY COUNT(*) DESC
    `);

    res.status(200).json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('[banco-ativos-centroids] Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
