-- ============================================================================
-- Script 02: Inserir Dados Iniciais
-- Descrição: Insere perfis, áreas do sistema e permissões padrão
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

-- ========================================================================
-- 1. INSERIR PERFIS
-- ========================================================================

-- Verifica se já existem perfis antes de inserir
IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_dm])
BEGIN
    INSERT INTO [serv_product_be180].[perfil_dm] (nome_st, descricao_st) VALUES
    ('Admin', 'Acesso total ao sistema incluindo gerenciamento de usuários'),
    ('Editor', 'Criar e editar roteiros, acesso completo ao banco de ativos'),
    ('Visualizador', 'Apenas visualizar roteiros e relatórios, sem edição'),
    ('Analista BI', 'Acesso aos relatórios e banco de ativos (somente leitura)');
    
    PRINT '✅ 4 perfis inseridos com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Perfis já existem, pulando inserção';
END
GO

-- ========================================================================
-- 2. INSERIR ÁREAS DO SISTEMA
-- ========================================================================

-- Verifica se já existem áreas antes de inserir
IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[area_sistema_dm])
BEGIN
    -- Áreas principais (nível 1)
    INSERT INTO [serv_product_be180].[area_sistema_dm] (codigo_st, nome_st, descricao_st, area_pai_pk, ordem_vl) VALUES
    ('meus_roteiros', 'Meus Roteiros', 'Visualizar lista de roteiros criados', NULL, 1),
    ('criar_roteiro', 'Criar Roteiro', 'Criar novos roteiros de mídia OOH', NULL, 2),
    ('banco_ativos', 'Banco de Ativos', 'Gerenciar banco de ativos de mídia', NULL, 3),
    ('consulta_endereco', 'Consulta de Endereço', 'Consultar endereços e localizações', NULL, 4),
    ('mapa', 'Mapa', 'Visualizar mapa com pontos de mídia', NULL, 5),
    ('admin', 'Administração', 'Gerenciar usuários e configurações do sistema', NULL, 99);
    
    PRINT '✅ 6 áreas principais inseridas com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Áreas principais já existem, pulando inserção';
END
GO

-- Inserir subáreas do Banco de Ativos
IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[area_sistema_dm] WHERE codigo_st = 'banco_ativos_dashboard')
BEGIN
    DECLARE @bancoAtivosId INT;
    SELECT @bancoAtivosId = area_pk FROM [serv_product_be180].[area_sistema_dm] WHERE codigo_st = 'banco_ativos';
    
    INSERT INTO [serv_product_be180].[area_sistema_dm] (codigo_st, nome_st, descricao_st, area_pai_pk, ordem_vl) VALUES
    ('banco_ativos_dashboard', 'Dashboard', 'Painel principal com métricas do banco de ativos', @bancoAtivosId, 1),
    ('banco_ativos_relatorio_praca', 'Relatório por Praça', 'Relatórios agrupados por cidade/praça', @bancoAtivosId, 2),
    ('banco_ativos_relatorio_exibidor', 'Relatório por Exibidor', 'Relatórios agrupados por exibidor', @bancoAtivosId, 3),
    ('banco_ativos_cadastrar_grupo', 'Cadastrar Grupo Mídia', 'Cadastrar novos grupos de mídia', @bancoAtivosId, 4),
    ('banco_ativos_cadastrar_tipo', 'Cadastrar Tipo Mídia', 'Cadastrar novos tipos de mídia', @bancoAtivosId, 5),
    ('banco_ativos_cadastrar_exibidor', 'Cadastrar Exibidor', 'Cadastrar novos exibidores', @bancoAtivosId, 6),
    ('banco_ativos_importar', 'Importar Arquivo', 'Importar dados via arquivo Excel/CSV', @bancoAtivosId, 7);
    
    PRINT '✅ 7 subáreas do banco de ativos inseridas com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Subáreas do banco de ativos já existem, pulando inserção';
END
GO

-- ========================================================================
-- 3. CONFIGURAR PERMISSÕES PADRÃO - PERFIL ADMIN
-- ========================================================================

DECLARE @adminId INT;
SELECT @adminId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Admin';

IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = @adminId)
BEGIN
    -- Admin tem acesso total a TUDO (ler e escrever)
    INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
    SELECT @adminId, area_pk, 1, 1
    FROM [serv_product_be180].[area_sistema_dm];
    
    PRINT '✅ Permissões do perfil Admin configuradas (acesso total)';
END
GO

-- ========================================================================
-- 4. CONFIGURAR PERMISSÕES PADRÃO - PERFIL EDITOR
-- ========================================================================

DECLARE @editorId INT;
SELECT @editorId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Editor';

IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = @editorId)
BEGIN
    -- Editor tem acesso de leitura e escrita, EXCETO administração
    INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
    SELECT @editorId, area_pk, 1, 1
    FROM [serv_product_be180].[area_sistema_dm]
    WHERE codigo_st != 'admin';  -- Sem acesso a administração
    
    PRINT '✅ Permissões do perfil Editor configuradas';
END
GO

-- ========================================================================
-- 5. CONFIGURAR PERMISSÕES PADRÃO - PERFIL VISUALIZADOR
-- ========================================================================

DECLARE @visualizadorId INT;
SELECT @visualizadorId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Visualizador';

IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = @visualizadorId)
BEGIN
    -- Visualizador tem apenas leitura, sem criar roteiro
    INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
    SELECT @visualizadorId, area_pk, 1, 0
    FROM [serv_product_be180].[area_sistema_dm]
    WHERE codigo_st IN ('meus_roteiros', 'mapa', 'consulta_endereco', 
                       'banco_ativos_dashboard', 'banco_ativos_relatorio_praca', 
                       'banco_ativos_relatorio_exibidor');
    
    PRINT '✅ Permissões do perfil Visualizador configuradas (somente leitura)';
END
GO

-- ========================================================================
-- 6. CONFIGURAR PERMISSÕES PADRÃO - PERFIL ANALISTA BI
-- ========================================================================

DECLARE @analistaId INT;
SELECT @analistaId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Analista BI';

IF NOT EXISTS (SELECT 1 FROM [serv_product_be180].[perfil_permissao_ft] WHERE perfil_pk = @analistaId)
BEGIN
    -- Analista BI tem leitura em relatórios e banco de ativos
    INSERT INTO [serv_product_be180].[perfil_permissao_ft] (perfil_pk, area_pk, ler_bl, escrever_bl)
    SELECT @analistaId, area_pk, 1, 0
    FROM [serv_product_be180].[area_sistema_dm]
    WHERE codigo_st LIKE 'banco_ativos%';  -- Todas as áreas do banco de ativos
    
    PRINT '✅ Permissões do perfil Analista BI configuradas';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT 02 CONCLUÍDO COM SUCESSO!';
PRINT '   - 4 Perfis criados';
PRINT '   - 13 Áreas configuradas';
PRINT '   - Permissões padrão configuradas';
PRINT '═══════════════════════════════════════════════════════════';
GO
