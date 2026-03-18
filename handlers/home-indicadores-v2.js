const { sql, getPool } = require('./db');

function normalizeAmbiente(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'VP' || upper === 'PUBLIC') return 'PUBLIC';
  if (upper === 'INDOOR') return 'INDOOR';
  return null;
}

function normalizePeriodo(value) {
  const allowed = new Set(['7d', '30d', '90d', '180d']);
  const normalized = String(value || '30d').toLowerCase();
  return allowed.has(normalized) ? normalized : '30d';
}

function daysFromPeriodo(periodo) {
  const map = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 };
  return map[periodo] || 30;
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

    const whereParts = ['valid_bl = 1'];
    if (ambiente) whereParts.push('UPPER(environment_st) = @ambiente');
    if (praca) whereParts.push('cidade_st = @praca');
    if (exibidor) whereParts.push('exibidor_st = @exibidor');
    const whereClause = whereParts.join(' AND ');

    const bindFilters = (request) => {
      if (ambiente) request.input('ambiente', sql.NVarChar, ambiente);
      if (praca) request.input('praca', sql.NVarChar, praca);
      if (exibidor) request.input('exibidor', sql.NVarChar, exibidor);
    };

    // ── Query 1: Banco de Ativos (KPIs + rankings + health dimensions) ──
    const ativosQuery = async () => {
      const r = pool.request();
      bindFilters(r);

      const kpiSql = `
        SELECT
          COUNT(*) AS total_pontos,
          COUNT(DISTINCT cidade_st) AS total_pracas,
          COUNT(DISTINCT exibidor_st) AS total_exibidores,
          SUM(CASE WHEN UPPER(environment_st) = 'PUBLIC' THEN 1 ELSE 0 END) AS total_public,
          SUM(CASE WHEN UPPER(environment_st) = 'INDOOR' THEN 1 ELSE 0 END) AS total_indoor,
          SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS com_coordenadas,
          SUM(CASE WHEN pedestrian_flow IS NOT NULL AND pedestrian_flow > 0 THEN 1 ELSE 0 END) AS com_passantes,
          AVG(CAST(ISNULL(pedestrian_flow, 0) AS FLOAT)) AS avg_passantes
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause};
      `;

      const rankPracasSql = `
        SELECT TOP 10
          cidade_st AS nome,
          COUNT(*) AS pontos,
          AVG(CAST(ISNULL(pedestrian_flow, 0) AS FLOAT)) AS avg_passantes
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY cidade_st
        ORDER BY COUNT(*) DESC;
      `;

      const rankExibSql = `
        SELECT TOP 10
          exibidor_st AS nome,
          COUNT(*) AS pontos,
          COUNT(DISTINCT cidade_st) AS pracas_atendidas
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
        GROUP BY exibidor_st
        ORDER BY COUNT(*) DESC;
      `;

      const hhiSql = `
        WITH exib_share AS (
          SELECT
            exibidor_st,
            COUNT(*) AS pontos,
            CAST(COUNT(*) AS FLOAT) /
              NULLIF((SELECT COUNT(*) FROM [serv_product_be180].[bancoAtivosJoin_ft] WHERE ${whereClause}), 0) AS share
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE ${whereClause}
          GROUP BY exibidor_st
        )
        SELECT
          SUM(share * share) AS hhi
        FROM exib_share;
      `;

      const lowInvSql = `
        WITH praca_counts AS (
          SELECT cidade_st, COUNT(*) AS pontos
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE ${whereClause}
          GROUP BY cidade_st
        ),
        stats AS (
          SELECT AVG(CAST(pontos AS FLOAT)) AS avg_pontos FROM praca_counts
        )
        SELECT TOP 10
          pc.cidade_st AS praca,
          pc.pontos,
          CAST(s.avg_pontos AS INT) AS media
        FROM praca_counts pc CROSS JOIN stats s
        WHERE s.avg_pontos IS NOT NULL AND pc.pontos < (s.avg_pontos * 0.5)
        ORDER BY pc.pontos ASC;
      `;

      const concSql = `
        WITH exib_praca AS (
          SELECT cidade_st, exibidor_st, COUNT(*) AS pe
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE ${whereClause}
          GROUP BY cidade_st, exibidor_st
        ),
        total_praca AS (
          SELECT cidade_st, COUNT(*) AS pt
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE ${whereClause}
          GROUP BY cidade_st
        )
        SELECT TOP 10
          ep.cidade_st AS praca,
          ep.exibidor_st AS exibidor,
          ep.pe AS pontos_exibidor,
          tp.pt AS pontos_total,
          CAST((ep.pe * 100.0) / NULLIF(tp.pt, 0) AS DECIMAL(5,1)) AS share_pct
        FROM exib_praca ep
        INNER JOIN total_praca tp ON ep.cidade_st = tp.cidade_st
        WHERE tp.pt > 0 AND ((ep.pe * 100.0) / tp.pt) >= 60
        ORDER BY share_pct DESC;
      `;

      const fullSql = kpiSql + rankPracasSql + rankExibSql + hhiSql + lowInvSql + concSql;
      const result = await r.query(fullSql);
      const sets = result.recordsets;
      return {
        kpi: sets[0]?.[0] || {},
        rankingPracas: sets[1] || [],
        rankingExibidores: sets[2] || [],
        hhi: sets[3]?.[0]?.hhi ?? 1,
        lowInventory: sets[4] || [],
        concentration: sets[5] || [],
      };
    };

    // ── Query 2: Pipeline de Roteiros ──
    const pipelineQuery = async () => {
      const r = pool.request();
      r.input('days', sql.Int, days);

      const pipelineSql = `
        SELECT
          COUNT(*) AS total_roteiros,
          SUM(CASE WHEN inProgress_bl = 1 THEN 1 ELSE 0 END) AS em_processamento,
          SUM(CASE WHEN inProgress_bl = 0 THEN 1 ELSE 0 END) AS finalizados
        FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
        WHERE delete_bl = 0;

        SELECT TOP 8
          planoMidiaGrupo_pk AS id,
          planoMidiaGrupo_st AS nome,
          inProgress_bl AS em_progresso,
          date_dh AS data_criacao,
          semanasMax_vl AS semanas
        FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
        WHERE delete_bl = 0
        ORDER BY date_dh DESC;

        SELECT
          planoMidiaGrupo_pk AS id,
          planoMidiaGrupo_st AS nome,
          date_dh AS data_criacao,
          DATEDIFF(HOUR, date_dh, GETDATE()) AS horas_em_processamento
        FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
        WHERE delete_bl = 0
          AND inProgress_bl = 1
          AND DATEDIFF(HOUR, date_dh, GETDATE()) > 24;

        SELECT
          COUNT(*) AS total_periodo
        FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
        WHERE delete_bl = 0
          AND date_dh >= DATEADD(DAY, -@days, GETDATE());
      `;

      const result = await r.query(pipelineSql);
      const sets = result.recordsets;
      return {
        totais: sets[0]?.[0] || {},
        recentes: sets[1] || [],
        travados: sets[2] || [],
        totalPeriodo: sets[3]?.[0]?.total_periodo || 0,
      };
    };

    // ── Query 3: Performance OOH (roteiros finalizados) ──
    const performanceQuery = async () => {
      const r = pool.request();

      const perfSql = `
        SELECT
          COUNT(DISTINCT rpt.report_pk) AS total_roteiros_com_dados,
          SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS BIGINT)) AS impactos_total,
          AVG(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT)) AS cobertura_media,
          AVG(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT)) AS frequencia_media,
          SUM(CAST(ISNULL(rpt.grp_vl, 0) AS FLOAT)) AS grp_acumulado,
          SUM(CAST(ISNULL(rpt.pontosPracaTotal_vl, 0) AS BIGINT)) AS pontos_total,
          SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS BIGINT)) AS populacao_total
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw] rpt;

        SELECT TOP 10
          rpt.cidade_st AS cidade,
          SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS BIGINT)) AS impactos,
          AVG(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT)) AS cobertura,
          AVG(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT)) AS frequencia,
          SUM(CAST(ISNULL(rpt.pontosPracaTotal_vl, 0) AS INT)) AS pontos
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw] rpt
        GROUP BY rpt.cidade_st
        ORDER BY SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS BIGINT)) DESC;
      `;

      const result = await r.query(perfSql);
      const sets = result.recordsets;
      return {
        consolidado: sets[0]?.[0] || {},
        porCidade: sets[1] || [],
      };
    };

    // ── Query 4: Filtros disponíveis ──
    const filtrosQuery = async () => {
      const r = pool.request();
      const optsSql = `
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
      `;
      const result = await r.query(optsSql);
      const sets = result.recordsets;
      return {
        pracas: (sets[0] || []).map(r => r.nome).filter(Boolean),
        exibidores: (sets[1] || []).map(r => r.nome).filter(Boolean),
        ambientes: ['PUBLIC', 'INDOOR'],
        periodos: ['7d', '30d', '90d', '180d'],
      };
    };

    const [ativos, pipeline, performance, opcoesFiltro] = await Promise.all([
      ativosQuery(),
      pipelineQuery(),
      performanceQuery(),
      filtrosQuery(),
    ]);

    // ── Health Score Calculation ──
    const kpi = ativos.kpi;
    const totalPontos = Number(kpi.total_pontos || 0);
    const totalPracas = Number(kpi.total_pracas || 0);
    const totalExibidores = Number(kpi.total_exibidores || 0);
    const comCoordenadas = Number(kpi.com_coordenadas || 0);
    const comPassantes = Number(kpi.com_passantes || 0);

    const coberturaScore = Math.min(100, totalPracas * 2);

    const hhi = Number(ativos.hhi) || 1;
    const diversidadeScore = Math.round((1 - hhi) * 100);

    const qualidadeCoordenadas = totalPontos > 0 ? (comCoordenadas / totalPontos) * 100 : 0;
    const qualidadePassantes = totalPontos > 0 ? (comPassantes / totalPontos) * 100 : 0;
    const qualidadeScore = Math.round((qualidadeCoordenadas * 0.6 + qualidadePassantes * 0.4));

    const pTotais = pipeline.totais;
    const totalRoteiros = Number(pTotais.total_roteiros || 0);
    const finalizados = Number(pTotais.finalizados || 0);
    const capacidadeScore = totalRoteiros > 0
      ? Math.round((finalizados / totalRoteiros) * 100)
      : 50;

    const healthScore = Math.round(
      coberturaScore * 0.25 +
      diversidadeScore * 0.25 +
      qualidadeScore * 0.25 +
      capacidadeScore * 0.25
    );

    // ── Assemble alerts ──
    const alertas = [];

    for (const item of ativos.lowInventory) {
      alertas.push({
        tipo: 'inventario_critico',
        severidade: 'Médio',
        modulo: 'Ativos',
        praca: item.praca,
        descricao: `Praça com inventário abaixo de 50% da média (${item.media} pts)`,
        metrica: `${item.pontos} pontos`,
        acao: 'Avaliar expansão de exibidores na praça',
      });
    }

    for (const item of ativos.concentration) {
      const sev = Number(item.share_pct) >= 80 ? 'Alto' : 'Médio';
      alertas.push({
        tipo: 'concentracao_exibidor',
        severidade: sev,
        modulo: 'Ativos',
        praca: item.praca,
        descricao: `${item.exibidor} concentra ${item.share_pct}% dos pontos`,
        metrica: `${item.pontos_exibidor}/${item.pontos_total}`,
        acao: 'Diversificar fornecedores na praça',
      });
    }

    for (const item of pipeline.travados) {
      alertas.push({
        tipo: 'roteiro_travado',
        severidade: 'Alto',
        modulo: 'Roteiros',
        praca: '-',
        descricao: `"${item.nome}" em processamento há ${item.horas_em_processamento}h`,
        metrica: `${item.horas_em_processamento}h`,
        acao: 'Verificar status do job no Databricks',
      });
    }

    alertas.sort((a, b) => {
      const order = { 'Alto': 0, 'Médio': 1, 'Info': 2 };
      return (order[a.severidade] ?? 3) - (order[b.severidade] ?? 3);
    });

    const totalPublic = Number(kpi.total_public || 0);
    const totalIndoor = Number(kpi.total_indoor || 0);

    return res.status(200).json({
      success: true,
      filtrosAplicados: { ambiente, praca: praca || null, exibidor: exibidor || null, periodo },

      healthScore: {
        score: healthScore,
        dimensoes: {
          cobertura: { score: coberturaScore, label: 'Cobertura de Praças', detail: `${totalPracas} praças ativas` },
          diversidade: { score: diversidadeScore, label: 'Diversidade de Exibidores', detail: `HHI: ${hhi.toFixed(3)}` },
          qualidade: { score: qualidadeScore, label: 'Qualidade de Dados', detail: `${Math.round(qualidadeCoordenadas)}% com coordenadas` },
          capacidade: { score: capacidadeScore, label: 'Capacidade Operacional', detail: `${finalizados}/${totalRoteiros} finalizados` },
        },
      },

      ativos: {
        kpis: {
          totalPontos,
          totalPracas,
          totalExibidores,
          percVP: totalPontos > 0 ? Number(((totalPublic * 100) / totalPontos).toFixed(1)) : 0,
          percIndoor: totalPontos > 0 ? Number(((totalIndoor * 100) / totalPontos).toFixed(1)) : 0,
          avgPassantes: Math.round(Number(kpi.avg_passantes || 0)),
        },
        rankingPracas: ativos.rankingPracas.map(r => ({
          nome: r.nome,
          pontos: r.pontos,
          avgPassantes: Math.round(Number(r.avg_passantes || 0)),
        })),
        rankingExibidores: ativos.rankingExibidores.map(r => ({
          nome: r.nome,
          pontos: r.pontos,
          pracasAtendidas: r.pracas_atendidas,
        })),
      },

      pipeline: {
        totalRoteiros: Number(pTotais.total_roteiros || 0),
        emProcessamento: Number(pTotais.em_processamento || 0),
        finalizados: Number(pTotais.finalizados || 0),
        totalPeriodo: pipeline.totalPeriodo,
        recentes: pipeline.recentes.map(r => ({
          id: r.id,
          nome: r.nome,
          emProgresso: Boolean(r.em_progresso),
          dataCriacao: r.data_criacao,
          semanas: r.semanas,
        })),
        travados: pipeline.travados.map(r => ({
          id: r.id,
          nome: r.nome,
          dataCriacao: r.data_criacao,
          horasEmProcessamento: r.horas_em_processamento,
        })),
      },

      performance: {
        consolidado: {
          totalRoteirosComDados: Number(performance.consolidado.total_roteiros_com_dados || 0),
          impactosTotal: Number(performance.consolidado.impactos_total || 0),
          coberturaMedia: Number(Number(performance.consolidado.cobertura_media || 0).toFixed(2)),
          frequenciaMedia: Number(Number(performance.consolidado.frequencia_media || 0).toFixed(2)),
          grpAcumulado: Number(Number(performance.consolidado.grp_acumulado || 0).toFixed(1)),
          pontosTotal: Number(performance.consolidado.pontos_total || 0),
          populacaoTotal: Number(performance.consolidado.populacao_total || 0),
        },
        porCidade: performance.porCidade.map(c => ({
          cidade: c.cidade,
          impactos: Number(c.impactos || 0),
          cobertura: Number(Number(c.cobertura || 0).toFixed(2)),
          frequencia: Number(Number(c.frequencia || 0).toFixed(2)),
          pontos: Number(c.pontos || 0),
        })),
      },

      alertas: alertas.slice(0, 25),
      opcoesFiltro,
    });
  } catch (error) {
    console.error('[home-indicadores-v2] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao carregar indicadores V2',
      message: error.message,
    });
  }
};
