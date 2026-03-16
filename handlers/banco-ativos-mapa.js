const { sql, getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pool = await getPool();
    const { tipo_ambiente } = req.query;
    // Axios codifica espaços como '+' em query strings — precisamos decodificar manualmente
    const cidade = req.query.cidade ? req.query.cidade.replace(/\+/g, ' ').trim() : null;
    const exibidor = req.query.exibidor ? req.query.exibidor.replace(/\+/g, ' ').trim() : null;
    const bairro = req.query.bairro ? req.query.bairro.replace(/\+/g, ' ').trim() : null;
    console.log('[banco-ativos-mapa] cidade:', cidade, '| tipo_ambiente:', tipo_ambiente, '| exibidor:', exibidor, '| bairro:', bairro);

    const request = pool.request();
    const filters = ['valid_bl = 1', 'latitude IS NOT NULL', 'longitude IS NOT NULL',
                     'CAST(latitude AS FLOAT) != 0', 'CAST(longitude AS FLOAT) != 0'];

    if (tipo_ambiente === 'indoor') {
      filters.push("UPPER(environment_st) = 'INDOOR'");
    } else if (tipo_ambiente === 'vias_publicas') {
      filters.push("UPPER(environment_st) = 'PUBLIC'");
    }

    if (cidade) {
      request.input('cidade', sql.NVarChar, `%${cidade.trim()}%`);
      filters.push('cidade_st LIKE @cidade');
    }
    if (exibidor) {
      request.input('exibidor', sql.NVarChar, `%${exibidor.trim()}%`);
      filters.push('exibidor_st LIKE @exibidor');
    }
    if (bairro) {
      request.input('bairro', sql.NVarChar, `%${bairro.trim()}%`);
      filters.push('district LIKE @bairro');
    }

    const where = filters.map(f => `(${f})`).join(' AND ');

    // Detecta dinamicamente uma coluna de rua/logradouro disponível no banco
    const colsResult = await pool.request().query(`
      SELECT LOWER(c.name) AS name
      FROM sys.columns c
      INNER JOIN sys.objects o ON o.object_id = c.object_id
      INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = 'serv_product_be180'
        AND o.name = 'bancoAtivosJoin_ft'
    `);
    const availableCols = new Set((colsResult.recordset || []).map(r => r.name));
    const ruaCandidates = [
      'rua_st',
      'rua',
      'rua_vl',
      'logradouro_st',
      'logradouro',
      'logradouro_vl',
      'endereco_st',
      'endereco',
      'endereco_vl',
      'endereco1_st',
      'address1_st',
      'address_line1',
      'address_line',
      'street_st',
      'street',
      'address_st',
      'address',
    ];
    const ruaCol = ruaCandidates.find(c => availableCols.has(c));
    const ruaSelect = ruaCol ? `${ruaCol} AS rua,` : `CAST(NULL AS NVARCHAR(255)) AS rua,`;

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
        ${ruaSelect}
        grupo_st                            AS grupo_midia,
        grupoSub_st                         AS subgrupo_midia,
        categoria_st                        AS categoria,
        media_format_st                     AS formato
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE ${where}
      ORDER BY pk
    `);

    const pontos = result.recordset;
    console.log('[banco-ativos-mapa] retornando', pontos.length, 'pontos para cidade:', cidade);

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
