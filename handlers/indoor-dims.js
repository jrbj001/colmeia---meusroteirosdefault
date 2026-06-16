const { getPool } = require('./db');

const S = 'serv_product_be180';

/** Executa uma query e retorna o recordset, ou [] se a tabela/view não existir ainda. */
async function safeQuery(pool, sql, label) {
  try {
    const result = await pool.request().query(sql);
    return result.recordset;
  } catch (err) {
    // Erro 208 = Invalid object name (tabela ainda não criada no banco)
    if (err.number === 208 || (err.originalError && err.originalError.info && err.originalError.info.number === 208)) {
      console.warn(`⚠️ [indoor-dims] Tabela ainda não existe, retornando vazio para "${label}"`);
      return [];
    }
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    console.log('📐 [indoor-dims] Carregando dimensões indoor...');
    const pool = await getPool();

    const [ambientes, tamanhos, visualizacoes, especificosRaw, cidades, deflatorDigital] = await Promise.all([
      safeQuery(pool,
        `SELECT ambiente_st, ISNULL(tamanhoOverride_st,'') AS tamanhoOverride_st
         FROM ${S}.indoorAmbiente_dm ORDER BY ambiente_st`,
        'indoorAmbiente_dm'),
      safeQuery(pool,
        `SELECT tamanho_st FROM ${S}.indoorFormatoTamanho_dm ORDER BY multiplicador_vl`,
        'indoorFormatoTamanho_dm'),
      safeQuery(pool,
        `SELECT visualizacao_st FROM ${S}.indoorVisualizacao_dm ORDER BY visualizacao_st`,
        'indoorVisualizacao_dm'),
      safeQuery(pool,
        `SELECT ambiente_st, local_st, cidade_st, estado_st,
                ISNULL(passantesSemana_vl, 0) AS passantesSemana_vl,
                ISNULL(area_vl, 0) AS area_vl
         FROM ${S}.indoorEspecifico_dm
         ORDER BY ambiente_st, cidade_st, local_st`,
        'indoorEspecifico_dm'),
      safeQuery(pool,
        `SELECT TOP 80 cidade_st FROM ${S}.cidadeClassIbgeKantar_dm_vw ORDER BY cityPopulationEstimatedIBGE DESC`,
        'cidadeClassIbgeKantar_dm_vw'),
      safeQuery(pool,
        `SELECT insercoesMin_vl, multiplicador_vl FROM ${S}.indoorDeflatorDigital_dm ORDER BY insercoesMin_vl`,
        'indoorDeflatorDigital_dm'),
    ]);

    // Agrupa venues por ambiente
    const especificosMap = {};
    for (const r of especificosRaw) {
      const amb = r.ambiente_st;
      if (!especificosMap[amb]) especificosMap[amb] = [];
      especificosMap[amb].push({
        local: r.local_st,
        cidade: r.cidade_st,
        estado: r.estado_st,
        passantes: Number(r.passantesSemana_vl) || 0,
        area: Number(r.area_vl) || 0,
      });
    }

    // Ambientes que têm venues cadastrados
    const ambientesComVenues = new Set(Object.keys(especificosMap));

    console.log(`✅ [indoor-dims] ${ambientes.length} ambientes, ${tamanhos.length} tamanhos, ${especificosRaw.length} venues específicos`);

    res.json({
      success: true,
      data: {
        ambientes: ambientes.map((r) => ({
          nome: r.ambiente_st,
          hasEspecificos: ambientesComVenues.has(r.ambiente_st),
          tamanhoOverride: r.tamanhoOverride_st || '',
        })),
        tamanhos: tamanhos.map((r) => r.tamanho_st),
        visualizacoes: visualizacoes.map((r) => r.visualizacao_st),
        especificos: especificosMap,
        cidades: cidades.map((r) => r.cidade_st),
        deflatorDigital: deflatorDigital.map((r) => ({
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
