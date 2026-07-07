const { sql, getPool } = require('./db');

/**
 * GET /cidades-praca
 *
 * Retorna lista canônica de praças para uso em dropdowns.
 * Fonte: UNION de:
 *  1. [cidadeIbge_dm]        — todos os 5570 municípios brasileiros (IBGE)
 *  2. [bancoAtivosJoin_ft]   — cidades do banco de ativos legado (fallback/complemento)
 *  3. [praca_canonica_dm]    — praças customizadas cadastradas pelo admin (se a tabela existir)
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
      searchFilter = 'AND (nome_cidade LIKE @search OR nome_estado LIKE @search)';
    }

    // Verifica se tabela de praças customizadas existe
    const hasCustom = await pool.request().query(`
      SELECT 1 AS existe FROM sys.tables t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE s.name = 'serv_product_be180' AND t.name = 'praca_canonica_dm'
    `);

    const customUnion = hasCustom.recordset.length
      ? `UNION
         SELECT UPPER(LTRIM(RTRIM(nome_st))) AS nome_cidade, UPPER(LTRIM(RTRIM(uf_st))) AS nome_estado
         FROM [serv_product_be180].[praca_canonica_dm]
         WHERE delete_bl = 0`
      : '';

    const result = await req_.query(`
      SELECT DISTINCT nome_cidade, nome_estado
      FROM (
        -- 1. IBGE (fonte principal — todos os municípios brasileiros)
        SELECT UPPER(LTRIM(RTRIM(cidade_st))) AS nome_cidade, UPPER(LTRIM(RTRIM(estado_st))) AS nome_estado
        FROM [serv_product_be180].[cidadeIbge_dm]
        WHERE cidade_st IS NOT NULL

        UNION

        -- 2. Banco de ativos legado (complementa praças com nomes customizados como "BARRA DA TIJUCA/RECREIO")
        SELECT UPPER(LTRIM(RTRIM(cidade_st))) AS nome_cidade, UPPER(LTRIM(RTRIM(estado_st))) AS nome_estado
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1 AND cidade_st IS NOT NULL

        ${customUnion}
      ) AS unificado
      WHERE nome_cidade IS NOT NULL AND nome_cidade <> ''
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
