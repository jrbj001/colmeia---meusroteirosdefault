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
    
    console.log(`\n🔍 [verificar-dados-para-databricks] Verificando dados para grupo: ${grupo}`);
    
    // 1. Verifica planoMidiaDesc_dm - onde salvamos os DESC
    console.log(`\n📋 1. Consultando planoMidiaDesc_dm...`);
    const descResult = await pool.request().query(`
      SELECT pk, planoMidiaDesc_st, ibgeCode_vl
      FROM serv_product_be180.planoMidiaDesc_dm
      WHERE pk IN (7406, 7407)
    `);
    console.log(`   Encontrados: ${descResult.recordset.length} registros`);
    descResult.recordset.forEach(r => {
      console.log(`   - PK: ${r.pk}, Cidade: ${r.planoMidiaDesc_st}`);
    });
    
    // 2. Verifica planoMidiaGrupo_dm - onde o grupo está
    console.log(`\n📋 2. Consultando planoMidiaGrupo_dm...`);
    const grupoResult = await pool.request().query(`
      SELECT TOP 10 *
      FROM serv_product_be180.planoMidiaGrupo_dm
      WHERE pk = ${grupo}
    `);
    console.log(`   Encontrados: ${grupoResult.recordset.length} registros`);
    if (grupoResult.recordset.length > 0) {
      console.log(`   Colunas: ${Object.keys(grupoResult.recordset[0]).join(', ')}`);
      console.log(`   Dados: ${JSON.stringify(grupoResult.recordset[0])}`);
    }
    
    // 3. Verifica se existe uma tabela de vínculo entre grupo e desc
    console.log(`\n📋 3. Buscando vínculo grupo-desc...`);
    
    // Tenta encontrar a tabela de vínculo
    const tabelasResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
      AND (
        TABLE_NAME LIKE '%grupo%desc%'
        OR TABLE_NAME LIKE '%desc%grupo%'
        OR TABLE_NAME LIKE '%planoMidia%'
      )
      ORDER BY TABLE_NAME
    `);
    
    console.log(`   Tabelas relacionadas encontradas: ${tabelasResult.recordset.length}`);
    tabelasResult.recordset.forEach(t => {
      console.log(`   - ${t.TABLE_NAME}`);
    });
    
    // 4. Verifica planoMidiaGrupoPivot_dm_vw - DEPOIS do Databricks
    console.log(`\n📋 4. Consultando planoMidiaGrupoPivot_dm_vw (RESULTADO DO DATABRICKS)...`);
    const pivotResult = await pool.request().query(`
      SELECT cidadeUpper_st, planoMidiaDesc_pk
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
    `);
    console.log(`   Encontrados: ${pivotResult.recordset.length} registros`);
    pivotResult.recordset.forEach(r => {
      console.log(`   - Cidade: ${r.cidadeUpper_st}, PK: ${r.planoMidiaDesc_pk}`);
    });
    
    res.json({ 
      grupo,
      planoMidiaDesc: descResult.recordset,
      planoMidiaGrupo: grupoResult.recordset,
      tabelasRelacionadas: tabelasResult.recordset,
      resultadoDatabricks: pivotResult.recordset
    });
  } catch (err) {
    console.error('❌ Erro na API /api/verificar-dados-para-databricks:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: err.message 
    });
  }
};

