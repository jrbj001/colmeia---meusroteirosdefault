-- Cadastro de exibidor (Colmeia) — executar no banco BE180 (serv_product_be180)
-- Fonte canônica para novos exibidores; inventário em bancoAtivosJoin_ft continua independente até vínculo futuro.

IF OBJECT_ID(N'[serv_product_be180].[exibidor_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_dm] (
    [exibidor_pk]         INT IDENTITY(1,1) NOT NULL,
    [nome_st]             NVARCHAR(255) NOT NULL,
    [nome_fantasia_st]    NVARCHAR(255) NULL,
    [codigo_st]           NVARCHAR(100) NULL,
    [cnpj_st]             NVARCHAR(18) NULL,
    [site_st]             NVARCHAR(500) NULL,
    [email_st]            NVARCHAR(255) NULL,
    [telefone_st]         NVARCHAR(50) NULL,
    [cep_st]              NVARCHAR(20) NULL,
    [logradouro_st]       NVARCHAR(500) NULL,
    [numero_st]           NVARCHAR(50) NULL,
    [complemento_st]      NVARCHAR(200) NULL,
    [bairro_st]           NVARCHAR(200) NULL,
    [cidade_st]           NVARCHAR(200) NULL,
    [estado_st]           NVARCHAR(2) NULL,
    [observacao_st]       NVARCHAR(2000) NULL,
    [active_bl]           BIT NOT NULL CONSTRAINT [DF_exibidor_dm_active] DEFAULT (1),
    [delete_bl]           BIT NOT NULL CONSTRAINT [DF_exibidor_dm_delete] DEFAULT (0),
    [dataCriacao_dh]      DATETIME2(0) NOT NULL CONSTRAINT [DF_exibidor_dm_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh]  DATETIME2(0) NULL,
    CONSTRAINT [PK_exibidor_dm] PRIMARY KEY CLUSTERED ([exibidor_pk])
  );

  CREATE NONCLUSTERED INDEX [IX_exibidor_dm_nome]
    ON [serv_product_be180].[exibidor_dm] ([nome_st])
    WHERE [delete_bl] = 0;

  CREATE NONCLUSTERED INDEX [IX_exibidor_dm_codigo]
    ON [serv_product_be180].[exibidor_dm] ([codigo_st])
    WHERE [delete_bl] = 0 AND [codigo_st] IS NOT NULL;
END
GO
