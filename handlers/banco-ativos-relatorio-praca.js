const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cidade } = req.body;
  if (!cidade) {
    return res.status(400).json({ success: false, error: 'Cidade é obrigatória' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('cidade', sql.NVarChar, `%${cidade}%`)
      .query(`
        SELECT
          ISNULL(exibidor_st, 'Sem exibidor')                              AS exibidor_nome,
          COUNT(*)                                                          AS total,
          SUM(CASE WHEN environment_st = 'Public'  THEN 1 ELSE 0 END)     AS pontos_vias_publicas,
          SUM(CASE WHEN environment_st = 'Indoor'  THEN 1 ELSE 0 END)     AS pontos_indoor,
          AVG(ISNULL(CAST(pedestrian_flow  AS FLOAT), 0))                 AS fluxo_medio_passantes,
          SUM(ISNULL(CAST(total_ipv_impact AS FLOAT), 0))                 AS total_impacto_ipv,
          (
            SELECT TOP 1 social_class_geo
            FROM [serv_product_be180].[bancoAtivosJoin_ft] sub
            WHERE sub.valid_bl = 1
              AND sub.cidade_st LIKE @cidade
              AND sub.exibidor_st = base.exibidor_st
              AND sub.social_class_geo IS NOT NULL
            GROUP BY social_class_geo
            ORDER BY COUNT(*) DESC
          )                                                                AS classe_social_predominante
        FROM [serv_product_be180].[bancoAtivosJoin_ft] base
        WHERE valid_bl = 1
          AND cidade_st LIKE @cidade
        GROUP BY exibidor_st
        ORDER BY total DESC
      `);

    const totalGeral = result.recordset.reduce((s, r) => s + (parseInt(r.total) || 0), 0);

    res.status(200).json({ success: true, data: result.recordset, totalGeral, cidade });

  } catch (error) {
    console.error('[banco-ativos-relatorio-praca] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar relatório por praça', message: error.message });
  }
};
