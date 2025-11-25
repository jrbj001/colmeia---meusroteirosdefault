const { getPostgresPool } = require('./banco-ativos-passantes');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPostgresPool();
    const { search } = req.query;
    
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
        const colunas = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'media_exhibitors'
          AND (column_name ILIKE '%name%' OR column_name ILIKE '%nome%' OR column_name ILIKE '%title%')
        `);
        if (colunas.rows.length > 0) {
          nomeColunaExhibitor = colunas.rows[0].column_name;
        }
      }
    } catch (err) {
      console.log('⚠️ Erro ao verificar tabela media_exhibitors:', err.message);
    }
    
    let query = '';
    let params = [];
    
    if (tabelaExhibitorExiste) {
      // Buscar exibidores da tabela media_exhibitors com código
      query = `
        SELECT DISTINCT
          COALESCE(me.${nomeColunaExhibitor}, mp.code) AS nome_exibidor,
          mp.code AS codigo_exibidor
        FROM media_points mp
        LEFT JOIN media_exhibitors me ON me.id = mp.media_exhibitor_id
        WHERE mp.is_deleted = false
          AND mp.is_active = true
          AND mp.code IS NOT NULL
      `;
      
      if (search && search.trim()) {
        query += ` AND (mp.code ILIKE $1 OR me.${nomeColunaExhibitor} ILIKE $1)`;
        params.push(`%${search.trim()}%`);
      }
      
      query += ` ORDER BY nome_exibidor, codigo_exibidor LIMIT 500`;
    } else {
      // Se não existe tabela, buscar apenas códigos únicos
      query = `
        SELECT DISTINCT
          mp.code AS nome_exibidor,
          mp.code AS codigo_exibidor
        FROM media_points mp
        WHERE mp.is_deleted = false
          AND mp.is_active = true
          AND mp.code IS NOT NULL
      `;
      
      if (search && search.trim()) {
        query += ` AND mp.code ILIKE $1`;
        params.push(`%${search.trim()}%`);
      }
      
      query += ` ORDER BY mp.code LIMIT 500`;
    }
    
    const result = await pool.query(query, params);
    
    // Formatar resposta
    const exibidores = result.rows.map(row => ({
      id_exibidor: row.codigo_exibidor,
      nome_exibidor: row.nome_exibidor || row.codigo_exibidor,
      codigo_exibidor: row.codigo_exibidor
    }));
    
    res.json(exibidores);
  } catch (error) {
    console.error('Erro na API /api/exibidores-praca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


