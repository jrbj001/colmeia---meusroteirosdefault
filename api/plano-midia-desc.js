const { getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk, recordsJson } = req.body;
    
    console.log('🔍 DEBUG plano-midia-desc - Dados recebidos:');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
    console.log('📊 recordsJson:', JSON.stringify(recordsJson, null, 2));
    
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

