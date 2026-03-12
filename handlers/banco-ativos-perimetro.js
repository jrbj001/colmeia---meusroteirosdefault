const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool   = await getPool();
    const cidade = req.query.cidade?.trim() || null;

    // --- Retornar TODOS os perimetros (visão Brasil) ---
    // Calculado diretamente de bancoAtivosJoin_ft — sem depender de city_id
    if (!cidade) {
      const result = await pool.request().query(`
        SELECT
          cidade_st,
          estado_st,
          MIN(CAST(latitude  AS FLOAT)) AS latitude_min_vl,
          MAX(CAST(latitude  AS FLOAT)) AS latitude_max_vl,
          MIN(CAST(longitude AS FLOAT)) AS longitude_min_vl,
          MAX(CAST(longitude AS FLOAT)) AS longitude_max_vl,
          AVG(CAST(latitude  AS FLOAT)) AS latitude_center_vl,
          AVG(CAST(longitude AS FLOAT)) AS longitude_center_vl
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1
          AND cidade_st  IS NOT NULL
          AND latitude   IS NOT NULL AND CAST(latitude  AS FLOAT) != 0
          AND longitude  IS NOT NULL AND CAST(longitude AS FLOAT) != 0
        GROUP BY cidade_st, estado_st
        HAVING
          MIN(CAST(latitude  AS FLOAT)) != MAX(CAST(latitude  AS FLOAT))
          AND MIN(CAST(longitude AS FLOAT)) != MAX(CAST(longitude AS FLOAT))
        ORDER BY cidade_st
      `);

      return res.status(200).json({ success: true, data: result.recordset });
    }

    // --- Retornar perimetro de uma cidade específica ---
    const result = await pool.request()
      .input('cidade', sql.NVarChar, cidade)
      .query(`
        SELECT
          cidade_st,
          estado_st,
          MIN(CAST(latitude  AS FLOAT)) AS latitude_min_vl,
          MAX(CAST(latitude  AS FLOAT)) AS latitude_max_vl,
          MIN(CAST(longitude AS FLOAT)) AS longitude_min_vl,
          MAX(CAST(longitude AS FLOAT)) AS longitude_max_vl,
          AVG(CAST(latitude  AS FLOAT)) AS latitude_center_vl,
          AVG(CAST(longitude AS FLOAT)) AS longitude_center_vl
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1
          AND cidade_st = @cidade
          AND latitude  IS NOT NULL AND CAST(latitude  AS FLOAT) != 0
          AND longitude IS NOT NULL AND CAST(longitude AS FLOAT) != 0
        GROUP BY cidade_st, estado_st
      `);

    if (result.recordset.length > 0 && result.recordset[0].latitude_min_vl !== null) {
      return res.status(200).json({ success: true, data: result.recordset[0] });
    }

    res.status(404).json({ success: false, error: 'Perimetro não encontrado' });

  } catch (error) {
    console.error('[banco-ativos-perimetro] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar perimetro', message: error.message });
  }
};
