const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cidade } = req.body;
    
    if (!cidade) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cidade é obrigatória' 
      });
    }

    console.log('📊 [banco-ativos-relatorio-praca] Buscando relatório para cidade:', cidade);
    
    const pool = await getPostgresPool();
    
    // Normalizar nome da cidade (remover acentos, converter para maiúsculas)
    const cidadeNormalizada = cidade
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    console.log('🔍 [banco-ativos-relatorio-praca] Cidade normalizada:', cidadeNormalizada);
    
    // Buscar São Paulo especificamente para debug
    const saoPauloCheck = await pool.query(`
      SELECT DISTINCT c.name, c.id, COUNT(mp.id) as total_pontos
      FROM cities c
      LEFT JOIN media_points mp ON mp.city_id = c.id AND mp.is_deleted = false AND mp.is_active = true
      WHERE c.name ILIKE '%são paulo%' OR c.name ILIKE '%sao paulo%' OR c.name ILIKE '%são%paulo%'
      GROUP BY c.name, c.id
      ORDER BY c.name
    `);
    
    console.log('🏙️ [banco-ativos-relatorio-praca] Busca específica São Paulo:', saoPauloCheck.rows.length);
    if (saoPauloCheck.rows.length > 0) {
      console.log('📋 São Paulo encontrada:', saoPauloCheck.rows.map(r => `${r.name} (${r.total_pontos} pontos)`));
    }
    
    // Buscar cidades que começam com "S" para ver o padrão
    const cidadesS = await pool.query(`
      SELECT DISTINCT c.name, COUNT(mp.id) as total_pontos
      FROM cities c
      LEFT JOIN media_points mp ON mp.city_id = c.id AND mp.is_deleted = false AND mp.is_active = true
      WHERE c.name ILIKE 'S%'
      GROUP BY c.name
      HAVING COUNT(mp.id) > 0
      ORDER BY c.name
      LIMIT 20
    `);
    console.log('📋 Cidades que começam com S:', cidadesS.rows.map(r => `${r.name} (${r.total_pontos} pontos)`));
    
    // Criar múltiplas variações do nome da cidade para busca
    const variacoesCidade = [
      cidade,
      cidadeNormalizada,
      cidade.replace(/\s+/g, '%'), // "SAO PAULO" -> "SAO%PAULO"
      cidade.replace(/\s+/g, ' ').trim(), // Normalizar espaços
    ];
    
    // Se contém "sao" ou "são", adicionar variações
    if (cidadeNormalizada.includes('SAO') || cidadeNormalizada.includes('SÃO')) {
      variacoesCidade.push(cidadeNormalizada.replace('SAO', 'SÃO'));
      variacoesCidade.push(cidadeNormalizada.replace('SÃO', 'SAO'));
    }
    
    // Criar condições OR para todas as variações
    const condicoesCidade = variacoesCidade.map((_, idx) => `c.name ILIKE $${idx + 1}`).join(' OR ');
    const parametrosCidade = variacoesCidade.map(v => `%${v}%`);
    
    console.log('🔍 [banco-ativos-relatorio-praca] Variações de busca:', variacoesCidade);
    
    // Primeiro, vamos verificar a estrutura da tabela media_points
    try {
      const estruturaQuery = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'media_points'
        ORDER BY ordinal_position
      `);
      console.log('📋 [banco-ativos-relatorio-praca] Estrutura da tabela media_points:');
      estruturaQuery.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
      
      // Verificar se há alguma coluna que possa conter nome do exibidor
      const colunasPossiveis = estruturaQuery.rows.filter(col => 
        col.column_name.toLowerCase().includes('name') ||
        col.column_name.toLowerCase().includes('nome') ||
        col.column_name.toLowerCase().includes('exibidor') ||
        col.column_name.toLowerCase().includes('exhibitor') ||
        col.column_name.toLowerCase().includes('title') ||
        col.column_name.toLowerCase().includes('label')
      );
      if (colunasPossiveis.length > 0) {
        console.log('🔍 [banco-ativos-relatorio-praca] Colunas que podem conter nome do exibidor:', colunasPossiveis.map(c => c.column_name));
      }
      
      // Buscar um exemplo de registro para ver os valores
      const exemploQuery = await pool.query(`
        SELECT *
        FROM media_points
        WHERE code IS NOT NULL
        LIMIT 1
      `);
      if (exemploQuery.rows.length > 0) {
        const exemplo = exemploQuery.rows[0];
        console.log('📋 [banco-ativos-relatorio-praca] Exemplo de registro da tabela media_points:');
        Object.keys(exemplo).forEach(key => {
          const value = exemplo[key];
          const tipo = typeof value;
          const preview = tipo === 'string' && value && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value;
          console.log(`  - ${key}: ${preview} (${tipo})`);
        });
      }
      
      // Verificar se existe tabela de exibidores relacionada
      const tabelasPossiveis = ['media_exhibitors', 'exhibitors', 'media_exhibitor', 'exhibitor'];
      for (const tabelaNome of tabelasPossiveis) {
        try {
          const tabelaExiste = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )
          `, [tabelaNome]);
          
          if (tabelaExiste.rows[0].exists) {
            console.log(`✅ [banco-ativos-relatorio-praca] Tabela encontrada: ${tabelaNome}`);
            
            // Verificar estrutura dessa tabela
            const estruturaExhibitor = await pool.query(`
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_name = $1
              ORDER BY ordinal_position
            `, [tabelaNome]);
            
            console.log(`📋 [banco-ativos-relatorio-praca] Estrutura da tabela ${tabelaNome}:`);
            estruturaExhibitor.rows.forEach(col => {
              console.log(`  - ${col.column_name} (${col.data_type})`);
            });
            
            // Buscar exemplo de registro
            const exemploExhibitor = await pool.query(`
              SELECT *
              FROM ${tabelaNome}
              LIMIT 1
            `);
            
            if (exemploExhibitor.rows.length > 0) {
              console.log(`📋 [banco-ativos-relatorio-praca] Exemplo de registro da tabela ${tabelaNome}:`);
              Object.keys(exemploExhibitor.rows[0]).forEach(key => {
                const value = exemploExhibitor.rows[0][key];
                const preview = typeof value === 'string' && value && value.length > 50 
                  ? value.substring(0, 50) + '...' 
                  : value;
                console.log(`  - ${key}: ${preview}`);
              });
            }
            break; // Se encontrou, para de procurar
          }
        } catch (err) {
          // Tabela não existe ou erro ao verificar, continua
        }
      }
    } catch (err) {
      console.log('⚠️ [banco-ativos-relatorio-praca] Erro ao verificar estrutura:', err.message);
    }
    
    // Verificar se existe tabela media_exhibitors
    let tabelaExhibitorExiste = false;
    let nomeColunaExhibitor = 'name';
    try {
      const verificarTabela = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'media_exhibitors'
        )
      `);
      tabelaExhibitorExiste = verificarTabela.rows[0].exists;
      
      if (tabelaExhibitorExiste) {
        // Verificar qual coluna tem o nome
        const colunas = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'media_exhibitors'
          AND (column_name ILIKE '%name%' OR column_name ILIKE '%nome%' OR column_name ILIKE '%title%')
        `);
        if (colunas.rows.length > 0) {
          nomeColunaExhibitor = colunas.rows[0].column_name;
          console.log(`✅ [banco-ativos-relatorio-praca] Usando coluna '${nomeColunaExhibitor}' da tabela media_exhibitors`);
        }
      }
    } catch (err) {
      console.log('⚠️ [banco-ativos-relatorio-praca] Erro ao verificar tabela media_exhibitors:', err.message);
    }
    
    // Query para buscar dados do relatório por praça
    // Agrupar por exibidor e separar tipos de mídia em Indoor e Vias públicas
    // Usar busca flexível com ILIKE (case-insensitive)
    
    // Construir partes da query dinamicamente
    const joinExhibitor = tabelaExhibitorExiste 
      ? 'LEFT JOIN media_exhibitors me ON me.id = mp.media_exhibitor_id' 
      : '';
    
    const selectExibidorNomeNoPonto = tabelaExhibitorExiste
      ? `me.${nomeColunaExhibitor} AS exibidor_nome_temp,`
      : '';
    
    const selectExibidorNomeAgrupado = tabelaExhibitorExiste
      ? `MAX(exibidor_nome_temp) FILTER (WHERE exibidor_nome_temp IS NOT NULL AND exibidor_nome_temp != '') AS exibidor_nome,`
      : '';
    
    const query = `
      WITH tipos_por_ponto AS (
        SELECT 
          mp.code AS exibidor_code,
          mp.media_exhibitor_id,
          mp.id AS ponto_id,
          mp.district,
          mp.pedestrian_flow,
          mp.total_ipv_impact,
          mp.social_class_geo,
          mt.name AS tipo_midia,
          ${selectExibidorNomeNoPonto}
          CASE 
            WHEN mt.name ILIKE '%indoor%' OR mt.name ILIKE '%shopping%' OR mt.name ILIKE '%mall%' OR mt.name ILIKE '%centro comercial%' OR mt.name ILIKE '%interno%'
            THEN 'indoor'
            WHEN mt.name ILIKE '%outdoor%' OR mt.name ILIKE '%painel%' OR mt.name ILIKE '%vias%' OR mt.name ILIKE '%public%' OR mt.name ILIKE '%rua%' OR mt.name ILIKE '%avenida%' OR mt.name ILIKE '%via%'
            THEN 'vias_publicas'
            ELSE NULL
          END AS categoria
        FROM media_points mp
        LEFT JOIN media_types mt ON mp.media_type_id = mt.id
        LEFT JOIN cities c ON mp.city_id = c.id
        ${joinExhibitor}
        WHERE mp.is_deleted = false
          AND mp.is_active = true
          AND (${condicoesCidade})
          AND mp.code IS NOT NULL
      ),
      tipos_agrupados AS (
        SELECT 
          exibidor_code,
          ${selectExibidorNomeAgrupado}
          COUNT(DISTINCT ponto_id) FILTER (WHERE categoria = 'indoor') AS pontos_indoor,
          COUNT(DISTINCT ponto_id) FILTER (WHERE categoria = 'vias_publicas') AS pontos_vias_publicas,
          COUNT(DISTINCT ponto_id) AS total,
          COUNT(DISTINCT district) FILTER (WHERE district IS NOT NULL AND district != '') AS quantidade_pracas,
          COUNT(DISTINCT tipo_midia) AS tipos_midia_unicos,
          AVG(pedestrian_flow) FILTER (WHERE pedestrian_flow IS NOT NULL) AS fluxo_medio_passantes,
          SUM(total_ipv_impact) FILTER (WHERE total_ipv_impact IS NOT NULL) AS total_impacto_ipv,
          MODE() WITHIN GROUP (ORDER BY social_class_geo) FILTER (WHERE social_class_geo IS NOT NULL) AS classe_social_predominante,
          STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE categoria = 'indoor') AS indoor,
          STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE categoria = 'vias_publicas') AS vias_publicas
        FROM tipos_por_ponto
        GROUP BY exibidor_code
      )
      SELECT 
        COALESCE(ta.exibidor_nome, ta.exibidor_code) AS exibidor_nome,
        ta.exibidor_code,
        COALESCE(ta.indoor, '') AS indoor,
        COALESCE(ta.vias_publicas, '') AS vias_publicas,
        COALESCE(ta.pontos_indoor, 0)::integer AS pontos_indoor,
        COALESCE(ta.pontos_vias_publicas, 0)::integer AS pontos_vias_publicas,
        ta.total,
        COALESCE(ta.quantidade_pracas, 0)::integer AS quantidade_pracas,
        COALESCE(ta.tipos_midia_unicos, 0)::integer AS tipos_midia_unicos,
        ROUND(COALESCE(ta.fluxo_medio_passantes, 0))::integer AS fluxo_medio_passantes,
        ROUND(COALESCE(ta.total_impacto_ipv, 0))::bigint AS total_impacto_ipv,
        COALESCE(ta.classe_social_predominante, '') AS classe_social_predominante
      FROM tipos_agrupados ta
      ORDER BY ta.total DESC
    `;
    
    const result = await pool.query(query, parametrosCidade);
    
    // Log para debug - verificar se os nomes estão vindo
    if (result.rows.length > 0) {
      const exemplo = result.rows[0];
      console.log('📋 [banco-ativos-relatorio-praca] Exemplo de dados retornados:');
      console.log('  - Exibidor code:', exemplo.exibidor_code);
      console.log('  - Exibidor nome:', exemplo.exibidor_nome);
      console.log('  - Total:', exemplo.total);
      
      // Contar quantos têm nome diferente do código
      const comNome = result.rows.filter(r => r.exibidor_nome && r.exibidor_nome !== r.exibidor_code).length;
      console.log(`  - Exibidores com nome encontrado: ${comNome} de ${result.rows.length}`);
    }
    
    console.log('✅ [banco-ativos-relatorio-praca] Dados encontrados:', result.rows.length);
    
    // Calcular total geral
    const totalGeral = result.rows.reduce((sum, row) => sum + (parseInt(row.total) || 0), 0);
    
    res.status(200).json({
      success: true,
      data: result.rows,
      totalGeral: totalGeral,
      cidade: cidade
    });
    
  } catch (error) {
    console.error('❌ [banco-ativos-relatorio-praca] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar relatório por praça',
      message: error.message
    });
  }
};

