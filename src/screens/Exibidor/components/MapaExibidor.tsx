import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import api from '../../../config/axios';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PontoMapaExibidor {
  id: number;
  code: string;
  latitude: number;
  longitude: number;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  tipo_midia: string | null;
  ambiente: string | null;
  formato: string | null;
  grupo: string | null;
  exibidor: string | null;
  passantes: number;
  impactos_ipv: number;
  rating: string | null;
  origem: 'legado' | 'exibidor';
}

type Origem = 'todos' | 'legado' | 'exibidor';

interface MapaExibidorProps {
  altura?: string;
  origemInicial?: Origem;
  onPontoClick?: (ponto: PontoMapaExibidor) => void;
  mostrarPainel?: boolean;
}

// ─── Cores (mesmo esquema do BancoDeAtivos: azul VP / laranja indoor) ────────
const corLegado  = '#3b82f6';  // azul — pontos da base BE180
const corEnviado = '#f97316';  // laranja — pontos enviados pelo exibidor

// ─── Cluster Layer (mesmo estilo do BancoDeAtivos.tsx atual) ─────────────────

const ClusterLayer: React.FC<{
  pontos: PontoMapaExibidor[];
  onPontoClick?: (p: PontoMapaExibidor) => void;
}> = ({ pontos, onPontoClick }) => {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
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

    pontos.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      const cor = p.origem === 'exibidor' ? corEnviado : corLegado;
      const marker = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: 5,
        fillColor: cor,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85,
      });

      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:230px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <strong style="color:${cor};font-size:13px;text-transform:uppercase">${p.code || '—'}</strong>
            ${p.origem === 'exibidor'
              ? '<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700">ENVIADO</span>'
              : '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700">BE180</span>'}
          </div>
          <div style="font-size:12px;color:#374151;line-height:1.6">
            ${p.cidade  ? `<div><strong>Cidade:</strong> ${p.cidade}${p.estado ? '/' + p.estado : ''}</div>` : ''}
            ${p.bairro  ? `<div><strong>Bairro:</strong> ${p.bairro}</div>` : ''}
            ${p.tipo_midia ? `<div><strong>Tipo:</strong> ${p.tipo_midia}</div>` : ''}
            ${p.ambiente  ? `<div><strong>Ambiente:</strong> ${p.ambiente}</div>` : ''}
            ${p.passantes ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb"><strong>Passantes:</strong> ${Math.round(p.passantes).toLocaleString('pt-BR')}</div>` : ''}
            <button id="btn-exib-${p.origem}-${p.id}" style="margin-top:8px;width:100%;background:#ff4600;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer">Ver detalhes</button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-exib-${p.origem}-${p.id}`);
        if (btn && onPontoClick) btn.onclick = () => onPontoClick(p);
      });

      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    // fit bounds ao carregar
    try {
      const bounds = cluster.getBounds();
      if (bounds.isValid()) {
        setTimeout(() => {
          try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 }); } catch (_) { /* ok */ }
        }, 150);
      }
    } catch (_) { /* ok */ }

    return () => { if (clusterRef.current) map.removeLayer(clusterRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos, onPontoClick]);

  return null;
};

// ─── Stats derivados dos pontos ───────────────────────────────────────────────

function calcStats(pontos: PontoMapaExibidor[]) {
  const porCidade: Record<string, number> = {};
  let totalLegado = 0;
  let totalExibidor = 0;
  for (const p of pontos) {
    if (p.origem === 'legado') totalLegado++;
    else totalExibidor++;
    const key = p.cidade || 'Sem cidade';
    porCidade[key] = (porCidade[key] || 0) + 1;
  }
  const topCidades = Object.entries(porCidade)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([nome, count]) => ({ nome, count }));
  return { totalLegado, totalExibidor, topCidades };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const MapaExibidor: React.FC<MapaExibidorProps> = ({
  altura = '480px',
  origemInicial = 'todos',
  onPontoClick,
  mostrarPainel = false,
}) => {
  const [origem, setOrigem]   = useState<Origem>(origemInicial);
  const [tipoAmb, setTipoAmb] = useState<'' | 'indoor' | 'vias_publicas'>('');
  const [pontos, setPontos]   = useState<PontoMapaExibidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const params: Record<string, string> = { mode: 'mapa', origem };
      if (tipoAmb) params.tipo_ambiente = tipoAmb;
      const { data } = await api.get('/exibidor-inventario', { params });
      setPontos(data?.data || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro ao carregar mapa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [origem, tipoAmb]);

  const stats = calcStats(pontos);
  const fmt   = (n: number) => n.toLocaleString('pt-BR');

  // ─── Barra de filtros (white, clean — igual ao painel do BancoDeAtivos) ───
  const filtrosBar = (
    <div className="flex items-center flex-wrap gap-1 p-3 border-b border-gray-200 bg-white">
      {/* Filtros de origem */}
      <div className="flex gap-1">
        {([
          ['todos',    `Todos (${fmt(pontos.length)})`],
          ['legado',   `BE180 (${fmt(stats.totalLegado)})`],
          ['exibidor', `Enviados (${fmt(stats.totalExibidor)})`],
        ] as [Origem, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setOrigem(id)}
            className={`flex-1 text-[10px] py-1.5 px-2.5 rounded-lg font-medium transition ${
              origem === id
                ? 'bg-[#ff4600] text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Filtros de ambiente */}
      <div className="flex gap-1">
        {([
          ['',             'Todos'],
          ['vias_publicas','VP'],
          ['indoor',       'Indoor'],
        ] as [string, string][]).map(([id, label]) => (
          <button
            key={id || 'all'}
            onClick={() => setTipoAmb(id as any)}
            className={`text-[10px] py-1.5 px-2.5 rounded-lg font-medium transition ${
              tipoAmb === id
                ? 'bg-[#ff4600] text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!loading && (
        <button
          onClick={carregar}
          className="ml-auto text-gray-400 hover:text-[#ff4600] transition-colors p-1.5"
          title="Atualizar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );

  // ─── Área do mapa ─────────────────────────────────────────────────────────
  const mapaArea = (
    <div className="relative" style={{ height: altura }}>
      {/* Loader — mesmo estilo do BancoDeAtivos */}
      {loading && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Carregando pontos...</span>
          </div>
        </div>
      )}

      {erro && (
        <div className="absolute inset-0 bg-white z-[500] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-3">{erro}</p>
            <button onClick={carregar}
              className="px-4 py-2 bg-[#ff4600] text-white text-sm font-semibold rounded-lg hover:bg-[#e03700] transition">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!loading && !erro && pontos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-[5]">
          <p className="text-sm text-gray-400 text-center px-6">Nenhum ponto com coordenadas para exibir.</p>
        </div>
      )}

      <MapContainer
        center={[-15.78, -47.93]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ClusterLayer pontos={pontos} onPontoClick={onPontoClick} />
      </MapContainer>

      {/* Legenda — canto inferior direito (mesmo estilo BancoDeAtivos) */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 500,
        background: 'rgba(255,255,255,0.95)', borderRadius: 10,
        padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.10)',
      }}>
        <div className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Origem</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: corLegado }} />
            <span className="text-[10px] text-gray-500">Legado BE180</span>
          </div>
          <span style={{ width: 1, height: 14, background: '#e5e7eb', display: 'inline-block' }} />
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: corEnviado }} />
            <span className="text-[10px] text-gray-500">Enviado</span>
          </div>
          <span style={{ width: 1, height: 14, background: '#e5e7eb', display: 'inline-block' }} />
          <span className="text-[10px] text-gray-500 font-medium">{fmt(pontos.length)} pontos</span>
        </div>
      </div>
    </div>
  );

  // ─── Painel lateral de stats (quando mostrarPainel=true) ─────────────────
  // Mesmo estilo dos cards do BancoDeAtivos: border-2 border-gray-200 bg-white, text compact
  const painel = mostrarPainel ? (
    <div className="lg:col-span-1 bg-gray-50 p-4 overflow-y-auto border-l border-gray-200" style={{ maxHeight: altura }}>
      <div className="space-y-6">
        {/* Resumo */}
        <div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">Resumo</div>
          <div className="rounded-xl border-2 border-gray-200 bg-white p-3 mb-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-gray-800">{fmt(pontos.length)}</div>
                <div className="text-[9px] text-gray-400 uppercase">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{fmt(stats.totalLegado)}</div>
                <div className="text-[9px] text-gray-400 uppercase">BE180</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-500">{fmt(stats.totalExibidor)}</div>
                <div className="text-[9px] text-gray-400 uppercase">Enviados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top praças */}
        {stats.topCidades.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">Top Praças</div>
            <div className="space-y-2">
              {stats.topCidades.map((c, i) => (
                <div key={c.nome} className="bg-white p-2 rounded border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-900 truncate flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 font-bold w-3">{i + 1}</span>
                      {c.nome}
                    </span>
                    <span className="text-xs font-bold text-[#ff4600] ml-2">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      {filtrosBar}

      {mostrarPainel ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
          <div className="lg:col-span-3">{mapaArea}</div>
          {painel}
        </div>
      ) : (
        mapaArea
      )}
    </div>
  );
};
