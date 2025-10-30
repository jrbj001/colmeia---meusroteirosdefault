const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    const pool = await getPool();
    
    console.log(`\n🔍 [pivot-descpks] Buscando descPks para grupo: ${grupo}`);
    
    const result = await pool.request().query(`
      SELECT cidadeUpper_st, planoMidiaDesc_pk
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
    `);
    
    console.log(`📊 [pivot-descpks] Registros encontrados: ${result.recordset.length}`);
    result.recordset.forEach(r => {
      console.log(`   - Cidade: ${r.cidadeUpper_st}, PK: ${r.planoMidiaDesc_pk}`);
    });
    
    const descPks = {};
    result.recordset.forEach(r => {
      descPks[r.cidadeUpper_st] = r.planoMidiaDesc_pk;
    });
    
    console.log(`📤 [pivot-descpks] Retornando:`, descPks);
    console.log(`---\n`);
    
    res.json({ descPks });
  } catch (err) {
    console.error('Erro na API /api/pivot-descpks:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 