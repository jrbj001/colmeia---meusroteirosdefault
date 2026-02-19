const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('📊 [Tipos Mídia Vias Públicas] Listando tipos de mídia vias públicas');
    
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
          mt.name ILIKE '%outdoor%' 
          OR mt.name ILIKE '%painel%' 
          OR mt.name ILIKE '%vias%' 
          OR mt.name ILIKE '%public%'
          OR mt.name ILIKE '%rua%'
          OR mt.name ILIKE '%avenida%'
          OR mt.name ILIKE '%via%'
        )
      ORDER BY mt.name
    `;

    const result = await pool.query(query);

    console.log(`✅ [Tipos Mídia Vias Públicas] ${result.rows.length} tipos encontrados`);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('❌ [Tipos Mídia Vias Públicas] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tipos de mídia vias públicas',
      error: error.message
    });
  }
};
