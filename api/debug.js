const { getPool, sql } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    
    // 1. Verificar todos os planoMidiaGrupo_pk que existem no pivot
    const pivotGrupos = await pool.request().query(`
      SELECT DISTINCT TOP 10
        planoMidiaGrupo_pk,
        COUNT(*) as total_pivot
      FROM [serv_product_be180].[planoMidiaGrupoPivot_dm_vw]
      GROUP BY planoMidiaGrupo_pk
      ORDER BY planoMidiaGrupo_pk DESC
    `);

    // 2. Verificar todos os planoMidiaGrupo_pk em uploadRoteiros_ft
    const roteirosGrupos = await pool.request().query(`
      SELECT DISTINCT TOP 10
        planoMidiaGrupo_pk,
        COUNT(*) as total_roteiros,
        MAX(date_dh) as ultima_data
      FROM [serv_product_be180].[uploadRoteiros_ft]
      GROUP BY planoMidiaGrupo_pk
      ORDER BY planoMidiaGrupo_pk DESC
    `);

    // 3. Pegar um exemplo de grupo que funciona (do pivot)
    const exemploFuncionando = await pool.request().query(`
      SELECT TOP 1
        pgp.planoMidiaGrupo_pk,
        pgp.planoMidiaDesc_pk,
        pmd.planoMidiaDesc_st,
        pm.pk as planoMidia_pk,
        pm.semanaInicial_vl,
        pm.semanaFinal_vl
      FROM [serv_product_be180].[planoMidiaGrupoPivot_dm_vw] pgp
      LEFT JOIN [serv_product_be180].[planoMidiaDesc_dm_vw] pmd
      ON pgp.planoMidiaDesc_pk = pmd.pk
      LEFT JOIN [serv_product_be180].[planoMidia_dm_vw] pm
      ON pmd.pk = pm.planoMidiaDesc_vl
      WHERE pgp.planoMidiaGrupo_pk IS NOT NULL
      ORDER BY pgp.planoMidiaGrupo_pk DESC
    `);

    // 4. Verificar a view com um grupo que funciona
    let viewFuncionando = { recordset: [] };
    if (exemploFuncionando.recordset.length > 0) {
      const grupoExemplo = exemploFuncionando.recordset[0].planoMidiaGrupo_pk;
      viewFuncionando = await pool.request()
        .input('planoMidiaGrupo_pk', sql.Int, grupoExemplo)
        .query(`
          SELECT TOP 5
            pk,
            planoMidiaGrupo_pk,
            cidade_st,
            semana_st,
            planoMidia_pk,
            fluxoPassantes_vl
          FROM [serv_product_be180].[uploadRoteirosInventario_ft_vw]
          WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
        `);
    }

    res.status(200).json({
      success: true,
      data: {
        gruposNoPivot: {
          count: pivotGrupos.recordset.length,
          grupos: pivotGrupos.recordset
        },
        gruposNosRoteiros: {
          count: roteirosGrupos.recordset.length,
          grupos: roteirosGrupos.recordset
        },
        exemploFuncionando: {
          count: exemploFuncionando.recordset.length,
          dados: exemploFuncionando.recordset
        },
        viewComExemploFuncionando: {
          count: viewFuncionando.recordset.length,
          dados: viewFuncionando.recordset
        }
      }
    });

  } catch (error) {
    console.error('Erro ao debugar:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
