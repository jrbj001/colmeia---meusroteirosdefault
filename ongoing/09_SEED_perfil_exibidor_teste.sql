-- ============================================================
-- SEED: Perfil "Exibidor" + usuário ze@pixelpulselab.dev
-- Executar no banco: serv_product_be180
-- ============================================================

-- 1) Criar perfil Exibidor se não existir
IF NOT EXISTS (
  SELECT 1 FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Exibidor'
)
BEGIN
  INSERT INTO [serv_product_be180].[perfil_dm]
    (nome_st, descricao_st, ativo_bl, dataCriacao_dh, dataAtualizacao_dh)
  VALUES
    ('Exibidor', 'Perfil exclusivo para exibidores de mídia OOH', 1, GETDATE(), GETDATE());
  PRINT '✅ Perfil Exibidor criado.';
END
ELSE
  PRINT '⚠️  Perfil Exibidor já existe.';
GO

-- 2) Capturar pk do perfil
DECLARE @perfilPk INT;
SELECT @perfilPk = perfil_pk FROM [serv_product_be180].[perfil_dm] WHERE nome_st = 'Exibidor';
PRINT 'perfil_pk Exibidor = ' + CAST(@perfilPk AS VARCHAR);

-- 3) Se o usuário já existe → apenas atualiza o perfil
IF EXISTS (
  SELECT 1 FROM [serv_product_be180].[usuario_dm]
  WHERE usuario_email = 'ze@pixelpulselab.dev'
)
BEGIN
  UPDATE [serv_product_be180].[usuario_dm]
  SET perfil_pk = @perfilPk,
      ativo_bl  = 1
  WHERE usuario_email = 'ze@pixelpulselab.dev';
  PRINT '✅ Usuário ze@pixelpulselab.dev atualizado para perfil Exibidor.';
END
ELSE
BEGIN
  -- 4) Se não existe → cria
  INSERT INTO [serv_product_be180].[usuario_dm]
    (usuario_nome, usuario_email, perfil_pk, empresa_pk, ativo_bl, date_dh, date_dt)
  VALUES
    ('Zé Exibidor Teste', 'ze@pixelpulselab.dev', @perfilPk, NULL, 1, GETDATE(), CAST(GETDATE() AS DATE));
  PRINT '✅ Usuário ze@pixelpulselab.dev criado com perfil Exibidor.';
END
GO

-- 5) Verificação
SELECT
  u.usuario_pk,
  u.usuario_nome,
  u.usuario_email,
  p.nome_st   AS perfil_nome,
  u.empresa_pk,
  u.ativo_bl
FROM [serv_product_be180].[usuario_dm] u
JOIN [serv_product_be180].[perfil_dm]  p ON p.perfil_pk = u.perfil_pk
WHERE u.usuario_email = 'ze@pixelpulselab.dev';
GO
