-- ============================================================================
-- Script 03: Migrar Usuários Existentes
-- Descrição: Atribui perfis aos 9 usuários já cadastrados
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

PRINT 'Iniciando migração dos usuários existentes...';
GO

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
GO

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
GO

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
END
ELSE
BEGIN
    PRINT '✅ Todos os usuários ativos têm perfil atribuído';
END
GO

-- ========================================================================
-- 4. EXIBIR RESUMO DA MIGRAÇÃO
-- ========================================================================

PRINT '';
PRINT '📊 RESUMO DA MIGRAÇÃO:';
PRINT '─────────────────────────────────────────────────────────';

SELECT 
    ISNULL(p.nome_st, 'SEM PERFIL') as Perfil,
    COUNT(u.pk) as Total_Usuarios,
    STRING_AGG(u.nome_st, ', ') as Usuarios
FROM [serv_product_be180].[usuario_dm] u
LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
WHERE u.ativo_bl = 1
GROUP BY p.nome_st, p.perfil_pk
ORDER BY p.perfil_pk;
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT 03 CONCLUÍDO COM SUCESSO!';
PRINT '═══════════════════════════════════════════════════════════';
GO
