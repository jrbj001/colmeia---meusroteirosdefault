/**
 * Cria [serv_product_be180].[exibidor_dm] se não existir.
 * Uso: node scripts/apply-exibidor-dm.js
 * Requer .env na raiz com DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 60000,
    requestTimeout: 120000,
  },
};

const DDL = `
IF OBJECT_ID(N'[serv_product_be180].[exibidor_dm]', N'U') IS NULL
BEGIN
  CREATE TABLE [serv_product_be180].[exibidor_dm] (
    [exibidor_pk]         INT IDENTITY(1,1) NOT NULL,
    [nome_st]             NVARCHAR(255) NOT NULL,
    [nome_fantasia_st]    NVARCHAR(255) NULL,
    [codigo_st]           NVARCHAR(100) NULL,
    [cnpj_st]             NVARCHAR(18) NULL,
    [site_st]             NVARCHAR(500) NULL,
    [email_st]            NVARCHAR(255) NULL,
    [telefone_st]         NVARCHAR(50) NULL,
    [cep_st]              NVARCHAR(20) NULL,
    [logradouro_st]       NVARCHAR(500) NULL,
    [numero_st]           NVARCHAR(50) NULL,
    [complemento_st]      NVARCHAR(200) NULL,
    [bairro_st]           NVARCHAR(200) NULL,
    [cidade_st]           NVARCHAR(200) NULL,
    [estado_st]           NVARCHAR(2) NULL,
    [observacao_st]       NVARCHAR(2000) NULL,
    [active_bl]           BIT NOT NULL CONSTRAINT [DF_exibidor_dm_active] DEFAULT (1),
    [delete_bl]           BIT NOT NULL CONSTRAINT [DF_exibidor_dm_delete] DEFAULT (0),
    [dataCriacao_dh]      DATETIME2(0) NOT NULL CONSTRAINT [DF_exibidor_dm_criacao] DEFAULT (SYSDATETIME()),
    [dataAtualizacao_dh]  DATETIME2(0) NULL,
    CONSTRAINT [PK_exibidor_dm] PRIMARY KEY CLUSTERED ([exibidor_pk])
  );

  CREATE NONCLUSTERED INDEX [IX_exibidor_dm_nome]
    ON [serv_product_be180].[exibidor_dm] ([nome_st])
    WHERE [delete_bl] = 0;

  CREATE NONCLUSTERED INDEX [IX_exibidor_dm_codigo]
    ON [serv_product_be180].[exibidor_dm] ([codigo_st])
    WHERE [delete_bl] = 0 AND [codigo_st] IS NOT NULL;
END
`;

async function main() {
  if (!config.server || !config.database || !config.user || !config.password) {
    console.error('❌ Defina DB_SERVER, DB_DATABASE, DB_USER e DB_PASSWORD no .env');
    process.exit(1);
  }

  console.log(`\n🔌 Conectando: ${config.server} / ${config.database}\n`);

  const pool = await sql.connect(config);

  await pool.request().query(DDL);

  const check = await pool.request().query(`
    SELECT OBJECT_ID(N'[serv_product_be180].[exibidor_dm]', N'U') AS object_id
  `);
  const oid = check.recordset[0]?.object_id;
  if (oid) {
    console.log('✅ Tabela [serv_product_be180].[exibidor_dm] existe (object_id:', oid + ').');
  } else {
    console.log('⚠️ Não foi possível confirmar object_id da tabela.');
  }

  await pool.close();
  console.log('\n✅ Script concluído.\n');
}

main().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
