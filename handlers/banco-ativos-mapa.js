const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pool = await getPool();
    const { tipo_ambiente, cidade } = req.query;

    const request = pool.request();
    const filters = ['valid_bl = 1', 'latitude IS NOT NULL', 'longitude IS NOT NULL',
                     'CAST(latitude AS FLOAT) != 0', 'CAST(longitude AS FLOAT) != 0'];

    if (tipo_ambiente === 'indoor') {
      filters.push("environment_st = 'Indoor'");
    } else if (tipo_ambiente === 'vias_publicas') {
      filters.push("environment_st = 'Public'");
    }

    if (cidade) {
      request.input('cidade', sql.NVarChar, `%${cidade}%`);
      filters.push('cidade_st LIKE @cidade');
    }

    const where = filters.map(f => `(${f})`).join(' AND ');

    const result = await request.query(`
      SELECT
        pk                                  AS id,
        code,
        CAST(latitude  AS FLOAT)            AS latitude,
        CAST(longitude AS FLOAT)            AS longitude,
        exibidor_st                         AS exibidor,
        tipoMidia_st                        AS tipo_midia,
        environment_st                      AS ambiente,
        cidade_st                           AS cidade,
        estado_st                           AS estado,
        district                            AS bairro,
        social_class_geo                    AS rating,
        ISNULL(CAST(pedestrian_flow  AS FLOAT), 0)  AS passantes,
        ISNULL(CAST(total_ipv_impact AS FLOAT), 0)  AS impactos_ipv,
        grupo_st                            AS grupo_midia,
        grupoSub_st                         AS subgrupo_midia,
        categoria_st                        AS categoria,
        media_format_st                     AS formato
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE ${where}
      ORDER BY pk
    `);

    const pontos = result.recordset;

    const stats = {
      total_pontos:    pontos.length,
      total_passantes: pontos.reduce((s, p) => s + (parseFloat(p.passantes)   || 0), 0),
      total_impactos:  pontos.reduce((s, p) => s + (parseFloat(p.impactos_ipv) || 0), 0),
    };

    res.status(200).json({ success: true, data: pontos, stats });

  } catch (error) {
    console.error('[banco-ativos-mapa] Erro:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar pontos', details: error.message });
  }
};
