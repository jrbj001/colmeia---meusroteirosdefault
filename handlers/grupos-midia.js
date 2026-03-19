const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('📊 [Grupos Mídia] Listando grupos de mídia');
    
    const pool = await getPostgresPool();

    const query = `
      SELECT DISTINCT
        mg.id,
        mg.name
      FROM media_groups mg
      INNER JOIN media_types mt ON mt.media_group_id = mg.id
      INNER JOIN media_points mp ON mp.media_type_id = mt.id
      WHERE mp.is_active = true
        AND mp.is_deleted = false
        AND mg.name IS NOT NULL
        AND mg.name != ''
      ORDER BY mg.name
    `;

    const result = await pool.query(query);

    console.log(`✅ [Grupos Mídia] ${result.rows.length} grupos encontrados`);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('❌ [Grupos Mídia] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar grupos de mídia',
      error: error.message
    });
  }
};
