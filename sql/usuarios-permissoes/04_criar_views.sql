-- ============================================================================
-- Script 04: Criar Views Úteis
-- Descrição: Cria views para facilitar consultas de usuários e permissões
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

-- ============================================================================
-- 1. VIEW: usuario_completo_vw
-- Descrição: View com dados completos do usuário incluindo perfil
-- ============================================================================

IF OBJECT_ID('[serv_product_be180].[usuario_completo_vw]', 'V') IS NOT NULL
    DROP VIEW [serv_product_be180].[usuario_completo_vw];
GO

CREATE VIEW [serv_product_be180].[usuario_completo_vw]
WITH SCHEMABINDING
AS
SELECT 
    u.pk as usuario_pk,
    u.pk2 as usuario_pk2,
    u.nome_st as usuario_nome,
    u.email_st as usuario_email,
    u.telefone_st as usuario_telefone,
    u.empresa_pk,
    u.auth0_id_st,
    u.ativo_bl as usuario_ativo,
    u.date_dh as usuario_data_criacao,
    u.date_dt as usuario_data,
    p.perfil_pk,
    p.nome_st as perfil_nome,
    p.descricao_st as perfil_descricao,
    p.ativo_bl as perfil_ativo
FROM [serv_product_be180].[usuario_dm] u
LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk;
GO

PRINT '✅ View usuario_completo_vw criada';
GO

-- ============================================================================
-- 2. VIEW: usuario_permissoes_vw
-- Descrição: View com todas as permissões de cada usuário
-- ============================================================================

IF OBJECT_ID('[serv_product_be180].[usuario_permissoes_vw]', 'V') IS NOT NULL
    DROP VIEW [serv_product_be180].[usuario_permissoes_vw];
GO

CREATE VIEW [serv_product_be180].[usuario_permissoes_vw]
WITH SCHEMABINDING
AS
SELECT 
    u.pk as usuario_pk,
    u.nome_st as usuario_nome,
    u.email_st as usuario_email,
    u.ativo_bl as usuario_ativo,
    p.perfil_pk,
    p.nome_st as perfil_nome,
    a.area_pk,
    a.codigo_st as area_codigo,
    a.nome_st as area_nome,
    a.descricao_st as area_descricao,
    ap.nome_st as area_pai_nome,
    pp.ler_bl,
    pp.escrever_bl
FROM [serv_product_be180].[usuario_dm] u
INNER JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
INNER JOIN [serv_product_be180].[perfil_permissao_ft] pp ON p.perfil_pk = pp.perfil_pk
INNER JOIN [serv_product_be180].[area_sistema_dm] a ON pp.area_pk = a.area_pk
LEFT JOIN [serv_product_be180].[area_sistema_dm] ap ON a.area_pai_pk = ap.area_pk
WHERE u.ativo_bl = 1 AND p.ativo_bl = 1 AND a.ativo_bl = 1;
GO

PRINT '✅ View usuario_permissoes_vw criada';
GO

-- ============================================================================
-- 3. VIEW: area_sistema_hierarquia_vw
-- Descrição: View que mostra a hierarquia completa das áreas
-- ============================================================================

IF OBJECT_ID('[serv_product_be180].[area_sistema_hierarquia_vw]', 'V') IS NOT NULL
    DROP VIEW [serv_product_be180].[area_sistema_hierarquia_vw];
GO

CREATE VIEW [serv_product_be180].[area_sistema_hierarquia_vw]
WITH SCHEMABINDING
AS
SELECT 
    a.area_pk,
    a.codigo_st,
    a.nome_st,
    a.descricao_st,
    a.area_pai_pk,
    ap.codigo_st as area_pai_codigo,
    ap.nome_st as area_pai_nome,
    a.ordem_vl,
    a.ativo_bl,
    CASE 
        WHEN a.area_pai_pk IS NULL THEN 1
        ELSE 2
    END as nivel_hierarquia
FROM [serv_product_be180].[area_sistema_dm] a
LEFT JOIN [serv_product_be180].[area_sistema_dm] ap ON a.area_pai_pk = ap.area_pk;
GO

PRINT '✅ View area_sistema_hierarquia_vw criada';
GO

-- ============================================================================
-- 4. VIEW: perfil_permissoes_resumo_vw
-- Descrição: Resumo de quantas permissões cada perfil tem
-- ============================================================================

IF OBJECT_ID('[serv_product_be180].[perfil_permissoes_resumo_vw]', 'V') IS NOT NULL
    DROP VIEW [serv_product_be180].[perfil_permissoes_resumo_vw];
GO

CREATE VIEW [serv_product_be180].[perfil_permissoes_resumo_vw]
AS
SELECT 
    p.perfil_pk,
    p.nome_st as perfil_nome,
    p.descricao_st as perfil_descricao,
    COUNT(pp.perfilPermissao_pk) as total_permissoes,
    SUM(CASE WHEN pp.ler_bl = 1 THEN 1 ELSE 0 END) as total_leitura,
    SUM(CASE WHEN pp.escrever_bl = 1 THEN 1 ELSE 0 END) as total_escrita,
    (SELECT COUNT(*) FROM [serv_product_be180].[usuario_dm] WHERE perfil_pk = p.perfil_pk AND ativo_bl = 1) as total_usuarios
FROM [serv_product_be180].[perfil_dm] p
LEFT JOIN [serv_product_be180].[perfil_permissao_ft] pp ON p.perfil_pk = pp.perfil_pk
WHERE p.ativo_bl = 1
GROUP BY p.perfil_pk, p.nome_st, p.descricao_st;
GO

PRINT '✅ View perfil_permissoes_resumo_vw criada';
GO

-- ============================================================================
-- 5. EXEMPLOS DE CONSULTAS ÚTEIS
-- ============================================================================

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT 04 CONCLUÍDO COM SUCESSO!';
PRINT '   4 Views criadas';
PRINT '';
PRINT '📖 EXEMPLOS DE CONSULTAS ÚTEIS:';
PRINT '─────────────────────────────────────────────────────────';
PRINT '1. Ver todos os usuários com seus perfis:';
PRINT '   SELECT * FROM [serv_product_be180].[usuario_completo_vw]';
PRINT '';
PRINT '2. Ver permissões de um usuário específico:';
PRINT '   SELECT * FROM [serv_product_be180].[usuario_permissoes_vw] WHERE usuario_pk = 7';
PRINT '';
PRINT '3. Ver hierarquia de áreas do sistema:';
PRINT '   SELECT * FROM [serv_product_be180].[area_sistema_hierarquia_vw] ORDER BY nivel_hierarquia, ordem_vl';
PRINT '';
PRINT '4. Ver resumo de permissões por perfil:';
PRINT '   SELECT * FROM [serv_product_be180].[perfil_permissoes_resumo_vw]';
PRINT '═══════════════════════════════════════════════════════════';
GO
