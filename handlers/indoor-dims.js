const { sql, getPool } = require('./db');

const S = 'serv_product_be180';

module.exports = async (req, res) => {
  try {
    console.log('📐 [indoor-dims] Carregando dimensões indoor...');
    const pool = await getPool();

    const [ambientes, tamanhos, visualizacoes, shoppings, cidades, deflatorDigital] = await Promise.all([
      pool.request().query(
        `SELECT ambiente_st, CAST(ehShopping_bl AS INT) AS ehShopping_vl, ISNULL(tamanhoOverride_st,'') AS tamanhoOverride_st
         FROM ${S}.indoorAmbiente_dm ORDER BY ambiente_st`
      ),
      pool.request().query(
        `SELECT tamanho_st FROM ${S}.indoorFormatoTamanho_dm ORDER BY multiplicador_vl`
      ),
      pool.request().query(
        `SELECT visualizacao_st FROM ${S}.indoorVisualizacao_dm ORDER BY visualizacao_st`
      ),
      pool.request().query(
        `SELECT shopping_st FROM ${S}.indoorShopping_dm ORDER BY shopping_st`
      ),
      pool.request().query(
        `SELECT TOP 80 cidade_st FROM ${S}.cidadeClassIbgeKantar_dm_vw ORDER BY cityPopulationEstimatedIBGE DESC`
      ),
      pool.request().query(
        `SELECT insercoesMin_vl, multiplicador_vl FROM ${S}.indoorDeflatorDigital_dm ORDER BY insercoesMin_vl`
      ),
    ]);

    console.log(`✅ [indoor-dims] ${ambientes.recordset.length} ambientes, ${tamanhos.recordset.length} tamanhos`);

    res.json({
      success: true,
      data: {
        ambientes: ambientes.recordset.map((r) => ({
          nome: r.ambiente_st,
          ehShopping: r.ehShopping_vl === 1,
          tamanhoOverride: r.tamanhoOverride_st || '',
        })),
        tamanhos: tamanhos.recordset.map((r) => r.tamanho_st),
        visualizacoes: visualizacoes.recordset.map((r) => r.visualizacao_st),
        shoppings: shoppings.recordset.map((r) => r.shopping_st),
        cidades: cidades.recordset.map((r) => r.cidade_st),
        deflatorDigital: deflatorDigital.recordset.map((r) => ({
          min: Number(r.insercoesMin_vl),
          mult: Number(r.multiplicador_vl),
        })),
      },
    });
  } catch (error) {
    console.error('❌ [indoor-dims] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dimensões indoor',
      error: error.message,
    });
  }
};
