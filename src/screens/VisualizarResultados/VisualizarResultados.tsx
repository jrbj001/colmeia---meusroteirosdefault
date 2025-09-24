import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../../config/axios";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';

interface RoteiroData {
  planoMidiaGrupo_pk: number;
  planoMidiaGrupo_st: string;
  gender_st: string;
  class_st: string;
  age_st: string;
  cidadeUpper_st_concat: string;
  semanasMax_vl: number;
  date_dh: string;
}

interface ResultadoData {
  report_pk: number;
  cidade_st: string;
  impactosTotal_vl: number;
  coberturaPessoasTotal_vl: number;
  coberturaPessoasGTotal_vl: number;
  coberturaPessoasPTotal_vl: number;
  coberturaProporcionalGPTotal_vl: number;
  coberturaProp_vl: number;
  frequencia_vl: number;
  grp_vl: number;
  pontosPracaTotal_vl: number;
  pontosTotal_vl: number;
  pontosPracaPropTotal_vl: number;
  deflacaoFrequencia_vl: number;
  oohLimitProp_vl: number;
  populacaoTotal_vl: number;
  coberturaLimiteTotal_vl: number;
  frequenciaTeorica_vl: number;
  noCobProp_vl: number;
}

interface TotaisData {
  impactosTotal_vl: number;
  coberturaPessoasTotal_vl: number;
  coberturaPessoasGTotal_vl: number;
  coberturaPessoasPTotal_vl: number;
  frequencia_vl: number;
  grp_vl: number;
  pontosPracaTotal_vl: number;
  pontosTotal_vl: number;
  coberturaProp_vl: number;
}

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
  geometry_8: string;
  grupoDesc_st: string;
}

export const VisualizarResultados: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuReduzido, setMenuReduzido] = useState(false);
  
  const [roteiroData, setRoteiroData] = useState<RoteiroData | null>(null);
  const [dadosResultados, setDadosResultados] = useState<ResultadoData[]>([]);
  const [totaisResultados, setTotaisResultados] = useState<TotaisData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados para o mapa
  const [mapaVisivel, setMapaVisivel] = useState(false);
  const [pracaSelecionada, setPracaSelecionada] = useState<string | null>(null);
  const [hexagonos, setHexagonos] = useState<Hexagono[]>([]);
  const [carregandoMapa, setCarregandoMapa] = useState(false);

  useEffect(() => {
    if (location.state?.roteiroData) {
      const roteiro = location.state.roteiroData;
      setRoteiroData(roteiro);
      carregarDadosResultados(roteiro.planoMidiaGrupo_pk);
    } else {
      setErro('Dados do roteiro não encontrados');
      setCarregando(false);
    }
  }, [location.state]);

  const carregarDadosResultados = async (planoMidiaGrupo_pk: number) => {
    try {
      setCarregando(true);
      console.log('📊 Carregando resultados para PK:', planoMidiaGrupo_pk);

      const response = await axios.post('/report-indicadores-vias-publicas', {
        report_pk: planoMidiaGrupo_pk
      });

      if (response.data.success) {
        setDadosResultados(response.data.data);
        setTotaisResultados(response.data.totais);
        console.log('✅ Dados carregados:', response.data.data.length, 'registros');
      } else {
        setErro('Erro ao carregar dados dos resultados');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar resultados:', error);
      setErro('Erro ao carregar dados dos resultados');
    } finally {
      setCarregando(false);
    }
  };

  const formatarNumero = (valor: number | undefined) => {
    if (valor === undefined || valor === null) return '0';
    return Math.round(valor).toLocaleString('pt-BR');
  };

  const formatarPercentual = (valor: number | undefined) => {
    if (valor === undefined || valor === null) return '0';
    // Exibir o valor decimal diretamente (0.4, 1.4, 1.045)
    return valor.toFixed(1);
  };

  // Função auxiliar para converter WKT em coordenadas
  const wktToLatLngs = (wkt: string): [number, number][] => {
    const coords = wkt.replace(/POLYGON\(\(|\)\)/g, '').split(',');
    return coords.map(coord => {
      const [lng, lat] = coord.trim().split(' ').map(Number);
      return [lat, lng] as [number, number];
    }).filter((x): x is [number, number] => Array.isArray(x) && x.length === 2);
  };

  // Componente auxiliar para ajustar o centro do mapa
  const AjustarMapa: React.FC<{ hexagonos: Hexagono[] }> = ({ hexagonos }) => {
    const map = useMap();
    
    useEffect(() => {
      if (hexagonos.length > 0) {
        const bounds = L.latLngBounds(hexagonos.map(hex => [hex.hex_centroid_lat, hex.hex_centroid_lon]));
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }, [hexagonos, map]);
    
    return null;
  };

  const carregarHexagonosMapa = async (cidade: string) => {
    console.log(`🗺️ [DEBUG] Iniciando carregarHexagonosMapa para: ${cidade}`);
    
    if (!roteiroData) {
      console.error(`❌ [DEBUG] roteiroData não disponível`);
      return;
    }
    
    try {
      setCarregandoMapa(true);
      console.log(`🗺️ [DEBUG] setCarregandoMapa(true) executado`);
      console.log(`🗺️ Carregando hexágonos para ${cidade}`);
      
      const requestData = {
        grupo: roteiroData.planoMidiaGrupo_pk,
        cidade: cidade,
        semana: '1' // Usar primeira semana por padrão
      };
      
      console.log(`🗺️ [DEBUG] Dados da requisição:`, requestData);
      
      const response = await axios.post('/hexagonos', requestData);
      
      console.log(`🗺️ [DEBUG] Resposta da API:`, response.data);

      if (response.data && Array.isArray(response.data)) {
        setHexagonos(response.data);
        console.log(`✅ ${response.data.length} hexágonos carregados para ${cidade}`);
      } else {
        console.warn('⚠️ Nenhum hexágono encontrado');
        setHexagonos([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar hexágonos:', error);
      setHexagonos([]);
    } finally {
      setCarregandoMapa(false);
      console.log(`🗺️ [DEBUG] setCarregandoMapa(false) executado`);
    }
  };

  const abrirMapa = async (cidade: string) => {
    console.log(`🗺️ Abrindo mapa para cidade: ${cidade}`);
    setPracaSelecionada(cidade);
    setMapaVisivel(true);
    await carregarHexagonosMapa(cidade);
  };

  const fecharMapa = () => {
    setMapaVisivel(false);
    setPracaSelecionada(null);
    setHexagonos([]);
  };

  if (!roteiroData) {
    return (
      <div className="min-h-screen bg-white flex font-sans">
        <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Dados do roteiro não encontrados</p>
            <button 
              onClick={() => navigate('/meus-roteiros')}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Voltar para Meus Roteiros
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div
        className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
      />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar 
          menuReduzido={menuReduzido} 
          breadcrumb={{
            items: [
              { label: "Home", path: "/" },
              { label: "Meus Roteiros", path: "/meus-roteiros" },
              { label: "Resultados" }
            ]
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
        />
        
        <div className="flex-1 pt-8 pb-8">
          <div className="px-16">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#3a3a3a] mb-2">
                Resultados do Roteiro
              </h1>
              <p className="text-gray-600">
                Visualize os resultados detalhados do seu plano de mídia
              </p>
            </div>

            {/* Informações do plano */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-[#3a3a3a] mb-2">
                    PLANO {roteiroData.planoMidiaGrupo_st}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Gênero:</strong> {roteiroData.gender_st}</p>
                    <p><strong>Classe:</strong> {roteiroData.class_st}</p>
                    <p><strong>Faixa etária:</strong> {roteiroData.age_st}</p>
                    <p><strong>Período total da campanha:</strong> {roteiroData.semanasMax_vl} semanas</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Cidades:</strong> {roteiroData.cidadeUpper_st_concat}</p>
                  <p><strong>Data de criação:</strong> {new Date(roteiroData.date_dh).toLocaleDateString('pt-BR')}</p>
                  <p><strong>CPMView:</strong> {totaisResultados?.grp_vl?.toFixed(3) || '0.000'}</p>
                </div>
              </div>
            </div>

            {/* Resultados */}
            {carregando ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando dados dos resultados...</p>
              </div>
            ) : erro ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">{erro}</p>
                <button 
                  onClick={() => carregarDadosResultados(roteiroData.planoMidiaGrupo_pk)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Tentar novamente
                </button>
              </div>
            ) : dadosResultados.length > 0 ? (
              <div className="space-y-8">
                {/* Resumo Total */}
                <div>
                  <h4 className="text-lg font-bold text-[#3a3a3a] mb-4">RESUMO TOTAL</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left font-medium text-[#3a3a3a]">Praça</th>
                          <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Impactos</th>
                          <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Cobertura (pessoas)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Cobertura (%)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Frequência</th>
                          <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">GRP</th>
                          <th className="border border-gray-300 px-4 py-2 text-center font-medium text-[#3a3a3a]">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {console.log('🔍 DEBUG: dadosResultados:', dadosResultados.length, 'itens')}
                        {dadosResultados.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">
                              {item.cidade_st}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarNumero(item.impactosTotal_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarNumero(item.coberturaPessoasTotal_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarPercentual(item.coberturaProp_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {item.frequencia_vl?.toFixed(1) || '0.0'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {item.grp_vl?.toFixed(3) || '0.000'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <button
                                onClick={() => {
                                  console.log('🔴 CLIQUE DETECTADO! cidade_st:', item.cidade_st);
                                  alert(`🔴 CLIQUE! Cidade: ${item.cidade_st}`);
                                  abrirMapa(item.cidade_st);
                                }}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                              >
                                View mapa
                              </button>
                            </td>
                          </tr>
                        ))}
                        {/* Linha de totais */}
                        {totaisResultados && (
                          <tr className="bg-orange-50 font-bold">
                            <td className="border border-gray-300 px-4 py-2 text-[#3a3a3a]">
                              TOTAL
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarNumero(totaisResultados.impactosTotal_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarNumero(totaisResultados.coberturaPessoasTotal_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatarPercentual(totaisResultados.coberturaProp_vl)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {totaisResultados.frequencia_vl?.toFixed(1) || '0.0'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {totaisResultados.grp_vl?.toFixed(3) || '0.000'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {/* Célula vazia para alinhamento */}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mapa */}
                {mapaVisivel && (
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-[#3a3a3a]">
                        Mapa de Hexágonos - {pracaSelecionada}
                      </h4>
                      <button
                        onClick={fecharMapa}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Fechar Mapa
                      </button>
                    </div>
                    
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      {carregandoMapa ? (
                        <div className="h-96 flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando hexágonos do mapa...</p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '500px', width: '100%' }}>
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
                                    <h4><strong>Hexágono {hex.hexagon_pk}</strong></h4>
                                    <p><strong>Grupo:</strong> {hex.grupoDesc_st}</p>
                                    <p><strong>Fluxo Estimado:</strong> {hex.fluxoEstimado_vl?.toLocaleString('pt-BR')}</p>
                                    <p><strong>Fluxo Calculado:</strong> {hex.calculatedFluxoEstimado_vl?.toLocaleString('pt-BR')}</p>
                                    <p><strong>Coordenadas:</strong> {hex.hex_centroid_lat.toFixed(6)}, {hex.hex_centroid_lon.toFixed(6)}</p>
                                  </div>
                                </Popup>
                              </Polygon>
                            ))}
                          </MapContainer>
                        </div>
                      )}
                    </div>
                    
                    {!carregandoMapa && hexagonos.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Total de hexágonos:</strong> {hexagonos.length} | 
                          <strong> Praça:</strong> {pracaSelecionada} |
                          <strong> Fluxo total estimado:</strong> {hexagonos.reduce((sum, hex) => sum + (hex.fluxoEstimado_vl || 0), 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botão de voltar */}
                <div className="flex justify-end">
                  <button 
                    onClick={() => navigate('/meus-roteiros')}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Voltar para Meus Roteiros
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum dado disponível para este roteiro.</p>
                <button 
                  onClick={() => navigate('/meus-roteiros')}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Voltar para Meus Roteiros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
