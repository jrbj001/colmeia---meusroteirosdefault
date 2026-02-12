-- ============================================================================
-- Script 03: Migrar Usuários Existentes
-- Descrição: Atribui perfis aos 9 usuários já cadastrados
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

BEGIN TRANSACTION;
BEGIN TRY

    PRINT 'Iniciando migração dos usuários existentes...';
    PRINT '';

    -- ========================================================================
    -- 1. ATRIBUIR PERFIL ADMIN aos usuários com email @be180.com.br
    -- ========================================================================
    
    DECLARE @adminId INT;
    SELECT @adminId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Admin';
    
    UPDATE [serv_product_be180].[usuario_dm]
    SET perfil_pk = @adminId
    WHERE email_st IN (
        'gabriel.gama@be180.com.br',
        'pedro.barbosa@be180.com.br',
        'millena.santos@be180.com.br'
    )
    AND perfil_pk IS NULL;  -- Só atualizar se ainda não tem perfil
    
    DECLARE @adminCount INT = @@ROWCOUNT;
    PRINT '✅ ' + CAST(@adminCount AS VARCHAR) + ' usuários atualizados para perfil Admin';
    
    -- ========================================================================
    -- 2. ATRIBUIR PERFIL EDITOR aos usuários sem email (uso interno)
    -- ========================================================================
    
    DECLARE @editorId INT;
    SELECT @editorId = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Editor';
    
    UPDATE [serv_product_be180].[usuario_dm]
    SET perfil_pk = @editorId
    WHERE (email_st IS NULL OR email_st = '')
    AND perfil_pk IS NULL;  -- Só atualizar se ainda não tem perfil
    
    DECLARE @editorCount INT = @@ROWCOUNT;
    PRINT '✅ ' + CAST(@editorCount AS VARCHAR) + ' usuários atualizados para perfil Editor';
    
    -- ========================================================================
    -- 3. VERIFICAR SE FICOU ALGUM USUÁRIO SEM PERFIL
    -- ========================================================================
    
    DECLARE @semPerfilCount INT;
    SELECT @semPerfilCount = COUNT(*) 
    FROM [serv_product_be180].[usuario_dm] 
    WHERE perfil_pk IS NULL AND ativo_bl = 1;
    
    IF @semPerfilCount > 0
    BEGIN
        PRINT '⚠️ ATENÇÃO: ' + CAST(@semPerfilCount AS VARCHAR) + ' usuários ativos ainda sem perfil';
        PRINT '   Execute consulta manual para verificar: SELECT * FROM usuario_dm WHERE perfil_pk IS NULL';
    END
    ELSE
    BEGIN
        PRINT '✅ Todos os usuários ativos têm perfil atribuído';
    END
    
    -- ========================================================================
    -- 4. EXIBIR RESUMO DA MIGRAÇÃO
    -- ========================================================================
    
    PRINT '';
    PRINT '📊 RESUMO DA MIGRAÇÃO:';
    PRINT '─────────────────────────────────────────────────────────';
    
    SELECT 
        p.nome_st as Perfil,
        COUNT(u.pk) as Total_Usuarios,
        STRING_AGG(u.nome_st, ', ') as Usuarios
    FROM [serv_product_be180].[usuario_dm] u
    LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
    WHERE u.ativo_bl = 1
    GROUP BY p.nome_st, p.perfil_pk
    ORDER BY p.perfil_pk;

    COMMIT TRANSACTION;
    
    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════';
    PRINT '✅ SCRIPT 03 CONCLUÍDO COM SUCESSO!';
    PRINT '═══════════════════════════════════════════════════════════';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    
    PRINT '';
    PRINT '❌ ERRO AO EXECUTAR SCRIPT 03';
    PRINT 'Mensagem: ' + @ErrorMessage;
    
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH
GO
