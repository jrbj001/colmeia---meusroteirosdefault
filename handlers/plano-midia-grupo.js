const { sql, getPool } = require('./db.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      planoMidiaGrupo_st,
      agencia_pk,
      marca_pk,
      categoria_pk,
      valorCampanha_vl,
      gender_st = null,
      class_st = null,
      age_st = null,
      usuarioId_st = null,
      usuarioName_st = null,
    } = req.body;
    
    // Validações
    if (!planoMidiaGrupo_st) {
      return res.status(400).json({ error: 'planoMidiaGrupo_st é obrigatório' });
    }
    if (!agencia_pk) {
      return res.status(400).json({ error: 'agencia_pk é obrigatório' });
    }
    if (!marca_pk) {
      return res.status(400).json({ error: 'marca_pk é obrigatório' });
    }
    if (!categoria_pk) {
      return res.status(400).json({ error: 'categoria_pk é obrigatório' });
    }
    if (!valorCampanha_vl) {
      return res.status(400).json({ error: 'valorCampanha_vl é obrigatório' });
    }

    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupo_st', sql.NVarChar(255), String(planoMidiaGrupo_st))
      .input('agencia_pk', sql.Int, Number(agencia_pk))
      .input('marca_pk', sql.Int, Number(marca_pk))
      .input('categoria_pk', sql.Int, Number(categoria_pk))
      .input('valorCampanha_vl', sql.Decimal(18, 2), Number(valorCampanha_vl));

    request.input('gender_st', sql.NVarChar(50), gender_st ? String(gender_st) : null);
    request.input('class_st', sql.NVarChar(50), class_st ? String(class_st) : null);
    request.input('age_st', sql.NVarChar(50), age_st ? String(age_st) : null);
    request.input('usuarioId_st', sql.NVarChar(255), usuarioId_st ? String(usuarioId_st) : null);
    request.input('usuarioName_st', sql.NVarChar(255), usuarioName_st ? String(usuarioName_st) : null);

    const result = await request.execute('[serv_product_be180].[sp_planoMidiaGrupoInsert]');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao criar plano mídia grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

