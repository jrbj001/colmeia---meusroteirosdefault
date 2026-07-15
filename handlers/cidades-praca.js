const { sql, getPool } = require('./db');

/**
 * GET /cidades-praca
 *
 * Retorna lista canônica de praças para uso em dropdowns.
 * Fonte: UNION de:
 *  1. [bancoAtivosJoin_ft]   — cidades do banco de ativos legado OOH (nomes com acentos corretos)
 *  2. [praca_canonica_dm]    — praças customizadas cadastradas pelo admin (se a tabela existir)
 *
 * Nota: [cidadeIbge_dm] foi removido temporariamente pois a tabela foi importada sem acentos.
 * Reativar após re-importação com encoding correto (nvarchar + UTF-8/Latin1).
 *
 * Query param: search (opcional) — filtra por nome ou UF
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool   = await getPool();
    const search = (req.query.search || '').replace(/\+/g, ' ').trim();
    const req_   = pool.request();

    let searchFilter = '';
    if (search) {
      req_.input('search', sql.NVarChar, `%${search}%`);
      searchFilter = "AND (nome_cidade COLLATE Latin1_General_CI_AI LIKE @search OR nome_estado COLLATE Latin1_General_CI_AI LIKE @search)";
    }

    // Verifica se tabela de praças customizadas existe
    const hasCustom = await pool.request().query(`
      SELECT 1 AS existe FROM sys.tables t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE s.name = 'serv_product_be180' AND t.name = 'praca_canonica_dm'
    `);

    // Praças customizadas têm maior prioridade (0), depois legado OOH (1, com acentos corretos).
    // IBGE foi removido por ter dados sem acento — re-importar com nvarchar/encoding correto
    // antes de reativar.
    // ROW_NUMBER com COLLATE CI_AI elimina duplicatas por acento/case dentro do legado.
    const customUnion = hasCustom.recordset.length
      ? `UNION ALL
         SELECT UPPER(LTRIM(RTRIM(nome_st))) AS nome_cidade, UPPER(LTRIM(RTRIM(uf_st))) AS nome_estado, 0 AS prioridade
         FROM [serv_product_be180].[praca_canonica_dm]
         WHERE delete_bl = 0`
      : '';

    const result = await req_.query(`
      SELECT nome_cidade, nome_estado
      FROM (
        SELECT
          nome_cidade,
          nome_estado,
          ROW_NUMBER() OVER (
            PARTITION BY nome_cidade COLLATE Latin1_General_CI_AI
            ORDER BY prioridade ASC
          ) AS rn
        FROM (
          -- 1. Banco de ativos legado OOH (nomes corretos com acentos: "SÃO PAULO", "BARRA DA TIJUCA/RECREIO" etc.)
          SELECT UPPER(LTRIM(RTRIM(cidade_st))) AS nome_cidade, UPPER(LTRIM(RTRIM(estado_st))) AS nome_estado, 1 AS prioridade
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE valid_bl = 1 AND cidade_st IS NOT NULL

          ${customUnion}
        ) AS todas
        WHERE nome_cidade IS NOT NULL AND nome_cidade <> ''
      ) AS ranked
      WHERE rn = 1
      ${searchFilter}
      ORDER BY nome_cidade
    `);

    res.json(result.recordset.map(r => ({
      id_cidade:   r.nome_cidade,
      nome_cidade: r.nome_cidade,
      nome_estado: r.nome_estado || '',
    })));

  } catch (error) {
    console.error('[cidades-praca] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar cidades' });
  }
};
