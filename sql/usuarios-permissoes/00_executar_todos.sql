-- ============================================================================
-- Script Master: Executar Todos os Scripts
-- Descrição: Executa todos os scripts na ordem correta
-- Data: 2026-02-12
-- ============================================================================

PRINT '╔═══════════════════════════════════════════════════════════╗';
PRINT '║  INSTALAÇÃO DO SISTEMA DE USUÁRIOS E PERMISSÕES          ║';
PRINT '║  Colmeia - Meus Roteiros Default                         ║';
PRINT '╚═══════════════════════════════════════════════════════════╝';
PRINT '';

-- ============================================================================
-- SCRIPT 01: Criar Tabelas
-- ============================================================================
PRINT '═══════════════════════════════════════════════════════════';
PRINT '▶ EXECUTANDO SCRIPT 01: Criar Tabelas';
PRINT '═══════════════════════════════════════════════════════════';
:r 01_criar_tabelas.sql
PRINT '';

-- ============================================================================
-- SCRIPT 02: Inserir Dados Iniciais
-- ============================================================================
PRINT '═══════════════════════════════════════════════════════════';
PRINT '▶ EXECUTANDO SCRIPT 02: Inserir Dados Iniciais';
PRINT '═══════════════════════════════════════════════════════════';
:r 02_inserir_dados_iniciais.sql
PRINT '';

-- ============================================================================
-- SCRIPT 03: Migrar Usuários Existentes
-- ============================================================================
PRINT '═══════════════════════════════════════════════════════════';
PRINT '▶ EXECUTANDO SCRIPT 03: Migrar Usuários Existentes';
PRINT '═══════════════════════════════════════════════════════════';
:r 03_migrar_usuarios_existentes.sql
PRINT '';

-- ============================================================================
-- SCRIPT 04: Criar Views
-- ============================================================================
PRINT '═══════════════════════════════════════════════════════════';
PRINT '▶ EXECUTANDO SCRIPT 04: Criar Views';
PRINT '═══════════════════════════════════════════════════════════';
:r 04_criar_views.sql
PRINT '';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
PRINT '╔═══════════════════════════════════════════════════════════╗';
PRINT '║  ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!                     ║';
PRINT '╚═══════════════════════════════════════════════════════════╝';
PRINT '';
PRINT '📊 RESUMO DA INSTALAÇÃO:';
PRINT '';

-- Contar tabelas criadas
DECLARE @totalTabelas INT;
SELECT @totalTabelas = COUNT(*) 
FROM sys.objects 
WHERE object_id IN (
    OBJECT_ID(N'[serv_product_be180].[perfil_dm]'),
    OBJECT_ID(N'[serv_product_be180].[area_sistema_dm]'),
    OBJECT_ID(N'[serv_product_be180].[perfil_permissao_ft]')
) AND type in (N'U');

PRINT '✅ Tabelas criadas: ' + CAST(@totalTabelas AS VARCHAR) + '/3';

-- Contar perfis
DECLARE @totalPerfis INT;
SELECT @totalPerfis = COUNT(*) FROM [serv_product_be180].[perfil_dm];
PRINT '✅ Perfis cadastrados: ' + CAST(@totalPerfis AS VARCHAR);

-- Contar áreas
DECLARE @totalAreas INT;
SELECT @totalAreas = COUNT(*) FROM [serv_product_be180].[area_sistema_dm];
PRINT '✅ Áreas do sistema: ' + CAST(@totalAreas AS VARCHAR);

-- Contar usuários com perfil
DECLARE @usuariosComPerfil INT, @usuariosSemPerfil INT;
SELECT @usuariosComPerfil = COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk IS NOT NULL;
SELECT @usuariosSemPerfil = COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk IS NULL;
PRINT '✅ Usuários com perfil: ' + CAST(@usuariosComPerfil AS VARCHAR);
IF @usuariosSemPerfil > 0
    PRINT '⚠️ Usuários sem perfil: ' + CAST(@usuariosSemPerfil AS VARCHAR);

-- Contar views
DECLARE @totalViews INT;
SELECT @totalViews = COUNT(*) 
FROM sys.views 
WHERE name IN (
    'usuario_completo_vw',
    'usuario_permissoes_vw',
    'area_sistema_hierarquia_vw',
    'perfil_permissoes_resumo_vw'
);
PRINT '✅ Views criadas: ' + CAST(@totalViews AS VARCHAR) + '/4';

PRINT '';
PRINT '📖 PRÓXIMOS PASSOS:';
PRINT '   1. Testar as views criadas';
PRINT '   2. Criar as APIs backend';
PRINT '   3. Implementar frontend de gerenciamento';
PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
GO
