const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  console.log('🗺️ [Mapa Banco Ativos] Requisição recebida');

  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const pool = await getPostgresPool();
    
    const { tipo_ambiente } = req.query; // 'indoor', 'vias_publicas', ou vazio para todos
    
    console.log('📊 [Mapa] Parâmetros:', { tipo_ambiente });

    // Query para buscar pontos com coordenadas
    let query = `
      SELECT 
        mp.id,
        mp.code,
        mp.latitude,
        mp.longitude,
        me.name as exibidor,
        mt.name as tipo_midia,
        mt.environment as ambiente,
        c.name as cidade,
        mp.district as bairro,
        mp.social_class_geo as rating,
        COALESCE(mp.pedestrian_flow, 0) as passantes,
        COALESCE(mp.total_ipv_impact, 0) as impactos_ipv,
        mg.name as grupo_midia
      FROM media_points mp
      LEFT JOIN cities c ON mp.city_id = c.id
      LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id
      LEFT JOIN media_types mt ON mp.media_type_id = mt.id
      LEFT JOIN media_groups mg ON mt.media_group_id = mg.id
      WHERE mp.latitude IS NOT NULL 
        AND mp.longitude IS NOT NULL
        AND mp.latitude != 0 
        AND mp.longitude != 0
        AND mp.is_deleted = false
        AND mp.is_active = true
    `;

    const params = [];
    
    // Filtro por tipo de ambiente (usando campo mt.environment diretamente)
    if (tipo_ambiente === 'indoor') {
      query += ` AND UPPER(mt.environment) = 'INDOOR'`;
    } else if (tipo_ambiente === 'vias_publicas') {
      query += ` AND UPPER(mt.environment) = 'PUBLIC'`;
    }

    query += ` ORDER BY mp.id`; // Sem limite - buscar todos os pontos

    console.log('🔍 [Mapa] Executando query...');
    console.log('📝 [Mapa] Query:', query.substring(0, 500));
    const result = await pool.query(query, params);

    console.log(`✅ [Mapa] ${result.rows.length} pontos retornados`);
    
    // Debug: contar por ambiente
    const debugAmbientes = {};
    result.rows.forEach(p => {
      const amb = p.ambiente || 'Não informado';
      debugAmbientes[amb] = (debugAmbientes[amb] || 0) + 1;
    });
    console.log('📊 [Mapa] Pontos por ambiente:', debugAmbientes);

    // Calcular estatísticas
    const stats = {
      total_pontos: result.rows.length,
      total_passantes: result.rows.reduce((sum, p) => sum + (parseFloat(p.passantes) || 0), 0),
      total_impactos: result.rows.reduce((sum, p) => sum + (parseFloat(p.impactos_ipv) || 0), 0),
      por_ambiente: {},
      por_cidade: {},
      por_exibidor: {},
      por_rating: {}
    };

    // Agrupar por ambiente
    result.rows.forEach(ponto => {
      const ambiente = ponto.ambiente || 'Não informado';
      if (!stats.por_ambiente[ambiente]) {
        stats.por_ambiente[ambiente] = { count: 0, passantes: 0 };
      }
      stats.por_ambiente[ambiente].count++;
      stats.por_ambiente[ambiente].passantes += parseFloat(ponto.passantes) || 0;

      // Por cidade
      const cidade = ponto.cidade || 'Não informado';
      if (!stats.por_cidade[cidade]) {
        stats.por_cidade[cidade] = { count: 0, passantes: 0 };
      }
      stats.por_cidade[cidade].count++;
      stats.por_cidade[cidade].passantes += parseFloat(ponto.passantes) || 0;

      // Por exibidor
      const exibidor = ponto.exibidor || 'Não informado';
      if (!stats.por_exibidor[exibidor]) {
        stats.por_exibidor[exibidor] = { count: 0, passantes: 0 };
      }
      stats.por_exibidor[exibidor].count++;
      stats.por_exibidor[exibidor].passantes += parseFloat(ponto.passantes) || 0;

      // Por rating
      const rating = ponto.rating ? ponto.rating.charAt(0) : 'N/A';
      if (!stats.por_rating[rating]) {
        stats.por_rating[rating] = 0;
      }
      stats.por_rating[rating]++;
    });

    // Converter para arrays e ordenar (top 10)
    const top_cidades = Object.entries(stats.por_cidade)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const top_exibidores = Object.entries(stats.por_exibidor)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: result.rows,
      stats: {
        ...stats,
        top_cidades,
        top_exibidores
      }
    });

  } catch (error) {
    console.error('❌ [Mapa] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar pontos para o mapa',
      details: error.message 
    });
  }
};

