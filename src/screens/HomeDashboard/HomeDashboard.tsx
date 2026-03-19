import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import api from "../../config/axios";
import { useDebounce } from "../../hooks/useDebounce";
import { Circle, MapContainer, TileLayer, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";

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

interface HeatPoint {
  lat: number;
  lng: number;
  oferta: number;
  demanda: number;
  oportunidade: number;
  ofertaBruta: number;
  demandaBruta: number;
  cidadesNoCluster: number;
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
    heatmap: HeatPoint[];
  };
  pipeline: PipelineData;
  performance: {
    consolidado: PerformanceConsolidado;
    porCidade: PerformanceCidade[];
  };
  alertas: AlertaItem[];
  metodologia?: {
    healthScore?: {
      versao?: string;
      pesos?: {
        cobertura: number;
        diversidade: number;
        qualidade: number;
        capacidade: number;
      };
      formulas?: {
        cobertura: string;
        diversidade: string;
        qualidade: string;
        capacidade: string;
        scoreFinal: string;
      };
      insumos?: Record<string, number | string>;
    };
    indicadores?: {
      percVP?: string;
      percIndoor?: string;
      coberturaMedia?: string;
      frequenciaMedia?: string;
      grpAcumulado?: string;
      periodoAnaliseDias?: number;
    };
  };
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

const RankBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = "bg-gray-500" }) => (
  <div className="h-1.5 bg-gray-100 border border-gray-200 rounded-full flex-1 ml-2 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
  </div>
);

const HeatFitBounds: React.FC<{ points: HeatPoint[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
  }, [map, points]);
  return null;
};

const InfoIconButton: React.FC<{ onClick: () => void; title: string }> = ({ onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9h.01M11 12h1v4h1m-1 6a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  </button>
);

/* ─── Main Component ─── */

export const HomeDashboard: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [filtros, setFiltros] = useState({ ambiente: "", praca: "", exibidor: "", periodo: "30d" });
  const [metodoModal, setMetodoModal] = useState<"health" | "indicadores" | null>(null);
  const [heatMode, setHeatMode] = useState<"oferta" | "demanda" | "oportunidade">("oportunidade");

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

  const hs = data?.healthScore;
  const ativos = data?.ativos;
  const pipe = data?.pipeline;
  const perf = data?.performance;
  const metodologia = data?.metodologia;
  const heatmapPoints = ativos?.heatmap || [];

  const displayedHeatPoints = useMemo(() => {
    const sorted = [...heatmapPoints].sort((a, b) => {
      if (heatMode === "oferta") return b.oferta - a.oferta;
      if (heatMode === "demanda") return b.demanda - a.demanda;
      return b.oportunidade - a.oportunidade;
    });
    return sorted.slice(0, 700);
  }, [heatmapPoints, heatMode]);

  const heatColor = useCallback((weight: number, mode: "oferta" | "demanda" | "oportunidade") => {
    const w = Math.max(0, Math.min(1, weight));
    if (mode === "oferta") {
      if (w > 0.8) return "#dc2626";
      if (w > 0.6) return "#ea580c";
      if (w > 0.4) return "#f59e0b";
      if (w > 0.2) return "#facc15";
      return "#fde68a";
    }
    if (mode === "demanda") {
      if (w > 0.8) return "#7c2d12";
      if (w > 0.6) return "#b45309";
      if (w > 0.4) return "#d97706";
      if (w > 0.2) return "#f59e0b";
      return "#fde68a";
    }
    if (w > 0.8) return "#b91c1c";
    if (w > 0.6) return "#ea580c";
    if (w > 0.4) return "#f59e0b";
    if (w > 0.2) return "#fbbf24";
    return "#fde68a";
  }, []);

  const heatWeight = useCallback((point: HeatPoint, mode: "oferta" | "demanda" | "oportunidade") => {
    if (mode === "oferta") return point.oferta;
    if (mode === "demanda") return point.demanda;
    return point.oportunidade;
  }, []);

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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#222]">Dashboard Colmeia</h1>
                <InfoIconButton onClick={() => setMetodoModal("indicadores")} title="Como calculamos os indicadores" />
              </div>
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
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm bg-gray-50 border border-gray-200 rounded-xl">
              Carregando indicadores…
            </div>
          )}

          {data && (
            <>
              {/* ═══ Row 1: Health Score + KPIs ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                {/* Health Score */}
                <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">Health Score</h2>
                    <InfoIconButton onClick={() => setMetodoModal("health")} title="Metodologia do Health Score" />
                  </div>
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
                    {
                      label: "Pontos Ativos",
                      value: fmt(ativos?.kpis?.totalPontos || 0),
                      sub: `Média ${fmtFull(ativos?.kpis?.avgPassantes || 0)} passantes/pto`,
                      tone: "bg-gray-600",
                    },
                    {
                      label: "Praças Cobertas",
                      value: fmtFull(ativos?.kpis?.totalPracas || 0),
                      sub: `${fmtPct(ativos?.kpis?.percVP || 0)} Vias Públicas`,
                      tone: "bg-gray-500",
                    },
                    {
                      label: "Exibidores Ativos",
                      value: fmtFull(ativos?.kpis?.totalExibidores || 0),
                      sub: `${fmtPct(ativos?.kpis?.percIndoor || 0)} Indoor`,
                      tone: "bg-gray-500",
                    },
                    {
                      label: "Roteiros Totais",
                      value: fmtFull(pipe?.totalRoteiros || 0),
                      sub: `${pipe?.emProcessamento || 0} em processamento`,
                      tone: "bg-gray-500",
                    },
                    {
                      label: "Finalizados",
                      value: fmtFull(pipe?.finalizados || 0),
                      sub: `${pipe?.totalPeriodo || 0} no período`,
                      tone: "bg-gray-500",
                    },
                    {
                      label: "Impactos OOH",
                      value: fmt(perf?.consolidado?.impactosTotal || 0),
                      sub: `GRP: ${(perf?.consolidado?.grpAcumulado || 0).toFixed(0)}`,
                      tone: "bg-gray-600",
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    >
                      <div className={`absolute left-0 top-0 h-1 w-full ${kpi.tone}`} />
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mt-1">{kpi.label}</p>
                      <p className="text-3xl leading-none font-bold text-[#1f2937] mt-2">{kpi.value}</p>
                      <div className="mt-4 border-t border-gray-200 pt-2">
                        <p className="text-[10px] text-gray-500">{kpi.sub}</p>
                      </div>
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
                      <div
                        key={item.nome}
                        className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 border border-gray-100 bg-white"
                      >
                        <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">{item.nome}</span>
                            <span className="text-xs font-semibold text-[#222] ml-2">{fmt(item.pontos)}</span>
                          </div>
                          <RankBar value={item.pontos} max={maxPracaPontos} />
                        </div>
                      </div>
                    ))}
                    {(ativos?.rankingPracas || []).length === 0 && !loading && (
                      <p className="text-xs text-gray-400 border border-gray-100 bg-gray-50 rounded-lg px-2 py-2">Sem dados.</p>
                    )}
                  </div>
                </div>

                {/* Top Exibidores */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Top Exibidores</h3>
                  <div className="space-y-2">
                    {(ativos?.rankingExibidores || []).map((item, i) => (
                      <div
                        key={item.nome}
                        className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 border border-gray-100 bg-white"
                      >
                        <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">{item.nome}</span>
                            <span className="text-xs font-semibold text-[#222] ml-2">{fmt(item.pontos)}</span>
                          </div>
                          <RankBar value={item.pontos} max={maxExibPontos} color="bg-gray-500" />
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.pracasAtendidas} praças</p>
                        </div>
                      </div>
                    ))}
                    {(ativos?.rankingExibidores || []).length === 0 && !loading && (
                      <p className="text-xs text-gray-400 border border-gray-100 bg-gray-50 rounded-lg px-2 py-2">Sem dados.</p>
                    )}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Pipeline de Roteiros</h3>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#222]">{pipe?.totalRoteiros || 0}</p>
                      <p className="text-[9px] uppercase text-gray-400 font-medium">Total</p>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-700">{pipe?.emProcessamento || 0}</p>
                      <p className="text-[9px] uppercase text-gray-400 font-medium">Processando</p>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-center">
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
                      <div key={r.id} className="flex items-center gap-2 text-xs border border-gray-100 rounded-md px-2 py-1">
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
                      <p className="text-xs text-gray-400 border border-gray-100 bg-gray-50 rounded-lg px-2 py-2">Nenhum roteiro recente.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ Row 3: Performance em Cards ═══ */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Mapa de Calor Geoespacial</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase">Camada</span>
                    <select
                      value={heatMode}
                      onChange={(e) => setHeatMode(e.target.value as "oferta" | "demanda" | "oportunidade")}
                      className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="oferta">Oferta (inventário)</option>
                      <option value="demanda">Demanda (passantes)</option>
                      <option value="oportunidade">Oportunidade (demanda - oferta)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 mb-3">
                  {heatMode === "oferta" && "Mostra concentração de inventário por célula geográfica."}
                  {heatMode === "demanda" && "Mostra concentração de fluxo estimado de passantes por célula."}
                  {heatMode === "oportunidade" && "Mostra áreas com potencial de demanda superior à oferta atual."}
                </div>

                <div className="h-[360px] rounded-xl border border-gray-200 overflow-hidden">
                  {displayedHeatPoints.length > 0 ? (
                    <MapContainer center={[-15.78, -47.93]} zoom={5} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                      <ZoomControl position="bottomright" />
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      <HeatFitBounds points={displayedHeatPoints} />
                      {displayedHeatPoints.map((point, idx) => {
                        const w = heatWeight(point, heatMode);
                        const radius = 1800 + (w * 6800);
                        const color = heatColor(w, heatMode);
                        const opacity = 0.12 + (w * 0.3);
                        return (
                          <Circle
                            key={`${point.lat}-${point.lng}-${idx}`}
                            center={[point.lat, point.lng]}
                            radius={radius}
                            pathOptions={{
                              color,
                              weight: 0,
                              fillColor: color,
                              fillOpacity: opacity,
                            }}
                          />
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                      Sem dados geográficos para os filtros selecionados.
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-[#fde68a]" />
                    <span>Baixa intensidade</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-[#f59e0b] ml-3" />
                    <span>Média</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-[#b91c1c] ml-3" />
                    <span>Alta intensidade</span>
                  </div>
                  <span>{displayedHeatPoints.length} células exibidas</span>
                </div>
              </div>

              {/* ═══ Row 4: Performance em Cards ═══ */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-4">Performance OOH Consolidada</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                  {[
                    { label: "Impactos", value: fmt(perf?.consolidado?.impactosTotal || 0) },
                    { label: "Cobertura", value: fmtPct(perf?.consolidado?.coberturaMedia || 0) },
                    { label: "Frequência", value: (perf?.consolidado?.frequenciaMedia || 0).toFixed(1) },
                    { label: "GRP", value: fmt(perf?.consolidado?.grpAcumulado || 0) },
                    { label: "Roteiros com dados", value: fmtFull(perf?.consolidado?.totalRoteirosComDados || 0) },
                    { label: "População", value: fmt(perf?.consolidado?.populacaoTotal || 0) },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-lg font-bold text-[#222]">{m.value}</p>
                      <p className="text-[10px] uppercase text-gray-400 font-medium mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Top praças por impacto</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(perf?.porCidade || []).slice(0, 6).map((c) => (
                    <div key={c.cidade} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 truncate">{c.cidade}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] text-gray-500">Impactos: <span className="font-semibold text-gray-700">{fmt(c.impactos)}</span></p>
                        <p className="text-[11px] text-gray-500">Cobertura: <span className="font-semibold text-gray-700">{fmtPct(c.cobertura)}</span></p>
                        <p className="text-[11px] text-gray-500">Frequência: <span className="font-semibold text-gray-700">{c.frequencia.toFixed(1)}</span></p>
                      </div>
                    </div>
                  ))}
                  {(perf?.porCidade || []).length === 0 && !loading && (
                    <p className="text-xs text-gray-400 border border-gray-100 bg-gray-50 rounded-lg px-2 py-2">
                      Sem dados de performance disponíveis.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {metodoModal && (
            <div
              className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4"
              onClick={() => setMetodoModal(null)}
            >
              <div
                className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white border border-gray-200 shadow-xl p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-800">
                    {metodoModal === "health" ? "Metodologia do Health Score" : "Metodologia dos Indicadores"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMetodoModal(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {metodoModal === "health" ? (
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="text-xs text-gray-500">
                      Versão: {metodologia?.healthScore?.versao || "2.1"} | Score final = soma ponderada das 4 dimensões.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Cobertura</p>
                        <p className="text-xs">{metodologia?.healthScore?.formulas?.cobertura || "pracas_equilibradas / total_pracas_analisadas * 100"}</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Diversidade</p>
                        <p className="text-xs">{metodologia?.healthScore?.formulas?.diversidade || "((1 - HHI) / (1 - 1/N_exibidores)) * 100"}</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Qualidade</p>
                        <p className="text-xs">{metodologia?.healthScore?.formulas?.qualidade || "0.5*(%com_coordenadas) + 0.5*(%com_passantes)"}</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Capacidade</p>
                        <p className="text-xs">{metodologia?.healthScore?.formulas?.capacidade || "taxa_finalizacao - 0.5*(%roteiros_travados)"}</p>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] uppercase font-semibold text-gray-500 mb-2">Pesos</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">Cobertura: {Math.round((metodologia?.healthScore?.pesos?.cobertura || 0.3) * 100)}%</div>
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">Diversidade: {Math.round((metodologia?.healthScore?.pesos?.diversidade || 0.25) * 100)}%</div>
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">Qualidade: {Math.round((metodologia?.healthScore?.pesos?.qualidade || 0.25) * 100)}%</div>
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">Capacidade: {Math.round((metodologia?.healthScore?.pesos?.capacidade || 0.2) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Indicadores de Ativos</p>
                      <p className="text-xs">% VP: {metodologia?.indicadores?.percVP || "total_public / total_pontos * 100"}</p>
                      <p className="text-xs">% Indoor: {metodologia?.indicadores?.percIndoor || "total_indoor / total_pontos * 100"}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-[11px] uppercase font-semibold text-gray-500 mb-1">Performance OOH</p>
                      <p className="text-xs">Cobertura média: {metodologia?.indicadores?.coberturaMedia || "média ponderada por população"}</p>
                      <p className="text-xs">Frequência média: {metodologia?.indicadores?.frequenciaMedia || "média ponderada por impactos"}</p>
                      <p className="text-xs">GRP acumulado: {metodologia?.indicadores?.grpAcumulado || "soma de grp_vl no período selecionado"}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      Janela de análise do período atual: {metodologia?.indicadores?.periodoAnaliseDias || 30} dias.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
