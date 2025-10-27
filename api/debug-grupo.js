const { getPool, sql } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { planoMidiaGrupo_pk, date_dh } = req.body;
    
    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({ error: 'planoMidiaGrupo_pk é obrigatório' });
    }

    const pool = await getPool();
    
    // 1. Verificar registros em planoMidiaGrupoPivot_dm_vw
    const pivotResult = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 10 
          planoMidiaGrupo_pk,
          planoMidiaDesc_pk
        FROM [serv_product_be180].[planoMidiaGrupoPivot_dm_vw]
        WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
      `);

    // 2. Verificar registros em planoMidiaDesc_dm_vw
    const descResult = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 10 
          pmd.pk,
          pmd.planoMidiaDesc_st,
          pmd.usuarioId_st,
          pmd.date_dh,
          pmd.date_dt
        FROM [serv_product_be180].[planoMidiaDesc_dm_vw] pmd
        INNER JOIN [serv_product_be180].[planoMidiaGrupoPivot_dm_vw] pgp
        ON pmd.pk = pgp.planoMidiaDesc_pk
        WHERE pgp.planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        ORDER BY pmd.date_dh DESC
      `);

    // 3. Verificar registros em planoMidia_dm_vw
    const midiaResult = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .query(`
        SELECT TOP 10 
          pm.pk,
          pm.planoMidiaDesc_vl,
          pm.semanaInicial_vl,
          pm.semanaFinal_vl,
          pm.date_dh,
          pm.date_dt
        FROM [serv_product_be180].[planoMidia_dm_vw] pm
        INNER JOIN [serv_product_be180].[planoMidiaDesc_dm_vw] pmd
        ON pm.planoMidiaDesc_vl = pmd.pk
        INNER JOIN [serv_product_be180].[planoMidiaGrupoPivot_dm_vw] pgp
        ON pmd.pk = pgp.planoMidiaDesc_pk
        WHERE pgp.planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        ORDER BY pm.date_dh DESC
      `);

    // 4. Verificar se a view consegue fazer o JOIN
    const viewResult = await pool.request()
      .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
      .input('date_dh', sql.DateTime, date_dh || new Date())
      .query(`
        SELECT TOP 10 
          pk,
          planoMidiaGrupo_pk,
          cidade_st,
          estado_st,
          semana_st,
          planoMidia_pk,
          fluxoPassantes_vl,
          date_dh
        FROM [serv_product_be180].[uploadRoteirosInventario_ft_vw]
        WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        AND date_dh = @date_dh
      `);

    res.status(200).json({
      success: true,
      data: {
        pivot: {
          count: pivotResult.recordset.length,
          samples: pivotResult.recordset
        },
        desc: {
          count: descResult.recordset.length,
          samples: descResult.recordset
        },
        midia: {
          count: midiaResult.recordset.length,
          samples: midiaResult.recordset
        },
        view: {
          count: viewResult.recordset.length,
          samples: viewResult.recordset
        }
      }
    });

  } catch (error) {
    console.error('Erro ao debugar grupo:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
