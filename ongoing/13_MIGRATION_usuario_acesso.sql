-- ============================================================================
-- Migração: rastreio de primeiro/último acesso de usuários
-- Data: 2026-05-26
-- ============================================================================
-- Adiciona colunas em usuario_dm e recria a view usuario_completo_vw
-- para expor primeiroAcesso_dh / ultimoAcesso_dh + dados do exibidor vinculado.
-- ============================================================================

USE [sql-be180-database-eastus];
GO

-- 1. Colunas em usuario_dm ---------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns c
  JOIN sys.tables t ON t.object_id = c.object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE t.name = 'usuario_dm' AND s.name = 'serv_product_be180'
    AND c.name = 'primeiroAcesso_dh'
)
BEGIN
  ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD primeiroAcesso_dh datetime2(0) NULL;
  PRINT '✅ Coluna primeiroAcesso_dh adicionada';
END
ELSE
  PRINT 'ℹ️ primeiroAcesso_dh já existe';
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns c
  JOIN sys.tables t ON t.object_id = c.object_id
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE t.name = 'usuario_dm' AND s.name = 'serv_product_be180'
    AND c.name = 'ultimoAcesso_dh'
)
BEGIN
  ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD ultimoAcesso_dh datetime2(0) NULL;
  PRINT '✅ Coluna ultimoAcesso_dh adicionada';
END
ELSE
  PRINT 'ℹ️ ultimoAcesso_dh já existe';
GO

-- 2. View usuario_completo_vw ------------------------------------------------
IF OBJECT_ID('[serv_product_be180].[usuario_completo_vw]', 'V') IS NOT NULL
  DROP VIEW [serv_product_be180].[usuario_completo_vw];
GO

CREATE VIEW [serv_product_be180].[usuario_completo_vw]
AS
SELECT
  u.pk                AS usuario_pk,
  u.pk2               AS usuario_pk2,
  u.nome_st           AS usuario_nome,
  u.email_st          AS usuario_email,
  u.telefone_st       AS usuario_telefone,
  u.empresa_pk,
  u.exibidor_fk,
  u.auth0_id_st,
  u.ativo_bl          AS usuario_ativo,
  u.date_dh           AS usuario_data_criacao,
  u.date_dt           AS usuario_data,
  u.primeiroAcesso_dh,
  u.ultimoAcesso_dh,
  p.perfil_pk,
  p.nome_st           AS perfil_nome,
  p.descricao_st      AS perfil_descricao,
  p.ativo_bl          AS perfil_ativo,
  e.nome_st           AS exibidor_nome,
  e.nome_fantasia_st  AS exibidor_nome_fantasia,
  e.dominio_st        AS exibidor_dominio
FROM [serv_product_be180].[usuario_dm] u
LEFT JOIN [serv_product_be180].[perfil_dm]  p ON p.perfil_pk = u.perfil_pk
LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk;
GO

PRINT '✅ View usuario_completo_vw recriada com primeiroAcesso_dh / ultimoAcesso_dh';
GO
