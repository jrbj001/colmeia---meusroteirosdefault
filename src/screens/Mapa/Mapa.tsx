import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";
import { useSearchParams, useLocation } from "react-router-dom";
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
  const location = useLocation();
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
  
  // Novos estados para feedback do usuário
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [statusType, setStatusType] = React.useState<"info" | "success" | "warning" | "error">("info");
  const [lastSearchInfo, setLastSearchInfo] = React.useState<{
    cidade: string;
    semana: string;
    totalHexagonos: number;
    timestamp: Date;
  } | null>(null);

  // Funções auxiliares para feedback do usuário
  const showStatus = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setStatusMessage(message);
    setStatusType(type);
    // Auto-limpar mensagens de sucesso após 5 segundos
    if (type === "success") {
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  const clearStatus = () => {
    setStatusMessage("");
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} segundos atrás`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutos atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
    return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
  };

  // useEffect para processar dados pré-selecionados vindos da tela de resultados
  React.useEffect(() => {
    if (location.state?.cidadePreSelecionada || location.state?.semanaPreSelecionada) {
      console.log('🗺️ [DEBUG] Dados pré-selecionados recebidos:', location.state);
      
      if (location.state.cidadePreSelecionada) {
        setCidadeSelecionada(location.state.cidadePreSelecionada);
        console.log('🗺️ [DEBUG] Cidade pré-selecionada:', location.state.cidadePreSelecionada);
      }
      
      if (location.state.semanaPreSelecionada) {
        setSemanaSelecionada(location.state.semanaPreSelecionada);
        console.log('🗺️ [DEBUG] Semana pré-selecionada:', location.state.semanaPreSelecionada);
      }
      
      // Se temos roteiroData, usar o grupo dele
      if (location.state.roteiroData?.planoMidiaGrupo_pk) {
        console.log('🗺️ [DEBUG] Usando grupo do roteiro:', location.state.roteiroData.planoMidiaGrupo_pk);
      }
    }
  }, [location.state]);

  React.useEffect(() => {
    console.log("Mapa: grupo recebido:", grupo);
    
    if (grupo) {
      showStatus(`Carregando dados do grupo "${grupo}"...`, "info");
      setLoading(true);
      setErro(null);
      clearStatus();
      
      // Teste inicial da API
      api.get('debug')
        .then(res => {
          console.log("Mapa: API debug funcionando:", res.data);
        })
        .catch(err => {
          console.error("Mapa: API debug falhou:", err);
          showStatus("⚠️ Problemas de conectividade detectados", "warning");
        });
      
      console.log("Mapa: fazendo requisição para cidades com grupo:", grupo);
      
      api.get(`cidades?grupo=${grupo}`)
        .then(res => {
          console.log("Mapa: resposta da API cidades:", res.data);
          console.log("Mapa: cidades recebidas:", res.data.cidades);
          console.log("Mapa: tipo de cidades:", typeof res.data.cidades);
          console.log("Mapa: cidades é array?", Array.isArray(res.data.cidades));
          setCidades(res.data.cidades);
          if (res.data.nomeGrupo) setNomeGrupo(res.data.nomeGrupo);
          
          if (res.data.cidades && res.data.cidades.length) {
            showStatus(`✅ ${res.data.cidades.length} praça(s) encontrada(s) para o grupo "${res.data.nomeGrupo || grupo}"`, "success");
            
            // Buscar os planoMidiaDesc_pk para cada cidade
            console.log("Mapa: fazendo requisição para pivot-descpks com grupo:", grupo);
            api.get(`pivot-descpks?grupo=${grupo}`)
              .then(r => {
                console.log("Mapa: resposta da API pivot-descpks:", r.data);
                setDescPks(Object.fromEntries(Object.entries(r.data.descPks).map(([k, v]) => [k.trim().toUpperCase(), Number(v)])));
              })
              .catch(err => {
                console.error("Mapa: erro na API pivot-descpks:", err);
                setDescPks({});
                showStatus("⚠️ Erro ao carregar dados das praças", "warning");
              });
          } else {
            showStatus(`❌ Nenhuma praça encontrada para o grupo "${res.data.nomeGrupo || grupo}". Verifique se o grupo possui dados cadastrados.`, "error");
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API cidades:", err);
          const errorMsg = err.response?.data?.error || 'Erro ao carregar cidades';
          setErro(errorMsg);
          setCidades([]);
          showStatus(`❌ Erro ao carregar dados: ${errorMsg}`, "error");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      showStatus("👋 Bem-vindo ao Mapa de Roteiros! Selecione um grupo para começar.", "info");
    }
  }, [grupo]);

  React.useEffect(() => {
    console.log("Mapa: cidadeSelecionada:", cidadeSelecionada, "descPks:", descPks);
    if (cidadeSelecionada && descPks[cidadeSelecionada]) {
      showStatus(`📅 Carregando semanas disponíveis para ${cidadeSelecionada}...`, "info");
      console.log("Mapa: fazendo requisição para semanas com desc_pk:", descPks[cidadeSelecionada]);
      api.get(`semanas?desc_pk=${descPks[cidadeSelecionada]}`)
        .then(res => {
          console.log("Mapa: resposta da API semanas:", res.data);
          setSemanas(res.data.semanas);
          if (res.data.semanas && res.data.semanas.length > 0) {
            showStatus(`✅ ${res.data.semanas.length} semana(s) encontrada(s) para ${cidadeSelecionada}`, "success");
          } else {
            showStatus(`⚠️ Nenhuma semana encontrada para ${cidadeSelecionada}. Esta praça pode não ter dados de planejamento.`, "warning");
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API semanas:", err);
          setSemanas([]);
          showStatus(`❌ Erro ao carregar semanas para ${cidadeSelecionada}`, "error");
        });
    } else {
      setSemanas([]);
      if (cidadeSelecionada && !descPks[cidadeSelecionada]) {
        showStatus(`⚠️ Dados da praça ${cidadeSelecionada} não encontrados`, "warning");
      }
    }
  }, [cidadeSelecionada, descPks]);

  // Novo useEffect para buscar hexágonos assim que o grupo for selecionado
  React.useEffect(() => {
    if (grupo) {
      showStatus("🗺️ Carregando mapa do grupo...", "info");
      setLoadingHexagonos(true);
      api.get(`hexagonos?desc_pk=${grupo}`)
        .then(res => {
          const hexagonosData = res.data.hexagonos || [];
          setHexagonos(hexagonosData);
          
          if (hexagonosData.length > 0) {
            const totalFluxo = hexagonosData.reduce((sum: number, hex: Hexagono) => sum + hex.calculatedFluxoEstimado_vl, 0);
            showStatus(`🗺️ Mapa carregado: ${formatNumber(hexagonosData.length)} pontos com fluxo total de ${formatNumber(totalFluxo)}`, "success");
          } else {
            showStatus(`⚠️ Nenhum ponto encontrado para este grupo. Verifique se há dados de planejamento cadastrados.`, "warning");
          }
        })
        .catch(err => {
          console.error("Erro ao carregar hexágonos do grupo:", err);
          setHexagonos([]);
          showStatus("❌ Erro ao carregar mapa do grupo", "error");
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
      const searchTerm = semanaSelecionada ? `semana ${semanaSelecionada}` : "todas as semanas";
      showStatus(`🗺️ Carregando mapa para ${cidadeSelecionada} (${searchTerm})...`, "info");
      setLoadingHexagonos(true);
      
      if (semanaSelecionada) {
        api.get(`hexagonos?desc_pk=${descPks[cidadeSelecionada]}&semana=${semanaSelecionada}`)
          .then(res => {
            const hexagonosData = res.data.hexagonos || [];
            setHexagonos(hexagonosData);
            
            if (hexagonosData.length > 0) {
              const totalFluxo = hexagonosData.reduce((sum: number, hex: Hexagono) => sum + hex.calculatedFluxoEstimado_vl, 0);
              const fluxoMedio = totalFluxo / hexagonosData.length;
              
              showStatus(`✅ Mapa carregado: ${formatNumber(hexagonosData.length)} pontos para ${cidadeSelecionada} (semana ${semanaSelecionada}) - Fluxo médio: ${formatNumber(fluxoMedio)}`, "success");
              
              // Salvar informações da última busca
              setLastSearchInfo({
                cidade: cidadeSelecionada,
                semana: semanaSelecionada,
                totalHexagonos: hexagonosData.length,
                timestamp: new Date()
              });
            } else {
              showStatus(`⚠️ Nenhum ponto encontrado para ${cidadeSelecionada} na semana ${semanaSelecionada}. Esta combinação pode não ter dados de planejamento.`, "warning");
            }
          })
          .catch(err => {
            console.error("Erro ao carregar hexágonos por semana:", err);
            setHexagonos([]);
            showStatus(`❌ Erro ao carregar mapa para ${cidadeSelecionada} (semana ${semanaSelecionada})`, "error");
          })
          .finally(() => {
            setLoadingHexagonos(false);
          });
      } else {
        // Se não houver semana selecionada, busca todos os hexágonos da praça
        api.get(`hexagonos?desc_pk=${descPks[cidadeSelecionada]}`)
          .then(res => {
            const hexagonosData = res.data.hexagonos || [];
            setHexagonos(hexagonosData);
            
            if (hexagonosData.length > 0) {
              const totalFluxo = hexagonosData.reduce((sum: number, hex: Hexagono) => sum + hex.calculatedFluxoEstimado_vl, 0);
              const fluxoMedio = totalFluxo / hexagonosData.length;
              
              showStatus(`✅ Mapa carregado: ${formatNumber(hexagonosData.length)} pontos para ${cidadeSelecionada} (todas as semanas) - Fluxo médio: ${formatNumber(fluxoMedio)}`, "success");
              
              // Salvar informações da última busca
              setLastSearchInfo({
                cidade: cidadeSelecionada,
                semana: "Todas",
                totalHexagonos: hexagonosData.length,
                timestamp: new Date()
              });
            } else {
              showStatus(`⚠️ Nenhum ponto encontrado para ${cidadeSelecionada}. Esta praça pode não ter dados de planejamento.`, "warning");
            }
          })
          .catch(err => {
            console.error("Erro ao carregar hexágonos da praça:", err);
            setHexagonos([]);
            showStatus(`❌ Erro ao carregar mapa para ${cidadeSelecionada}`, "error");
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

  // Componente de Status para feedback do usuário
  const StatusMessage = () => {
    if (!statusMessage) return null;
    
    const bgColor = {
      info: "bg-blue-50 border-blue-200 text-blue-800",
      success: "bg-green-50 border-green-200 text-green-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      error: "bg-red-50 border-red-200 text-red-800"
    }[statusType];
    
    const icon = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌"
    }[statusType];
    
    return (
      <div className={`mb-4 p-3 border rounded-lg flex items-start gap-2 ${bgColor}`}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{statusMessage}</p>
          {statusType === "info" && (
            <button 
              onClick={clearStatus}
              className="text-xs underline mt-1 hover:no-underline"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    );
  };

  // Componente do Mapa simples (usando um mapa básico)
  const MapaVisualizacao = () => {
    if (!hexagonos.length) {
      return (
        <div className="w-full h-full bg-white flex items-center justify-center rounded border">
          <div className="text-center p-8">
            {loadingHexagonos ? (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
                <p className="text-blue-600 font-medium">Carregando mapa...</p>
                <p className="text-sm text-gray-500">Aguarde enquanto processamos os dados</p>
              </div>
            ) : semanaSelecionada ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">🗺️</div>
                <h3 className="text-lg font-semibold text-gray-700">Nenhum ponto encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Não foram encontrados pontos para <strong>{cidadeSelecionada}</strong> na <strong>semana {semanaSelecionada}</strong>.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Possíveis motivos:</strong><br/>
                    • Esta combinação de praça e semana não possui dados de planejamento<br/>
                    • Os dados podem estar em processamento<br/>
                    • Tente selecionar outra semana ou praça
                  </p>
                </div>
              </div>
            ) : cidadeSelecionada ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">🏙️</div>
                <h3 className="text-lg font-semibold text-gray-700">Nenhum ponto encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Não foram encontrados pontos para <strong>{cidadeSelecionada}</strong>.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Possíveis motivos:</strong><br/>
                    • Esta praça não possui dados de planejamento cadastrados<br/>
                    • Os dados podem estar em processamento<br/>
                    • Tente selecionar outra praça
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">📍</div>
                <h3 className="text-lg font-semibold text-gray-700">Selecione uma praça</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Para visualizar o mapa, selecione uma praça e opcionalmente uma semana específica.
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Como usar:</strong><br/>
                    1. Selecione uma praça no filtro à esquerda<br/>
                    2. Opcionalmente, escolha uma semana específica<br/>
                    3. O mapa será carregado automaticamente
                  </p>
                </div>
              </div>
            )}
          </div>
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
        <Topbar 
          menuReduzido={menuReduzido} 
          breadcrumb={{
            items: [
              { label: "Home", path: "/" },
              { label: "Meus roteiros", path: "/" },
              { 
                label: nomeGrupo 
                  ? cidadeSelecionada 
                    ? `Mapa - ${nomeGrupo} > ${cidadeSelecionada}${semanaSelecionada ? ` (Semana ${semanaSelecionada})` : ''}`
                    : `Mapa - ${nomeGrupo}`
                  : "Mapa" 
              }
            ]
          }}
        />
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
              
              {/* Componente de Status */}
              <StatusMessage />
              
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
                  <option value="">Ex.: Semana 1 - 1</option>
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
                  const areaCoberta = hexagonos.length * 0.36; // Aproximação: cada hexágono ~0.36 km²
                  
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <h4 className="text-sm font-bold text-green-700">Resumo dos Dados</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Pontos no mapa</div>
                          <div className="text-green-600 font-bold">{formatNumber(hexagonos.length)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Área coberta</div>
                          <div className="text-blue-600 font-bold">~{formatNumber(areaCoberta)} km²</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Fluxo total</div>
                          <div className="text-purple-600 font-bold">{formatNumber(totalFluxo)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Fluxo médio</div>
                          <div className="text-orange-600 font-bold">{formatNumber(fluxoMedio)}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-white rounded border">
                        <div className="text-xs text-gray-600 mb-1">
                          <strong>Extremos:</strong> {formatNumber(minHex.calculatedFluxoEstimado_vl)} (mín) → {formatNumber(maxHex.calculatedFluxoEstimado_vl)} (máx)
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Grupos:</strong> {grupos.length > 0 ? grupos.join(', ') : 'Nenhum grupo definido'}
                        </div>
                      </div>
                      
                      {lastSearchInfo && (
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Última atualização: {getTimeAgo(lastSearchInfo.timestamp)}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
              
              {/* Seção de Dicas e Ajuda */}
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💡</span>
                  <h4 className="text-sm font-bold text-blue-700">Dicas de Uso</h4>
                </div>
                
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Clique nos pontos do mapa para ver detalhes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use o zoom para explorar áreas específicas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Selecione uma semana para filtrar dados específicos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>As cores indicam diferentes grupos de planejamento</span>
                  </div>
                </div>
                
                {hexagonos.length === 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Não encontrou dados?</strong><br/>
                      • Verifique se a praça possui planejamento cadastrado<br/>
                      • Tente selecionar outra semana<br/>
                      • Entre em contato com o suporte se o problema persistir
                    </p>
                  </div>
                )}
              </div>
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
                  background: 'rgba(255,255,255,0.95)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20
                }}>
                  <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                    <h3 style={{ fontSize: 24, fontWeight: 600, color: '#222', marginBottom: 12 }}>
                      Mapa de Roteiros
                    </h3>
                    <p style={{ fontSize: 16, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
                      Para visualizar o mapa, selecione uma praça no painel à esquerda e opcionalmente uma semana específica.
                    </p>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white', 
                      padding: '12px 24px', 
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      💡 Dica: Comece selecionando uma praça para ver os dados disponíveis
                    </div>
                  </div>
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
                  background: 'rgba(255,255,255,0.8)',
                  zIndex: 1500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      🗺️ Carregando mapa...
                    </div>
                    <div style={{ color: '#666', fontSize: 14 }}>
                      Processando dados para {cidadeSelecionada}
                      {semanaSelecionada && ` (semana ${semanaSelecionada})`}
                    </div>
                  </div>
                </div>
              )}
              <MapContainer
                center={hexagonos.length > 0 ? [hexagonos[0].hex_centroid_lat, hexagonos[0].hex_centroid_lon] : [-15.7801, -47.9292]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#2563eb' }}>
                          📍 Hexágono #{hex.hexagon_pk}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <div><strong>Fluxo estimado:</strong> {formatNumber(hex.fluxoEstimado_vl)}</div>
                          <div><strong>Fluxo calculado:</strong> {formatNumber(hex.calculatedFluxoEstimado_vl)}</div>
                          <div><strong>Grupo:</strong> {hex.grupoDesc_st || 'Não definido'}</div>
                          <div><strong>Plano:</strong> {hex.planoMidiaDesc_st || 'Não definido'}</div>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>
                            <strong>Coordenadas:</strong><br/>
                            Lat: {hex.hex_centroid_lat.toFixed(6)}<br/>
                            Lon: {hex.hex_centroid_lon.toFixed(6)}
                          </div>
                        </div>
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
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#2563eb' }}>
                          📍 Hexágono #{hex.hexagon_pk}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                          <div><strong>Fluxo:</strong> {formatNumber(hex.fluxoEstimado_vl)}</div>
                          <div><strong>Calculado:</strong> {formatNumber(hex.calculatedFluxoEstimado_vl)}</div>
                        </div>
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
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>📏 Tamanho dos Pontos</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <svg width={24} height={24} style={{ display: 'block' }}>
                      <circle cx={12} cy={12} r={6} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Menor fluxo<br/><strong>{formatNumber(minFluxo)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width={40} height={40} style={{ display: 'block' }}>
                      <circle cx={20} cy={20} r={20} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Maior fluxo<br/><strong>{formatNumber(maxFluxo)}</strong></span>
                  </div>
                </div>
                
                {/* Legenda de grupos */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>🎨 Grupos de Planejamento</div>
                  {Array.from(new Map(hexagonos.map(h => [h.grupoDesc_st, h]))).map(([grupo, hex]) => (
                    <div key={grupo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`, border: '2px solid #888' }}></span>
                      <span style={{ fontSize: 11, color: '#444' }}>{grupo || 'Sem grupo'}</span>
                    </div>
                  ))}
                </div>
                
                {/* Informações rápidas */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>ℹ️ Informações</div>
                  <div style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
                    <div><strong>Total:</strong> {formatNumber(hexagonos.length)} pontos</div>
                    <div><strong>Área:</strong> ~{formatNumber(hexagonos.length * 0.36)} km²</div>
                    <div><strong>Última atualização:</strong></div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {lastSearchInfo ? getTimeAgo(lastSearchInfo.timestamp) : 'Agora'}
                    </div>
                  </div>
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