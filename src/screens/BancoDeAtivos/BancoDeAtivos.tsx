import React from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import api from '../../config/axios';
import { MapContainer, TileLayer, CircleMarker, ZoomControl, Tooltip, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// ── Types ──────────────────────────────────────────────────────────────

interface DashboardData {
  total: { pontos_midia: number; pracas: number; exibidores: number };
  vias_publicas: { pontos_midia: number; pracas: number; exibidores: number };
  indoor: { pontos_midia: number; pracas: number; exibidores: number };
}

interface CityBubble {
  cidade: string;
  estado: string;
  lat: number;
  lon: number;
  total_pontos: number;
  total_passantes: number;
  total_impactos: number;
  pontos_public: number;
  pontos_indoor: number;
}

interface PontoMidia {
  id: number;
  code: string;
  latitude: number;
  longitude: number;
  exibidor: string;
  tipo_midia: string;
  ambiente: string;
  cidade: string;
  bairro: string;
  rating: string;
  passantes: number;
  impactos_ipv: number;
  grupo_midia: string;
}

interface Perimetro {
  city_id: number | null;
  cidade_st: string;
  estado_st?: string;
  latitude_min_vl: number;
  latitude_max_vl: number;
  longitude_min_vl: number;
  longitude_max_vl: number;
  latitude_center_vl: number;
  longitude_center_vl: number;
}

interface HoveredCity {
  cidade_st: string;
  estado_st?: string;
  total_pontos: number;
  pontos_public: number;
  pontos_indoor: number;
  total_passantes: number;
  total_impactos: number;
}

// ── Choropleth helpers ─────────────────────────────────────────────────

function choroplethStyle(pontos: number, maxPontos: number, isSelecionada: boolean) {
  if (isSelecionada) {
    return { color: '#ff4600', weight: 3, opacity: 1, fillColor: '#ff4600', fillOpacity: 0.15, dashArray: undefined };
  }
  if (maxPontos <= 0 || pontos <= 0) {
    return { color: '#94a3b8', weight: 1, opacity: 0.4, fillColor: '#94a3b8', fillOpacity: 0.03, dashArray: '4 3' };
  }
  const ratio = Math.log(pontos + 1) / Math.log(maxPontos + 1);

  let fillColor: string;
  let fillOpacity: number;
  if (ratio < 0.15) { fillColor = '#fed7aa'; fillOpacity = 0.18; }
  else if (ratio < 0.30) { fillColor = '#fb923c'; fillOpacity = 0.22; }
  else if (ratio < 0.50) { fillColor = '#f97316'; fillOpacity = 0.28; }
  else if (ratio < 0.70) { fillColor = '#ea580c'; fillOpacity = 0.34; }
  else if (ratio < 0.85) { fillColor = '#c2410c'; fillOpacity = 0.40; }
  else                    { fillColor = '#9a3412'; fillOpacity = 0.48; }

  const borderOpacity = 0.45 + ratio * 0.45;
  return {
    color: fillColor,
    weight: 1.5,
    opacity: borderOpacity,
    fillColor,
    fillOpacity,
    dashArray: undefined,
  };
}

// ── Map helpers ────────────────────────────────────────────────────────

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  React.useEffect(() => {
    onZoom(map.getZoom());
    const handler = () => onZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function AjustarMapaBrasil({ cidades }: { cidades: CityBubble[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (cidades.length === 0) return;
    if (cidades.length === 1) {
      map.setView([cidades[0].lat, cidades[0].lon], 8);
    } else {
      const bounds = L.latLngBounds(cidades.map(c => [c.lat, c.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidades.length]);
  return null;
}

function FlyToCity({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo([lat, lon], 12, { duration: 1.2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);
  return null;
}

function MarkerClusterLayer({ pontos, onSelect }: { pontos: PontoMidia[]; onSelect: (p: PontoMidia) => void }) {
  const map = useMap();
  const clusterRef = React.useRef<L.MarkerClusterGroup | null>(null);

  React.useEffect(() => {
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    // @ts-ignore
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div style="background:#ff4600;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.25)">${count > 999 ? Math.round(count / 1000) + 'k' : count}</div>`,
          className: '',
          iconSize: [36, 36],
        });
      },
    });

    pontos.forEach(p => {
      if (!p.latitude || !p.longitude) return;
      const isPublic = (p.ambiente || '').toUpperCase().includes('PUBLIC');
      const color = isPublic ? '#3b82f6' : '#f97316';
      const marker = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: 5, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.85,
      });
      marker.on('click', () => onSelect(p));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    return () => { if (clusterRef.current) map.removeLayer(clusterRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos]);

  return null;
}

// ── Formatters ─────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toLocaleString('pt-BR'); }

function bubbleRadius(total: number, max: number): number {
  if (max <= 0) return 6;
  return Math.max(4, Math.min(16, 4 + (total / max) * 12));
}

// ── Main Component ─────────────────────────────────────────────────────

export const BancoDeAtivos: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = React.useState(false);

  // Data
  const [dados, setDados] = React.useState<DashboardData | null>(null);
  const [centroids, setCentroids] = React.useState<CityBubble[]>([]);
  const [pontos, setPontos] = React.useState<PontoMidia[]>([]);
  const [perimetros, setPerimetros] = React.useState<Perimetro[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingPontos, setLoadingPontos] = React.useState(false);

  // Interaction
  const [cidadeSelecionada, setCidadeSelecionada] = React.useState<CityBubble | null>(null);
  const [pontoSelecionado, setPontoSelecionado] = React.useState<PontoMidia | null>(null);
  const [painelColapsado, setPainelColapsado] = React.useState(false);
  const [zoom, setZoom] = React.useState(4);
  const [hoveredCity, setHoveredCity] = React.useState<HoveredCity | null>(null);

  // Filters
  const [filtroAmbiente, setFiltroAmbiente] = React.useState<'todos' | 'vias_publicas' | 'indoor'>('todos');

  // Drag
  const painelRef = React.useRef<HTMLDivElement>(null);
  const painelPos = React.useRef({ x: 16, y: 16 });
  const dragState = React.useRef({ dragging: false, startX: 0, startY: 0, origX: 16, origY: 16 });

  const onDragHandleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: painelPos.current.x, origY: painelPos.current.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current.dragging || !painelRef.current) return;
      const nx = Math.max(0, dragState.current.origX + ev.clientX - dragState.current.startX);
      const ny = Math.max(0, dragState.current.origY + ev.clientY - dragState.current.startY);
      painelPos.current = { x: nx, y: ny };
      painelRef.current.style.left = `${nx}px`;
      painelRef.current.style.top = `${ny}px`;
    };
    const onUp = () => {
      dragState.current.dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/banco-ativos-dashboard'),
      api.get('/banco-ativos-centroids'),
      api.get('/banco-ativos-perimetro'),
    ])
      .then(([dashRes, centRes, perRes]) => {
        if (dashRes.data.success) setDados(dashRes.data.data);
        if (centRes.data.success) setCentroids(centRes.data.data || []);
        if (perRes.data.success)  setPerimetros(perRes.data.data || []);
      })
      .catch(err => console.error('Erro ao carregar dados:', err))
      .finally(() => setLoading(false));
  }, []);

  // Aceita `ambienteParam` para evitar stale closure quando o filtro muda e
  // a função é chamada no mesmo ciclo de render (antes do re-render com novo valor)
  const carregarPontosCidade = React.useCallback((cidade: string, ambienteParam?: string) => {
    console.log('[carregarPontosCidade] buscando:', cidade, '| ambiente:', ambienteParam ?? filtroAmbiente);
    setLoadingPontos(true);
    setPontos([]);
    setPontoSelecionado(null);
    const ambiente = ambienteParam ?? filtroAmbiente;
    const params: Record<string, string> = { cidade };
    if (ambiente !== 'todos') params.tipo_ambiente = ambiente;
    api.get('/banco-ativos-mapa', { params })
      .then(res => {
        console.log('[carregarPontosCidade] resposta:', res.data.success, '| pontos:', res.data.data?.length);
        if (res.data.success) setPontos(res.data.data);
      })
      .catch(err => console.error('[carregarPontosCidade] erro:', err))
      .finally(() => setLoadingPontos(false));
  }, [filtroAmbiente]);

  const handleClickCidade = React.useCallback((city: CityBubble) => {
    console.log('[handleClickCidade] cidade:', city.cidade, '| lat:', city.lat, '| lon:', city.lon);
    setCidadeSelecionada(city);
    setPontoSelecionado(null);
    setHoveredCity(null);
    carregarPontosCidade(city.cidade);
  }, [carregarPontosCidade]);

  const voltarBrasil = React.useCallback(() => {
    setCidadeSelecionada(null);
    setPontos([]);
    setPontoSelecionado(null);
    setHoveredCity(null);
  }, []);

  const handleZoom = React.useCallback((z: number) => setZoom(z), []);

  // ── Derived ────────────────────────────────────────────────────────

  const showBrazilView = !cidadeSelecionada;
  const maxPontos = React.useMemo(() => Math.max(...centroids.map(c => c.total_pontos), 1), [centroids]);

  // Map cidade_st → centroid para lookup rápido
  // Chave normalizada (trim + lowercase) para tolerar diferenças de case/espaços entre as duas queries
  const centroidMap = React.useMemo(() => {
    const m = new Map<string, CityBubble>();
    centroids.forEach(c => m.set((c.cidade ?? '').trim().toLowerCase(), c));
    return m;
  }, [centroids]);

  const getCentroid = React.useCallback((nome: string): CityBubble | undefined => {
    return centroidMap.get((nome ?? '').trim().toLowerCase());
  }, [centroidMap]);

  const centroidsFiltrados = React.useMemo(() => {
    if (filtroAmbiente === 'todos') return centroids;
    return centroids.filter(c =>
      filtroAmbiente === 'vias_publicas' ? c.pontos_public > 0 : c.pontos_indoor > 0
    );
  }, [centroids, filtroAmbiente]);

  // Progressive disclosure thresholds
  // zoom < 5  → only choropleth perimeters, no bubbles
  // zoom 5-7  → perimeters + city bubbles (hover only, no labels)
  // zoom >= 8 → city drill-down with clustered points
  const showBubbles = showBrazilView && zoom >= 5;

  // ── Render ─────────────────────────────────────────────────────────

    return (
      <div className="min-h-screen bg-white flex font-sans">
        <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
          <Topbar 
            menuReduzido={menuReduzido} 
          breadcrumbItems={[
            { label: 'Home', path: '/' },
            { label: 'Banco de Ativos' },
          ]}
        />

        {/* Mapa fullscreen */}
        <div className="relative flex-1 overflow-hidden" style={{ marginTop: 72 }}>

          <style>{`
            .leaflet-top.leaflet-left .leaflet-control-zoom { display: none !important; }
            .leaflet-tooltip { pointer-events: none; }
          `}</style>

          {/* ── Floating Panel ── */}
          <div
            ref={painelRef}
            className="absolute z-[500] flex flex-col w-[300px] rounded-2xl shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', top: 16, left: 16 }}
          >
            {/* Drag Handle */}
            <div
              onMouseDown={onDragHandleMouseDown}
              className="flex items-center justify-between px-3 py-2 rounded-t-2xl cursor-grab active:cursor-grabbing select-none"
              style={{ background: 'rgba(240,240,240,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="4" r="1.2" fill="#aaa"/><circle cx="10" cy="4" r="1.2" fill="#aaa"/><circle cx="4" cy="10" r="1.2" fill="#aaa"/><circle cx="10" cy="10" r="1.2" fill="#aaa"/></svg>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Banco de Ativos</span>
                </div>
                <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setPainelColapsado(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  {painelColapsado
                    ? <path d="M2 8L6 4L10 8" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    : <path d="M2 4L6 8L10 4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  }
                </svg>
                </button>
            </div>
            
            {/* Panel Content */}
            <div
              className="flex flex-col overflow-y-auto"
              style={{
                maxHeight: painelColapsado ? 0 : 'calc(100vh - 140px)',
                overflow: painelColapsado ? 'hidden' : 'auto',
                transition: 'max-height 0.25s ease',
              }}
            >
              <div className="p-3 space-y-3">

                {/* Card: Totais Gerais */}
                {dados && (
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#ff4600]" />
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Total Geral</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                        <div className="text-lg font-bold text-gray-800">{fmt(dados.total.pontos_midia)}</div>
                        <div className="text-[9px] text-gray-400 uppercase">Pontos</div>
                    </div>
                      <div>
                        <div className="text-lg font-bold text-gray-800">{fmt(dados.total.pracas)}</div>
                        <div className="text-[9px] text-gray-400 uppercase">Praças</div>
                    </div>
                      <div>
                        <div className="text-lg font-bold text-gray-800">{fmt(dados.total.exibidores)}</div>
                        <div className="text-[9px] text-gray-400 uppercase">Exibidores</div>
                    </div>
                  </div>
                </div>
                )}

                {/* Card: VP vs Indoor */}
                {dados && (
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-3">
                    <div className="grid grid-cols-2 gap-3">
                <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[9px] uppercase tracking-wide font-semibold text-gray-500">Vias Públicas</span>
                    </div>
                        <div className="text-sm font-bold text-blue-600">{fmt(dados.vias_publicas.pontos_midia)}</div>
                        <div className="text-[9px] text-gray-400">{fmt(dados.vias_publicas.pracas)} praças · {fmt(dados.vias_publicas.exibidores)} exib.</div>
                    </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-[9px] uppercase tracking-wide font-semibold text-gray-500">Indoor</span>
                    </div>
                        <div className="text-sm font-bold text-orange-600">{fmt(dados.indoor.pontos_midia)}</div>
                        <div className="text-[9px] text-gray-400">{fmt(dados.indoor.pracas)} praças · {fmt(dados.indoor.exibidores)} exib.</div>
                  </div>
                </div>
                  </div>
                )}

                {/* Card: Filtros */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">Filtrar</div>
                  <div className="flex gap-1 mb-2">
                    {(['todos', 'vias_publicas', 'indoor'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setFiltroAmbiente(opt); if (cidadeSelecionada) carregarPontosCidade(cidadeSelecionada.cidade, opt); }}
                        className={`flex-1 text-[10px] py-1.5 rounded-lg font-medium transition ${
                          filtroAmbiente === opt
                            ? 'bg-[#ff4600] text-white shadow'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {opt === 'todos' ? 'Todos' : opt === 'vias_publicas' ? 'VP' : 'Indoor'}
                      </button>
                    ))}
                    </div>
                  {cidadeSelecionada && (
                    <button
                      onClick={voltarBrasil}
                      className="w-full text-[10px] py-1.5 rounded-lg font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
                    >
                      ← Voltar para visão Brasil
                    </button>
                  )}
                    </div>

                {/* Card: Cidade Selecionada */}
                {cidadeSelecionada && (
                  <div className="rounded-xl border-2 border-[#ff4600] bg-orange-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#ff4600]" />
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-[#ff4600]">
                          {cidadeSelecionada.cidade}{cidadeSelecionada.estado ? `/${cidadeSelecionada.estado}` : ''}
                        </span>
                    </div>
                      <button onClick={voltarBrasil} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                    {loadingPontos ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-bold text-gray-800">{fmt(pontos.length)}</div>
                          <div className="text-[9px] text-gray-400">Pontos</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{fmt(cidadeSelecionada.total_passantes)}</div>
                          <div className="text-[9px] text-gray-400">Passantes</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{fmt(cidadeSelecionada.total_impactos)}</div>
                          <div className="text-[9px] text-gray-400">Impactos</div>
                </div>
              </div>
            )}
              </div>
            )}

                {/* Card: Ponto Selecionado */}
                {pontoSelecionado && (
                  <div className="rounded-xl border-2 bg-white p-3" style={{ borderColor: (pontoSelecionado.ambiente || '').toUpperCase().includes('PUBLIC') ? '#3b82f6' : '#f97316' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Detalhe do Ponto</span>
                      <button onClick={() => setPontoSelecionado(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                    <div className="space-y-1.5 text-xs">
                      {pontoSelecionado.code && (
                        <div className="flex justify-between"><span className="text-gray-400">Código</span><span className="font-medium text-gray-700">{pontoSelecionado.code}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-400">Exibidor</span><span className="font-medium text-gray-700 text-right max-w-[160px] truncate">{pontoSelecionado.exibidor || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Tipo Mídia</span><span className="font-medium text-gray-700 text-right max-w-[160px] truncate">{pontoSelecionado.tipo_midia || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Ambiente</span>
                        <span className={`font-medium ${(pontoSelecionado.ambiente || '').toUpperCase().includes('PUBLIC') ? 'text-blue-600' : 'text-orange-600'}`}>
                          {(pontoSelecionado.ambiente || '').toUpperCase().includes('PUBLIC') ? 'Vias Públicas' : 'Indoor'}
                          </span>
                      </div>
                      <div className="flex justify-between"><span className="text-gray-400">Cidade</span><span className="font-medium text-gray-700">{pontoSelecionado.cidade || '-'}</span></div>
                      {pontoSelecionado.bairro && pontoSelecionado.bairro !== 'Não informado' && (
                        <div className="flex justify-between"><span className="text-gray-400">Bairro</span><span className="font-medium text-gray-700">{pontoSelecionado.bairro}</span></div>
                      )}
                      {pontoSelecionado.grupo_midia && pontoSelecionado.grupo_midia !== 'Não informado' && (
                        <div className="flex justify-between"><span className="text-gray-400">Grupo</span><span className="font-medium text-gray-700">{pontoSelecionado.grupo_midia}</span></div>
                      )}
                      <div className="h-px bg-gray-100 my-1" />
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div>
                          <div className="text-sm font-bold text-gray-800">{fmt(pontoSelecionado.passantes || 0)}</div>
                          <div className="text-[8px] text-gray-400 uppercase">Passantes</div>
                            </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{fmt(pontoSelecionado.impactos_ipv || 0)}</div>
                          <div className="text-[8px] text-gray-400 uppercase">Impactos</div>
                            </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{pontoSelecionado.rating || '-'}</div>
                          <div className="text-[8px] text-gray-400 uppercase">Rating</div>
                        </div>
                          </div>
                        </div>
                    </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                  </div>
                )}
                    </div>
                    </div>
                    </div>

          {/* ── Hover Card (cidade em hover no perimetro) ── */}
          {hoveredCity && !cidadeSelecionada && (
            <div
              className="absolute z-[490] rounded-xl shadow-xl pointer-events-none"
              style={{
                right: 60, top: 10,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(8px)',
                border: '1.5px solid rgba(0,0,0,0.08)',
                minWidth: 200,
                padding: '10px 14px',
              }}
            >
              <div className="text-[11px] font-bold text-gray-800 mb-2">
                {hoveredCity.cidade_st}{hoveredCity.estado_st ? ` / ${hoveredCity.estado_st}` : ''}
                    </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                  <div className="text-sm font-bold text-[#ff4600]">{fmt(hoveredCity.total_pontos)}</div>
                  <div className="text-[8px] text-gray-400 uppercase">Pontos</div>
                    </div>
                    <div>
                  <div className="text-sm font-bold text-blue-600">{fmt(hoveredCity.pontos_public)}</div>
                  <div className="text-[8px] text-gray-400 uppercase">VP</div>
                    </div>
                    <div>
                  <div className="text-sm font-bold text-orange-500">{fmt(hoveredCity.pontos_indoor)}</div>
                  <div className="text-[8px] text-gray-400 uppercase">Indoor</div>
                    </div>
                  </div>
              {hoveredCity.total_passantes > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Passantes</span>
                  <span className="font-semibold text-gray-700">{fmt(hoveredCity.total_passantes)}</span>
                </div>
              )}
              {hoveredCity.total_impactos > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Impactos IPV</span>
                  <span className="font-semibold text-gray-700">{fmt(hoveredCity.total_impactos)}</span>
                </div>
              )}
              <div className="mt-2 text-[9px] text-gray-400 italic">Clique para ver os pontos</div>
            </div>
          )}

          {/* ── Map ── */}
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            <MapContainer
              center={[-15.78, -47.93]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="topright" />
              <ZoomTracker onZoom={handleZoom} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              {/* Choropleth perimeters — sempre visíveis */}
              {perimetros.map(p => {
                const city = getCentroid(p.cidade_st);
                const totalPontos = city?.total_pontos ?? 0;
                const isSelecionada = (cidadeSelecionada?.cidade ?? '').trim().toLowerCase() === (p.cidade_st ?? '').trim().toLowerCase();
                const style = choroplethStyle(totalPontos, maxPontos, isSelecionada);

                // CityBubble garantido: usa centroid se disponível, senão usa coords do próprio perimetro
                const cityParaClick: CityBubble = city ?? {
                  cidade: p.cidade_st,
                  estado: p.estado_st ?? '',
                  lat: Number(p.latitude_center_vl) || -15.78,
                  lon: Number(p.longitude_center_vl) || -47.93,
                  total_pontos: 0,
                  total_passantes: 0,
                  total_impactos: 0,
                  pontos_public: 0,
                  pontos_indoor: 0,
                };

                return (
                  <Rectangle
                    key={p.cidade_st}
                    bounds={[
                      [p.latitude_min_vl, p.longitude_min_vl],
                      [p.latitude_max_vl, p.longitude_max_vl],
                    ]}
                    pathOptions={{ ...style, interactive: true }}
                    bubblingMouseEvents={false}
                    eventHandlers={{
                      mouseover: () => setHoveredCity({
                        cidade_st: p.cidade_st,
                        estado_st: p.estado_st,
                        total_pontos: city?.total_pontos ?? 0,
                        pontos_public: city?.pontos_public ?? 0,
                        pontos_indoor: city?.pontos_indoor ?? 0,
                        total_passantes: city?.total_passantes ?? 0,
                        total_impactos: city?.total_impactos ?? 0,
                      }),
                      mouseout: () => setHoveredCity(null),
                      click: () => {
                        console.log('[Rectangle click] cidade:', p.cidade_st, '| cityParaClick:', cityParaClick.cidade);
                        handleClickCidade(cityParaClick);
                      },
                    }}
                  />
                );
              })}

              {/* City bubbles — aparecem a partir do zoom 5 na visão Brasil */}
              {showBubbles && centroidsFiltrados.map(city => (
                <CircleMarker
                  key={city.cidade}
                  center={[city.lat, city.lon]}
                  radius={bubbleRadius(city.total_pontos, maxPontos)}
                  pathOptions={{ color: '#ff4600', fillColor: '#ff4600', fillOpacity: 0.75, weight: 1.5, opacity: 1 }}
                  eventHandlers={{
                    click: () => handleClickCidade(city),
                    mouseover: () => setHoveredCity({
                      cidade_st: city.cidade,
                      estado_st: city.estado,
                      total_pontos: city.total_pontos,
                      pontos_public: city.pontos_public,
                      pontos_indoor: city.pontos_indoor,
                      total_passantes: city.total_passantes,
                      total_impactos: city.total_impactos,
                    }),
                    mouseout: () => setHoveredCity(null),
                  }}
                >
                  {/* Tooltip compacto apenas com nome — só quando zoom >= 7 */}
                  {zoom >= 7 && (
                    <Tooltip permanent direction="bottom" offset={[0, 8]} className="leaflet-praca-label" opacity={0.85}>
                      <span style={{ fontWeight: 600, fontSize: 9, color: '#444', letterSpacing: 0.2 }}>
                        {city.cidade}
                      </span>
                    </Tooltip>
                  )}
                </CircleMarker>
              ))}

              {showBrazilView && centroidsFiltrados.length > 0 && (
                <AjustarMapaBrasil cidades={centroidsFiltrados} />
              )}

              {/* Fly to city imediatamente ao selecionar — sem esperar pelos pontos */}
              {cidadeSelecionada && (
                <FlyToCity lat={cidadeSelecionada.lat} lon={cidadeSelecionada.lon} />
              )}

              {/* MarkerClusterLayer sempre montado quando há cidade selecionada;
                  renderiza vazio enquanto carrega e atualiza sozinho quando pontos chegam */}
              {cidadeSelecionada && (
                <MarkerClusterLayer pontos={pontos} onSelect={setPontoSelecionado} />
              )}
            </MapContainer>
                  </div>
                  
          {/* ── Legenda Choropleth ── */}
          <div style={{
            position: 'absolute', bottom: 48, right: 16, zIndex: 500,
            background: 'rgba(255,255,255,0.95)', borderRadius: 10,
            padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}>
            <div className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
              {showBrazilView ? 'Densidade de Pontos' : 'Ambiente'}
                                        </div>
            {showBrazilView ? (
              <div className="flex items-center gap-1">
                {['#fed7aa','#fb923c','#f97316','#ea580c','#c2410c','#9a3412'].map((c, i) => (
                  <span key={i} style={{ width: 16, height: 10, borderRadius: 2, background: c, display: 'inline-block', opacity: 0.85 }} />
                ))}
                <span className="text-[9px] text-gray-400 ml-1">menos → mais</span>
                                      </div>
                                    ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-gray-500">Vias Públicas</span>
                                  </div>
                <span style={{ width: 1, height: 14, background: '#e5e7eb', display: 'inline-block' }} />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-[10px] text-gray-500">Indoor</span>
                                </div>
                <span style={{ width: 1, height: 14, background: '#e5e7eb', display: 'inline-block' }} />
                <span className="text-[10px] text-gray-500 font-medium">{fmt(pontos.length)} pontos</span>
              </div>
            )}
                    </div>

          {/* Loading overlay */}
          {loadingPontos && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Carregando pontos...</span>
                </div>
              </div>
            )}
        </div>
        
        {/* ── Footer ── */}
        <div className={`fixed bottom-0 z-[600] pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <footer className="w-full border-t border-[#e5e5e5] px-4 py-2 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white pointer-events-none">
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </div>
  );
};
