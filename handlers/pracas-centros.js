const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { grupo_pk } = req.query;
  if (!grupo_pk) {
    return res.status(400).json({ error: 'grupo_pk é obrigatório' });
  }

  try {
    const pool = await getPool();

    // Passo 1: obter todos os planoMidiaDesc_pk do grupo
    const pivotResult = await pool.request()
      .input('grupo_pk', grupo_pk)
      .query(`
        SELECT planoMidiaDesc_pk
        FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
        WHERE planoMidiaGrupo_pk = @grupo_pk
      `);

    if (!pivotResult.recordset || pivotResult.recordset.length === 0) {
      return res.status(200).json({ pracas: [] });
    }

    const descPks = pivotResult.recordset.map(r => r.planoMidiaDesc_pk);

    // Passo 2: obter todos os planoMidia_pk para esses desc_pks
    const descRequest = pool.request();
    const descParams = descPks.map((pk, i) => {
      descRequest.input(`desc${i}`, pk);
      return `@desc${i}`;
    }).join(',');

    const planoResult = await descRequest.query(`
      SELECT pk
      FROM serv_product_be180.planoMidia_dm_vw
      WHERE planoMidiaDesc_vl IN (${descParams})
    `);

    if (!planoResult.recordset || planoResult.recordset.length === 0) {
      return res.status(200).json({ pracas: [] });
    }

    const planoMidiaPks = planoResult.recordset.map(r => r.pk);

    // Passo 3: centróide médio por praça
    const pontosRequest = pool.request();
    const pkParams = planoMidiaPks.map((pk, i) => {
      pontosRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');

    const result = await pontosRequest.query(`
      SELECT
        cidade_st,
        estado_st,
        AVG(latitude_vl)  AS lat,
        AVG(longitude_vl) AS lon,
        COUNT(*)          AS total_pontos
      FROM serv_product_be180.baseCalculadoraLastPlanoMidia_ft_vw
      WHERE planoMidia_pk IN (${pkParams})
        AND cidade_st    IS NOT NULL
        AND latitude_vl  IS NOT NULL
        AND longitude_vl IS NOT NULL
        AND latitude_vl  != 0
        AND longitude_vl != 0
      GROUP BY cidade_st, estado_st
      ORDER BY cidade_st
    `);

    console.log(`[pracas-centros] ${result.recordset.length} praças retornadas para grupo ${grupo_pk}`);

    res.status(200).json({ pracas: result.recordset });

  } catch (err) {
    console.error('Erro na API /api/pracas-centros:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
};
