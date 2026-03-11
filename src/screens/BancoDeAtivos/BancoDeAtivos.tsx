import React from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import api from '../../config/axios';
import { MapContainer, TileLayer, CircleMarker, ZoomControl, Tooltip, useMap } from 'react-leaflet';
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

// ── Map helpers ────────────────────────────────────────────────────────

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
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    // @ts-ignore
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div style="background:#ff4600;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.25)">${count > 999 ? Math.round(count/1000)+'k' : count}</div>`,
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
        radius: 5,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85,
      });
      marker.on('click', () => onSelect(p));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos]);

  return null;
}

// ── Formatters ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function bubbleRadius(total: number, max: number): number {
  if (max <= 0) return 8;
  const ratio = total / max;
  return Math.max(6, Math.min(24, 6 + ratio * 18));
}

// ── Main Component ─────────────────────────────────────────────────────

export const BancoDeAtivos: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = React.useState(false);

  // Data
  const [dados, setDados] = React.useState<DashboardData | null>(null);
  const [centroids, setCentroids] = React.useState<CityBubble[]>([]);
  const [pontos, setPontos] = React.useState<PontoMidia[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingPontos, setLoadingPontos] = React.useState(false);

  // Interaction
  const [cidadeSelecionada, setCidadeSelecionada] = React.useState<CityBubble | null>(null);
  const [pontoSelecionado, setPontoSelecionado] = React.useState<PontoMidia | null>(null);
  const [painelColapsado, setPainelColapsado] = React.useState(false);

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
    ])
      .then(([dashRes, centRes]) => {
        if (dashRes.data.success) setDados(dashRes.data.data);
        if (centRes.data.success) setCentroids(centRes.data.data || []);
      })
      .catch(err => console.error('Erro ao carregar dados:', err))
      .finally(() => setLoading(false));
  }, []);

  const carregarPontosCidade = React.useCallback((cidade: string) => {
    setLoadingPontos(true);
    setPontoSelecionado(null);
    api.get('/banco-ativos-mapa', { params: { tipo_ambiente: filtroAmbiente === 'todos' ? undefined : filtroAmbiente } })
      .then(res => {
        if (res.data.success) {
          const filtered = res.data.data.filter((p: PontoMidia) =>
            (p.cidade || '').toUpperCase().trim() === cidade.toUpperCase().trim()
          );
          setPontos(filtered);
        }
      })
      .catch(err => console.error('Erro ao carregar pontos:', err))
      .finally(() => setLoadingPontos(false));
  }, [filtroAmbiente]);

  const handleClickCidade = React.useCallback((city: CityBubble) => {
    setCidadeSelecionada(city);
    setPontoSelecionado(null);
    carregarPontosCidade(city.cidade);
  }, [carregarPontosCidade]);

  const voltarBrasil = React.useCallback(() => {
    setCidadeSelecionada(null);
    setPontos([]);
    setPontoSelecionado(null);
  }, []);

  // Derived
  const showBrazilView = !cidadeSelecionada;
  const maxPontos = React.useMemo(() => Math.max(...centroids.map(c => c.total_pontos), 1), [centroids]);

  const centroidsFiltrados = React.useMemo(() => {
    if (filtroAmbiente === 'todos') return centroids;
    return centroids.filter(c =>
      filtroAmbiente === 'vias_publicas' ? c.pontos_public > 0 : c.pontos_indoor > 0
    );
  }, [centroids, filtroAmbiente]);

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
            .leaflet-praca-label { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; white-space: nowrap; }
            .leaflet-praca-label::before { display: none !important; }
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
                        onClick={() => { setFiltroAmbiente(opt); if (cidadeSelecionada) carregarPontosCidade(cidadeSelecionada.cidade); }}
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

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Map ── */}
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            <MapContainer
              center={[-15.78, -47.93]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="topright" />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              {/* Brazil Overview: city bubbles */}
              {showBrazilView && centroidsFiltrados.map(city => (
                <CircleMarker
                  key={city.cidade}
                  center={[city.lat, city.lon]}
                  radius={bubbleRadius(city.total_pontos, maxPontos)}
                  pathOptions={{ color: '#ff4600', fillColor: '#ff4600', fillOpacity: 0.8, weight: 2, opacity: 1 }}
                  eventHandlers={{ click: () => handleClickCidade(city) }}
                >
                  <Tooltip permanent direction="bottom" offset={[0, 12]} className="leaflet-praca-label">
                    <span style={{ fontWeight: 700, fontSize: 10, color: '#222' }}>
                      {city.cidade}{city.estado ? `/${city.estado}` : ''}
                    </span>
                  </Tooltip>
                  <Tooltip direction="top" offset={[0, -16]} opacity={1}>
                    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                      <strong>{city.cidade}</strong><br />
                      <span style={{ color: '#555' }}>{fmt(city.total_pontos)} pontos</span><br />
                      <span style={{ color: '#3b82f6' }}>{fmt(city.pontos_public)} VP</span> · <span style={{ color: '#f97316' }}>{fmt(city.pontos_indoor)} Indoor</span><br />
                      {city.total_passantes > 0 && <>{fmt(city.total_passantes)} passantes<br /></>}
                      {city.total_impactos > 0 && <>{fmt(city.total_impactos)} impactos</>}
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}

              {showBrazilView && centroidsFiltrados.length > 0 && (
                <AjustarMapaBrasil cidades={centroidsFiltrados} />
              )}

              {/* City drill-down: clustered points */}
              {cidadeSelecionada && !loadingPontos && pontos.length > 0 && (
                <>
                  <FlyToCity lat={cidadeSelecionada.lat} lon={cidadeSelecionada.lon} />
                  <MarkerClusterLayer pontos={pontos} onSelect={setPontoSelecionado} />
                </>
              )}
            </MapContainer>
          </div>

          {/* ── Mini Legend ── */}
          <div style={{
            position: 'absolute', bottom: 48, right: 16, zIndex: 500,
            background: 'rgba(255,255,255,0.95)', borderRadius: 8,
            padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-500">Vias Públicas</span>
            </div>
            <span style={{ width: 1, height: 16, background: '#e5e7eb' }} />
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-[10px] text-gray-500">Indoor</span>
            </div>
            {!showBrazilView && pontos.length > 0 && (
              <>
                <span style={{ width: 1, height: 16, background: '#e5e7eb' }} />
                <span className="text-[10px] text-gray-500 font-medium">{fmt(pontos.length)} pontos</span>
              </>
            )}
          </div>

          {/* Loading overlay for city points */}
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
