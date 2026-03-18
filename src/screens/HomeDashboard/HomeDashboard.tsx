import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import api from "../../config/axios";
import { useDebounce } from "../../hooks/useDebounce";

/* ─── Types ─── */

interface HealthDimension {
  score: number;
  label: string;
  detail: string;
}

interface HealthScoreData {
  score: number;
  dimensoes: {
    cobertura: HealthDimension;
    diversidade: HealthDimension;
    qualidade: HealthDimension;
    capacidade: HealthDimension;
  };
}

interface AtivosKpis {
  totalPontos: number;
  totalPracas: number;
  totalExibidores: number;
  percVP: number;
  percIndoor: number;
  avgPassantes: number;
}

interface RankingPraca {
  nome: string;
  pontos: number;
  avgPassantes: number;
}

interface RankingExibidor {
  nome: string;
  pontos: number;
  pracasAtendidas: number;
}

interface PipelineRecente {
  id: number;
  nome: string;
  emProgresso: boolean;
  dataCriacao: string;
  semanas: number;
}

interface PipelineTravado {
  id: number;
  nome: string;
  dataCriacao: string;
  horasEmProcessamento: number;
}

interface PipelineData {
  totalRoteiros: number;
  emProcessamento: number;
  finalizados: number;
  totalPeriodo: number;
  recentes: PipelineRecente[];
  travados: PipelineTravado[];
}

interface PerformanceConsolidado {
  totalRoteirosComDados: number;
  impactosTotal: number;
  coberturaMedia: number;
  frequenciaMedia: number;
  grpAcumulado: number;
  pontosTotal: number;
  populacaoTotal: number;
}

interface PerformanceCidade {
  cidade: string;
  impactos: number;
  cobertura: number;
  frequencia: number;
  pontos: number;
}

interface AlertaItem {
  tipo: string;
  severidade: string;
  modulo: string;
  praca: string;
  descricao: string;
  metrica: string;
  acao: string;
}

interface DashboardV2Data {
  healthScore: HealthScoreData;
  ativos: {
    kpis: AtivosKpis;
    rankingPracas: RankingPraca[];
    rankingExibidores: RankingExibidor[];
  };
  pipeline: PipelineData;
  performance: {
    consolidado: PerformanceConsolidado;
    porCidade: PerformanceCidade[];
  };
  alertas: AlertaItem[];
  opcoesFiltro: {
    pracas: string[];
    exibidores: string[];
    ambientes: string[];
    periodos: string[];
  };
}

/* ─── Helpers ─── */

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v || 0);

const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v || 0);

const fmtPct = (v: number) => `${(v || 0).toFixed(1)}%`;

const scoreColor = (s: number) => {
  if (s >= 75) return { ring: "#22c55e", bg: "bg-emerald-50", text: "text-emerald-700", label: "Saudável" };
  if (s >= 50) return { ring: "#eab308", bg: "bg-amber-50", text: "text-amber-700", label: "Atenção" };
  return { ring: "#ef4444", bg: "bg-red-50", text: "text-red-700", label: "Crítico" };
};

const dimColor = (s: number) => {
  if (s >= 75) return "bg-emerald-500";
  if (s >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const sevBadge = (sev: string) => {
  if (sev === "Alto") return "bg-red-100 text-red-700";
  if (sev === "Médio") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
};

const normalizeApiError = (err: any, fallback: string) => {
  const c = err?.response?.data?.error ?? err?.response?.data?.message;
  if (typeof c === "string" && c.trim()) return c;
  if (c && typeof c === "object") {
    const composed = `${c.code ? String(c.code) : ""}${c.code && c.message ? ": " : ""}${c.message ? String(c.message) : ""}`.trim();
    if (composed) return composed;
  }
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallback;
};

/* ─── Gauge SVG ─── */

const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const s = Math.max(0, Math.min(100, score));
  const { ring, label } = scoreColor(s);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (s / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
        <text x="70" y="64" textAnchor="middle" className="text-3xl font-bold" fill="#222" fontSize="28" fontWeight="700">
          {s}
        </text>
        <text x="70" y="84" textAnchor="middle" fill="#757575" fontSize="11" fontWeight="500">
          {label}
        </text>
      </svg>
    </div>
  );
};

/* ─── Dimension Bar ─── */

const DimBar: React.FC<{ dim: HealthDimension }> = ({ dim }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600 font-medium">{dim.label}</span>
      <span className="font-bold text-gray-800">{dim.score}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${dimColor(dim.score)}`}
        style={{ width: `${dim.score}%`, transition: "width 0.6s ease" }}
      />
    </div>
    <p className="text-[10px] text-gray-400">{dim.detail}</p>
  </div>
);

/* ─── Progress Bar (ranking) ─── */

const RankBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = "bg-indigo-500" }) => (
  <div className="h-1.5 bg-gray-100 rounded-full flex-1 ml-2 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
  </div>
);

/* ─── Main Component ─── */

export const HomeDashboard: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [filtros, setFiltros] = useState({ ambiente: "", praca: "", exibidor: "", periodo: "30d" });

  const debouncedPraca = useDebounce(filtros.praca, 300);
  const debouncedExibidor = useDebounce(filtros.exibidor, 300);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await api.get("/home-indicadores-v2", {
        params: {
          ambiente: filtros.ambiente || undefined,
          praca: debouncedPraca || undefined,
          exibidor: debouncedExibidor || undefined,
          periodo: filtros.periodo || "30d",
        },
      });
      if (resp.data?.success) {
        setData(resp.data);
      } else {
        setError("Não foi possível carregar os indicadores.");
      }
    } catch (err: any) {
      console.error("Erro dashboard V2:", err);
      setError(normalizeApiError(err, "Erro ao carregar indicadores."));
    } finally {
      setLoading(false);
    }
  }, [filtros.ambiente, filtros.periodo, debouncedPraca, debouncedExibidor]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const selectPraca = useCallback((nome: string) => {
    setFiltros((f) => ({ ...f, praca: f.praca === nome ? "" : nome }));
  }, []);

  const selectExibidor = useCallback((nome: string) => {
    setFiltros((f) => ({ ...f, exibidor: f.exibidor === nome ? "" : nome }));
  }, []);

  const hs = data?.healthScore;
  const ativos = data?.ativos;
  const pipe = data?.pipeline;
  const perf = data?.performance;
  const alertas = data?.alertas || [];

  const maxPracaPontos = useMemo(
    () => Math.max(...(ativos?.rankingPracas || []).map((r) => r.pontos), 1),
    [ativos?.rankingPracas]
  );
  const maxExibPontos = useMemo(
    () => Math.max(...(ativos?.rankingExibidores || []).map((r) => r.pontos), 1),
    [ativos?.rankingExibidores]
  );

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div
        className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}
      >
        <Topbar menuReduzido={menuReduzido} breadcrumb={{ items: [{ label: "Home", path: "/" }] }} />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
        />

        <div className="w-full pt-20 flex-1 overflow-auto px-6 pb-10">
          {/* ═══ Header + Filtros ═══ */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-lg font-bold text-[#222]">Dashboard Colmeia</h1>
              <p className="text-xs text-gray-500 mt-0.5">Visão consolidada de ativos, roteiros e performance OOH</p>
            </div>
            <button
              type="button"
              onClick={carregar}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Carregando…" : "Atualizar"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
            <select
              value={filtros.ambiente}
              onChange={(e) => setFiltros((f) => ({ ...f, ambiente: e.target.value }))}
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Ambiente: Todos</option>
              <option value="PUBLIC">Vias Públicas</option>
              <option value="INDOOR">Indoor</option>
            </select>

            <select
              value={filtros.praca}
              onChange={(e) => setFiltros((f) => ({ ...f, praca: e.target.value }))}
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Praça: Todas</option>
              {(data?.opcoesFiltro?.pracas || []).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select
              value={filtros.exibidor}
              onChange={(e) => setFiltros((f) => ({ ...f, exibidor: e.target.value }))}
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Exibidor: Todos</option>
              {(data?.opcoesFiltro?.exibidores || []).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select
              value={filtros.periodo}
              onChange={(e) => setFiltros((f) => ({ ...f, periodo: e.target.value }))}
              className="h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="90d">90 dias</option>
              <option value="180d">180 dias</option>
            </select>

            <button
              type="button"
              onClick={() => setFiltros({ ambiente: "", praca: "", exibidor: "", periodo: "30d" })}
              className="h-9 px-3 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
          )}

          {loading && !data && (
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Carregando indicadores…</div>
          )}

          {data && (
            <>
              {/* ═══ Row 1: Health Score + KPIs ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                {/* Health Score */}
                <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 self-start">Health Score</h2>
                  {hs && <HealthGauge score={hs.score} />}
                  <div className="w-full mt-4 space-y-3">
                    {hs &&
                      Object.values(hs.dimensoes).map((dim) => (
                        <DimBar key={dim.label} dim={dim} />
                      ))}
                  </div>
                </div>

                {/* KPI cards */}
                <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Pontos Ativos", value: fmt(ativos?.kpis?.totalPontos || 0), sub: `Média ${fmtFull(ativos?.kpis?.avgPassantes || 0)} passantes/pto` },
                    { label: "Praças Cobertas", value: fmtFull(ativos?.kpis?.totalPracas || 0), sub: `${fmtPct(ativos?.kpis?.percVP || 0)} Vias Públicas` },
                    { label: "Exibidores Ativos", value: fmtFull(ativos?.kpis?.totalExibidores || 0), sub: `${fmtPct(ativos?.kpis?.percIndoor || 0)} Indoor` },
                    { label: "Roteiros Totais", value: fmtFull(pipe?.totalRoteiros || 0), sub: `${pipe?.emProcessamento || 0} em processamento` },
                    { label: "Finalizados", value: fmtFull(pipe?.finalizados || 0), sub: `${pipe?.totalPeriodo || 0} no período` },
                    { label: "Impactos OOH", value: fmt(perf?.consolidado?.impactosTotal || 0), sub: `GRP: ${(perf?.consolidado?.grpAcumulado || 0).toFixed(0)}` },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{kpi.label}</p>
                      <p className="text-2xl font-bold text-[#222] mt-1">{kpi.value}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{kpi.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Row 2: Rankings + Pipeline ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Top Praças */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Top Praças</h3>
                  <div className="space-y-2">
                    {(ativos?.rankingPracas || []).map((item, i) => (
                      <button
                        key={item.nome}
                        type="button"
                        onClick={() => selectPraca(item.nome)}
                        className={`w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors ${
                          filtros.praca === item.nome ? "bg-indigo-50 ring-1 ring-indigo-300" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">{item.nome}</span>
                            <span className="text-xs font-semibold text-[#222] ml-2">{fmt(item.pontos)}</span>
                          </div>
                          <RankBar value={item.pontos} max={maxPracaPontos} />
                        </div>
                      </button>
                    ))}
                    {(ativos?.rankingPracas || []).length === 0 && !loading && (
                      <p className="text-xs text-gray-400">Sem dados.</p>
                    )}
                  </div>
                </div>

                {/* Top Exibidores */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Top Exibidores</h3>
                  <div className="space-y-2">
                    {(ativos?.rankingExibidores || []).map((item, i) => (
                      <button
                        key={item.nome}
                        type="button"
                        onClick={() => selectExibidor(item.nome)}
                        className={`w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors ${
                          filtros.exibidor === item.nome ? "bg-violet-50 ring-1 ring-violet-300" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">{item.nome}</span>
                            <span className="text-xs font-semibold text-[#222] ml-2">{fmt(item.pontos)}</span>
                          </div>
                          <RankBar value={item.pontos} max={maxExibPontos} color="bg-violet-500" />
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.pracasAtendidas} praças</p>
                        </div>
                      </button>
                    ))}
                    {(ativos?.rankingExibidores || []).length === 0 && !loading && (
                      <p className="text-xs text-gray-400">Sem dados.</p>
                    )}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Pipeline de Roteiros</h3>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-100 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#222]">{pipe?.totalRoteiros || 0}</p>
                      <p className="text-[9px] uppercase text-gray-400 font-medium">Total</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">{pipe?.emProcessamento || 0}</p>
                      <p className="text-[9px] uppercase text-gray-400 font-medium">Processando</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">{pipe?.finalizados || 0}</p>
                      <p className="text-[9px] uppercase text-gray-400 font-medium">Finalizados</p>
                    </div>
                  </div>

                  {(pipe?.travados || []).length > 0 && (
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2.5 mb-3">
                      <p className="text-[10px] font-bold uppercase text-gray-600 mb-1">Em risco ({pipe?.travados.length})</p>
                      {pipe?.travados.map((t) => (
                        <p key={t.id} className="text-[11px] text-gray-700 truncate">
                          {t.nome} — {t.horasEmProcessamento}h
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Recentes</p>
                  <div className="flex-1 overflow-auto space-y-1.5">
                    {(pipe?.recentes || []).map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            r.emProgresso ? "bg-gray-500 animate-pulse" : "bg-gray-400"
                          }`}
                        />
                        <span className="truncate flex-1 text-gray-700">{r.nome}</span>
                        <span className="text-gray-400 text-[10px] whitespace-nowrap">
                          {new Date(r.dataCriacao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    ))}
                    {(pipe?.recentes || []).length === 0 && !loading && (
                      <p className="text-xs text-gray-400">Nenhum roteiro recente.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ Row 3: Performance OOH + Alertas ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Performance */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-4">Performance OOH Consolidada</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Impactos", value: fmt(perf?.consolidado?.impactosTotal || 0) },
                      { label: "Cobertura", value: fmtPct(perf?.consolidado?.coberturaMedia || 0) },
                      { label: "Frequência", value: (perf?.consolidado?.frequenciaMedia || 0).toFixed(1) },
                      { label: "GRP", value: fmt(perf?.consolidado?.grpAcumulado || 0) },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-xl font-bold text-[#222]">{m.value}</p>
                        <p className="text-[10px] uppercase text-gray-400 font-medium mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Eficiência por Praça</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                          <th className="py-1.5 pr-3 font-medium">Cidade</th>
                          <th className="py-1.5 pr-3 font-medium text-right">Impactos</th>
                          <th className="py-1.5 pr-3 font-medium text-right">Cobertura</th>
                          <th className="py-1.5 font-medium text-right">Freq.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(perf?.porCidade || []).map((c) => (
                          <tr key={c.cidade} className="border-b border-gray-50">
                            <td className="py-1.5 pr-3 text-gray-700">{c.cidade}</td>
                            <td className="py-1.5 pr-3 text-right font-medium text-[#222]">{fmt(c.impactos)}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-600">{fmtPct(c.cobertura)}</td>
                            <td className="py-1.5 text-right text-gray-600">{c.frequencia.toFixed(1)}</td>
                          </tr>
                        ))}
                        {(perf?.porCidade || []).length === 0 && !loading && (
                          <tr>
                            <td colSpan={4} className="py-3 text-gray-400 text-center">
                              Sem dados de performance disponíveis.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Alertas */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-4">
                    Alertas Inteligentes
                    {alertas.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                        {alertas.length}
                      </span>
                    )}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                          <th className="py-1.5 pr-2 font-medium">Sev.</th>
                          <th className="py-1.5 pr-2 font-medium">Módulo</th>
                          <th className="py-1.5 pr-2 font-medium">Praça</th>
                          <th className="py-1.5 pr-2 font-medium">Descrição</th>
                          <th className="py-1.5 font-medium">Ação Recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertas.slice(0, 12).map((a, idx) => (
                          <tr key={`${a.tipo}-${idx}`} className="border-b border-gray-50">
                            <td className="py-1.5 pr-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${sevBadge(a.severidade)}`}>
                                {a.severidade}
                              </span>
                            </td>
                            <td className="py-1.5 pr-2 text-gray-500">{a.modulo}</td>
                            <td className="py-1.5 pr-2 text-gray-700">{a.praca}</td>
                            <td className="py-1.5 pr-2 text-gray-700">{a.descricao}</td>
                            <td className="py-1.5 text-gray-500 italic">{a.acao}</td>
                          </tr>
                        ))}
                        {alertas.length === 0 && !loading && (
                          <tr>
                            <td colSpan={5} className="py-3 text-gray-400 text-center">
                              Nenhum alerta no momento.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
