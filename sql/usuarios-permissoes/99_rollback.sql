-- ============================================================================
-- Script 99: ROLLBACK - Reverter Alterações
-- Descrição: Remove todas as estruturas criadas (USE COM CUIDADO!)
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

PRINT '╔═══════════════════════════════════════════════════════════╗';
PRINT '║  ⚠️  ATENÇÃO: SCRIPT DE ROLLBACK                          ║';
PRINT '║  Este script vai REMOVER todas as estruturas criadas     ║';
PRINT '╚═══════════════════════════════════════════════════════════╝';
PRINT '';

BEGIN TRANSACTION;
BEGIN TRY

    -- ========================================================================
    -- 1. REMOVER VIEWS
    -- ========================================================================
    
    IF OBJECT_ID('[serv_product_be180].[perfil_permissoes_resumo_vw]', 'V') IS NOT NULL
    BEGIN
        DROP VIEW [serv_product_be180].[perfil_permissoes_resumo_vw];
        PRINT '✅ View perfil_permissoes_resumo_vw removida';
    END
    
    IF OBJECT_ID('[serv_product_be180].[area_sistema_hierarquia_vw]', 'V') IS NOT NULL
    BEGIN
        DROP VIEW [serv_product_be180].[area_sistema_hierarquia_vw];
        PRINT '✅ View area_sistema_hierarquia_vw removida';
    END
    
    IF OBJECT_ID('[serv_product_be180].[usuario_permissoes_vw]', 'V') IS NOT NULL
    BEGIN
        DROP VIEW [serv_product_be180].[usuario_permissoes_vw];
        PRINT '✅ View usuario_permissoes_vw removida';
    END
    
    IF OBJECT_ID('[serv_product_be180].[usuario_completo_vw]', 'V') IS NOT NULL
    BEGIN
        DROP VIEW [serv_product_be180].[usuario_completo_vw];
        PRINT '✅ View usuario_completo_vw removida';
    END

    -- ========================================================================
    -- 2. REMOVER FOREIGN KEYS da tabela usuario_dm
    -- ========================================================================
    
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuario_perfil')
    BEGIN
        ALTER TABLE [serv_product_be180].[usuario_dm] DROP CONSTRAINT FK_usuario_perfil;
        PRINT '✅ Foreign key FK_usuario_perfil removida';
    END

    -- ========================================================================
    -- 3. REMOVER COLUNAS ADICIONADAS à tabela usuario_dm
    -- ========================================================================
    
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'perfil_pk')
    BEGIN
        ALTER TABLE [serv_product_be180].[usuario_dm] DROP COLUMN perfil_pk;
        PRINT '✅ Coluna perfil_pk removida da tabela usuario_dm';
    END
    
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'auth0_id_st')
    BEGIN
        ALTER TABLE [serv_product_be180].[usuario_dm] DROP COLUMN auth0_id_st;
        PRINT '✅ Coluna auth0_id_st removida da tabela usuario_dm';
    END

    -- ========================================================================
    -- 4. REMOVER TABELAS (ordem reversa devido às foreign keys)
    -- ========================================================================
    
    -- 4.1 Remover perfil_permissao_ft primeiro (tem FKs)
    IF OBJECT_ID('[serv_product_be180].[perfil_permissao_ft]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [serv_product_be180].[perfil_permissao_ft];
        PRINT '✅ Tabela perfil_permissao_ft removida';
    END
    
    -- 4.2 Remover area_sistema_dm (tem self-referencing FK)
    IF OBJECT_ID('[serv_product_be180].[area_sistema_dm]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [serv_product_be180].[area_sistema_dm];
        PRINT '✅ Tabela area_sistema_dm removida';
    END
    
    -- 4.3 Remover perfil_dm por último
    IF OBJECT_ID('[serv_product_be180].[perfil_dm]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [serv_product_be180].[perfil_dm];
        PRINT '✅ Tabela perfil_dm removida';
    END

    COMMIT TRANSACTION;
    
    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════';
    PRINT '✅ ROLLBACK CONCLUÍDO COM SUCESSO!';
    PRINT '   Todas as estruturas foram removidas';
    PRINT '   Tabela usuario_dm voltou ao estado original';
    PRINT '═══════════════════════════════════════════════════════════';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    PRINT '';
    PRINT '❌ ERRO AO EXECUTAR ROLLBACK';
    PRINT 'Mensagem: ' + @ErrorMessage;
    
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH
GO
