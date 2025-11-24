-- =============================================
-- FIX PARA: sp_planoMidiaDescInsert
-- =============================================
-- PROBLEMA:
--   A SP atual SOBRESCREVE o valor de planoMidiaDescPk_st cada vez que é chamada,
--   causando perda de dados quando múltiplas cidades são processadas.
--
-- EXEMPLO DO PROBLEMA:
--   Chamada 1: cria PK 7406 → planoMidiaDescPk_st = "7406" ✅
--   Chamada 2: cria PK 7407 → planoMidiaDescPk_st = "7407" ❌ (perdeu o 7406!)
--
-- SOLUÇÃO:
--   Alterar a SP para CONCATENAR os novos PKs com os existentes em vez de sobrescrever.
--
-- =============================================

ALTER PROCEDURE [serv_product_be180].[sp_planoMidiaDescInsert]
    @planoMidiaGrupo_pk INT,
    @recordsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Create a table to store the newly created PKs
    DECLARE @InsertedPKs TABLE (new_pk INT);
    
    -- Parse JSON and insert records
    INSERT INTO [serv_product_be180].[planoMidiaDesc_dm]
    (
        pk2,
        planoMidiaDesc_st,
        active_bl,
        delete_bl,
        usuarioId_st,
        usuarioName_st,
        gender_st,
        class_st,
        age_st,
        ibgeCode_vl
    )
    OUTPUT INSERTED.pk INTO @InsertedPKs(new_pk)
    SELECT 
        0 as pk2,                                    -- Default value
        JSON_VALUE(value, '$.planoMidiaDesc_st'),   -- Required field
        1 as active_bl,                             -- Default to active
        0 as delete_bl,                             -- Default to not deleted
        JSON_VALUE(value, '$.usuarioId_st'),       -- Required field
        JSON_VALUE(value, '$.usuarioName_st'),     -- Required field
        JSON_VALUE(value, '$.gender_st'),          -- Required field
        JSON_VALUE(value, '$.class_st'),           -- Required field
        JSON_VALUE(value, '$.age_st'),             -- Required field
        CAST(JSON_VALUE(value, '$.ibgeCode_vl') AS BIGINT) -- Required field (converted to number)
    FROM OPENJSON(@recordsJson);
    
    -- =============================================
    -- FIX: CONCATENAR em vez de SOBRESCREVER
    -- =============================================
    -- ANTES:
    -- UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
    -- SET planoMidiaDescPk_st = (
    --     SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',')
    --     FROM @InsertedPKs
    -- )
    -- WHERE pk = @planoMidiaGrupo_pk;
    --
    -- DEPOIS:
    UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
    SET planoMidiaDescPk_st = 
        CASE 
            -- Se não existe valor ou está vazio, usa apenas os novos PKs
            WHEN planoMidiaDescPk_st IS NULL OR planoMidiaDescPk_st = '' 
            THEN (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
            
            -- Se já existe valor, concatena com vírgula
            ELSE planoMidiaDescPk_st + ',' + (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
        END
    WHERE pk = @planoMidiaGrupo_pk;
    -- =============================================
    
    -- Return all the newly created PKs
    SELECT new_pk FROM @InsertedPKs ORDER BY new_pk;
END
GO

-- =============================================
-- TESTE:
-- =============================================
-- 1. Criar um grupo de teste
-- 2. Chamar a SP 2 vezes com cidades diferentes
-- 3. Verificar se planoMidiaDescPk_st contém AMBOS os PKs separados por vírgula
--
-- RESULTADO ESPERADO: planoMidiaDescPk_st = "7406,7407"
-- =============================================

