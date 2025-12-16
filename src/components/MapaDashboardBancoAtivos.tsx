import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Componente de Loading estilo Apple
const AppleLoading: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes apple-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes apple-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes apple-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div 
        className="flex flex-col items-center justify-center"
        style={{ animation: 'apple-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="relative mb-6">
          {/* Background blur circle - 20% maior */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 107, 53, 0.2) 0%, rgba(255, 107, 53, 0.05) 100%)',
              width: '96px', // 80 * 1.2
              height: '96px',
              margin: '-12px', // -10 * 1.2
              animation: 'apple-pulse 2s ease-in-out infinite'
            }}
          />
          
          {/* Spinner - 20% maior */}
          <div 
            className="relative"
            style={{ 
              width: 67.2, // 56 * 1.2
              height: 67.2,
              animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          >
            <svg width="67.2" height="67.2" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#ff4600"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="60 158"
                opacity="0.8"
              />
            </svg>
          </div>
        </div>
        
        <span 
          className="text-[#ff4600] font-medium text-lg tracking-tight" // text-base -> text-lg
          style={{ letterSpacing: '-0.01em' }}
        >
          Carregando mapa...
        </span>
      </div>
    </>
  );
};

// Tipos
interface PontoMapa {
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

interface Stats {
  total_pontos: number;
  total_passantes: number;
  total_impactos: number;
  por_ambiente: Record<string, { count: number; passantes: number }>;
  top_cidades: Array<{ nome: string; count: number; passantes: number }>;
  top_exibidores: Array<{ nome: string; count: number; passantes: number }>;
  por_rating: Record<string, number>;
}

interface MapaDashboardProps {
  tipoAmbiente?: 'indoor' | 'vias_publicas' | '';
  altura?: string;
}

// Chaves para o cache por tipo de ambiente
const CACHE_KEYS = {
  all: 'mapa_all',
  indoor: 'mapa_indoor',
  vias_publicas: 'mapa_vias_publicas'
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const DB_NAME = 'MapaBancoAtivosDB';
const DB_VERSION = 1;
const STORE_NAME = 'mapaCache';

interface CacheData {
  pontos: PontoMapa[];
  stats: Stats;
  timestamp: number;
}

// Função para abrir IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Componente para criar clusters customizados
const ClusterLayer: React.FC<{ pontos: PontoMapa[]; corPrincipal: string }> = ({ pontos, corPrincipal }) => {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Verificar se o mapa está pronto e inicializado
    if (!map || !map.getMinZoom) {
      console.log('⏳ [Cluster] Aguardando mapa estar pronto...');
      return;
    }

    // Aguardar o mapa estar completamente carregado
    if (!map._loaded) {
      console.log('⏳ [Cluster] Mapa ainda não carregado completamente...');
      const checkMapLoaded = setInterval(() => {
        if (map._loaded) {
          clearInterval(checkMapLoaded);
          // Forçar re-render
          setPontos([...pontos]);
        }
      }, 100);
      return () => clearInterval(checkMapLoaded);
    }

    // Remover cluster anterior se existir
    if (clusterGroupRef.current) {
      try {
        map.removeLayer(clusterGroupRef.current);
      } catch (e) {
        console.log('ℹ️ [Cluster] Cluster anterior já removido');
      }
      clusterGroupRef.current = null;
    }

    // Não criar clusters se não houver pontos
    if (pontos.length === 0) {
      console.log('ℹ️ [Cluster] Nenhum ponto para exibir');
      return;
    }

    console.log(`🗺️ [Cluster] Criando clusters para ${pontos.length} pontos`);

    // Criar novo cluster group
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let sizeClass = 40;
        
        if (count > 100) {
          size = 'large';
          sizeClass = 60;
        } else if (count > 50) {
          size = 'medium';
          sizeClass = 50;
        }

        return L.divIcon({
          html: `<div style="
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
            border: 3px solid ${corPrincipal};
            color: white;
            width: ${sizeClass}px;
            height: ${sizeClass}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${size === 'large' ? '16px' : size === 'medium' ? '14px' : '12px'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.2s;
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(sizeClass, sizeClass),
        });
      },
    });

    // Adicionar marcadores ao cluster
    pontos.forEach((ponto) => {
      const marker = L.circleMarker([ponto.latitude, ponto.longitude], {
        radius: 8,
        fillColor: corPrincipal,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      // Popup com informações
      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 250px;">
          <div style="font-weight: bold; color: ${corPrincipal}; font-size: 14px; margin-bottom: 8px; text-transform: uppercase;">
            ${ponto.code}
          </div>
          <div style="font-size: 12px; color: #374151; line-height: 1.6;">
            <div style="margin-bottom: 4px;"><strong>Exibidor:</strong> ${ponto.exibidor || 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Cidade:</strong> ${ponto.cidade || 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Bairro:</strong> ${ponto.bairro || 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Tipo:</strong> ${ponto.tipo_midia || 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Ambiente:</strong> ${ponto.ambiente || 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Rating:</strong> <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${ponto.rating || 'N/A'}</span></div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="margin-bottom: 4px;"><strong>Passantes:</strong> ${(ponto.passantes || 0).toLocaleString('pt-BR')}</div>
              <div><strong>Impactos:</strong> ${(ponto.impactos_ipv || 0).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>
      `);

      markers.addLayer(marker);
    });

    // Adicionar ao mapa com verificações
    try {
      // Garantir que o mapa está pronto
      if (!map._loaded) {
        console.warn('⚠️ [Cluster] Tentativa de adicionar clusters antes do mapa carregar');
        return;
      }

      map.addLayer(markers);
      clusterGroupRef.current = markers;
      console.log('✅ [Cluster] Clusters adicionados ao mapa');

      // Ajustar bounds se houver pontos
      if (pontos.length > 0) {
        const bounds = markers.getBounds();
        if (bounds.isValid()) {
          // Timeout para garantir que o mapa está totalmente renderizado
          setTimeout(() => {
            try {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            } catch (e) {
              console.log('ℹ️ [Cluster] Não foi possível ajustar bounds');
            }
          }, 200);
        }
      }
    } catch (error) {
      console.error('❌ [Cluster] Erro ao adicionar clusters ao mapa:', error);
    }

    return () => {
      if (clusterGroupRef.current) {
        try {
          map.removeLayer(clusterGroupRef.current);
        } catch (e) {
          // Ignorar erro ao remover
        }
      }
    };
  }, [pontos, map, corPrincipal]);

  return null;
};

export const MapaDashboardBancoAtivos: React.FC<MapaDashboardProps> = ({ 
  tipoAmbiente = '', 
  altura = '600px' 
}) => {
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<'indoor' | 'vias_publicas' | ''>('');
  const [usandoCache, setUsandoCache] = useState(false);

  // Função para obter chave do cache baseado no tipo
  const getCacheKey = (tipo: string): string => {
    if (tipo === 'indoor') return CACHE_KEYS.indoor;
    if (tipo === 'vias_publicas') return CACHE_KEYS.vias_publicas;
    return CACHE_KEYS.all;
  };

  // Função para obter dados do cache (IndexedDB)
  const getCachedData = async (tipo: string): Promise<CacheData | null> => {
    try {
      const db = await openDB();
      const cacheKey = getCacheKey(tipo);
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(cacheKey);
        
        request.onsuccess = () => {
          const data = request.result as CacheData | undefined;
          if (data) {
            const now = Date.now();
            if (now - data.timestamp < CACHE_DURATION) {
              const minutosRestantes = Math.round((CACHE_DURATION - (now - data.timestamp)) / 1000 / 60);
              console.log(`✅ [Mapa Cache] Dados em cache válidos (${minutosRestantes}min restantes)`);
              resolve(data);
            } else {
              console.log('⏰ [Mapa Cache] Cache expirado, removendo...');
              const deleteTransaction = db.transaction([STORE_NAME], 'readwrite');
              const deleteStore = deleteTransaction.objectStore(STORE_NAME);
              deleteStore.delete(cacheKey);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('❌ [Mapa Cache] Erro ao ler cache');
          resolve(null);
        };
      });
    } catch (error) {
      console.error('❌ [Mapa Cache] Erro ao acessar IndexedDB:', error);
      return null;
    }
  };

  // Função para salvar dados no cache (IndexedDB)
  const setCachedData = async (tipo: string, pontos: PontoMapa[], stats: Stats) => {
    try {
      const db = await openDB();
      const cacheKey = getCacheKey(tipo);
      
      const cacheData: CacheData = {
        pontos,
        stats,
        timestamp: Date.now()
      };
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(cacheData, cacheKey);
      
      transaction.oncomplete = () => {
        const sizeInMB = (JSON.stringify(cacheData).length / (1024 * 1024)).toFixed(2);
        console.log(`💾 [Mapa Cache] Dados salvos no IndexedDB (${pontos.length} pontos, ~${sizeInMB}MB)`);
      };
      
      transaction.onerror = () => {
        console.error('❌ [Mapa Cache] Erro ao salvar no IndexedDB');
      };
    } catch (error: any) {
      console.error('❌ [Mapa Cache] Erro ao salvar cache:', error.message);
    }
  };

  const carregarPontos = async (tipo: string = '', forcarAtualizacao: boolean = false) => {
    try {
      setErro(null);
      
      // Tentar usar cache se não for atualização forçada
      if (!forcarAtualizacao) {
        const cached = await getCachedData(tipo);
        if (cached) {
          setPontos(cached.pontos);
          setStats(cached.stats);
          setUsandoCache(true);
          setLoading(false);
          
          // Atualizar em background após 2 segundos
          console.log('🔄 [Mapa Cache] Atualizando dados em background...');
          setTimeout(() => carregarPontos(tipo, true), 2000);
          return;
        }
      }
      
      setLoading(true);
      setUsandoCache(false);
      console.log('🗺️ Carregando pontos do mapa...', { tipo, forcarAtualizacao });

      const params = new URLSearchParams();
      if (tipo) params.append('tipo_ambiente', tipo);

      const response = await fetch(`/banco-ativos-mapa?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPontos(data.data);
        setStats(data.stats);
        
        // Salvar no cache (sem await para não bloquear)
        setCachedData(tipo, data.data, data.stats);
        
        console.log(`✅ ${data.data.length} pontos carregados do servidor`);
      } else {
        throw new Error(data.error || 'Erro ao carregar pontos');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar pontos:', error);
      setErro(error.message);
    } finally {
      setLoading(false);
      setUsandoCache(false);
    }
  };

  useEffect(() => {
    console.log('🎬 [Mapa] useEffect executado, tipo:', tipoAmbiente);
    carregarPontos(tipoAmbiente);
  }, [tipoAmbiente]);

  const aplicarFiltro = (tipo: 'indoor' | 'vias_publicas' | '') => {
    setFiltroAtivo(tipo);
    carregarPontos(tipo);
  };

  const formatarNumero = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const corPrincipal = '#ff4600';

  return (
    <div className="bg-white shadow-sm border-t-2 border-b-2 border-gray-200 overflow-hidden">
      {/* Header com título e filtros */}
      <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              Mapa de Pontos de Mídia
            </h3>
            <span className="px-2 py-1 bg-[#ff4600] text-white text-xs font-bold uppercase tracking-wider rounded">
              Beta
            </span>
            {usandoCache && (
              <div className="flex items-center gap-2 text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 bg-[#ff4600] rounded-full animate-pulse"></span>
                <span>Cache</span>
              </div>
            )}
          </div>
          
          {/* Filtros rápidos e botão atualizar */}
          <div className="flex gap-2 items-center">
            {/* Botão Atualizar */}
            {!loading && (
              <button
                onClick={() => carregarPontos(filtroAtivo, true)}
                className="px-3 py-2 text-gray-300 hover:text-[#ff4600] transition-colors"
                title="Atualizar dados"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            <div className="w-px h-6 bg-gray-600"></div>
            
            <button
              onClick={() => aplicarFiltro('')}
              className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-wide transition-all ${
                filtroAtivo === ''
                  ? 'bg-[#ff4600] text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos {stats && `(${formatarNumero(stats.total_pontos)})`}
            </button>
            <button
              onClick={() => aplicarFiltro('indoor')}
              className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-wide transition-all ${
                filtroAtivo === 'indoor'
                  ? 'bg-[#ff4600] text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Indoor
            </button>
            <button
              onClick={() => aplicarFiltro('vias_publicas')}
              className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-wide transition-all ${
                filtroAtivo === 'vias_publicas'
                  ? 'bg-[#ff4600] text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Vias Públicas
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
        {/* Mapa */}
        <div className="lg:col-span-3 relative" style={{ height: altura }}>
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-95 z-[1000] flex items-center justify-center backdrop-blur-sm">
              <AppleLoading />
            </div>
          )}

          {erro && (
            <div className="absolute inset-0 bg-white z-[1000] flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 font-semibold mb-4">{erro}</p>
                <button
                  onClick={() => carregarPontos(filtroAtivo)}
                  className="px-6 py-3 bg-[#ff4600] text-white font-bold rounded hover:bg-[#e03700] transition-all shadow-md hover:shadow-lg uppercase tracking-wide text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {!loading && !erro && (
            <MapContainer
              center={[-23.5505, -46.6333]} // São Paulo como centro inicial
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <ClusterLayer pontos={pontos} corPrincipal={corPrincipal} />
            </MapContainer>
          )}
        </div>

        {/* Painel lateral com estatísticas */}
        <div className="lg:col-span-1 bg-gray-50 p-4 overflow-y-auto" style={{ maxHeight: altura }}>
          {stats && (
            <div className="space-y-6">
              {/* Estatísticas gerais */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Resumo
                </h4>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-[#ff4600]">
                      {formatarNumero(stats.total_pontos)}
                    </div>
                    <div className="text-xs text-gray-600 uppercase">Pontos</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">
                      {formatarNumero(Math.round(stats.total_passantes))}
                    </div>
                    <div className="text-xs text-gray-600 uppercase">Passantes</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">
                      {formatarNumero(Math.round(stats.total_impactos))}
                    </div>
                    <div className="text-xs text-gray-600 uppercase">Impactos</div>
                  </div>
                </div>
              </div>

              {/* Top 5 Cidades */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Top 5 Praças
                </h4>
                <div className="space-y-2">
                  {stats.top_cidades.slice(0, 5).map((cidade, index) => (
                    <div key={index} className="bg-white p-2 rounded border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {cidade.nome}
                        </span>
                        <span className="text-xs font-bold text-[#ff4600] ml-2">
                          {cidade.count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatarNumero(Math.round(cidade.passantes))} passantes
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 Exibidores */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Top 5 Exibidores
                </h4>
                <div className="space-y-2">
                  {stats.top_exibidores.slice(0, 5).map((exibidor, index) => (
                    <div key={index} className="bg-white p-2 rounded border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {exibidor.nome}
                        </span>
                        <span className="text-xs font-bold text-[#ff4600] ml-2">
                          {exibidor.count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatarNumero(Math.round(exibidor.passantes))} passantes
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribuição por Rating */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Por Rating
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.por_rating)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([rating, count]) => (
                      <div key={rating} className="bg-white p-2 rounded border border-gray-200 text-center">
                        <div className="text-sm font-bold text-gray-900">{rating}</div>
                        <div className="text-xs text-gray-600">{count}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

