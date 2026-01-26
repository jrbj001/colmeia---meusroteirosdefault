-- =============================================
-- STORED PROCEDURE: sp_planoMidiaGrupoDelete
-- =============================================
-- DESCRIÇÃO:
--   Realiza soft delete de um roteiro (plano de mídia grupo)
--   Marca o campo delete_bl = 1 na tabela planoMidiaGrupo_dm
--
-- PARÂMETROS:
--   @pk INT - PK do grupo a ser deletado
--
-- RETORNO:
--   Informações do registro após o update
--
-- EXEMPLO DE USO:
--   EXEC [serv_product_be180].[sp_planoMidiaGrupoDelete] @pk = 6842;
--
-- =============================================

CREATE PROCEDURE [serv_product_be180].[sp_planoMidiaGrupoDelete]
    @pk INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar se o PK foi fornecido
    IF @pk IS NULL OR @pk <= 0
    BEGIN
        RAISERROR('PK inválido', 16, 1);
        RETURN;
    END
    
    -- Validar se o registro existe
    IF NOT EXISTS (
        SELECT 1 
        FROM [serv_product_be180].[planoMidiaGrupo_dm] 
        WHERE pk = @pk
    )
    BEGIN
        RAISERROR('Roteiro não encontrado', 16, 1);
        RETURN;
    END
    
    -- Validar se já está deletado
    IF EXISTS (
        SELECT 1 
        FROM [serv_product_be180].[planoMidiaGrupo_dm] 
        WHERE pk = @pk AND delete_bl = 1
    )
    BEGIN
        RAISERROR('Roteiro já está deletado', 16, 1);
        RETURN;
    END
    
    -- Realizar soft delete (marcar como deletado)
    UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
    SET delete_bl = 1
    WHERE pk = @pk;
    
    -- Retornar informações do registro deletado
    SELECT 
        pk,
        planoMidiaGrupo_st,
        delete_bl,
        date_dh
    FROM [serv_product_be180].[planoMidiaGrupo_dm]
    WHERE pk = @pk;
    
END
GO

-- =============================================
-- TESTE:
-- =============================================
-- 1. Executar o delete:
--    EXEC [serv_product_be180].[sp_planoMidiaGrupoDelete] @pk = 6842;
--
-- 2. Verificar se delete_bl = 1:
--    SELECT * FROM [serv_product_be180].[planoMidiaGrupo_dm] WHERE pk = 6842;
--
-- RESULTADO ESPERADO: delete_bl = 1
-- =============================================
