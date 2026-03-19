-- ============================================================================
-- Script 01: Criar Tabelas do Sistema de Usuários e Permissões
-- Descrição: Cria as tabelas necessárias para controle de acesso
-- Data: 2026-02-12
-- ============================================================================

USE [sql-be180-database-eastus];
GO

-- ============================================================================
-- 1. TABELA DE PERFIS
-- ============================================================================
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
    
    PRINT '✅ Tabela perfil_dm criada com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Tabela perfil_dm já existe';
END
GO

-- ============================================================================
-- 2. TABELA DE ÁREAS DO SISTEMA
-- ============================================================================
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
    
    PRINT '✅ Tabela area_sistema_dm criada com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Tabela area_sistema_dm já existe';
END
GO

-- ============================================================================
-- 3. TABELA DE PERMISSÕES POR PERFIL
-- ============================================================================
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
    
    PRINT '✅ Tabela perfil_permissao_ft criada com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Tabela perfil_permissao_ft já existe';
END
GO

-- ============================================================================
-- 4. ATUALIZAR TABELA DE USUÁRIOS - Adicionar coluna perfil_pk
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'perfil_pk')
BEGIN
    ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD perfil_pk INT NULL;
    
    PRINT '✅ Coluna perfil_pk adicionada à tabela usuario_dm';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna perfil_pk já existe na tabela usuario_dm';
END
GO

-- ============================================================================
-- 5. ATUALIZAR TABELA DE USUÁRIOS - Adicionar coluna auth0_id_st
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]') AND name = 'auth0_id_st')
BEGIN
    ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD auth0_id_st NVARCHAR(255) NULL UNIQUE;
    
    PRINT '✅ Coluna auth0_id_st adicionada à tabela usuario_dm';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna auth0_id_st já existe na tabela usuario_dm';
END
GO

-- ============================================================================
-- 6. CRIAR FOREIGN KEY de usuario_dm para perfil_dm
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_usuario_perfil')
BEGIN
    ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD CONSTRAINT FK_usuario_perfil 
    FOREIGN KEY (perfil_pk) REFERENCES [serv_product_be180].[perfil_dm](perfil_pk);
    
    PRINT '✅ Foreign key FK_usuario_perfil criada com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Foreign key FK_usuario_perfil já existe';
END
GO

-- ============================================================================
-- 7. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para buscar usuários por email
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuario_email' AND object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_usuario_email 
    ON [serv_product_be180].[usuario_dm](email_st);
    
    PRINT '✅ Índice IX_usuario_email criado';
END
GO

-- Índice para buscar usuários por auth0_id
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_usuario_auth0' AND object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_usuario_auth0 
    ON [serv_product_be180].[usuario_dm](auth0_id_st);
    
    PRINT '✅ Índice IX_usuario_auth0 criado';
END
GO

-- Índice para buscar áreas por código
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_area_codigo' AND object_id = OBJECT_ID(N'[serv_product_be180].[area_sistema_dm]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_area_codigo 
    ON [serv_product_be180].[area_sistema_dm](codigo_st);
    
    PRINT '✅ Índice IX_area_codigo criado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT 01 CONCLUÍDO COM SUCESSO!';
PRINT '═══════════════════════════════════════════════════════════';
GO
