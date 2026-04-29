-- ============================================================
-- MIGRATION: domínio em exibidor_dm + vínculo exibidor em usuario_dm
-- Executar no banco: serv_product_be180
-- ============================================================

-- 1) Adicionar dominio_st em exibidor_dm (ex: "pixelpulselab.dev")
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[serv_product_be180].[exibidor_dm]')
    AND name = 'dominio_st'
)
BEGIN
  ALTER TABLE [serv_product_be180].[exibidor_dm]
    ADD [dominio_st] NVARCHAR(150) NULL;
  PRINT '✅ Coluna dominio_st adicionada em exibidor_dm';
END
ELSE
  PRINT '⚠️  dominio_st já existe em exibidor_dm';
GO

-- Índice único por domínio ativo (um domínio → um exibidor)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[serv_product_be180].[exibidor_dm]')
    AND name = 'UX_exibidor_dm_dominio'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [UX_exibidor_dm_dominio]
    ON [serv_product_be180].[exibidor_dm] ([dominio_st])
    WHERE [delete_bl] = 0 AND [dominio_st] IS NOT NULL;
  PRINT '✅ Índice único UX_exibidor_dm_dominio criado';
END
GO

-- 2) Adicionar exibidor_fk em usuario_dm
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[serv_product_be180].[usuario_dm]')
    AND name = 'exibidor_fk'
)
BEGIN
  ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD [exibidor_fk] INT NULL;
  PRINT '✅ Coluna exibidor_fk adicionada em usuario_dm';
END
ELSE
  PRINT '⚠️  exibidor_fk já existe em usuario_dm';
GO

-- FK para integridade referencial (sem CASCADE para não deletar usuários)
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_usuario_dm_exibidor'
)
AND OBJECT_ID(N'[serv_product_be180].[exibidor_dm]', N'U') IS NOT NULL
BEGIN
  ALTER TABLE [serv_product_be180].[usuario_dm]
    ADD CONSTRAINT [FK_usuario_dm_exibidor]
    FOREIGN KEY ([exibidor_fk])
    REFERENCES [serv_product_be180].[exibidor_dm] ([exibidor_pk]);
  PRINT '✅ FK FK_usuario_dm_exibidor criada';
END
GO

-- 3) Atualizar view usuario_completo_vw para incluir exibidor_fk e dominio_st
-- (recria a view para não precisar do DDL original)
IF OBJECT_ID(N'[serv_product_be180].[usuario_completo_vw]', N'V') IS NOT NULL
BEGIN
  EXEC sp_executesql N'
    ALTER VIEW [serv_product_be180].[usuario_completo_vw] AS
    SELECT
      u.usuario_pk,
      u.usuario_nome,
      u.usuario_email,
      u.usuario_telefone,
      u.ativo_bl         AS usuario_ativo,
      u.perfil_pk,
      p.nome_st          AS perfil_nome,
      p.descricao_st     AS perfil_descricao,
      u.empresa_pk,
      u.exibidor_fk,
      e.nome_st          AS exibidor_nome,
      e.nome_fantasia_st AS exibidor_nome_fantasia,
      e.dominio_st       AS exibidor_dominio,
      u.auth0_id_st,
      u.date_dh,
      u.date_dt
    FROM [serv_product_be180].[usuario_dm] u
    JOIN [serv_product_be180].[perfil_dm]  p ON p.perfil_pk = u.perfil_pk
    LEFT JOIN [serv_product_be180].[exibidor_dm] e
           ON e.exibidor_pk = u.exibidor_fk
           AND e.delete_bl  = 0
  ';
  PRINT '✅ View usuario_completo_vw atualizada com exibidor_fk';
END
ELSE
  PRINT '⚠️  View usuario_completo_vw não encontrada — crie-a manualmente se necessário';
GO

-- 4) Seed de teste: vincular domínio "pixelpulselab.dev" ao exibidor de teste
-- (ajuste o exibidor_pk conforme seu banco; o bloco abaixo busca por nome)
DECLARE @exibidorPk INT;
SELECT TOP 1 @exibidorPk = exibidor_pk
FROM [serv_product_be180].[exibidor_dm]
WHERE delete_bl = 0
ORDER BY exibidor_pk;

IF @exibidorPk IS NOT NULL
BEGIN
  UPDATE [serv_product_be180].[exibidor_dm]
  SET dominio_st = 'pixelpulselab.dev'
  WHERE exibidor_pk = @exibidorPk
    AND (dominio_st IS NULL OR dominio_st = '');
  PRINT '✅ domínio pixelpulselab.dev vinculado ao exibidor_pk ' + CAST(@exibidorPk AS VARCHAR);
END
ELSE
  PRINT '⚠️  Nenhum exibidor cadastrado — cadastre um primeiro e vincule o domínio manualmente';
GO

-- 5) Verificação final
SELECT
  e.exibidor_pk,
  e.nome_st,
  e.dominio_st,
  COUNT(u.usuario_pk) AS total_usuarios
FROM [serv_product_be180].[exibidor_dm] e
LEFT JOIN [serv_product_be180].[usuario_dm] u ON u.exibidor_fk = e.exibidor_pk AND u.ativo_bl = 1
WHERE e.delete_bl = 0
GROUP BY e.exibidor_pk, e.nome_st, e.dominio_st
ORDER BY e.exibidor_pk;
GO
