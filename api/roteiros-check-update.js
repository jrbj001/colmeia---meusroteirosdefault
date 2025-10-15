const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        max_pk,
        dateMax_dh
      FROM serv_product_be180.planoMidiaGrupoMax_dm_vw
    `);
    
    if (result.recordset && result.recordset.length > 0) {
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
  } catch (err) {
    console.error('Erro na API /api/roteiros-check-update:', err);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

