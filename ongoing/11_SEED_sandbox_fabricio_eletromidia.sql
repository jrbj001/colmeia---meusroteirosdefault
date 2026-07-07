-- ============================================================
-- SEED: Usuário sandbox Fabrício → exibidor Eletromídia
-- Executar no banco: serv_product_be180
-- Motivo: e-mail gmail.com não pode usar auto-provisionamento
--         por domínio (afetaria todos os Gmail).
--         Inserção manual com perfil Exibidor + exibidor_fk.
-- ============================================================

-- ── 0. Preview: confirme os PKs antes de prosseguir ─────────
SELECT 'exibidor_dm' AS tabela, exibidor_pk, nome_st, nome_fantasia_st, active_bl, delete_bl
FROM [serv_product_be180].[exibidor_dm]
WHERE delete_bl = 0
ORDER BY nome_st;

SELECT 'perfil_dm' AS tabela, perfil_pk, nome_st
FROM [serv_product_be180].[perfil_dm]
WHERE LOWER(nome_st) LIKE '%exibidor%';
GO

-- ── 1. Variáveis de controle ─────────────────────────────────
DECLARE @email       NVARCHAR(255) = 'fabricio.b.guimares@gmail.com';
DECLARE @nome        NVARCHAR(255) = 'Fabrício Guimarães (Sandbox Eletromídia)';

-- Perfil Exibidor (resolvido automaticamente)
DECLARE @perfilPk    INT;
SELECT TOP 1 @perfilPk = perfil_pk
FROM [serv_product_be180].[perfil_dm]
WHERE LOWER(nome_st) LIKE '%exibidor%'
ORDER BY perfil_pk;

IF @perfilPk IS NULL
BEGIN
  RAISERROR('Perfil Exibidor não encontrado. Execute ongoing/09_SEED_perfil_exibidor_teste.sql primeiro.', 16, 1);
  RETURN;
END
PRINT 'perfil_pk Exibidor = ' + CAST(@perfilPk AS VARCHAR);

-- Eletromídia (resolvido automaticamente pelo nome)
DECLARE @exibidorPk  INT;
SELECT TOP 1 @exibidorPk = exibidor_pk
FROM [serv_product_be180].[exibidor_dm]
WHERE delete_bl = 0
  AND active_bl = 1
  AND (
        LOWER(nome_st)          LIKE '%eletromidia%'
     OR LOWER(nome_st)          LIKE '%eletromídia%'
     OR LOWER(nome_fantasia_st) LIKE '%eletromidia%'
     OR LOWER(nome_fantasia_st) LIKE '%eletromídia%'
  )
ORDER BY exibidor_pk;

IF @exibidorPk IS NULL
BEGIN
  RAISERROR('Exibidor Eletromídia não encontrado em exibidor_dm. Verifique o nome cadastrado.', 16, 1);
  RETURN;
END
PRINT 'exibidor_pk Eletromídia = ' + CAST(@exibidorPk AS VARCHAR);

-- ── 2. Insert ou Update ──────────────────────────────────────
IF EXISTS (
  SELECT 1 FROM [serv_product_be180].[usuario_dm]
  WHERE LOWER(email_st) = LOWER(@email)
)
BEGIN
  UPDATE [serv_product_be180].[usuario_dm]
  SET perfil_pk    = @perfilPk,
      exibidor_fk  = @exibidorPk,
      ativo_bl     = 1
  WHERE LOWER(email_st) = LOWER(@email);
  PRINT '✅ Usuário ' + @email + ' atualizado → perfil Exibidor, exibidor_fk=' + CAST(@exibidorPk AS VARCHAR);
END
ELSE
BEGIN
  INSERT INTO [serv_product_be180].[usuario_dm]
    (nome_st, email_st, perfil_pk, exibidor_fk, empresa_pk, ativo_bl, date_dh, date_dt)
  VALUES
    (@nome, @email, @perfilPk, @exibidorPk, NULL, 1, GETDATE(), CAST(GETDATE() AS DATE));
  PRINT '✅ Usuário ' + @email + ' criado → perfil Exibidor, exibidor_fk=' + CAST(@exibidorPk AS VARCHAR);
END
GO

-- ── 3. Verificação final ─────────────────────────────────────
SELECT
  u.pk            AS usuario_pk,
  u.nome_st       AS nome,
  u.email_st      AS email,
  p.nome_st       AS perfil,
  u.exibidor_fk,
  e.nome_st       AS exibidor_nome,
  e.nome_fantasia_st AS exibidor_fantasia,
  u.empresa_pk,
  u.ativo_bl
FROM [serv_product_be180].[usuario_dm]  u
JOIN [serv_product_be180].[perfil_dm]   p ON p.perfil_pk   = u.perfil_pk
LEFT JOIN [serv_product_be180].[exibidor_dm] e ON e.exibidor_pk = u.exibidor_fk
WHERE LOWER(u.email_st) = 'fabricio.b.guimares@gmail.com';
GO
