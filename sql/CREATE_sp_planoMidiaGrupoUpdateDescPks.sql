-- =============================================
-- STORED PROCEDURE: sp_planoMidiaGrupoUpdateDescPks
-- =============================================
-- DESCRIÇÃO:
--   Atualiza a coluna planoMidiaDescPk_st da tabela planoMidiaGrupo_dm
--   com uma lista de PKs separados por vírgula.
--
-- MOTIVO:
--   Workaround para o bug na sp_planoMidiaDescInsert que sobrescreve
--   o valor de planoMidiaDescPk_st em vez de concatenar quando múltiplas
--   cidades são processadas no roteiro simulado.
--
-- SOLUÇÃO PERMANENTE:
--   Corrigir a sp_planoMidiaDescInsert para concatenar em vez de sobrescrever:
--   
--   UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
--   SET planoMidiaDescPk_st = 
--       CASE 
--           WHEN planoMidiaDescPk_st IS NULL OR planoMidiaDescPk_st = '' 
--           THEN (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
--           ELSE planoMidiaDescPk_st + ',' + (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
--       END
--   WHERE pk = @planoMidiaGrupo_pk;
--
-- =============================================

CREATE PROCEDURE [serv_product_be180].[sp_planoMidiaGrupoUpdateDescPks]
    @planoMidiaGrupo_pk INT,
    @planoMidiaDescPk_st VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Valida parâmetros
    IF @planoMidiaGrupo_pk IS NULL OR @planoMidiaGrupo_pk <= 0
    BEGIN
        RAISERROR('planoMidiaGrupo_pk inválido', 16, 1);
        RETURN;
    END
    
    IF @planoMidiaDescPk_st IS NULL OR @planoMidiaDescPk_st = ''
    BEGIN
        RAISERROR('planoMidiaDescPk_st não pode ser vazio', 16, 1);
        RETURN;
    END
    
    -- Atualiza o grupo com a lista de PKs
    UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
    SET planoMidiaDescPk_st = @planoMidiaDescPk_st
    WHERE pk = @planoMidiaGrupo_pk;
    
    -- Retorna o registro atualizado para confirmação
    SELECT 
        pk,
        planoMidiaDescPk_st,
        planoMidiaGrupo_st,
        date_dh
    FROM [serv_product_be180].[planoMidiaGrupo_dm]
    WHERE pk = @planoMidiaGrupo_pk;
END
GO

-- Exemplo de uso:
-- EXEC [serv_product_be180].[sp_planoMidiaGrupoUpdateDescPks] 
--     @planoMidiaGrupo_pk = 6342, 
--     @planoMidiaDescPk_st = '7408,7409'

