const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔍 [banco-ativos-diagnostico] Iniciando diagnóstico do banco de dados...');
    
    const pool = await getPostgresPool();
    
    const diagnosticos = {};
    
    // 1. Verificar estrutura da tabela media_points
    console.log('📋 Verificando estrutura da tabela media_points...');
    const estrutura = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'media_points'
      AND column_name IN ('id', 'code', 'media_exhibitor_id', 'is_deleted', 'is_active', 'district', 'city_id')
      ORDER BY ordinal_position
    `);
    diagnosticos.estrutura_tabela = estrutura.rows;
    
    // 2. Verificar se existe tabela media_exhibitors
    console.log('📋 Verificando se existe tabela media_exhibitors...');
    const tabelaExhibitor = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'media_exhibitors'
      ) AS existe
    `);
    diagnosticos.tabela_exhibitors_existe = tabelaExhibitor.rows[0].existe;
    
    // 3. Contagem básica
    console.log('📊 Contagem básica de registros...');
    const contagemBasica = await pool.query(`
      SELECT 
        COUNT(*) AS total_registros,
        COUNT(*) FILTER (WHERE is_deleted = false AND is_active = true) AS registros_ativos,
        COUNT(DISTINCT id) AS pontos_unicos,
        COUNT(DISTINCT code) FILTER (WHERE code IS NOT NULL) AS codigos_distintos,
        COUNT(DISTINCT TRIM(UPPER(code))) FILTER (WHERE code IS NOT NULL AND TRIM(code) != '') AS codigos_normalizados_distintos,
        COUNT(*) FILTER (WHERE code IS NULL OR TRIM(code) = '') AS sem_codigo
      FROM media_points
    `);
    diagnosticos.contagem_basica = contagemBasica.rows[0];
    
    // 4. Análise de códigos duplicados
    console.log('🔍 Analisando códigos duplicados...');
    const codigosDuplicados = await pool.query(`
      WITH codigos_normalizados AS (
        SELECT 
          TRIM(UPPER(code)) AS codigo_norm,
          code AS codigo_original,
          COUNT(*) AS quantidade
        FROM media_points
        WHERE code IS NOT NULL 
          AND TRIM(code) != ''
          AND is_deleted = false
          AND is_active = true
        GROUP BY TRIM(UPPER(code)), code
      )
      SELECT 
        codigo_norm,
        COUNT(DISTINCT codigo_original) AS variacoes_codigo,
        SUM(quantidade) AS total_pontos
      FROM codigos_normalizados
      GROUP BY codigo_norm
      HAVING COUNT(DISTINCT codigo_original) > 1
      ORDER BY total_pontos DESC
      LIMIT 20
    `);
    diagnosticos.codigos_com_variacoes = codigosDuplicados.rows;
    
    // 5. Comparação de contagens (como está sendo feito atualmente)
    console.log('📊 Comparando métodos de contagem...');
    const comparacaoContagens = await pool.query(`
      WITH contagens AS (
        SELECT 
          COUNT(DISTINCT mp.id) AS total_pontos,
          COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL) AS exibidores_sem_normalizar,
          COUNT(DISTINCT TRIM(UPPER(mp.code))) FILTER (WHERE mp.code IS NOT NULL AND TRIM(mp.code) != '') AS exibidores_normalizados
        FROM media_points mp
        WHERE mp.is_deleted = false
          AND mp.is_active = true
      )
      SELECT * FROM contagens
    `);
    diagnosticos.comparacao_contagens = comparacaoContagens.rows[0];
    
    // 6. Análise por categoria (Vias Públicas vs Indoor)
    console.log('📊 Analisando por categoria...');
    const analiseCategoria = await pool.query(`
      WITH categorias AS (
        SELECT 
          mp.id,
          mp.code,
          CASE 
            WHEN mt.name ILIKE '%indoor%' OR mt.name ILIKE '%shopping%' OR mt.name ILIKE '%mall%' OR mt.name ILIKE '%centro comercial%' OR mt.name ILIKE '%interno%'
            THEN 'indoor'
            WHEN mt.name ILIKE '%outdoor%' OR mt.name ILIKE '%painel%' OR mt.name ILIKE '%vias%' OR mt.name ILIKE '%public%' OR mt.name ILIKE '%rua%' OR mt.name ILIKE '%avenida%' OR mt.name ILIKE '%via%'
            THEN 'vias_publicas'
            ELSE 'outro'
          END AS categoria
        FROM media_points mp
        LEFT JOIN media_types mt ON mp.media_type_id = mt.id
        WHERE mp.is_deleted = false
          AND mp.is_active = true
      )
      SELECT 
        categoria,
        COUNT(DISTINCT id) AS pontos_midia,
        COUNT(DISTINCT code) FILTER (WHERE code IS NOT NULL) AS exibidores_sem_normalizar,
        COUNT(DISTINCT TRIM(UPPER(code))) FILTER (WHERE code IS NOT NULL AND TRIM(code) != '') AS exibidores_normalizados
      FROM categorias
      GROUP BY categoria
    `);
    diagnosticos.analise_por_categoria = analiseCategoria.rows;
    
    // 7. Exemplos de códigos com problemas
    console.log('🔍 Buscando exemplos de códigos problemáticos...');
    const exemplosCodigos = await pool.query(`
      SELECT 
        code AS codigo_original,
        TRIM(code) AS codigo_trim,
        UPPER(TRIM(code)) AS codigo_normalizado,
        COUNT(*) AS quantidade_pontos
      FROM media_points
      WHERE code IS NOT NULL
        AND is_deleted = false
        AND is_active = true
      GROUP BY code, TRIM(code), UPPER(TRIM(code))
      HAVING COUNT(*) > 1
      ORDER BY quantidade_pontos DESC
      LIMIT 10
    `);
    diagnosticos.exemplos_codigos_duplicados = exemplosCodigos.rows;
    
    // 8. Verificar se há relação com media_exhibitor_id
    if (diagnosticos.tabela_exhibitors_existe) {
      console.log('📊 Analisando relação com media_exhibitors...');
      const relacaoExhibitors = await pool.query(`
        SELECT 
          COUNT(DISTINCT mp.id) AS total_pontos,
          COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL) AS exibidores_por_code,
          COUNT(DISTINCT mp.media_exhibitor_id) FILTER (WHERE mp.media_exhibitor_id IS NOT NULL) AS exibidores_por_id,
          COUNT(DISTINCT TRIM(UPPER(mp.code))) FILTER (WHERE mp.code IS NOT NULL AND TRIM(mp.code) != '') AS exibidores_normalizados
        FROM media_points mp
        WHERE mp.is_deleted = false
          AND mp.is_active = true
      `);
      diagnosticos.relacao_exhibitors = relacaoExhibitors.rows[0];
    }
    
    // 9. Verificar se cada ponto tem código único
    console.log('🔍 Verificando se há pontos com mesmo código...');
    const pontosMesmoCodigo = await pool.query(`
      SELECT 
        TRIM(UPPER(code)) AS codigo_norm,
        COUNT(*) AS quantidade_pontos
      FROM media_points
      WHERE code IS NOT NULL
        AND TRIM(code) != ''
        AND is_deleted = false
        AND is_active = true
      GROUP BY TRIM(UPPER(code))
      HAVING COUNT(*) > 1
      ORDER BY quantidade_pontos DESC
      LIMIT 10
    `);
    diagnosticos.pontos_com_mesmo_codigo = pontosMesmoCodigo.rows;
    
    // 10. Resumo final
    diagnosticos.resumo = {
      total_pontos: diagnosticos.contagem_basica.pontos_unicos,
      codigos_distintos_originais: diagnosticos.contagem_basica.codigos_distintos,
      codigos_distintos_normalizados: diagnosticos.contagem_basica.codigos_normalizados_distintos,
      diferenca: diagnosticos.contagem_basica.codigos_distintos - diagnosticos.contagem_basica.codigos_normalizados_distintos,
      problema_identificado: diagnosticos.contagem_basica.codigos_distintos === diagnosticos.contagem_basica.pontos_unicos 
        ? 'Cada ponto tem um código diferente (código = identificador único do ponto)' 
        : 'Códigos podem ser compartilhados entre pontos'
    };
    
    console.log('✅ Diagnóstico concluído!');
    
    res.status(200).json({
      success: true,
      diagnosticos: diagnosticos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [banco-ativos-diagnostico] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar diagnóstico',
      message: error.message,
      stack: error.stack
    });
  }
};

