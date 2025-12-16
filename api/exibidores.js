const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('📊 [Exibidores] Listando exibidores disponíveis');
    
    const pool = await getPostgresPool();

    const query = `
      SELECT DISTINCT
        me.id,
        me.name
      FROM media_exhibitors me
      INNER JOIN media_points mp ON mp.media_exhibitor_id = me.id
      WHERE mp.is_active = true
        AND mp.is_deleted = false
        AND me.name IS NOT NULL
        AND me.name != ''
      ORDER BY me.name
    `;

    const result = await pool.query(query);

    console.log(`✅ [Exibidores] ${result.rows.length} exibidores encontrados`);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('❌ [Exibidores] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar exibidores',
      error: error.message
    });
  }
};
