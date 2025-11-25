const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('📊 [banco-ativos-dashboard] Buscando estatísticas do banco de ativos...');
    
    const pool = await getPostgresPool();
    
    // Query para buscar estatísticas agregadas do banco de ativos
    // Contagem de pontos de mídia, praças (districts) e exibidores (codes únicos)
    // Separando por Vias Públicas e Indoor baseado no tipo de mídia
    
    const query = `
      WITH totais AS (
        SELECT 
          COUNT(DISTINCT mp.id) AS total_pontos_midia,
          COUNT(DISTINCT mp.district) FILTER (WHERE mp.district IS NOT NULL AND mp.district != '') AS total_pracas,
          COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL AND mp.code != '') AS total_exibidores
        FROM media_points mp
        WHERE mp.is_deleted = false
          AND mp.is_active = true
      ),
      vias_publicas AS (
        SELECT 
          COUNT(DISTINCT mp.id) AS pontos_midia,
          COUNT(DISTINCT mp.district) FILTER (WHERE mp.district IS NOT NULL AND mp.district != '') AS pracas,
          COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL AND mp.code != '') AS exibidores
        FROM media_points mp
        LEFT JOIN media_types mt ON mp.media_type_id = mt.id
        WHERE mp.is_deleted = false
          AND mp.is_active = true
          AND (
            mt.name ILIKE '%outdoor%' 
            OR mt.name ILIKE '%painel%' 
            OR mt.name ILIKE '%vias%' 
            OR mt.name ILIKE '%public%'
            OR mt.name ILIKE '%rua%'
            OR mt.name ILIKE '%avenida%'
            OR mt.name ILIKE '%via%'
          )
      ),
      indoor AS (
        SELECT 
          COUNT(DISTINCT mp.id) AS pontos_midia,
          COUNT(DISTINCT mp.district) FILTER (WHERE mp.district IS NOT NULL AND mp.district != '') AS pracas,
          COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL AND mp.code != '') AS exibidores
        FROM media_points mp
        LEFT JOIN media_types mt ON mp.media_type_id = mt.id
        WHERE mp.is_deleted = false
          AND mp.is_active = true
          AND (
            mt.name ILIKE '%indoor%' 
            OR mt.name ILIKE '%shopping%' 
            OR mt.name ILIKE '%mall%'
            OR mt.name ILIKE '%centro comercial%'
            OR mt.name ILIKE '%interno%'
          )
      )
      SELECT 
        COALESCE((SELECT total_pontos_midia FROM totais), 0) AS total_pontos_midia,
        COALESCE((SELECT total_pracas FROM totais), 0) AS total_pracas,
        COALESCE((SELECT total_exibidores FROM totais), 0) AS total_exibidores,
        COALESCE((SELECT pontos_midia FROM vias_publicas), 0) AS vias_publicas_pontos_midia,
        COALESCE((SELECT pracas FROM vias_publicas), 0) AS vias_publicas_pracas,
        COALESCE((SELECT exibidores FROM vias_publicas), 0) AS vias_publicas_exibidores,
        COALESCE((SELECT pontos_midia FROM indoor), 0) AS indoor_pontos_midia,
        COALESCE((SELECT pracas FROM indoor), 0) AS indoor_pracas,
        COALESCE((SELECT exibidores FROM indoor), 0) AS indoor_exibidores
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: {
            pontos_midia: 0,
            pracas: 0,
            exibidores: 0
          },
          vias_publicas: {
            pontos_midia: 0,
            pracas: 0,
            exibidores: 0
          },
          indoor: {
            pontos_midia: 0,
            pracas: 0,
            exibidores: 0
          }
        }
      });
    }
    
    const row = result.rows[0];
    
    const dados = {
      total: {
        pontos_midia: parseInt(row.total_pontos_midia) || 0,
        pracas: parseInt(row.total_pracas) || 0,
        exibidores: parseInt(row.total_exibidores) || 0
      },
      vias_publicas: {
        pontos_midia: parseInt(row.vias_publicas_pontos_midia) || 0,
        pracas: parseInt(row.vias_publicas_pracas) || 0,
        exibidores: parseInt(row.vias_publicas_exibidores) || 0
      },
      indoor: {
        pontos_midia: parseInt(row.indoor_pontos_midia) || 0,
        pracas: parseInt(row.indoor_pracas) || 0,
        exibidores: parseInt(row.indoor_exibidores) || 0
      }
    };
    
    console.log('✅ [banco-ativos-dashboard] Estatísticas encontradas:', dados);
    
    res.status(200).json({
      success: true,
      data: dados
    });
    
  } catch (error) {
    console.error('❌ [banco-ativos-dashboard] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas do banco de ativos',
      message: error.message
    });
  }
};

