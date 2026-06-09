/**
 * Deploy: cria/atualiza sp_planoMidiaIndoorInsert no banco
 * Uso: node scripts/deploy-sp-indoor-insert.js
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT || 1433),
  options:  { encrypt: true, trustServerCertificate: true, connectTimeout: 60000, requestTimeout: 120000 },
};

const SP_DDL = `
CREATE OR ALTER PROCEDURE [serv_product_be180].[sp_planoMidiaIndoorInsert]
    @recordsJson        NVARCHAR(MAX),
    @planoMidiaGrupo_pk INT,
    @report_pk          INT = NULL,
    @semanas            INT = 12
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @report_pk IS NULL SET @report_pk = @planoMidiaGrupo_pk;
    SET @semanas = CASE WHEN @semanas BETWEEN 1 AND 12 THEN @semanas ELSE 12 END;

    DECLARE @linhas TABLE (pk INT, ord INT, localidades NVARCHAR(MAX));

    BEGIN TRAN;

    DELETE w
      FROM [serv_product_be180].[planoMidiaIndoorSemana_ft] w
      JOIN [serv_product_be180].[planoMidiaIndoor_ft] l ON l.[pk] = w.[linha_pk]
     WHERE l.[planoMidiaGrupo_pk] = @planoMidiaGrupo_pk AND l.[report_pk] = @report_pk;

    DELETE FROM [serv_product_be180].[planoMidiaIndoor_ft]
     WHERE [planoMidiaGrupo_pk] = @planoMidiaGrupo_pk AND [report_pk] = @report_pk;

    MERGE INTO [serv_product_be180].[planoMidiaIndoor_ft] AS tgt
    USING (
        SELECT
            j.[key] AS ord,
            x.[praca_st], x.[ambiente_st], x.[indoorEspecifico_st], x.[tamanhoFormato_st],
            x.[circulacao_st], x.[tipo_st], x.[passantesManual_vl], x.[insercoesPorSlot_vl],
            x.[slots_vl], x.[localidades]
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
            localidades         NVARCHAR(MAX) '$.localidades' AS JSON
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
    OUTPUT inserted.[pk], src.ord, src.[localidades] INTO @linhas([pk], [ord], [localidades]);

    INSERT INTO [serv_product_be180].[planoMidiaIndoorSemana_ft] ([linha_pk], [semana_vl], [localidades_vl])
    SELECT L.[pk], n.semana,
           CASE WHEN n.semana <= @semanas
                THEN ISNULL(TRY_CONVERT(INT, JSON_VALUE(L.[localidades], CONCAT('$[', n.semana - 1, ']'))), 0)
                ELSE 0 END
    FROM @linhas L
    CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) n(semana);

    DECLARE @n INT = (SELECT COUNT(*) FROM @linhas);

    COMMIT;

    SELECT
        status_st          = 'SUCCESS',
        insertedCount_vl   = @n,
        planoMidiaGrupo_pk = @planoMidiaGrupo_pk,
        report_pk          = @report_pk,
        date_dh            = SWITCHOFFSET(CONVERT(datetimeoffset, GETDATE()), '-03:00');
END
`;

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado ao banco:', process.env.DB_SERVER);

    // Verifica se as tabelas-alvo existem antes de criar a SP
    const tblCheck = await pool.request().query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'serv_product_be180'
        AND TABLE_NAME IN ('planoMidiaIndoor_ft', 'planoMidiaIndoorSemana_ft')
    `);
    const cnt = tblCheck.recordset[0].cnt;
    if (cnt < 2) {
      console.error(`❌ Tabelas-alvo não encontradas (encontradas ${cnt}/2).`);
      console.error('   Esperado: planoMidiaIndoor_ft e planoMidiaIndoorSemana_ft');
      console.error('   Execute a migração 05 de rename de tabelas antes deste script.');
      process.exit(1);
    }
    console.log('✅ Tabelas planoMidiaIndoor_ft e planoMidiaIndoorSemana_ft encontradas.');

    await pool.request().query(SP_DDL);
    console.log('✅ sp_planoMidiaIndoorInsert criada/atualizada com sucesso.');

    // Confirma que a SP existe
    const spCheck = await pool.request().query(`
      SELECT
        SCHEMA_NAME(schema_id) AS schema_nm,
        name,
        create_date,
        modify_date
      FROM sys.objects
      WHERE object_id = OBJECT_ID(N'[serv_product_be180].[sp_planoMidiaIndoorInsert]')
        AND type = 'P'
    `);
    console.log('\n── Verificação final ────────────────────────────────');
    console.table(spCheck.recordset);

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
