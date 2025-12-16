const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('📊 [Bairros] Listando bairros disponíveis');
    
    const pool = await getPostgresPool();

    const { praca } = req.query;

    let query = `
      SELECT DISTINCT
        mp.district AS name
      FROM media_points mp
    `;

    const conditions = ['mp.is_active = true', 'mp.is_deleted = false', 'mp.district IS NOT NULL', "mp.district != ''"];
    const params = [];

    // Filtrar por praça se fornecido
    if (praca) {
      const paramIndex = params.length + 1;
      conditions.push(`c.name = $${paramIndex}`);
      params.push(praca);
      query = `
        SELECT DISTINCT
          mp.district AS name
        FROM media_points mp
        LEFT JOIN cities c ON mp.city_id = c.id
      `;
    }

    query += ` WHERE ${conditions.join(' AND ')} ORDER BY mp.district`;

    const result = await pool.query(query, params);

    console.log(`✅ [Bairros] ${result.rows.length} bairros encontrados`);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('❌ [Bairros] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar bairros',
      error: error.message
    });
  }
};
