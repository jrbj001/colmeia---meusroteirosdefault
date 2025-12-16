const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  try {
    console.log('🔍 [Teste Cidades] Verificando cidades disponíveis...');
    
    const pool = await getPostgresPool();

    // Buscar algumas cidades e seus pontos
    const query = `
      SELECT 
        c.id,
        c.name AS cidade_name,
        COUNT(mp.id) AS total_pontos
      FROM cities c
      LEFT JOIN media_points mp ON mp.city_id = c.id
      WHERE mp.is_active = true
        AND mp.is_deleted = false
      GROUP BY c.id, c.name
      HAVING COUNT(mp.id) > 0
      ORDER BY COUNT(mp.id) DESC
      LIMIT 20
    `;

    const result = await pool.query(query);

    console.log(`✅ [Teste Cidades] ${result.rows.length} cidades com pontos encontradas`);
    result.rows.forEach(row => {
      console.log(`   - ${row.cidade_name}: ${row.total_pontos} pontos`);
    });

    // Buscar especificamente por variações de "SANTOS"
    const querySantos = `
      SELECT 
        c.id,
        c.name AS cidade_name,
        COUNT(mp.id) AS total_pontos
      FROM cities c
      LEFT JOIN media_points mp ON mp.city_id = c.id
      WHERE mp.is_active = true
        AND mp.is_deleted = false
        AND c.name ILIKE '%santos%'
      GROUP BY c.id, c.name
    `;

    const resultSantos = await pool.query(querySantos);
    
    console.log(`🔍 [Teste Cidades] Buscando por "SANTOS" (case-insensitive):`);
    if (resultSantos.rows.length > 0) {
      resultSantos.rows.forEach(row => {
        console.log(`   - "${row.cidade_name}": ${row.total_pontos} pontos`);
      });
    } else {
      console.log('   - Nenhuma cidade encontrada com nome parecido com "SANTOS"');
    }

    res.status(200).json({
      success: true,
      total_cidades: result.rows.length,
      cidades: result.rows,
      santos: resultSantos.rows
    });

  } catch (error) {
    console.error('❌ [Teste Cidades] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar cidades',
      error: error.message
    });
  }
};
