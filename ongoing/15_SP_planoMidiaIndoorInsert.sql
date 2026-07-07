-- ============================================================
-- Indoor — Fase II: REGISTRO da seleção (integração Aba 5)  [forward]
-- schema: serv_product_be180 | deploy MANUAL (SSMS)
-- ------------------------------------------------------------
-- sp_planoMidiaIndoorInsert — encapsula em T-SQL o que o protótipo faz em Python
--   (app/api/server.py::post_simular): grava as linhas de ambiente + localidades/semana
--   de um roteiro. Espelha o CONTRATO de sp_planoMidiaOohInsert (mesma forma de chamada
--   + recordset de retorno), para o handler do app real ser quase-cópia do OOH.
--
-- SÓ REGISTRA — não calcula. O cálculo é sp_indoorResultadoInsert (fase posterior, Aba 6).
-- Depende das tabelas já renomeadas pela 05 (planoMidiaIndoor_ft / planoMidiaIndoorSemana_ft).
-- Deploy: rodar APÓS 05. CREATE OR ALTER (idempotente).
-- ============================================================

CREATE OR ALTER PROCEDURE [serv_product_be180].[sp_planoMidiaIndoorInsert]
    @recordsJson        NVARCHAR(MAX),       -- array de linhas (1 por ambiente) — shape no doc integration/02
    @planoMidiaGrupo_pk INT,                 -- o roteiro
    @report_pk          INT = NULL,          -- D1: default = @planoMidiaGrupo_pk (1 report por roteiro)
    @semanas            INT = 12,            -- nº de semanas ativas (W1..N); semanas > N viram 0
    @praca_st           NVARCHAR(255) = NULL -- praça sendo (re)salva; NULL = limpa TODAS (legado)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @report_pk IS NULL SET @report_pk = @planoMidiaGrupo_pk;                 -- D1
    SET @semanas = CASE WHEN @semanas BETWEEN 1 AND 12 THEN @semanas ELSE 12 END;
    -- Se não informado, extrai a praça do primeiro registro do JSON
    IF @praca_st IS NULL
        SET @praca_st = (SELECT TOP 1 JSON_VALUE([value], '$.praca_st') FROM OPENJSON(@recordsJson));

    DECLARE @linhas TABLE (pk INT, ord INT, localidades NVARCHAR(MAX), faces NVARCHAR(MAX));

    BEGIN TRAN;

    -- (D6 idempotência) substitui APENAS os registros da praça atual neste roteiro/report
    DELETE w
      FROM [serv_product_be180].[planoMidiaIndoorSemana_ft] w
      JOIN [serv_product_be180].[planoMidiaIndoor_ft] l ON l.[pk] = w.[linha_pk]
     WHERE l.[planoMidiaGrupo_pk] = @planoMidiaGrupo_pk
       AND l.[report_pk] = @report_pk
       AND l.[praca_st] = @praca_st;

    DELETE FROM [serv_product_be180].[planoMidiaIndoor_ft]
     WHERE [planoMidiaGrupo_pk] = @planoMidiaGrupo_pk
       AND [report_pk] = @report_pk
       AND [praca_st] = @praca_st;

    -- 1) linhas de ambiente. MERGE (ON 1=0 -> sempre INSERT) para o OUTPUT capturar
    --    inserted.pk JUNTO com a ordem/localidades/faces da origem (mapeamento ord<->pk set-based).
    MERGE INTO [serv_product_be180].[planoMidiaIndoor_ft] AS tgt
    USING (
        SELECT
            j.[key] AS ord,
            x.[praca_st], x.[ambiente_st], x.[indoorEspecifico_st], x.[tamanhoFormato_st],
            x.[circulacao_st], x.[tipo_st], x.[passantesManual_vl], x.[insercoesPorSlot_vl],
            x.[slots_vl], x.[localidades], x.[faces]
        FROM OPENJSON(@recordsJson) j
        CROSS APPLY OPENJSON(j.[value]) WITH (
            praca_st            NVARCHAR(255) '$.praca_st',
            ambiente_st         NVARCHAR(255) '$.ambiente_st',
            indoorEspecifico_st NVARCHAR(255) '$.indoorEspecifico_st',
            tamanhoFormato_st   NVARCHAR(50)  '$.tamanhoFormato_st',
            circulacao_st       NVARCHAR(50)  '$.circulacao_st',
            tipo_st             NVARCHAR(20)  '$.tipo_st',
            passantesManual_vl  FLOAT         '$.passantesManual_vl',
            insercoesPorSlot_vl INT           '$.insercoesPorSlot_vl',
            slots_vl            INT           '$.slots_vl',
            localidades         NVARCHAR(MAX) '$.localidades' AS JSON,
            faces               NVARCHAR(MAX) '$.faces'       AS JSON
        ) x
    ) AS src
    ON (1 = 0)
    WHEN NOT MATCHED THEN
        INSERT ([planoMidiaGrupo_pk], [report_pk], [praca_st], [ambiente_st], [indoorEspecifico_st],
                [tamanhoFormato_st], [circulacao_st], [tipo_st], [passantesManual_vl],
                [insercoesPorSlot_vl], [slots_vl])
        VALUES (@planoMidiaGrupo_pk, @report_pk, src.[praca_st], src.[ambiente_st],
                NULLIF(src.[indoorEspecifico_st], N''), src.[tamanhoFormato_st], src.[circulacao_st],
                ISNULL(NULLIF(src.[tipo_st], N''), N'Estático'), src.[passantesManual_vl],
                src.[insercoesPorSlot_vl], src.[slots_vl])
    OUTPUT inserted.[pk], src.ord, src.[localidades], src.[faces]
      INTO @linhas([pk], [ord], [localidades], [faces]);

    -- 2) localidades + faces por semana (W1..12) por linha; semanas > @semanas viram 0/1
    INSERT INTO [serv_product_be180].[planoMidiaIndoorSemana_ft]
           ([linha_pk], [semana_vl], [localidades_vl], [faces_vl])
    SELECT L.[pk], n.semana,
           CASE WHEN n.semana <= @semanas
                THEN ISNULL(TRY_CONVERT(INT, JSON_VALUE(L.[localidades], CONCAT('$[', n.semana - 1, ']'))), 0)
                ELSE 0 END,
           CASE WHEN n.semana <= @semanas
                THEN ISNULL(TRY_CONVERT(INT, JSON_VALUE(L.[faces], CONCAT('$[', n.semana - 1, ']'))), 1)
                ELSE 1 END
    FROM @linhas L
    CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) n(semana);

    DECLARE @n INT = (SELECT COUNT(*) FROM @linhas);

    COMMIT;

    -- contrato de retorno (espelha sp_planoMidiaOohInsert)
    SELECT
        status_st          = 'SUCCESS',
        insertedCount_vl   = @n,
        planoMidiaGrupo_pk = @planoMidiaGrupo_pk,
        report_pk          = @report_pk,
        date_dh            = SWITCHOFFSET(CONVERT(datetimeoffset, GETDATE()), '-03:00');
END
GO
