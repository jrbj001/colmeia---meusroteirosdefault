require('dotenv').config();
const { getPool } = require('./api/db.js');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  INSTALAÇÃO SIMPLIFICADA - SISTEMA DE USUÁRIOS           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

(async () => {
  try {
    const pool = await getPool();
    
    // 1. Criar tabela perfil_dm
    console.log('1/9 Criando tabela perfil_dm...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[serv_product_be180].[perfil_dm]') AND type in (N'U'))
      BEGIN
          CREATE TABLE [serv_product_be180].[perfil_dm] (
              perfil_pk INT PRIMARY KEY IDENTITY(1,1),
              nome_st NVARCHAR(100) NOT NULL UNIQUE,
              descricao_st NVARCHAR(500),
              ativo_bl BIT DEFAULT 1,
              dataCriacao_dh DATETIME DEFAULT GETDATE(),
              dataAtualizacao_dh DATETIME DEFAULT GETDATE()
          );
          PRINT '✅ Tabela perfil_dm criada';
      END
    `);
    
    // 2. Criar tabela area_sistema_dm
    console.log('2/9 Criando tabela area_sistema_dm...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[serv_product_be180].[area_sistema_dm]') AND type in (N'U'))
      BEGIN
          CREATE TABLE [serv_product_be180].[area_sistema_dm] (
              area_pk INT PRIMARY KEY IDENTITY(1,1),
              codigo_st NVARCHAR(50) NOT NULL UNIQUE,
              nome_st NVARCHAR(100) NOT NULL,
              descricao_st NVARCHAR(500),
              area_pai_pk INT NULL,
              ordem_vl INT DEFAULT 0,
              ativo_bl BIT DEFAULT 1,
              dataCriacao_dh DATETIME DEFAULT GETDATE(),
              FOREIGN KEY (area_pai_pk) REFERENCES [serv_product_be180].[area_sistema_dm](area_pk)
          );
          PRINT '✅ Tabela area_sistema_dm criada';
      END
    `);
    
    // 3. Criar tabela perfil_permissao_ft
    console.log('3/9 Criando tabela perfil_permissao_ft...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[serv_product_be180].[perfil_permissao_ft]') AND type in (N'U'))
      BEGIN
          CREATE TABLE [serv_product_be180].[perfil_permissao_ft] (
              perfilPermissao_pk INT PRIMARY KEY IDENTITY(1,1),
              perfil_pk INT NOT NULL,
              area_pk INT NOT NULL,
              ler_bl BIT DEFAULT 1,
              escrever_bl BIT DEFAULT 0,
              dataCriacao_dh DATETIME DEFAULT GETDATE(),
              FOREIGN KEY (perfil_pk) REFERENCES [serv_product_be180].[perfil_dm](perfil_pk),
              FOREIGN KEY (area_pk) REFERENCES [serv_product_be180].[area_sistema_dm](area_pk),
              UNIQUE(perfil_pk, area_pk)
          );
          PRINT '✅ Tabela perfil_permissao_ft criada';
      END
    `);
    
    // 4. Adicionar colunas em usuario_dm
    console.log('4/9 Adicionando colunas em usuario_dm...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'perfil_pk')
      BEGIN
          ALTER TABLE [serv_product_be180].[usuario_dm] ADD perfil_pk INT NULL;
      END
      
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'auth0_id_st')
      BEGIN
          ALTER TABLE [serv_product_be180].[usuario_dm] ADD auth0_id_st NVARCHAR(255) NULL;
      END
      
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuario_perfil')
      BEGIN
          ALTER TABLE [serv_product_be180].[usuario_dm]
          ADD CONSTRAINT FK_usuario_perfil 
          FOREIGN KEY (perfil_pk) REFERENCES [serv_product_be180].[perfil_dm](perfil_pk);
      END
    `);
    
    // 5. Inserir perfis
    console.log('5/9 Inserindo perfis...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_dm])
      BEGIN
          INSERT INTO [serv_product_be180].[perfil_dm] (nome_st, descricao_st) VALUES
          ('Admin', 'Acesso total ao sistema incluindo gerenciamento de usuários'),
          ('Editor', 'Criar e editar roteiros, acesso completo ao banco de ativos'),
          ('Visualizador', 'Apenas visualizar roteiros e relatórios, sem edição'),
          ('Analista BI', 'Acesso aos relatórios e banco de ativos (somente leitura)');
      END
    `);
    
    // 6. Inserir áreas
    console.log('6/9 Inserindo áreas do sistema...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[area_sistema_dm])
      BEGIN
          INSERT INTO [serv_product_be180].[area_sistema_dm] (codigo_st, nome_st, descricao_st, area_pai_pk, ordem_vl) VALUES
          ('meus_roteiros', 'Meus Roteiros', 'Visualizar lista de roteiros criados', NULL, 1),
          ('criar_roteiro', 'Criar Roteiro', 'Criar novos roteiros de mídia OOH', NULL, 2),
          ('banco_ativos', 'Banco de Ativos', 'Gerenciar banco de ativos de mídia', NULL, 3),
          ('consulta_endereco', 'Consulta de Endereço', 'Consultar endereços e localizações', NULL, 4),
          ('mapa', 'Mapa', 'Visualizar mapa com pontos de mídia', NULL, 5),
          ('admin', 'Administração', 'Gerenciar usuários e configurações do sistema', NULL, 99);
      END
    `);
    
    // 7. Inserir subáreas
    console.log('7/9 Inserindo subáreas...');
    const result = await pool.request().query(`SELECT area_pk FROM [serv_product_be180].[area_sistema_dm] WHERE codigo_st = 'banco_ativos'`);
    const bancoAtivosId = result.recordset[0]?.area_pk;
    
    if (bancoAtivosId) {
      await pool.request()
        .input('bancoAtivosId', bancoAtivosId)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[area_sistema_dm] WHERE codigo_st = 'banco_ativos_dashboard')
          BEGIN
              INSERT INTO [serv_product_be180].[area_sistema_dm] (codigo_st, nome_st, descricao_st, area_pai_pk, ordem_vl) VALUES
              ('banco_ativos_dashboard', 'Dashboard', 'Painel principal', @bancoAtivosId, 1),
              ('banco_ativos_relatorio_praca', 'Relatório por Praça', 'Relatórios por cidade', @bancoAtivosId, 2),
              ('banco_ativos_relatorio_exibidor', 'Relatório por Exibidor', 'Relatórios por exibidor', @bancoAtivosId, 3),
              ('banco_ativos_cadastrar_grupo', 'Cadastrar Grupo Mídia', 'Cadastrar grupos', @bancoAtivosId, 4),
              ('banco_ativos_cadastrar_tipo', 'Cadastrar Tipo Mídia', 'Cadastrar tipos', @bancoAtivosId, 5),
              ('banco_ativos_cadastrar_exibidor', 'Cadastrar Exibidor', 'Cadastrar exibidores', @bancoAtivosId, 6),
              ('banco_ativos_importar', 'Importar Arquivo', 'Importar Excel/CSV', @bancoAtivosId, 7);
          END
        `);
    }
    
    // 8. Configurar permissões
    console.log('8/9 Configurando permissões...');
    
    // Admin - acesso total
    const adminResult = await pool.request().query(`SELECT perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Admin'`);
    const adminId = adminResult.recordset[0]?.perfil_pk;
    
    if (adminId) {
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = ${adminId})
        BEGIN
            INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
            SELECT ${adminId}, area_pk, 1, 1 FROM [serv_product_be180].[area_sistema_dm];
        END
      `);
    }
    
    // Editor - tudo exceto admin
    const editorResult = await pool.request().query(`SELECT perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Editor'`);
    const editorId = editorResult.recordset[0]?.perfil_pk;
    
    if (editorId) {
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = ${editorId})
        BEGIN
            INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
            SELECT ${editorId}, area_pk, 1, 1 FROM [serv_product_be180].[area_sistema_dm] WHERE codigo_st != 'admin';
        END
      `);
    }
    
    // 9. Migrar usuários
    console.log('9/9 Migrando usuários...');
    if (adminId && editorId) {
      await pool.request().query(`
        UPDATE [serv_product_be180].[usuario_dm]
        SET perfil_pk = ${adminId}
        WHERE email_st IN ('gabriel.gama@be180.com.br', 'pedro.barbosa@be180.com.br', 'millena.santos@be180.com.br')
        AND perfil_pk IS NULL;
        
        UPDATE [serv_product_be180].[usuario_dm]
        SET perfil_pk = ${editorId}
        WHERE (email_st IS NULL OR email_st = '')
        AND perfil_pk IS NULL;
      `);
    }
    
    console.log('\n✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!\n');
    
    // Verificação
    const verificacao = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM [serv_product_be180].[perfil_dm]) as total_perfis,
        (SELECT COUNT(*) FROM [serv_product_be180].[area_sistema_dm]) as total_areas,
        (SELECT COUNT(*) FROM [serv_product_be180].[perfil_permissao_ft]) as total_permissoes,
        (SELECT COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk IS NOT NULL) as usuarios_com_perfil
    `);
    
    console.log('📊 RESUMO:');
    console.table(verificacao.recordset[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
