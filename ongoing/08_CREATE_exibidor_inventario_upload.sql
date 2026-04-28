-- Estruturas de suporte ao upload do inventário de exibidor (MVP Fase 1)

IF OBJECT_ID(N'[serv_product_be180].[exibidor_inventario_upload_lote_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_inventario_upload_lote_dm] (
    [lote_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [arquivo_st] NVARCHAR(300) NOT NULL,
    [uploadedBy_st] NVARCHAR(255) NULL,
    [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_lote_status] DEFAULT ('EM_ANALISE'),
    [totalRegistros_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_total] DEFAULT (0),
    [processados_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_proc] DEFAULT (0),
    [pendentes_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_pend] DEFAULT (0),
    [rejeitados_vl] INT NOT NULL CONSTRAINT [DF_exib_lote_rej] DEFAULT (0),
    [observacao_st] NVARCHAR(2000) NULL,
    [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_lote_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh] DATETIME2(0) NULL
  );
END
GO

IF OBJECT_ID(N'[serv_product_be180].[exibidor_midia_depara_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_midia_depara_dm] (
    [depara_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [sourceAmbiente_st] NVARCHAR(150) NULL,
    [sourceFormato_st] NVARCHAR(150) NULL,
    [sourceTipo_st] NVARCHAR(150) NULL,
    [aliases_st] NVARCHAR(1000) NULL,
    [mappedAmbiente_st] NVARCHAR(150) NULL,
    [mappedFormato_st] NVARCHAR(150) NULL,
    [mappedTipo_st] NVARCHAR(150) NULL,
    [active_bl] BIT NOT NULL CONSTRAINT [DF_exib_depara_active] DEFAULT (1),
    [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_depara_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh] DATETIME2(0) NULL
  );
END
GO

IF OBJECT_ID(N'[serv_product_be180].[exibidor_inventario_item_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_inventario_item_dm] (
    [item_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [lote_fk] INT NOT NULL,
    [linhaArquivo_vl] INT NOT NULL,
    [codigo_ativo_st] NVARCHAR(100) NOT NULL,
    [latitude_vl] DECIMAL(12,8) NULL,
    [longitude_vl] DECIMAL(12,8) NULL,
    [ambiente_st] NVARCHAR(150) NULL,
    [formato_midia_st] NVARCHAR(150) NULL,
    [tipo_midia_st] NVARCHAR(150) NULL,
    [tipo_ambiente_indoor_st] NVARCHAR(150) NULL,
    [nome_fantasia_st] NVARCHAR(255) NULL,
    [valor_tabela_vl] DECIMAL(18,2) NULL,
    [periodo_tabela_st] NVARCHAR(100) NULL,
    [area_total_largura_vl] DECIMAL(18,4) NULL,
    [area_total_altura_vl] DECIMAL(18,4) NULL,
    [area_total_unidade_st] NVARCHAR(20) NULL,
    [area_visual_largura_vl] DECIMAL(18,4) NULL,
    [area_visual_altura_vl] DECIMAL(18,4) NULL,
    [area_visual_unidade_st] NVARCHAR(20) NULL,
    [substrato_st] NVARCHAR(255) NULL,
    [especificacoes_st] NVARCHAR(1000) NULL,
    [secundagem_st] NVARCHAR(100) NULL,
    [observacoes_st] NVARCHAR(2000) NULL,
    [mapped_ambiente_st] NVARCHAR(150) NULL,
    [mapped_formato_st] NVARCHAR(150) NULL,
    [mapped_tipo_st] NVARCHAR(150) NULL,
    [mapped_bl] BIT NOT NULL CONSTRAINT [DF_exib_item_mapped] DEFAULT (0),
    [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_item_status] DEFAULT ('EM_ANALISE'),
    [erroValidacao_st] NVARCHAR(500) NULL,
    [delete_bl] BIT NOT NULL CONSTRAINT [DF_exib_item_delete] DEFAULT (0),
    [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_item_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh] DATETIME2(0) NULL
  );

  CREATE NONCLUSTERED INDEX [IX_exib_item_lote]
    ON [serv_product_be180].[exibidor_inventario_item_dm]([lote_fk], [delete_bl], [status_st]);
END
GO

IF OBJECT_ID(N'[serv_product_be180].[exibidor_solicitacao_comentario_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_solicitacao_comentario_dm] (
    [comentario_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [lote_fk] INT NOT NULL,
    [autor_st] NVARCHAR(255) NOT NULL,
    [mensagem_st] NVARCHAR(2000) NOT NULL,
    [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_comentario_criacao] DEFAULT (SYSDATETIME())
  );
END
GO

IF OBJECT_ID(N'[serv_product_be180].[exibidor_places_enriquecimento_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_places_enriquecimento_dm] (
    [enriquecimento_pk] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [item_fk] INT NOT NULL,
    [status_st] NVARCHAR(40) NOT NULL CONSTRAINT [DF_exib_places_status] DEFAULT ('PENDENTE'),
    [place_id_st] NVARCHAR(255) NULL,
    [tipos_st] NVARCHAR(1000) NULL,
    [payload_st] NVARCHAR(MAX) NULL,
    [tentativas_vl] INT NOT NULL CONSTRAINT [DF_exib_places_tentativas] DEFAULT (0),
    [processarApos_dh] DATETIME2(0) NULL,
    [dataCriacao_dh] DATETIME2(0) NOT NULL CONSTRAINT [DF_exib_places_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh] DATETIME2(0) NULL
  );
END
GO
