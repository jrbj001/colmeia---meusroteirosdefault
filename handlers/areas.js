const { getPool } = require('./db.js');

/**
 * API de Áreas do Sistema
 * 
 * GET /areas - Lista todas as áreas
 * GET /areas?hierarquia=true - Lista áreas em estrutura hierárquica
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await getPool();
    const { hierarquia } = req.query;

    // Lista simples de áreas
    if (!hierarquia) {
      const result = await pool.request().query(`
        SELECT * FROM [serv_product_be180].[area_sistema_hierarquia_vw]
        WHERE ativo_bl = 1
        ORDER BY nivel_hierarquia, ordem_vl
      `);

      return res.status(200).json({
        areas: result.recordset,
        total: result.recordset.length
      });
    }

    // Lista hierárquica (áreas principais com subáreas)
    const result = await pool.request().query(`
      SELECT * FROM [serv_product_be180].[area_sistema_hierarquia_vw]
      WHERE ativo_bl = 1
      ORDER BY nivel_hierarquia, ordem_vl
    `);

    // Organizar em estrutura hierárquica
    const areasPrincipais = result.recordset.filter(a => a.nivel_hierarquia === 1);
    const subareas = result.recordset.filter(a => a.nivel_hierarquia === 2);

    const hierarquiaAreas = areasPrincipais.map(areaPrincipal => ({
      area_pk: areaPrincipal.area_pk,
      codigo: areaPrincipal.codigo_st,
      nome: areaPrincipal.nome_st,
      descricao: areaPrincipal.descricao_st,
      ordem: areaPrincipal.ordem_vl,
      subareas: subareas
        .filter(sub => sub.area_pai_nome === areaPrincipal.nome_st)
        .map(sub => ({
          area_pk: sub.area_pk,
          codigo: sub.codigo_st,
          nome: sub.nome_st,
          descricao: sub.descricao_st,
          ordem: sub.ordem_vl
        }))
    }));

    return res.status(200).json({
      areas: hierarquiaAreas,
      total_principais: areasPrincipais.length,
      total_subareas: subareas.length,
      total_geral: result.recordset.length
    });

  } catch (error) {
    console.error('Erro ao buscar áreas do sistema:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar áreas',
      detalhes: error.message 
    });
  }
};
