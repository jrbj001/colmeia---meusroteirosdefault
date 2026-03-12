const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        COUNT(*)                                                            AS total_pontos_midia,
        COUNT(DISTINCT cidade_st)                                           AS total_pracas,
        COUNT(DISTINCT exibidor_st)                                         AS total_exibidores,

        SUM(CASE WHEN UPPER(environment_st) = 'PUBLIC'  THEN 1 ELSE 0 END)        AS vias_publicas_pontos_midia,
        COUNT(DISTINCT CASE WHEN UPPER(environment_st) = 'PUBLIC'  THEN cidade_st  END) AS vias_publicas_pracas,
        COUNT(DISTINCT CASE WHEN UPPER(environment_st) = 'PUBLIC'  THEN exibidor_st END) AS vias_publicas_exibidores,

        SUM(CASE WHEN UPPER(environment_st) = 'INDOOR'  THEN 1 ELSE 0 END)        AS indoor_pontos_midia,
        COUNT(DISTINCT CASE WHEN UPPER(environment_st) = 'INDOOR'  THEN cidade_st  END) AS indoor_pracas,
        COUNT(DISTINCT CASE WHEN UPPER(environment_st) = 'INDOOR'  THEN exibidor_st END) AS indoor_exibidores
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE valid_bl = 1
    `);

    const row = result.recordset[0] || {};

    res.status(200).json({
      success: true,
      data: {
        total: {
          pontos_midia: parseInt(row.total_pontos_midia) || 0,
          pracas:       parseInt(row.total_pracas)       || 0,
          exibidores:   parseInt(row.total_exibidores)   || 0,
        },
        vias_publicas: {
          pontos_midia: parseInt(row.vias_publicas_pontos_midia)  || 0,
          pracas:       parseInt(row.vias_publicas_pracas)        || 0,
          exibidores:   parseInt(row.vias_publicas_exibidores)    || 0,
        },
        indoor: {
          pontos_midia: parseInt(row.indoor_pontos_midia) || 0,
          pracas:       parseInt(row.indoor_pracas)       || 0,
          exibidores:   parseInt(row.indoor_exibidores)   || 0,
        },
      },
    });

  } catch (error) {
    console.error('[banco-ativos-dashboard] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas', message: error.message });
  }
};
