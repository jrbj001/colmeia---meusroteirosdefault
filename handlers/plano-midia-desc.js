const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk, recordsJson } = req.body;
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 [CHAMADA 1] POST /plano-midia-desc');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 BODY COMPLETO:', JSON.stringify(req.body, null, 2));
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
    console.log('📊 Tipo:', typeof planoMidiaGrupo_pk);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📊 recordsJson (total de registros):', recordsJson?.length || 0);
    console.log('📊 recordsJson (dados):');
    recordsJson?.forEach((record, index) => {
      console.log(`   [${index + 1}]:`, JSON.stringify(record, null, 6));
    });
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (!planoMidiaGrupo_pk || !recordsJson) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk e recordsJson são obrigatórios' });
    }

    const pool = await getPool();
    console.log('🚀 Executando sp_planoMidiaDescInsert...');
    
    const result = await pool.request()
      .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
      .input('recordsJson', JSON.stringify(recordsJson))
      .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');

    console.log('✅ sp_planoMidiaDescInsert executada com sucesso!');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia desc:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

