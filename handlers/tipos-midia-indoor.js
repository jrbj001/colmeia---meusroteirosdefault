const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('📊 [Tipos Mídia Indoor] Listando tipos de mídia indoor');
    
    const pool = await getPostgresPool();

    const query = `
      SELECT DISTINCT
        mt.id,
        mt.name
      FROM media_types mt
      INNER JOIN media_points mp ON mp.media_type_id = mt.id
      WHERE mp.is_active = true
        AND mp.is_deleted = false
        AND (
          mt.name ILIKE '%indoor%' 
          OR mt.name ILIKE '%shopping%' 
          OR mt.name ILIKE '%mall%'
          OR mt.name ILIKE '%aeroporto%'
          OR mt.name ILIKE '%rodoviária%'
          OR mt.name ILIKE '%rodoviaria%'
        )
      ORDER BY mt.name
    `;

    const result = await pool.query(query);

    console.log(`✅ [Tipos Mídia Indoor] ${result.rows.length} tipos encontrados`);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('❌ [Tipos Mídia Indoor] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tipos de mídia indoor',
      error: error.message
    });
  }
};
