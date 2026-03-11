const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { exibidor } = req.body;
  if (!exibidor) {
    return res.status(400).json({ success: false, error: 'Exibidor é obrigatório' });
  }

  try {
    const pool = await getPostgresPool();

    // Fix Bug 2: busca por media_exhibitors.name (nome real da empresa)
    // Fix Bug 3/4: classifica via mt.environment ('Public'/'Indoor'), não ILIKE no nome
    // Fix Bug 1: agrupa por cities.name (cidade), não por district (bairro)
    const result = await pool.query(`
      WITH pontos AS (
        SELECT
          COALESCE(c.name, 'Sem cidade')  AS cidade,
          mp.id                           AS ponto_id,
          mt.environment                  AS ambiente,
          mt.name                         AS tipo_midia,
          mp.pedestrian_flow,
          mp.total_ipv_impact,
          mp.social_class_geo
        FROM media_points    mp
        JOIN  media_exhibitors me  ON me.id  = mp.media_exhibitor_id
        LEFT JOIN cities       c   ON c.id   = mp.city_id
        LEFT JOIN media_types  mt  ON mt.id  = mp.media_type_id
        WHERE mp.is_deleted = false
          AND mp.is_active  = true
          AND me.name ILIKE $1
      )
      SELECT
        cidade,
        COUNT(DISTINCT ponto_id)                                          AS total,
        COUNT(DISTINCT ponto_id) FILTER (WHERE ambiente = 'Public')      AS pontos_vias_publicas,
        COUNT(DISTINCT ponto_id) FILTER (WHERE ambiente = 'Indoor')      AS pontos_indoor,
        STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE ambiente = 'Public')  AS vias_publicas,
        STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE ambiente = 'Indoor')  AS indoor,
        ROUND(AVG(pedestrian_flow)   FILTER (WHERE pedestrian_flow   IS NOT NULL))::bigint AS fluxo_medio_passantes,
        ROUND(SUM(total_ipv_impact)  FILTER (WHERE total_ipv_impact  IS NOT NULL))::bigint AS total_impacto_ipv,
        MODE() WITHIN GROUP (ORDER BY social_class_geo) FILTER (WHERE social_class_geo IS NOT NULL) AS classe_social_predominante
      FROM pontos
      GROUP BY cidade
      ORDER BY total DESC
    `, [`%${exibidor}%`]);

    const totalGeral = result.rows.reduce((s, r) => s + (parseInt(r.total) || 0), 0);

    res.status(200).json({ success: true, data: result.rows, totalGeral, exibidor });

  } catch (error) {
    console.error('[banco-ativos-relatorio-exibidor] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar relatório por exibidor', message: error.message });
  }
};
