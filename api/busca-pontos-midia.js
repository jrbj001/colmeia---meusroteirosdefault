const { getPostgresPool } = require('./banco-ativos-passantes');

// Função para remover acentos
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = async (req, res) => {
  try {
    console.log('📊 [Busca Pontos Mídia] Iniciando busca com filtros:', req.query);
    
    const pool = await getPostgresPool();

    // Decodificar os parâmetros da URL (substituir + por espaço)
    let {
      praca,
      exibidor,
      bairro,
      rating,
      ambiente,
      grupo_midia,
      tipo_ambiente_indoor,
      tipo_midia_vias_publicas,
      formato
    } = req.query;

    // Decodificar strings (+ vira espaço)
    if (praca) praca = decodeURIComponent(praca.replace(/\+/g, ' '));
    if (exibidor) exibidor = decodeURIComponent(exibidor.replace(/\+/g, ' '));
    if (bairro) bairro = decodeURIComponent(bairro.replace(/\+/g, ' '));
    if (grupo_midia) grupo_midia = decodeURIComponent(grupo_midia.replace(/\+/g, ' '));
    if (tipo_ambiente_indoor) tipo_ambiente_indoor = decodeURIComponent(tipo_ambiente_indoor.replace(/\+/g, ' '));
    if (tipo_midia_vias_publicas) tipo_midia_vias_publicas = decodeURIComponent(tipo_midia_vias_publicas.replace(/\+/g, ' '));

    console.log('📊 [Busca Pontos Mídia] Parâmetros decodificados:', { praca, exibidor, bairro });

    // Construir WHERE clause dinamicamente baseado nos filtros
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Sempre incluir apenas pontos ativos e não deletados
    conditions.push('mp.is_active = true');
    conditions.push('mp.is_deleted = false');

    // Filtro: Praça (cidade) - case-insensitive e sem acentos
    if (praca) {
      // Remover acentos do filtro
      const pracaSemAcentos = removerAcentos(praca);
      conditions.push(`
        (UPPER(c.name) = UPPER($${paramIndex}) OR 
         UPPER(TRANSLATE(c.name, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')) = UPPER($${paramIndex + 1}))
      `);
      params.push(praca);
      params.push(pracaSemAcentos);
      paramIndex += 2;
    }

    // Filtro: Exibidor - case-insensitive e sem acentos
    if (exibidor) {
      const exibidorSemAcentos = removerAcentos(exibidor);
      conditions.push(`
        (UPPER(me.name) = UPPER($${paramIndex}) OR 
         UPPER(TRANSLATE(me.name, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')) = UPPER($${paramIndex + 1}))
      `);
      params.push(exibidor);
      params.push(exibidorSemAcentos);
      paramIndex += 2;
    }

    // Filtro: Bairro - case-insensitive e sem acentos
    if (bairro) {
      const bairroSemAcentos = removerAcentos(bairro);
      conditions.push(`
        (UPPER(mp.district) = UPPER($${paramIndex}) OR 
         UPPER(TRANSLATE(mp.district, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')) = UPPER($${paramIndex + 1}))
      `);
      params.push(bairro);
      params.push(bairroSemAcentos);
      paramIndex += 2;
    }

    // Filtro: Rating (classe social)
    if (rating) {
      conditions.push(`mp.social_class_geo = $${paramIndex}`);
      params.push(rating);
      paramIndex++;
    }

    // Filtro: Ambiente
    if (ambiente) {
      if (ambiente === 'Indoor') {
        conditions.push(`(mt.name ILIKE '%indoor%' OR mt.name ILIKE '%shopping%' OR mt.name ILIKE '%mall%' OR mt.name ILIKE '%aeroporto%' OR mt.name ILIKE '%rodoviária%')`);
      } else if (ambiente === 'Vias Públicas') {
        conditions.push(`(mt.name ILIKE '%outdoor%' OR mt.name ILIKE '%painel%' OR mt.name ILIKE '%vias%' OR mt.name ILIKE '%public%' OR mt.name ILIKE '%rua%' OR mt.name ILIKE '%avenida%')`);
      }
    }

    // Filtro: Grupo de mídia (para vias públicas)
    if (grupo_midia) {
      conditions.push(`mg.name = $${paramIndex}`);
      params.push(grupo_midia);
      paramIndex++;
    }

    // Filtro: Tipo de ambiente indoor
    if (tipo_ambiente_indoor) {
      conditions.push(`mt.name ILIKE $${paramIndex}`);
      params.push(`%${tipo_ambiente_indoor}%`);
      paramIndex++;
    }

    // Filtro: Tipo de mídia vias públicas
    if (tipo_midia_vias_publicas) {
      conditions.push(`mt.name ILIKE $${paramIndex}`);
      params.push(`%${tipo_midia_vias_publicas}%`);
      paramIndex++;
    }

    // Filtro: Formato (Estático/Digital)
    // NOTA: Campo is_digital não existe na tabela, filtro desabilitado
    // if (formato) {
    //   if (formato === 'Estático') {
    //     conditions.push(`mp.is_digital = false`);
    //   } else if (formato === 'Digital') {
    //     conditions.push(`mp.is_digital = true`);
    //   }
    // }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Log para debug - mostrar filtros aplicados
    console.log(`📊 [Busca Pontos Mídia] Filtros aplicados:`, {
      praca,
      exibidor,
      bairro,
      rating,
      ambiente,
      grupo_midia,
      tipo_ambiente_indoor,
      tipo_midia_vias_publicas,
      formato
    });
    console.log(`📊 [Busca Pontos Mídia] Total de condições: ${conditions.length}`);

    const query = `
      SELECT 
        mp.id AS codigo_ponto,
        mp.code,
        mp.latitude,
        mp.longitude,
        COALESCE(me.name, 'Não informado') AS exibidor,
        'Não informado' AS categoria_exibidor,
        CASE 
          WHEN mt.name ILIKE '%indoor%' OR mt.name ILIKE '%shopping%' OR mt.name ILIKE '%mall%' 
          THEN 'Indoor'
          ELSE 'Vias Públicas'
        END AS ambiente,
        'Não informado' AS formato,
        COALESCE(mg.name, 'Não informado') AS grupo_midia,
        COALESCE(mt.name, 'Não informado') AS tipo_midia,
        COALESCE(c.name, 'Não informado') AS cidade,
        'Não informado' AS estado,
        'Não informado' AS endereco,
        COALESCE(mp.district, 'Não informado') AS bairro,
        'Não informado' AS cep,
        COALESCE(mp.pedestrian_flow, 0)::integer AS passantes,
        COALESCE(mp.total_ipv_impact, 0)::integer AS impactos_ipv,
        COALESCE(mp.social_class_geo, 'Não informado') AS rating
      FROM media_points mp
      LEFT JOIN cities c ON mp.city_id = c.id
      LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id
      LEFT JOIN media_types mt ON mp.media_type_id = mt.id
      LEFT JOIN media_groups mg ON mt.media_group_id = mg.id
      ${whereClause}
      ORDER BY mp.id
      LIMIT 1000
    `;

    console.log('📊 [Busca Pontos Mídia] Query SQL:', query);
    console.log('📊 [Busca Pontos Mídia] Params:', params);

    const result = await pool.query(query, params);

    console.log(`✅ [Busca Pontos Mídia] ${result.rows.length} pontos encontrados`);

    // Se não encontrou nada, fazer uma busca simplificada para debug
    if (result.rows.length === 0 && (praca || exibidor)) {
      try {
        let debugQuery = 'SELECT COUNT(*) as total FROM media_points mp';
        let debugConditions = ['mp.is_active = true', 'mp.is_deleted = false'];
        let debugParams = [];
        let debugParamIndex = 1;

        if (praca) {
          debugQuery += ' LEFT JOIN cities c ON mp.city_id = c.id';
          const pracaSemAcentos = removerAcentos(praca);
          debugConditions.push(`(UPPER(c.name) = UPPER($${debugParamIndex}) OR UPPER(TRANSLATE(c.name, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')) = UPPER($${debugParamIndex + 1}))`);
          debugParams.push(praca, pracaSemAcentos);
          debugParamIndex += 2;
        }

        if (exibidor) {
          debugQuery += ' LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id';
          const exibidorSemAcentos = removerAcentos(exibidor);
          debugConditions.push(`(UPPER(me.name) = UPPER($${debugParamIndex}) OR UPPER(TRANSLATE(me.name, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')) = UPPER($${debugParamIndex + 1}))`);
          debugParams.push(exibidor, exibidorSemAcentos);
          debugParamIndex += 2;
        }

        debugQuery += ` WHERE ${debugConditions.join(' AND ')}`;
        
        const debugResult = await pool.query(debugQuery, debugParams);
        console.log(`🔍 [Debug] Pontos disponíveis com filtros básicos (praça/exibidor): ${debugResult.rows[0].total}`);
        
        // Log adicional para ver nomes reais no banco
        if (debugResult.rows[0].total === 0) {
          const nomesCidadesQuery = `SELECT DISTINCT c.name FROM cities c JOIN media_points mp ON mp.city_id = c.id WHERE mp.is_active = true AND mp.is_deleted = false ORDER BY c.name LIMIT 20`;
          const nomesCidades = await pool.query(nomesCidadesQuery);
          console.log(`🔍 [Debug] Primeiras 20 cidades no banco:`, nomesCidades.rows.map(r => r.name));
        }
      } catch (debugError) {
        console.error('❌ [Debug] Erro ao fazer busca simplificada:', debugError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ [Busca Pontos Mídia] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pontos de mídia',
      error: error.message
    });
  }
};
