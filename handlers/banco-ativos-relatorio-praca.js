const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cidade } = req.body;
  if (!cidade) {
    return res.status(400).json({ success: false, error: 'Cidade é obrigatória' });
  }

  try {
    const pool = await getPostgresPool();

    // Fix Bug 2: agrupa por media_exhibitors.name (empresa real), não por code (código do ponto)
    // Fix Bug 3/4: classifica via mt.environment ('Public'/'Indoor'), não ILIKE no nome
    const result = await pool.query(`
      WITH pontos AS (
        SELECT
          me.id                AS exibidor_id,
          me.name              AS exibidor_nome,
          mp.id                AS ponto_id,
          mt.environment       AS ambiente,
          mt.name              AS tipo_midia,
          mp.pedestrian_flow,
          mp.total_ipv_impact,
          mp.social_class_geo
        FROM media_points    mp
        JOIN  cities          c   ON c.id   = mp.city_id
        LEFT JOIN media_exhibitors me  ON me.id  = mp.media_exhibitor_id
        LEFT JOIN media_types      mt  ON mt.id  = mp.media_type_id
        WHERE mp.is_deleted = false
          AND mp.is_active  = true
          AND c.name ILIKE $1
      )
      SELECT
        COALESCE(exibidor_nome, 'Sem exibidor')                          AS exibidor_nome,
        COUNT(DISTINCT ponto_id)                                          AS total,
        COUNT(DISTINCT ponto_id) FILTER (WHERE ambiente = 'Public')      AS pontos_vias_publicas,
        COUNT(DISTINCT ponto_id) FILTER (WHERE ambiente = 'Indoor')      AS pontos_indoor,
        STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE ambiente = 'Public')  AS vias_publicas,
        STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE ambiente = 'Indoor')  AS indoor,
        ROUND(AVG(pedestrian_flow)   FILTER (WHERE pedestrian_flow   IS NOT NULL))::bigint AS fluxo_medio_passantes,
        ROUND(SUM(total_ipv_impact)  FILTER (WHERE total_ipv_impact  IS NOT NULL))::bigint AS total_impacto_ipv,
        MODE() WITHIN GROUP (ORDER BY social_class_geo) FILTER (WHERE social_class_geo IS NOT NULL) AS classe_social_predominante
      FROM pontos
      GROUP BY exibidor_id, exibidor_nome
      ORDER BY total DESC
    `, [`%${cidade}%`]);

    const totalGeral = result.rows.reduce((s, r) => s + (parseInt(r.total) || 0), 0);

    res.status(200).json({ success: true, data: result.rows, totalGeral, cidade });

  } catch (error) {
    console.error('[banco-ativos-relatorio-praca] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar relatório por praça', message: error.message });
  }
};
