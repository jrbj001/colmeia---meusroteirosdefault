const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { exibidor } = req.body;
    
    if (!exibidor) {
      return res.status(400).json({ 
        success: false, 
        error: 'Exibidor é obrigatório' 
      });
    }

    console.log('📊 [banco-ativos-relatorio-exibidor] Buscando relatório para exibidor:', exibidor);
    
    const pool = await getPostgresPool();
    
    // Normalizar nome/código do exibidor (remover acentos, converter para maiúsculas)
    const exibidorNormalizado = exibidor
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    console.log('🔍 [banco-ativos-relatorio-exibidor] Exibidor normalizado:', exibidorNormalizado);
    
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
          console.log(`✅ [banco-ativos-relatorio-exibidor] Usando coluna '${nomeColunaExhibitor}' da tabela media_exhibitors`);
        }
      }
    } catch (err) {
      console.log('⚠️ [banco-ativos-relatorio-exibidor] Erro ao verificar tabela media_exhibitors:', err.message);
    }
    
    // Criar múltiplas variações do código/nome do exibidor para busca
    const variacoesExibidor = [
      exibidor,
      exibidorNormalizado,
      exibidor.replace(/\s+/g, '%'),
      exibidor.replace(/\s+/g, ' ').trim(),
    ];
    
    // Criar condições OR para todas as variações (buscar por código ou nome)
    let condicoesExibidor = [];
    let parametrosExibidor = [];
    let paramIndex = 1;
    
    // Adicionar condições para código
    variacoesExibidor.forEach((v) => {
      condicoesExibidor.push(`mp.code ILIKE $${paramIndex}`);
      parametrosExibidor.push(`%${v}%`);
      paramIndex++;
    });
    
    // Adicionar condições para nome (se tabela existe)
    if (tabelaExhibitorExiste) {
      variacoesExibidor.forEach((v) => {
        condicoesExibidor.push(`me.${nomeColunaExhibitor} ILIKE $${paramIndex}`);
        parametrosExibidor.push(`%${v}%`);
        paramIndex++;
      });
    }
    
    const condicoesExibidorStr = condicoesExibidor.join(' OR ');
    
    console.log('🔍 [banco-ativos-relatorio-exibidor] Variações de busca:', variacoesExibidor);
    
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
    
    // Query para buscar dados do relatório por exibidor
    // Agrupar por cidade/praça e separar tipos de mídia em Indoor e Vias públicas
    const query = `
      WITH tipos_por_ponto AS (
        SELECT 
          mp.code AS exibidor_code,
          mp.media_exhibitor_id,
          mp.id AS ponto_id,
          mp.district AS praca,
          c.name AS cidade,
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
          AND (${condicoesExibidorStr})
          AND mp.code IS NOT NULL
      ),
      tipos_agrupados AS (
        SELECT 
          COALESCE(praca, cidade, 'Não informado') AS praca_cidade,
          cidade,
          ${selectExibidorNomeAgrupado}
          MAX(exibidor_code) AS exibidor_code,
          COUNT(DISTINCT ponto_id) FILTER (WHERE categoria = 'indoor') AS pontos_indoor,
          COUNT(DISTINCT ponto_id) FILTER (WHERE categoria = 'vias_publicas') AS pontos_vias_publicas,
          COUNT(DISTINCT ponto_id) AS total,
          COUNT(DISTINCT tipo_midia) AS tipos_midia_unicos,
          AVG(pedestrian_flow) FILTER (WHERE pedestrian_flow IS NOT NULL) AS fluxo_medio_passantes,
          SUM(total_ipv_impact) FILTER (WHERE total_ipv_impact IS NOT NULL) AS total_impacto_ipv,
          MODE() WITHIN GROUP (ORDER BY social_class_geo) FILTER (WHERE social_class_geo IS NOT NULL) AS classe_social_predominante,
          STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE categoria = 'indoor') AS indoor,
          STRING_AGG(DISTINCT tipo_midia, ', ') FILTER (WHERE categoria = 'vias_publicas') AS vias_publicas
        FROM tipos_por_ponto
        GROUP BY praca_cidade, cidade
      )
      SELECT 
        ta.praca_cidade AS praca_nome,
        ta.cidade,
        COALESCE(ta.exibidor_nome, ta.exibidor_code) AS exibidor_nome,
        ta.exibidor_code,
        COALESCE(ta.indoor, '') AS indoor,
        COALESCE(ta.vias_publicas, '') AS vias_publicas,
        COALESCE(ta.pontos_indoor, 0)::integer AS pontos_indoor,
        COALESCE(ta.pontos_vias_publicas, 0)::integer AS pontos_vias_publicas,
        ta.total,
        COALESCE(ta.tipos_midia_unicos, 0)::integer AS tipos_midia_unicos,
        ROUND(COALESCE(ta.fluxo_medio_passantes, 0))::integer AS fluxo_medio_passantes,
        ROUND(COALESCE(ta.total_impacto_ipv, 0))::bigint AS total_impacto_ipv,
        COALESCE(ta.classe_social_predominante, '') AS classe_social_predominante
      FROM tipos_agrupados ta
      ORDER BY ta.total DESC
    `;
    
    const result = await pool.query(query, parametrosExibidor);
    
    console.log('✅ [banco-ativos-relatorio-exibidor] Dados encontrados:', result.rows.length);
    
    // Calcular total geral
    const totalGeral = result.rows.reduce((sum, row) => sum + (parseInt(row.total) || 0), 0);
    
    res.status(200).json({
      success: true,
      data: result.rows,
      totalGeral: totalGeral,
      exibidor: exibidor
    });
    
  } catch (error) {
    console.error('❌ [banco-ativos-relatorio-exibidor] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar relatório por exibidor',
      message: error.message
    });
  }
};

