const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPostgresPool();

    // Fix Bug 1: praças = COUNT(DISTINCT cities.name) — não district (bairro)
    // Fix Bug 2: exibidores = COUNT(DISTINCT media_exhibitors.id) — não media_exhibitor_id genérico
    // Fix Bug 3/4: classificação via media_types.environment ('Public'/'Indoor') — não ILIKE no nome
    const result = await pool.query(`
      WITH base AS (
        SELECT
          mp.id,
          c.name         AS cidade,
          me.id          AS exibidor_id,
          mt.environment AS ambiente
        FROM media_points mp
        LEFT JOIN cities           c  ON c.id  = mp.city_id
        LEFT JOIN media_exhibitors me ON me.id = mp.media_exhibitor_id
        LEFT JOIN media_types      mt ON mt.id = mp.media_type_id
        WHERE mp.is_deleted = false
          AND mp.is_active  = true
      )
      SELECT
        COUNT(*)                                                          AS total_pontos_midia,
        COUNT(DISTINCT cidade)                                            AS total_pracas,
        COUNT(DISTINCT exibidor_id)                                       AS total_exibidores,

        COUNT(*)           FILTER (WHERE ambiente = 'Public')            AS vias_publicas_pontos_midia,
        COUNT(DISTINCT cidade)      FILTER (WHERE ambiente = 'Public')   AS vias_publicas_pracas,
        COUNT(DISTINCT exibidor_id) FILTER (WHERE ambiente = 'Public')   AS vias_publicas_exibidores,

        COUNT(*)           FILTER (WHERE ambiente = 'Indoor')            AS indoor_pontos_midia,
        COUNT(DISTINCT cidade)      FILTER (WHERE ambiente = 'Indoor')   AS indoor_pracas,
        COUNT(DISTINCT exibidor_id) FILTER (WHERE ambiente = 'Indoor')   AS indoor_exibidores
      FROM base
    `);

    const row = result.rows[0] || {};

    res.status(200).json({
      success: true,
      data: {
        total: {
          pontos_midia: parseInt(row.total_pontos_midia)          || 0,
          pracas:       parseInt(row.total_pracas)                || 0,
          exibidores:   parseInt(row.total_exibidores)            || 0,
        },
        vias_publicas: {
          pontos_midia: parseInt(row.vias_publicas_pontos_midia)  || 0,
          pracas:       parseInt(row.vias_publicas_pracas)        || 0,
          exibidores:   parseInt(row.vias_publicas_exibidores)    || 0,
        },
        indoor: {
          pontos_midia: parseInt(row.indoor_pontos_midia)         || 0,
          pracas:       parseInt(row.indoor_pracas)               || 0,
          exibidores:   parseInt(row.indoor_exibidores)           || 0,
        },
      },
    });

  } catch (error) {
    console.error('[banco-ativos-dashboard] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas', message: error.message });
  }
};
