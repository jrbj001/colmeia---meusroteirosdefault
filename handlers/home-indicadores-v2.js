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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
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

      const coberturaSql = `
        WITH praca_counts AS (
          SELECT cidade_st, COUNT(*) AS pontos
          FROM [serv_product_be180].[bancoAtivosJoin_ft]
          WHERE ${whereClause}
          GROUP BY cidade_st
        ),
        stats AS (
          SELECT AVG(CAST(pontos AS FLOAT)) AS avg_pontos FROM praca_counts
        )
        SELECT
          COUNT(*) AS total_pracas_analisadas,
          SUM(CASE WHEN pc.pontos >= (s.avg_pontos * 0.5) THEN 1 ELSE 0 END) AS pracas_equilibradas,
          AVG(CAST(pc.pontos AS FLOAT)) AS media_pontos_praca
        FROM praca_counts pc
        CROSS JOIN stats s;
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

      const heatmapSql = `
        SELECT TOP 1200
          ROUND(CAST(latitude AS FLOAT), 2) AS lat,
          ROUND(CAST(longitude AS FLOAT), 2) AS lng,
          COUNT(*) AS oferta,
          SUM(CAST(ISNULL(pedestrian_flow, 0) AS FLOAT)) AS demanda,
          COUNT(DISTINCT cidade_st) AS cidades_no_cluster
        FROM [serv_product_be180].[bancoAtivosJoin_ft]
        WHERE ${whereClause}
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND latitude BETWEEN -35 AND 6
          AND longitude BETWEEN -75 AND -30
        GROUP BY
          ROUND(CAST(latitude AS FLOAT), 2),
          ROUND(CAST(longitude AS FLOAT), 2)
        ORDER BY COUNT(*) DESC;
      `;

      const fullSql = kpiSql + rankPracasSql + rankExibSql + hhiSql + coberturaSql + lowInvSql + concSql + heatmapSql;
      const result = await r.query(fullSql);
      const sets = result.recordsets;
      const heatRows = sets[7] || [];
      const maxOferta = Math.max(...heatRows.map((r2) => toNumber(r2.oferta)), 1);
      const maxDemanda = Math.max(...heatRows.map((r2) => toNumber(r2.demanda)), 1);

      const heatmap = heatRows.map((r2) => {
        const ofertaNorm = clamp(toNumber(r2.oferta) / maxOferta, 0, 1);
        const demandaNorm = clamp(toNumber(r2.demanda) / maxDemanda, 0, 1);
        const oportunidade = clamp((demandaNorm - ofertaNorm + 1) / 2, 0, 1);
        return {
          lat: toNumber(r2.lat),
          lng: toNumber(r2.lng),
          oferta: round(ofertaNorm, 4),
          demanda: round(demandaNorm, 4),
          oportunidade: round(oportunidade, 4),
          ofertaBruta: toNumber(r2.oferta),
          demandaBruta: round(toNumber(r2.demanda), 0),
          cidadesNoCluster: toNumber(r2.cidades_no_cluster),
        };
      });

      return {
        kpi: sets[0]?.[0] || {},
        rankingPracas: sets[1] || [],
        rankingExibidores: sets[2] || [],
        hhi: sets[3]?.[0]?.hhi ?? 1,
        coberturaStats: sets[4]?.[0] || {},
        lowInventory: sets[5] || [],
        concentration: sets[6] || [],
        heatmap,
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

        SELECT
          AVG(CAST(DATEDIFF(HOUR, date_dh, GETDATE()) AS FLOAT)) AS idade_media_horas_finalizados
        FROM [serv_product_be180].[planoMidiaGrupo_dm_vw]
        WHERE delete_bl = 0
          AND inProgress_bl = 0
          AND date_dh >= DATEADD(DAY, -@days, GETDATE());
      `;

      const result = await r.query(pipelineSql);
      const sets = result.recordsets;
      return {
        totais: sets[0]?.[0] || {},
        recentes: sets[1] || [],
        travados: sets[2] || [],
        totalPeriodo: sets[3]?.[0]?.total_periodo || 0,
        idadeMediaHorasFinalizados: sets[4]?.[0]?.idade_media_horas_finalizados || 0,
      };
    };

    // ── Query 3: Performance OOH (roteiros finalizados) ──
    const performanceQuery = async () => {
      const r = pool.request();
      r.input('days', sql.Int, days);

      const perfSql = `
        SELECT
          COUNT(DISTINCT rpt.report_pk) AS total_roteiros_com_dados,
          SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS BIGINT)) AS impactos_total,
          CASE
            WHEN SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT)) > 0
              THEN SUM(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT) * CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT))
                / SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT))
            ELSE AVG(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT))
          END AS cobertura_media,
          CASE
            WHEN SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT)) > 0
              THEN SUM(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT) * CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT))
                / SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT))
            ELSE AVG(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT))
          END AS frequencia_media,
          SUM(CAST(ISNULL(rpt.grp_vl, 0) AS FLOAT)) AS grp_acumulado,
          SUM(CAST(ISNULL(rpt.pontosPracaTotal_vl, 0) AS BIGINT)) AS pontos_total,
          SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS BIGINT)) AS populacao_total
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw] rpt
        INNER JOIN [serv_product_be180].[planoMidiaGrupo_dm_vw] pmg
          ON pmg.planoMidiaGrupo_pk = rpt.report_pk
        WHERE pmg.delete_bl = 0
          AND pmg.date_dh >= DATEADD(DAY, -@days, GETDATE());

        SELECT TOP 10
          rpt.cidade_st AS cidade,
          SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS BIGINT)) AS impactos,
          CASE
            WHEN SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT)) > 0
              THEN SUM(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT) * CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT))
                / SUM(CAST(ISNULL(rpt.populacaoTotal_vl, 0) AS FLOAT))
            ELSE AVG(CAST(ISNULL(rpt.coberturaProp_vl, 0) AS FLOAT))
          END AS cobertura,
          CASE
            WHEN SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT)) > 0
              THEN SUM(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT) * CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT))
                / SUM(CAST(ISNULL(rpt.impactosTotal_vl, 0) AS FLOAT))
            ELSE AVG(CAST(ISNULL(rpt.frequencia_vl, 0) AS FLOAT))
          END AS frequencia,
          SUM(CAST(ISNULL(rpt.pontosPracaTotal_vl, 0) AS INT)) AS pontos
        FROM [serv_product_be180].[reportDataIndicadoresViasPublicasTotal_dm_vw] rpt
        INNER JOIN [serv_product_be180].[planoMidiaGrupo_dm_vw] pmg
          ON pmg.planoMidiaGrupo_pk = rpt.report_pk
        WHERE pmg.delete_bl = 0
          AND pmg.date_dh >= DATEADD(DAY, -@days, GETDATE())
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

    // ── Health Score Calculation (metodologia revisada) ──
    const kpi = ativos.kpi;
    const totalPontos = toNumber(kpi.total_pontos);
    const totalPracas = toNumber(kpi.total_pracas);
    const totalExibidores = toNumber(kpi.total_exibidores);
    const comCoordenadas = toNumber(kpi.com_coordenadas);
    const comPassantes = toNumber(kpi.com_passantes);
    const totalPublic = toNumber(kpi.total_public);
    const totalIndoor = toNumber(kpi.total_indoor);

    const coberturaTotalPracas = toNumber(ativos.coberturaStats.total_pracas_analisadas);
    const pracasEquilibradas = toNumber(ativos.coberturaStats.pracas_equilibradas);
    const mediaPontosPraca = toNumber(ativos.coberturaStats.media_pontos_praca);
    const coberturaScore = clamp(round(coberturaTotalPracas > 0 ? (pracasEquilibradas / coberturaTotalPracas) * 100 : 0));

    const hhi = clamp(toNumber(ativos.hhi, 1), 0, 1);
    const diversidadeDenominador = totalExibidores > 1 ? (1 - (1 / totalExibidores)) : 0;
    const diversidadeRaw = diversidadeDenominador > 0 ? ((1 - hhi) / diversidadeDenominador) * 100 : 0;
    const diversidadeScore = clamp(round(diversidadeRaw));

    const qualidadeCoordenadas = totalPontos > 0 ? (comCoordenadas / totalPontos) * 100 : 0;
    const qualidadePassantes = totalPontos > 0 ? (comPassantes / totalPontos) * 100 : 0;
    const qualidadeScore = clamp(round((qualidadeCoordenadas * 0.5) + (qualidadePassantes * 0.5)));

    const pTotais = pipeline.totais;
    const totalRoteiros = toNumber(pTotais.total_roteiros);
    const finalizados = toNumber(pTotais.finalizados);
    const travados = Array.isArray(pipeline.travados) ? pipeline.travados.length : 0;
    const finalizacaoRate = totalRoteiros > 0 ? (finalizados / totalRoteiros) * 100 : 50;
    const travamentoPenalty = totalRoteiros > 0 ? ((travados / totalRoteiros) * 100) * 0.5 : 0;
    const capacidadeScore = clamp(round(finalizacaoRate - travamentoPenalty));

    const pesos = {
      cobertura: 0.30,
      diversidade: 0.25,
      qualidade: 0.25,
      capacidade: 0.20,
    };

    const healthScore = clamp(round(
      (coberturaScore * pesos.cobertura) +
      (diversidadeScore * pesos.diversidade) +
      (qualidadeScore * pesos.qualidade) +
      (capacidadeScore * pesos.capacidade)
    ));

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

    return res.status(200).json({
      success: true,
      filtrosAplicados: { ambiente, praca: praca || null, exibidor: exibidor || null, periodo },

      healthScore: {
        score: healthScore,
        dimensoes: {
          cobertura: {
            score: coberturaScore,
            label: 'Cobertura de Praças',
            detail: `${pracasEquilibradas}/${coberturaTotalPracas} praças com inventário >= 50% da média (${round(mediaPontosPraca)} pts)`,
          },
          diversidade: {
            score: diversidadeScore,
            label: 'Diversidade de Exibidores',
            detail: `HHI normalizado: ${round(hhi, 3)} com ${totalExibidores} exibidores`,
          },
          qualidade: {
            score: qualidadeScore,
            label: 'Qualidade de Dados',
            detail: `${round(qualidadeCoordenadas, 1)}% com coordenadas e ${round(qualidadePassantes, 1)}% com passantes`,
          },
          capacidade: {
            score: capacidadeScore,
            label: 'Capacidade Operacional',
            detail: `${finalizados}/${totalRoteiros} finalizados | penalidade de travamento: ${round(travamentoPenalty, 1)} pts`,
          },
        },
      },

      ativos: {
        kpis: {
          totalPontos,
          totalPracas,
          totalExibidores,
          percVP: totalPontos > 0 ? round((totalPublic * 100) / totalPontos, 1) : 0,
          percIndoor: totalPontos > 0 ? round((totalIndoor * 100) / totalPontos, 1) : 0,
          avgPassantes: round(toNumber(kpi.avg_passantes)),
        },
        rankingPracas: ativos.rankingPracas.map(r => ({
          nome: r.nome,
          pontos: toNumber(r.pontos),
          avgPassantes: round(toNumber(r.avg_passantes)),
        })),
        rankingExibidores: ativos.rankingExibidores.map(r => ({
          nome: r.nome,
          pontos: toNumber(r.pontos),
          pracasAtendidas: toNumber(r.pracas_atendidas),
        })),
        heatmap: ativos.heatmap,
      },

      pipeline: {
        totalRoteiros: toNumber(pTotais.total_roteiros),
        emProcessamento: toNumber(pTotais.em_processamento),
        finalizados: toNumber(pTotais.finalizados),
        totalPeriodo: toNumber(pipeline.totalPeriodo),
        idadeMediaHorasFinalizados: round(toNumber(pipeline.idadeMediaHorasFinalizados), 1),
        recentes: pipeline.recentes.map(r => ({
          id: toNumber(r.id),
          nome: r.nome,
          emProgresso: Boolean(r.em_progresso),
          dataCriacao: r.data_criacao,
          semanas: toNumber(r.semanas),
        })),
        travados: pipeline.travados.map(r => ({
          id: toNumber(r.id),
          nome: r.nome,
          dataCriacao: r.data_criacao,
          horasEmProcessamento: toNumber(r.horas_em_processamento),
        })),
      },

      performance: {
        consolidado: {
          totalRoteirosComDados: toNumber(performance.consolidado.total_roteiros_com_dados),
          impactosTotal: toNumber(performance.consolidado.impactos_total),
          coberturaMedia: round(toNumber(performance.consolidado.cobertura_media), 2),
          frequenciaMedia: round(toNumber(performance.consolidado.frequencia_media), 2),
          grpAcumulado: round(toNumber(performance.consolidado.grp_acumulado), 1),
          pontosTotal: toNumber(performance.consolidado.pontos_total),
          populacaoTotal: toNumber(performance.consolidado.populacao_total),
        },
        porCidade: performance.porCidade.map(c => ({
          cidade: c.cidade,
          impactos: toNumber(c.impactos),
          cobertura: round(toNumber(c.cobertura), 2),
          frequencia: round(toNumber(c.frequencia), 2),
          pontos: toNumber(c.pontos),
        })),
      },

      metodologia: {
        healthScore: {
          versao: '2.1',
          pesos,
          formulas: {
            cobertura: 'pracas_equilibradas / total_pracas_analisadas * 100',
            diversidade: '((1 - HHI) / (1 - 1/N_exibidores)) * 100',
            qualidade: '0.5*(%com_coordenadas) + 0.5*(%com_passantes)',
            capacidade: 'taxa_finalizacao - 0.5*(%roteiros_travados)',
            scoreFinal: 'Σ(score_dimensao * peso_dimensao)',
          },
          insumos: {
            totalPontos,
            totalPracas,
            totalExibidores,
            pracasEquilibradas,
            coberturaTotalPracas,
            hhi: round(hhi, 4),
            percentualComCoordenadas: round(qualidadeCoordenadas, 2),
            percentualComPassantes: round(qualidadePassantes, 2),
            totalRoteiros,
            finalizados,
            travados,
            travamentoPenalty: round(travamentoPenalty, 2),
          },
        },
        indicadores: {
          percVP: 'total_public / total_pontos * 100',
          percIndoor: 'total_indoor / total_pontos * 100',
          coberturaMedia: 'media ponderada por populacao',
          frequenciaMedia: 'media ponderada por impactos',
          grpAcumulado: 'soma de grp_vl no periodo selecionado',
          periodoAnaliseDias: days,
        },
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
