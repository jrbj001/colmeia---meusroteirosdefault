-- View atualizada para incluir liberadoAgencia_bl (flag de liberação para agências externas)
-- Executada automaticamente durante a implementação da feature "acesso-agencias"
ALTER VIEW [serv_product_be180].[planoMidiaGrupo_dm_vw] AS
WITH
    queryTable AS (
        SELECT pk, pk2, planoMidiaDescPk_st, planoMidiaGrupo_st,
               agencia_pk, marca_pk, categoria_pk, valorCampanha_vl,
               inProgress_bl, active_bl, delete_bl, liberadoAgencia_bl,
               date_dh, date_dt
        FROM [serv_product_be180].[planoMidiaGrupo_dm]
    ),
    queryReplacePk2 AS (
        SELECT pk,
               CASE WHEN pk2 <> 0 THEN pk2 ELSE pk END AS new_pk,
               planoMidiaDescPk_st, planoMidiaGrupo_st,
               agencia_pk, marca_pk, categoria_pk, valorCampanha_vl,
               inProgress_bl, active_bl, delete_bl, liberadoAgencia_bl,
               date_dh, date_dt
        FROM queryTable
    ),
    queryMax AS (
        SELECT new_pk AS pk2, MAX(pk) AS max_pk
        FROM queryReplacePk2 GROUP BY new_pk
    ),
    queryLast AS (
        SELECT a.new_pk AS pk, a.planoMidiaDescPk_st, a.planoMidiaGrupo_st,
               a.agencia_pk, a.marca_pk, a.categoria_pk, a.valorCampanha_vl,
               a.inProgress_bl, a.active_bl, a.delete_bl, a.liberadoAgencia_bl,
               a.date_dh, a.date_dt
        FROM queryReplacePk2 a
        INNER JOIN queryMax b ON a.pk = b.max_pk
    ),
    pivotData AS (
        SELECT g.planoMidiaGrupo_pk, g.planoMidiaDesc_pk,
               g.planoMidiaGrupo_st, g.planoMidiaDesc_st,
               g.usuarioId_st, g.usuarioName_st,
               g.gender_st, g.class_st, g.age_st,
               g.ibgeCode_vl, g.planoMidiaType_st,
               g.cidadeUpper_st, g.semanas_vl,
               l.agencia_pk, l.marca_pk, l.categoria_pk,
               l.valorCampanha_vl, l.liberadoAgencia_bl,
               g.inProgress_bl, g.inProgress_st,
               g.active_bl, g.active_st,
               g.delete_bl, g.date_dh
        FROM [serv_product_be180].[planoMidiaGrupoPivot_dm_vw] g
        INNER JOIN queryLast l ON g.planoMidiaGrupo_pk = l.pk
    ),
    base AS (
        SELECT DISTINCT planoMidiaGrupo_pk, cidadeUpper_st FROM pivotData
    ),
    cidades_agg AS (
        SELECT planoMidiaGrupo_pk,
               STRING_AGG(cidadeUpper_st, ' | ') AS cidadeUpper_st_concat
        FROM base GROUP BY planoMidiaGrupo_pk
    )
SELECT
    g.planoMidiaGrupo_pk,
    MIN(g.planoMidiaGrupo_st) AS planoMidiaGrupo_st,
    STRING_AGG(g.planoMidiaDesc_st, ' | ') AS planoMidiaDesc_st_concat,
    MIN(g.usuarioId_st) AS usuarioId_st,
    MIN(g.usuarioName_st) AS usuarioName_st,
    MIN(g.gender_st) AS gender_st,
    MIN(g.class_st) AS class_st,
    MIN(g.age_st) AS age_st,
    MIN(g.ibgeCode_vl) AS ibgeCode_vl,
    MIN(g.planoMidiaType_st) AS planoMidiaType_st,
    c.cidadeUpper_st_concat,
    MAX(g.semanas_vl) AS semanasMax_vl,
    MIN(g.agencia_pk) AS agencia_pk,
    MIN(ag.agencia_st) AS agencia_st,
    MIN(g.marca_pk) AS marca_pk,
    MIN(ma.marca_st) AS marca_st,
    MIN(g.categoria_pk) AS categoria_pk,
    MIN(cat.categoria_st) AS categoria_st,
    MIN(g.valorCampanha_vl) AS valorCampanha_vl,
    MAX(g.date_dh) AS date_dh,
    MIN(g.inProgress_bl) AS inProgress_bl,
    MIN(g.inProgress_st) AS inProgress_st,
    MIN(g.active_bl) AS active_bl,
    MIN(g.active_st) AS active_st,
    MIN(g.delete_bl) AS delete_bl,
    MIN(CAST(g.liberadoAgencia_bl AS INT)) AS liberadoAgencia_bl
FROM pivotData g
LEFT JOIN cidades_agg c ON g.planoMidiaGrupo_pk = c.planoMidiaGrupo_pk
LEFT JOIN [serv_product_be180].[agencia_dm_vw] ag ON g.agencia_pk = ag.pk
LEFT JOIN [serv_product_be180].[marca_dm_vw] ma ON g.marca_pk = ma.pk
LEFT JOIN [serv_product_be180].[categoria_dm_vw] cat ON g.categoria_pk = cat.pk
GROUP BY g.planoMidiaGrupo_pk, c.cidadeUpper_st_concat;
