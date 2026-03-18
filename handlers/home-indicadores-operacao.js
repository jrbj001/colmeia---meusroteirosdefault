const { sql, getPool } = require('./db');

function normalizeAmbiente(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'VP' || upper === 'PUBLIC') return 'PUBLIC';
  if (upper === 'INDOOR') return 'INDOOR';
  return null;
}

function normalizePeriodo(value) {
  const allowed = new Set(['7d', '30d', '90d']);
  const normalized = String(value || '30d').toLowerCase();
  return allowed.has(normalized) ? normalized : '30d';
}

function daysFromPeriodo(periodo) {
  if (periodo === '7d') return 7;
  if (periodo === '90d') return 90;
  return 30;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pool = await getPool();

    const ambiente = normalizeAmbiente(req.query.ambiente);
    const praca = (req.query.praca || '').trim();
    const exibidor = (req.query.exibidor || '').trim();
    const periodo = normalizePeriodo(req.query.periodo);
    const days = daysFromPeriodo(periodo);

    const colResult = await pool.request().query(`
      SELECT
        CASE WHEN COL_LENGTH('serv_product_be180.bancoAtivosJoin_ft', 'date_dh') IS NOT NULL THEN 1 ELSE 0 END AS has_date_dh,
        CASE WHEN COL_LENGTH('serv_product_be180.bancoAtivosJoin_ft', 'date_dt') IS NOT NULL THEN 1 ELSE 0 END AS has_date_dt
    `);
    const hasDateDh = colResult.recordset?.[0]?.has_date_dh === 1;
    const hasDateDt = colResult.recordset?.[0]?.has_date_dt === 1;

    const whereParts = ['valid_bl = 1'];
    const filterInputs = (request) => {
      if (ambiente) request.input('ambiente', sql.NVarChar, ambiente);
      if (praca) request.input('praca', sql.NVarChar, praca);
      if (exibidor) request.input('exibidor', sql.NVarChar, exibidor);
      if (hasDateDh || hasDateDt) request.input('days', sql.Int, days);
    };

    if (ambiente) whereParts.push('UPPER(environment_st) = @ambiente');
    if (praca) whereParts.push('cidade_st = @praca');
    if (exibidor) whereParts.push('exibidor_st = @exibidor');

    const dateColumn = hasDateDh ? 'date_dh' : hasDateDt ? 'date_dt' : null;
    if (dateColumn) {
      whereParts.push(`${dateColumn} >= DATEADD(DAY, -@days, GETDATE())`);
    }
    const whereClause = whereParts.join(' AND ');

    const baseKpiQuery = `
      SELECT
        COUNT(*) AS total_pontos,
        COUNT(DISTINCT cidade_st) AS total_pracas,
        COUNT(DISTINCT exibidor_st) AS total_exibidores,
        SUM(CASE WHEN UPPER(environment_st) = 'PUBLIC' THEN 1 ELSE 0 END) AS total_public,
        SUM(CASE WHEN UPPER(environment_st) = 'INDOOR' THEN 1 ELSE 0 END) AS total_indoor
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE ${whereClause}
    `;

    const rankingPracasQuery = `
      SELECT TOP 10
        cidade_st AS nome,
        COUNT(*) AS pontos
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE ${whereClause}
      GROUP BY cidade_st
      ORDER BY COUNT(*) DESC, cidade_st ASC
    `;

    const rankingExibidoresQuery = `
      SELECT TOP 10
        exibidor_st AS nome,
        COUNT(*) AS pontos
      FROM [serv_product_be180].[bancoAtivosJoin_ft]
      WHERE ${whereClause}
      GROUP BY exibidor_st
      ORDER BY COUNT(*) DESC, exibidor_st ASC
    `;

    const lowInventoryAlertQuery = `
      WITH praca_counts AS (
        SELECT cidade_st, COUNT(*) AS pontos
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY cidade_st
      ),
      avg_stats AS (
        SELECT AVG(CAST(pontos AS FLOAT)) AS avg_pontos
        FROM praca_counts
      )
      SELECT TOP 10
        pc.cidade_st AS praca,
        pc.pontos,
        'baixo_inventario' AS tipo_alerta,
        'Médio' AS severidade,
        'Praça com inventário abaixo da média operacional' AS descricao
      FROM praca_counts pc
      CROSS JOIN avg_stats a
      WHERE a.avg_pontos IS NOT NULL
        AND pc.pontos < (a.avg_pontos * 0.5)
      ORDER BY pc.pontos ASC
    `;

    const concentrationAlertQuery = `
      WITH exibidor_praca AS (
        SELECT cidade_st, exibidor_st, COUNT(*) AS pontos_exibidor
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY cidade_st, exibidor_st
      ),
      total_praca AS (
        SELECT cidade_st, COUNT(*) AS pontos_total
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY cidade_st
      )
      SELECT TOP 10
        ep.cidade_st AS praca,
        ep.exibidor_st AS exibidor,
        ep.pontos_exibidor,
        tp.pontos_total,
        CAST((ep.pontos_exibidor * 100.0) / NULLIF(tp.pontos_total, 0) AS DECIMAL(10,2)) AS share_pct
      FROM exibidor_praca ep
      INNER JOIN total_praca tp ON ep.cidade_st = tp.cidade_st
      WHERE tp.pontos_total > 0
        AND ((ep.pontos_exibidor * 100.0) / tp.pontos_total) >= 60
      ORDER BY share_pct DESC, ep.pontos_exibidor DESC
    `;

    let trendRows = [];
    if (dateColumn) {
      const trendQuery = `
        SELECT
          CAST(${dateColumn} AS DATE) AS dia,
          COUNT(*) AS pontos
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY CAST(${dateColumn} AS DATE)
        ORDER BY dia ASC
      `;
      const trendReq = pool.request();
      filterInputs(trendReq);
      const trendResult = await trendReq.query(trendQuery);
      trendRows = trendResult.recordset || [];
    }

    const [kpiResult, pracaResult, exibidorResult, lowInvResult, concResult, optionsResult] = await Promise.all([
      (async () => {
        const request = pool.request();
        filterInputs(request);
        return request.query(baseKpiQuery);
      })(),
      (async () => {
        const request = pool.request();
        filterInputs(request);
        return request.query(rankingPracasQuery);
      })(),
      (async () => {
        const request = pool.request();
        filterInputs(request);
        return request.query(rankingExibidoresQuery);
      })(),
      (async () => {
        const request = pool.request();
        filterInputs(request);
        return request.query(lowInventoryAlertQuery);
      })(),
      (async () => {
        const request = pool.request();
        filterInputs(request);
        return request.query(concentrationAlertQuery);
      })(),
      pool.request().query(`
        SELECT TOP 200 cidade_st AS nome
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1 AND cidade_st IS NOT NULL
        GROUP BY cidade_st
        ORDER BY cidade_st ASC;

        SELECT TOP 200 exibidor_st AS nome
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE valid_bl = 1 AND exibidor_st IS NOT NULL
        GROUP BY exibidor_st
        ORDER BY exibidor_st ASC;
      `),
    ]);

    const kpi = kpiResult.recordset?.[0] || {};
    const totalPontos = Number(kpi.total_pontos || 0);
    const totalPublic = Number(kpi.total_public || 0);
    const totalIndoor = Number(kpi.total_indoor || 0);

    const alerts = [
      ...(lowInvResult.recordset || []).map((a) => ({
        tipo: 'baixo_inventario',
        severidade: a.severidade || 'Médio',
        praca: a.praca,
        descricao: a.descricao,
        metrica: `${a.pontos} pontos`,
      })),
      ...(concResult.recordset || []).map((a) => ({
        tipo: 'concentracao_exibidor',
        severidade: Number(a.share_pct) >= 80 ? 'Alto' : 'Médio',
        praca: a.praca,
        descricao: `${a.exibidor} concentra ${a.share_pct}% dos ativos na praça`,
        metrica: `${a.pontos_exibidor}/${a.pontos_total} pontos`,
      })),
    ];

    const recordsets = optionsResult.recordsets || [];
    const pracasDisponiveis = (recordsets[0] || []).map((r) => r.nome).filter(Boolean);
    const exibidoresDisponiveis = (recordsets[1] || []).map((r) => r.nome).filter(Boolean);

    return res.status(200).json({
      success: true,
      filtrosAplicados: {
        ambiente: ambiente || null,
        praca: praca || null,
        exibidor: exibidor || null,
        periodo,
      },
      kpis: {
        totalPontos,
        totalPracas: Number(kpi.total_pracas || 0),
        totalExibidores: Number(kpi.total_exibidores || 0),
        percVP: totalPontos > 0 ? Number(((totalPublic * 100) / totalPontos).toFixed(2)) : 0,
        percIndoor: totalPontos > 0 ? Number(((totalIndoor * 100) / totalPontos).toFixed(2)) : 0,
      },
      rankingPracas: pracaResult.recordset || [],
      rankingExibidores: exibidorResult.recordset || [],
      alertas: alerts.slice(0, 20),
      tendencia: trendRows,
      opcoesFiltro: {
        pracas: pracasDisponiveis,
        exibidores: exibidoresDisponiveis,
        ambientes: ['PUBLIC', 'INDOOR'],
        periodos: ['7d', '30d', '90d'],
      },
      metadata: {
        hasDateColumn: Boolean(dateColumn),
        dateColumn: dateColumn || null,
      },
    });
  } catch (error) {
    console.error('[home-indicadores-operacao] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao carregar indicadores da home',
      message: error.message,
    });
  }
};

