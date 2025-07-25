import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";
import { useSearchParams } from "react-router-dom";
import api from "../../config/axios";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';

// Tipo para os dados dos hexágonos
interface Hexagono {
  hexagon_pk: number;
  hex_centroid_lat: number;
  hex_centroid_lon: number;
  calculatedFluxoEstimado_vl: number;
  fluxoEstimado_vl: number;
  rgbColorR_vl: number;
  rgbColorG_vl: number;
  rgbColorB_vl: number;
  hexColor_st: string;
  planoMidiaDesc_st: string;
  geometry_8: string; // Adicionado para armazenar o WKT do polígono
  grupoDesc_st: string;
}

// Componente auxiliar para ajustar o centro e bounds do mapa
function AjustarMapa({ hexagonos }: { hexagonos: Hexagono[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (hexagonos.length > 0) {
      const bounds = L.latLngBounds(hexagonos.map(h => [h.hex_centroid_lat, h.hex_centroid_lon]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [hexagonos, map]);
  return null;
}

// Função para converter WKT para array de coordenadas [lat, lon]
function wktToLatLngs(wkt: string) {
  const matches = wkt.match(/\(\((.*)\)\)/);
  if (!matches) return [];
  return matches[1].split(',').map(pair => {
    const [lon, lat] = pair.trim().split(' ').map(Number);
    if (isNaN(lat) || isNaN(lon)) return undefined;
    return [lat, lon] as [number, number];
  }).filter((x): x is [number, number] => Array.isArray(x) && x.length === 2);
}

export const Mapa: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = React.useState(false);
  const [searchParams] = useSearchParams();
  const grupo = searchParams.get("grupo");
  const [cidades, setCidades] = React.useState<string[]>([]);
  const [cidadeSelecionada, setCidadeSelecionada] = React.useState("");
  const [nomeGrupo, setNomeGrupo] = React.useState("");
  const [semanas, setSemanas] = React.useState<{ semanaInicial_vl: number, semanaFinal_vl: number }[]>([]);
  const [semanaSelecionada, setSemanaSelecionada] = React.useState("");
  const [descPks, setDescPks] = React.useState<{ [cidade: string]: number }>({});
  const [hexagonos, setHexagonos] = React.useState<Hexagono[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHexagonos, setLoadingHexagonos] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log("Mapa: grupo recebido:", grupo);
    
    // Teste inicial da API
    api.get('debug')
      .then(res => {
        console.log("Mapa: API debug funcionando:", res.data);
      })
      .catch(err => {
        console.error("Mapa: API debug falhou:", err);
      });
    
    if (grupo) {
      setLoading(true);
      setErro(null);
      console.log("Mapa: fazendo requisição para cidades com grupo:", grupo);
      
      api.get(`cidades?grupo=${grupo}`)
        .then(res => {
          console.log("Mapa: resposta da API cidades:", res.data);
          setCidades(res.data.cidades);
          if (res.data.nomeGrupo) setNomeGrupo(res.data.nomeGrupo);
          // Buscar os planoMidiaDesc_pk para cada cidade
          if (res.data.cidades && res.data.cidades.length) {
            console.log("Mapa: fazendo requisição para pivot-descpks com grupo:", grupo);
            api.get(`pivot-descpks?grupo=${grupo}`)
              .then(r => {
                console.log("Mapa: resposta da API pivot-descpks:", r.data);
                setDescPks(Object.fromEntries(Object.entries(r.data.descPks).map(([k, v]) => [k.trim().toUpperCase(), Number(v)])));
              })
              .catch(err => {
                console.error("Mapa: erro na API pivot-descpks:", err);
                setDescPks({});
              });
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API cidades:", err);
          setErro(err.response?.data?.error || 'Erro ao carregar cidades');
          setCidades([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [grupo]);

  React.useEffect(() => {
    console.log("Mapa: cidadeSelecionada:", cidadeSelecionada, "descPks:", descPks);
    if (cidadeSelecionada && descPks[cidadeSelecionada]) {
      console.log("Mapa: fazendo requisição para semanas com desc_pk:", descPks[cidadeSelecionada]);
      api.get(`semanas?desc_pk=${descPks[cidadeSelecionada]}`)
        .then(res => {
          console.log("Mapa: resposta da API semanas:", res.data);
          setSemanas(res.data.semanas);
        })
        .catch(err => {
          console.error("Mapa: erro na API semanas:", err);
          setSemanas([]);
        });
    } else {
      setSemanas([]);
    }
  }, [cidadeSelecionada, descPks]);

  // Novo useEffect para buscar hexágonos assim que o grupo for selecionado
  React.useEffect(() => {
    if (grupo) {
      setLoadingHexagonos(true);
      api.get(`hexagonos?desc_pk=${grupo}`)
        .then(res => {
          setHexagonos(res.data.hexagonos);
        })
        .catch(err => {
          setHexagonos([]);
        })
        .finally(() => {
          setLoadingHexagonos(false);
        });
    } else {
      setHexagonos([]);
    }
  }, [grupo]);

  // Novo useEffect para buscar hexágonos ao selecionar semana
  React.useEffect(() => {
    // Só busca se houver cidadeSelecionada e descPks[cidadeSelecionada]
    if (cidadeSelecionada && descPks[cidadeSelecionada]) {
      setLoadingHexagonos(true);
      if (semanaSelecionada) {
        api.get(`hexagonos?desc_pk=${descPks[cidadeSelecionada]}&semana=${semanaSelecionada}`)
          .then(res => {
            setHexagonos(res.data.hexagonos);
          })
          .catch(err => {
            setHexagonos([]);
          })
          .finally(() => {
            setLoadingHexagonos(false);
          });
      } else {
        // Se não houver semana selecionada, busca todos os hexágonos da praça
        api.get(`hexagonos?desc_pk=${descPks[cidadeSelecionada]}`)
          .then(res => {
            setHexagonos(res.data.hexagonos);
          })
          .catch(err => {
            setHexagonos([]);
          })
          .finally(() => {
            setLoadingHexagonos(false);
          });
      }
    }
  }, [cidadeSelecionada, descPks, semanaSelecionada]);

  // Calcular o range de fluxo para normalizar o tamanho dos pontos
  const minFluxo = hexagonos.length > 0 ? Math.min(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 0;
  const maxFluxo = hexagonos.length > 0 ? Math.max(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 1;
  function getRadius(fluxo: number) {
    // Raio mínimo 6, máximo 20
    if (maxFluxo === minFluxo) return 10;
    return 6 + 14 * ((fluxo - minFluxo) / (maxFluxo - minFluxo));
  }

  // Mensagem de aviso sobre o filtro
  {grupo && (
    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
      No momento, todos os pontos do roteiro estão sendo exibidos. O filtro por praça e semana estará disponível em breve.
    </div>
  )}

  // Componente do Mapa simples (usando um mapa básico)
  const MapaVisualizacao = () => {
    if (!hexagonos.length) {
      return (
        <div className="w-full h-full bg-white flex items-center justify-center rounded border">
          <p className="text-gray-500">
            {loadingHexagonos
              ? "Carregando hexágonos..."
              : semanaSelecionada
                ? "Nenhum ponto encontrado para a praça e semana selecionadas."
                : cidadeSelecionada
                  ? "Nenhum ponto encontrado para a praça selecionada."
                  : "Selecione uma praça e semana para visualizar o mapa"}
          </p>
        </div>
      );
    }

    // Calcular limites do mapa
    const lats = hexagonos.map(h => h.hex_centroid_lat);
    const lons = hexagonos.map(h => h.hex_centroid_lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return (
      <div className="w-full h-full bg-white rounded border relative overflow-hidden">
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow z-10">
          <h3 className="text-sm font-bold text-gray-700">Hexágonos Plotados</h3>
          <p className="text-xs text-gray-600">{hexagonos.length} pontos</p>
          <p className="text-xs text-gray-600">Área: {minLat.toFixed(4)}, {minLon.toFixed(4)} → {maxLat.toFixed(4)}, {maxLon.toFixed(4)}</p>
        </div>
        
        {/* Área do mapa com pontos plotados */}
        <div className="w-full h-full relative bg-gradient-to-br from-blue-50 to-green-50">
          {hexagonos.map((hex, index) => {
            // Normalizar coordenadas para o container
            const x = ((hex.hex_centroid_lon - minLon) / (maxLon - minLon)) * 100;
            const y = ((maxLat - hex.hex_centroid_lat) / (maxLat - minLat)) * 100;
            
            return (
              <div
                key={hex.hexagon_pk}
                className="absolute w-2 h-2 rounded-full transform -translate-x-1 -translate-y-1"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  backgroundColor: hex.hexColor_st || `rgb(${hex.rgbColorR_vl}, ${hex.rgbColorG_vl}, ${hex.rgbColorB_vl})`,
                }}
                title={`Hex ${hex.hexagon_pk}: Fluxo ${hex.calculatedFluxoEstimado_vl} | Lat: ${hex.hex_centroid_lat}, Lon: ${hex.hex_centroid_lon}`}
              />
            );
          })}
        </div>
        
        {/* Legenda */}
        <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow">
          <h4 className="text-xs font-bold text-gray-700 mb-1">Legenda</h4>
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Alto fluxo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Médio fluxo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Baixo fluxo</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Adicionar overlay/modal quando não houver seleção de praça
  const showOverlay = !cidadeSelecionada;

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar menuReduzido={menuReduzido} />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
          <h1 className="text-lg font-bold text-[#222] tracking-wide mb-4 uppercase font-sans mt-4 pl-6">
            Meus roteiros
          </h1>
          <div className="w-full flex flex-row gap-8 mt-8 px-8 flex-1 min-h-[500px]" style={{height: 'calc(100vh - 220px)'}}>
            {/* Coluna dos filtros */}
            <div className="flex flex-col flex-1 max-w-[420px] justify-start">
              <table className="w-full border-separate border-spacing-0 font-sans mb-6">
                <thead>
                  <tr className="bg-[#393939] h-10">
                    <th className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-[#222] text-sm font-bold px-6 py-4 whitespace-nowrap font-sans border-b border-[#c1c1c1]">
                      {nomeGrupo || <span className="italic text-[#b0b0b0]">Carregando...</span>} <span className="ml-2">→</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mb-6 text-[#222] text-base">Selecione a praça e a semana do roteiro para visualizar o mapa em html.</p>
              
              {erro && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                  Erro: {erro}
                </div>
              )}
              
              {/* Remover ou desabilitar selects de cidade e semana temporariamente */}
              <div className="mb-4">
                <label className="block text-[#222] mb-2 font-semibold">
                  Praça {loading && <span className="text-blue-500">(Carregando...)</span>}
                </label>
                <select
                  className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base"
                  value={cidadeSelecionada}
                  onChange={e => setCidadeSelecionada(e.target.value)}
                  disabled={!cidades.length || loading}
                >
                  <option value="">{loading ? "Carregando..." : "Ex.: São Paulo"}</option>
                  {cidades.map((cidade) => (
                    <option key={cidade} value={cidade}>{cidade}</option>
                  ))}
                </select>
                {cidades.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">{cidades.length} cidade(s) carregada(s)</p>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[#222] mb-2 font-semibold">Semana</label>
                <select
                  className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base"
                  value={semanaSelecionada}
                  onChange={e => setSemanaSelecionada(e.target.value)}
                  disabled={!semanas.length}
                >
                  <option value="">Ex.: São Paulo</option>
                  {semanas.map((semana, idx) => (
                    <option key={idx} value={semana.semanaInicial_vl}>{`Semana ${semana.semanaInicial_vl} - ${semana.semanaFinal_vl}`}</option>
                  ))}
                </select>
              </div>
              
              {/* Informações dos hexágonos */}
              {hexagonos.length > 0 && (
                (() => {
                  const totalFluxo = hexagonos.reduce((sum, hex) => sum + hex.calculatedFluxoEstimado_vl, 0);
                  const fluxoMedio = totalFluxo / hexagonos.length;
                  const maxHex = hexagonos.reduce((a, b) => (a.calculatedFluxoEstimado_vl > b.calculatedFluxoEstimado_vl ? a : b));
                  const minHex = hexagonos.reduce((a, b) => (a.calculatedFluxoEstimado_vl < b.calculatedFluxoEstimado_vl ? a : b));
                  const grupos = Array.from(new Set(hexagonos.map(h => h.grupoDesc_st))).filter(Boolean);
                  return (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <h4 className="text-sm font-bold text-green-700 mb-1">Dados carregados</h4>
                      <p className="text-xs text-green-600">{hexagonos.length} hexágonos encontrados</p>
                      <p className="text-xs text-green-600">Fluxo total estimado: {totalFluxo.toLocaleString()}</p>
                      <p className="text-xs text-green-600">Fluxo médio por hexágono: {fluxoMedio.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-green-600">Maior fluxo: {maxHex.calculatedFluxoEstimado_vl.toLocaleString()} (Hexágono {maxHex.hexagon_pk})</p>
                      <p className="text-xs text-green-600">Menor fluxo: {minHex.calculatedFluxoEstimado_vl.toLocaleString()} (Hexágono {minHex.hexagon_pk})</p>
                      <p className="text-xs text-green-600">Grupos presentes: {grupos.join(', ')}</p>
                    </div>
                  );
                })()
              )}
              
              {/* Remover o botão de testar API */}
            </div>
            {/* Coluna do mapa */}
            <div className="flex-1 h-full w-full" style={{ minHeight: 320, background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', marginBottom: 48, position: 'relative' }}>
              {/* Overlay/modal para seleção de praça e semana */}
              {showOverlay && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.92)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: '#222',
                  fontWeight: 500
                }}>
                  <div style={{ marginBottom: 12 }}>Selecione a praça e a semana para visualizar o mapa</div>
                  {/* Futuramente pode adicionar botão ou instrução extra aqui */}
                </div>
              )}
              {/* Loading overlay após seleção da praça */}
              {loadingHexagonos && cidadeSelecionada && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.7)',
                  zIndex: 1500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
                  <span style={{ marginLeft: 16, color: '#2563eb', fontWeight: 500 }}>Carregando mapa...</span>
                </div>
              )}
              <MapContainer
                center={hexagonos.length > 0 ? [hexagonos[0].hex_centroid_lat, hexagonos[0].hex_centroid_lon] : [-15.7801, -47.9292]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <AjustarMapa hexagonos={hexagonos} />
                {hexagonos.map((hex, idx) => (
                  <Polygon
                    key={"poly-" + idx}
                    positions={wktToLatLngs(hex.geometry_8)}
                    pathOptions={{
                      color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`,
                      fillOpacity: 0.4
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>Hexágono:</strong> {hex.hexagon_pk}<br />
                        <strong>Fluxo estimado:</strong> {hex.fluxoEstimado_vl}<br />
                        <strong>Grupo:</strong> {hex.grupoDesc_st}<br />
                        <strong>Cor:</strong> {hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`}<br />
                        <strong>Centro:</strong> {hex.hex_centroid_lat}, {hex.hex_centroid_lon}
                      </div>
                    </Popup>
                  </Polygon>
                ))}
                {hexagonos.map((hex, idx) => (
                  <CircleMarker
                    key={hex.hexagon_pk}
                    center={[hex.hex_centroid_lat, hex.hex_centroid_lon]}
                    pathOptions={{ color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`, fillOpacity: 0.7 }}
                    radius={getRadius(hex.calculatedFluxoEstimado_vl)}
                  >
                    <Popup>
                      <div>
                        <strong>Hexágono:</strong> {hex.hexagon_pk}<br />
                        <strong>Fluxo:</strong> {hex.fluxoEstimado_vl}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            {/* Legendas agrupadas no canto inferior direito */}
            {hexagonos.length > 0 && (
              <div style={{ position: 'absolute', bottom: 96, right: 64, display: 'flex', gap: 24, flexWrap: 'wrap', zIndex: 1000 }}>
                {/* Legenda do tamanho */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 120 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>Legenda do tamanho</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <svg width={24} height={24} style={{ display: 'block' }}>
                      <circle cx={12} cy={12} r={6} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Menor fluxo<br/>{minFluxo.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width={40} height={40} style={{ display: 'block' }}>
                      <circle cx={20} cy={20} r={20} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Maior fluxo<br/>{maxFluxo.toLocaleString()}</span>
                  </div>
                </div>
                {/* Legenda de grupos */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 120 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>Legenda de grupos</div>
                  {Array.from(new Map(hexagonos.map(h => [h.grupoDesc_st, h]))).map(([grupo, hex]) => (
                    <div key={grupo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`, border: '2px solid #888' }}></span>
                      <span style={{ fontSize: 12, color: '#444' }}>{grupo || 'Sem grupo'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <div className="w-full bg-white py-4 border-t border-[#e5e5e5] flex justify-center pointer-events-auto">
            {/* Remover qualquer renderização do componente Pagination e divs relacionadas */}
          </div>
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </div>
  );
}; 