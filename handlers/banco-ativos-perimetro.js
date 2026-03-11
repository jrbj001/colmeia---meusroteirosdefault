const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool   = await getPool();
    const cidade = req.query.cidade?.trim() || null;

    // --- Retornar TODOS os perimetros (visão Brasil) ---
    if (!cidade) {
      const result = await pool.request().query(`
        SELECT
          l.city_id,
          l.latitude_min_vl,
          l.latitude_max_vl,
          l.longitude_min_vl,
          l.longitude_max_vl,
          l.latitude_center_vl,
          l.longitude_center_vl,
          f.cidade_st,
          f.estado_st
        FROM [serv_product_be180].[bancoAtivosCidadeLimites_dm] l
        INNER JOIN (
          SELECT DISTINCT city_id, cidade_st, estado_st
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE valid_bl = 1
            AND city_id IS NOT NULL
            AND cidade_st IS NOT NULL
        ) f ON f.city_id = l.city_id
        WHERE l.latitude_min_vl  IS NOT NULL
          AND l.latitude_max_vl  IS NOT NULL
          AND l.longitude_min_vl IS NOT NULL
          AND l.longitude_max_vl IS NOT NULL
          AND l.latitude_min_vl  != l.latitude_max_vl
          AND l.longitude_min_vl != l.longitude_max_vl
      `);

      return res.status(200).json({ success: true, data: result.recordset });
    }

    // --- Retornar perimetro de uma cidade específica ---
    const limites = await pool.request()
      .input('cidade', sql.NVarChar, cidade)
      .query(`
        SELECT TOP 1
          l.city_id,
          l.latitude_min_vl,
          l.latitude_max_vl,
          l.longitude_min_vl,
          l.longitude_max_vl,
          l.latitude_center_vl,
          l.longitude_center_vl,
          @cidade AS cidade_st
        FROM [serv_product_be180].[bancoAtivosCidadeLimites_dm] l
        WHERE l.city_id IN (
          SELECT DISTINCT city_id
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE cidade_st = @cidade AND valid_bl = 1 AND city_id IS NOT NULL
        )
        AND l.latitude_min_vl  IS NOT NULL
        AND l.latitude_max_vl  IS NOT NULL
        AND l.longitude_min_vl IS NOT NULL
        AND l.longitude_max_vl IS NOT NULL
      `);

    if (limites.recordset.length > 0) {
      return res.status(200).json({ success: true, data: limites.recordset[0] });
    }

    // Fallback: calcula min/max dos pontos
    const fallback = await pool.request()
      .input('cidade', sql.NVarChar, cidade)
      .query(`
        SELECT
          NULL AS city_id,
          MIN(CAST(latitude  AS FLOAT)) AS latitude_min_vl,
          MAX(CAST(latitude  AS FLOAT)) AS latitude_max_vl,
          MIN(CAST(longitude AS FLOAT)) AS longitude_min_vl,
          MAX(CAST(longitude AS FLOAT)) AS longitude_max_vl,
          AVG(CAST(latitude  AS FLOAT)) AS latitude_center_vl,
          AVG(CAST(longitude AS FLOAT)) AS longitude_center_vl,
          @cidade AS cidade_st
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1
          AND cidade_st = @cidade
          AND latitude  IS NOT NULL AND CAST(latitude  AS FLOAT) != 0
          AND longitude IS NOT NULL AND CAST(longitude AS FLOAT) != 0
      `);

    if (fallback.recordset.length > 0 && fallback.recordset[0].latitude_min_vl !== null) {
      return res.status(200).json({ success: true, source: 'fallback', data: fallback.recordset[0] });
    }

    res.status(404).json({ success: false, error: 'Perimetro não encontrado' });

  } catch (error) {
    console.error('[banco-ativos-perimetro] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar perimetro', message: error.message });
  }
};
