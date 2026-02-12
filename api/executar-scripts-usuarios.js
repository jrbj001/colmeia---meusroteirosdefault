const { getPool } = require('./db.js');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { confirmar, scriptEspecifico } = req.body;

  // Segurança: Exigir confirmação explícita
  if (confirmar !== 'SIM_EXECUTAR_SCRIPTS_USUARIO') {
    return res.status(400).json({ 
      error: 'Confirmação necessária',
      mensagem: 'Para executar, envie: { "confirmar": "SIM_EXECUTAR_SCRIPTS_USUARIO" }'
    });
  }

  try {
    const pool = await getPool();
    const resultados = [];
    
    // Scripts a executar
    const scripts = scriptEspecifico 
      ? [scriptEspecifico]
      : ['01_criar_tabelas', '02_inserir_dados_iniciais', '03_migrar_usuarios_existentes', '04_criar_views'];
    
    for (const scriptNome of scripts) {
      const scriptPath = path.join(__dirname, '..', 'sql', 'usuarios-permissoes', `${scriptNome}.sql`);
      
      console.log(`📄 Lendo script: ${scriptNome}.sql`);
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script não encontrado: ${scriptNome}.sql`);
      }
      
      const scriptSQL = fs.readFileSync(scriptPath, 'utf8');
      
      // Dividir por GO (separador de batch do SQL Server)
      const batches = scriptSQL
        .split(/\r?\nGO\r?\n/gi)
        .filter(batch => batch.trim().length > 0)
        .map(batch => batch.trim());
      
      console.log(`🔄 Executando ${batches.length} batches do script ${scriptNome}...`);
      
      let batchResults = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Pular comentários puros e prints
        if (batch.startsWith('--') || batch.toUpperCase().startsWith('PRINT')) {
          continue;
        }
        
        try {
          const result = await pool.request().query(batch);
          batchResults.push({
            batch: i + 1,
            sucesso: true,
            linhasAfetadas: result.rowsAffected?.[0] || 0
          });
        } catch (batchError) {
          // Alguns erros são esperados (ex: objeto já existe)
          const errorMsg = batchError.message || '';
          
          // Ignorar erros de objeto já existente
          if (errorMsg.includes('already exists') || errorMsg.includes('já existe')) {
            batchResults.push({
              batch: i + 1,
              sucesso: true,
              aviso: 'Objeto já existia'
            });
          } else {
            throw batchError;
          }
        }
      }
      
      resultados.push({
        script: scriptNome,
        sucesso: true,
        batches: batchResults.length,
        mensagem: `Script ${scriptNome} executado com sucesso`
      });
      
      console.log(`✅ Script ${scriptNome} concluído`);
    }
    
    // Verificação final
    const verificacao = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM [serv_product_be180].[perfil_dm]) as total_perfis,
        (SELECT COUNT(*) FROM [serv_product_be180].[area_sistema_dm]) as total_areas,
        (SELECT COUNT(*) FROM [serv_product_be180].[perfil_permissao_ft]) as total_permissoes,
        (SELECT COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk IS NOT NULL) as usuarios_com_perfil,
        (SELECT COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk IS NULL) as usuarios_sem_perfil
    `);

    res.status(200).json({
      sucesso: true,
      mensagem: 'Scripts executados com sucesso',
      scripts_executados: resultados,
      verificacao: verificacao.recordset[0],
      proximos_passos: [
        'Testar as views criadas',
        'Criar APIs backend para gerenciamento',
        'Implementar tela de administração'
      ]
    });

  } catch (error) {
    console.error('Erro ao executar scripts:', error);
    res.status(500).json({ 
      error: 'Erro ao executar scripts',
      detalhes: error.message,
      stack: error.stack
    });
  }
};
