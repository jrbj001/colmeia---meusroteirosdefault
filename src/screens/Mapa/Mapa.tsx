import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";
import { useSearchParams, useLocation } from "react-router-dom";
import api from "../../config/axios";
import { MapContainer, TileLayer, CircleMarker, useMap, Polygon, ZoomControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { MapLoadingOverlay } from '../../components/MapLoadingOverlay';
import { usePlanoOptimizer } from '../../hooks/usePlanoOptimizer';
import { SuggestionsModal } from '../../components/SuggestionsModal';

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
  // Novos campos da API
  hexagon_8: string;
  planoMidia_pk: number;
  grupo_st: string;
  count_vl: number;
  groupCount_vl: number;
}

// Tipo para os dados dos pontos de mídia individuais
interface PontoMidia {
  planoMidia_pk: number;
  latitude_vl: number;
  longitude_vl: number;
  fluxoEstimado_vl?: number;
  calculatedFluxoEstimado_vl?: number;
  estaticoDigital_st: 'D' | 'E';
  grupoSub_st: string;
  grupo_st: string;
  hexColor_st: string;
  rgbColorR_vl: number;
  rgbColorG_vl: number;
  rgbColorB_vl: number;
  nome_st?: string;
  tipo_st?: string;
  formato_st?: string;
  cidade_st?: string;
  estado_st?: string;
  bairro_st?: string;
  [key: string]: any;
}

// Componente auxiliar para ajustar o centro e bounds do mapa (praça selecionada)
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

// Componente para centralizar no Brasil mostrando todas as praças
function AjustarMapaBrasil({ pracas }: { pracas: { lat: number; lon: number }[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (pracas.length === 0) return;
    if (pracas.length === 1) {
      map.setView([pracas[0].lat, pracas[0].lon], 8);
    } else {
      const bounds = L.latLngBounds(pracas.map(p => [p.lat, p.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 8 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pracas.length]);
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

// Função para verificar se um ponto está dentro de um polígono (usando ray casting algorithm)
function pontoDentroPoligono(ponto: [number, number], poligono: [number, number][]): boolean {
  if (poligono.length < 3) return false;
  
  const [lat, lon] = ponto;
  let dentro = false;
  
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [latI, lonI] = poligono[i];
    const [latJ, lonJ] = poligono[j];
    
    const intersect = ((latI > lat) !== (latJ > lat)) &&
      (lon < (lonJ - lonI) * (lat - latI) / (latJ - latI) + lonI);
    
    if (intersect) dentro = !dentro;
  }
  
  return dentro;
}

// Função para calcular distância entre dois pontos (Haversine)
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Retorna em metros
}

// Função para verificar se um ponto está dentro de um hexágono de outro grupo
// IMPORTANTE: Esta função permite MÚLTIPLOS pontos do mesmo grupo dentro do mesmo hexágono
// Retorna true APENAS se o ponto estiver dentro de um hexágono do mesmo grupo
// Retorna false se estiver dentro de hexágono de outro grupo ou não estiver dentro de nenhum

interface ResultadoPraca {
  report_pk: number;
  cidade_st: string;
  impactosTotal_vl: number;
  coberturaPessoasTotal_vl: number;
  coberturaProp_vl: number;
  frequencia_vl: number;
  grp_vl: number;
  pontosPracaTotal_vl: number;
  pontosTotal_vl: number;
}

interface TotaisGerais {
  impactosTotal_vl: number;
  coberturaPessoasTotal_vl: number;
  coberturaProp_vl: number;
  frequencia_vl: number;
  grp_vl: number;
  pontosPracaTotal_vl: number;
  pontosTotal_vl: number;
}

export const Mapa: React.FC = () => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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
  const [dadosPorPraca, setDadosPorPraca] = React.useState<ResultadoPraca[]>([]);
  const [totaisGerais, setTotaisGerais] = React.useState<TotaisGerais | null>(null);
  const [loadingResultados, setLoadingResultados] = React.useState(false);
  const [pracasCentros, setPracasCentros] = React.useState<{ cidade_st: string; estado_st?: string; lat: number; lon: number; total_pontos: number }[]>([]);
  const [hexagonos, setHexagonos] = React.useState<Hexagono[]>([]);
  const [pontosMidia, setPontosMidia] = React.useState<PontoMidia[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHexagonos, setLoadingHexagonos] = React.useState(false);
  const [loadingPontos, setLoadingPontos] = React.useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = React.useState(false);
  const [mostrarModalDetalhes, setMostrarModalDetalhes] = React.useState(false);
  const [mostrarStreetView, setMostrarStreetView] = React.useState(false);
  
  const [tamanhoUniforme, setTamanhoUniforme] = React.useState(false);
  const [pontoSelecionado, setPontoSelecionado] = React.useState<PontoMidia | null>(null);
  const [painelColapsado, setPainelColapsado] = React.useState(false);

  // Drag do painel flutuante
  const painelRef = React.useRef<HTMLDivElement>(null);
  const painelPos = React.useRef({ x: 16, y: 16 });
  const dragState = React.useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false, startX: 0, startY: 0, origX: 16, origY: 16
  });

  const onDragHandleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: painelPos.current.x,
      origY: painelPos.current.y,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current.dragging || !painelRef.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const newX = Math.max(0, dragState.current.origX + dx);
      const newY = Math.max(0, dragState.current.origY + dy);
      painelPos.current = { x: newX, y: newY };
      painelRef.current.style.left = `${newX}px`;
      painelRef.current.style.top = `${newY}px`;
    };
    const onUp = () => {
      dragState.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);
  
  // Hook de otimização do plano
  const { analise, isAnalyzing, analisar, temDados } = usePlanoOptimizer(hexagonos);
  const [erro, setErro] = React.useState<string | null>(null);
  
  // Loading states granulares
  const [loadingCidades, setLoadingCidades] = React.useState(false);
  const [loadingDescPks, setLoadingDescPks] = React.useState(false);
  const [loadingSemanas, setLoadingSemanas] = React.useState(false);
  
  // Estados debounced para performance (reduzido de 300ms para 150ms)
  const debouncedCidadeSelecionada = useDebounce(cidadeSelecionada, 150);
  const debouncedSemanaSelecionada = useDebounce(semanaSelecionada, 150);
  
  // Estados de cache para performance
  const [cacheCidades, setCacheCidades] = React.useState<{ [grupo: string]: string[] }>({});
  const [cacheDescPks, setCacheDescPks] = React.useState<{ [grupo: string]: { [cidade: string]: number } }>({});
  const [cacheSemanas, setCacheSemanas] = React.useState<{ [descPk: string]: { semanaInicial_vl: number, semanaFinal_vl: number }[] }>({});
  const [cacheHexagonos, setCacheHexagonos] = React.useState<{ [key: string]: Hexagono[] }>({});
  
  // Estados para feedback do usuário
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [statusType, setStatusType] = React.useState<"info" | "success" | "warning" | "error">("info");
  const [isDebouncing, setIsDebouncing] = React.useState(false);
  const [lastSearchInfo, setLastSearchInfo] = React.useState<{
    cidade: string;
    semana: string;
    totalHexagonos: number;
    timestamp: Date;
  } | null>(null);

  const streetViewEmbedUrl = React.useMemo(() => {
    if (!pontoSelecionado || !googleMapsApiKey) return null;
    const lat = pontoSelecionado.latitude_vl;
    const lng = pontoSelecionado.longitude_vl;
    const params = new URLSearchParams({
      key: googleMapsApiKey,
      location: `${lat},${lng}`,
      heading: "210",
      pitch: "10",
      fov: "80",
    });
    return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`;
  }, [pontoSelecionado, googleMapsApiKey]);

  const streetViewExternalUrl = React.useMemo(() => {
    if (!pontoSelecionado) return null;
    const lat = pontoSelecionado.latitude_vl;
    const lng = pontoSelecionado.longitude_vl;
    return `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
  }, [pontoSelecionado]);

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

  // Funções auxiliares para popup melhorado
  const getHexagonRanking = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const sortedHexagons = [...allHexagons].sort((a, b) => b.fluxoEstimado_vl - a.fluxoEstimado_vl);
    const rank = sortedHexagons.findIndex(h => h.hexagon_pk === hex.hexagon_pk) + 1;
    const total = allHexagons.length;
    const percentile = Math.round((rank / total) * 100);
    
    if (percentile <= 10) return { text: "Top 10%", color: "#10b981", emoji: "🥇" };
    if (percentile <= 25) return { text: "Top 25%", color: "#3b82f6", emoji: "🥈" };
    if (percentile <= 50) return { text: "Top 50%", color: "#f59e0b", emoji: "🥉" };
    return { text: "Abaixo da média", color: "#6b7280", emoji: "📊" };
  };

  const getFluxoVsMedia = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const media = allHexagons.reduce((sum, h) => sum + h.fluxoEstimado_vl, 0) / allHexagons.length;
    const diff = ((hex.fluxoEstimado_vl - media) / media) * 100;
    
    if (diff > 20) return { text: `+${diff.toFixed(0)}%`, color: "#10b981", emoji: "📈" };
    if (diff > 0) return { text: `+${diff.toFixed(0)}%`, color: "#3b82f6", emoji: "📊" };
    if (diff > -20) return { text: `${diff.toFixed(0)}%`, color: "#f59e0b", emoji: "📉" };
    return { text: `${diff.toFixed(0)}%`, color: "#ef4444", emoji: "📉" };
  };

  const getAreaAproximada = (hex: Hexagono) => {
    // Estimativa baseada no tamanho padrão de hexágonos H3 nível 8
    // H3 nível 8 tem aproximadamente 0.74 km²
    return "~0.74 km²";
  };

  const getTipoRegiao = (hex: Hexagono) => {
    // Lógica simples baseada no fluxo para determinar tipo de região
    if (hex.calculatedFluxoEstimado_vl > 150000) return { text: "Centro comercial", emoji: "🏢" };
    if (hex.calculatedFluxoEstimado_vl > 100000) return { text: "Área comercial", emoji: "🏪" };
    if (hex.calculatedFluxoEstimado_vl > 50000) return { text: "Residencial", emoji: "🏠" };
    return { text: "Baixa densidade", emoji: "🌳" };
  };

  // Funções para métricas de eficiência
  const getEficiencia = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const mediaFluxo = allHexagons.reduce((sum, h) => sum + h.fluxoEstimado_vl, 0) / allHexagons.length;
    const eficiencia = (hex.fluxoEstimado_vl / mediaFluxo) * 100;
    
    if (eficiencia > 150) return { text: "Muito Alta", color: "#10b981", emoji: "🚀" };
    if (eficiencia > 120) return { text: "Alta", color: "#3b82f6", emoji: "💰" };
    if (eficiencia > 80) return { text: "Média", color: "#f59e0b", emoji: "📊" };
    return { text: "Baixa", color: "#ef4444", emoji: "📉" };
  };

  const getCobertura = (hex: Hexagono) => {
    // Simulação baseada no fluxo - em um sistema real viria da API
    const cobertura = Math.min(95, Math.max(60, (hex.fluxoEstimado_vl / 200000) * 100));
    
    if (cobertura > 90) return { text: `${cobertura.toFixed(0)}%`, color: "#10b981", emoji: "👥" };
    if (cobertura > 75) return { text: `${cobertura.toFixed(0)}%`, color: "#3b82f6", emoji: "👥" };
    if (cobertura > 60) return { text: `${cobertura.toFixed(0)}%`, color: "#f59e0b", emoji: "👥" };
    return { text: `${cobertura.toFixed(0)}%`, color: "#ef4444", emoji: "👥" };
  };

  const getPontosDisponiveis = (hex: Hexagono) => {
    // Usar count_vl se disponível, senão simular baseado no fluxo
    const pontos = hex.count_vl || Math.floor(hex.calculatedFluxoEstimado_vl / 10000);
    
    if (pontos > 15) return { text: `${pontos} pontos`, color: "#10b981", emoji: "📍" };
    if (pontos > 8) return { text: `${pontos} pontos`, color: "#3b82f6", emoji: "📍" };
    if (pontos > 3) return { text: `${pontos} pontos`, color: "#f59e0b", emoji: "📍" };
    return { text: `${pontos} pontos`, color: "#ef4444", emoji: "📍" };
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

  // useEffect para detectar mudanças em tempo real e mostrar indicador de debounce
  React.useEffect(() => {
    const cidadeChanged = cidadeSelecionada !== debouncedCidadeSelecionada;
    const semanaChanged = semanaSelecionada !== debouncedSemanaSelecionada;
    
    // Só mostrar debounce se realmente há mudança E não está usando cache
    if ((cidadeChanged || semanaChanged) && !isDebouncing) {
      setIsDebouncing(true);
      showStatus("⏳ Aguardando...", "info");
    } else if (!cidadeChanged && !semanaChanged && isDebouncing) {
      // Resetar debounce quando valores estão sincronizados
      setIsDebouncing(false);
    }
  }, [cidadeSelecionada, debouncedCidadeSelecionada, semanaSelecionada, debouncedSemanaSelecionada, isDebouncing]);

  React.useEffect(() => {
    console.log("Mapa: grupo recebido:", grupo);
    
    if (grupo) {
      // Verificar cache primeiro
      if (cacheCidades[grupo]) {
        console.log("🗺️ [CACHE] Usando cidades do cache para grupo:", grupo);
        setCidades(cacheCidades[grupo]);
        setLoading(false);
        setLoadingCidades(false);
        setLoadingDescPks(false);
        setIsDebouncing(false); // Resetar debounce quando usa cache
        showStatus(`✅ Dados carregados do cache para grupo ${grupo}`, "success");
        return;
      }

      showStatus(`Carregando dados do grupo "${grupo}"...`, "info");
      setLoading(true);
      setLoadingCidades(true);
      setLoadingDescPks(true);
      setErro(null);
      clearStatus();
      
      console.log("🗺️ [PERF] Carregando dados em paralelo para grupo:", grupo);
      
      // Paralelizar chamadas independentes
      const promises = [
        api.get(`cidades?grupo=${grupo}`),
        cacheDescPks[grupo] ? Promise.resolve({ data: { descPks: cacheDescPks[grupo] } }) : api.get(`pivot-descpks?grupo=${grupo}`)
      ];
      
      Promise.all(promises)
        .then(([cidadesRes, descPksRes]) => {
          // Processar resposta de cidades
          console.log("🗺️ [CACHE] Salvando cidades no cache para grupo:", grupo);
          setCidades(cidadesRes.data.cidades);
          setCacheCidades(prev => ({ ...prev, [grupo]: cidadesRes.data.cidades }));
          setLoadingCidades(false);
          if (cidadesRes.data.nomeGrupo) setNomeGrupo(cidadesRes.data.nomeGrupo);
          
          // Processar resposta de descPks
          if (!cacheDescPks[grupo]) {
            console.log("🗺️ [CACHE] Salvando descPks no cache para grupo:", grupo);
            const descPksData = Object.fromEntries(Object.entries(descPksRes.data.descPks).map(([k, v]) => [k.trim().toUpperCase(), Number(v)]));
            setDescPks(descPksData);
            setCacheDescPks(prev => ({ ...prev, [grupo]: descPksData }));
          } else {
            console.log("🗺️ [CACHE] Usando descPks do cache para grupo:", grupo);
            setDescPks(cacheDescPks[grupo]);
          }
          setLoadingDescPks(false);
          
          if (cidadesRes.data.cidades && cidadesRes.data.cidades.length) {
            showStatus(`✅ ${cidadesRes.data.cidades.length} praça(s) encontrada(s) para o grupo "${cidadesRes.data.nomeGrupo || grupo}"`, "success");
          } else {
            showStatus(`❌ Nenhuma praça encontrada para o grupo "${cidadesRes.data.nomeGrupo || grupo}". Verifique se o grupo possui dados cadastrados.`, "error");
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
          setLoadingCidades(false);
          setLoadingDescPks(false);
        });
    } else {
      showStatus("👋 Bem-vindo ao Mapa de Roteiros! Selecione um grupo para começar.", "info");
    }
  }, [grupo]);

  // Carregar resultados gerais por praça + centroids ao abrir a tela
  React.useEffect(() => {
    if (!grupo) return;
    setLoadingResultados(true);
    Promise.all([
      api.post('report-indicadores-vias-publicas', { report_pk: Number(grupo) }),
      api.get(`pracas-centros?grupo_pk=${grupo}`),
    ])
      .then(([indicRes, centrosRes]) => {
        if (indicRes.data.success) {
          setDadosPorPraca(indicRes.data.data || []);
          setTotaisGerais(indicRes.data.totais || null);
        }
        if (centrosRes.data.pracas) {
          setPracasCentros(centrosRes.data.pracas);
        }
      })
      .catch(err => console.error('Erro ao carregar resultados por praça:', err))
      .finally(() => setLoadingResultados(false));
  }, [grupo]);

  React.useEffect(() => {
    console.log("🗺️ [DEBOUNCE] cidadeSelecionada:", cidadeSelecionada, "debounced:", debouncedCidadeSelecionada);
    console.log("🗺️ [DEBOUNCE] descPks:", descPks);
    if (debouncedCidadeSelecionada && descPks[debouncedCidadeSelecionada]) {
      const descPk = descPks[debouncedCidadeSelecionada];
      
      // Verificar cache primeiro
      if (cacheSemanas[descPk]) {
        console.log("🗺️ [CACHE] Usando semanas do cache para descPk:", descPk);
        
        // Filtrar semanas que têm valores null (garantir consistência)
        const semanasCacheadas = cacheSemanas[descPk].filter((semana: any) => 
          semana.semanaInicial_vl !== null && 
          semana.semanaInicial_vl !== undefined && 
          semana.semanaFinal_vl !== null && 
          semana.semanaFinal_vl !== undefined
        );
        
        setSemanas(semanasCacheadas);
        setLoadingSemanas(false);
        setIsDebouncing(false); // Resetar debounce quando usa cache
        showStatus(`✅ ${semanasCacheadas.length} semana(s) válida(s) do cache para ${debouncedCidadeSelecionada}`, "success");
        return;
      }

      showStatus(`📅 [DEBOUNCE] Carregando semanas disponíveis para ${debouncedCidadeSelecionada}...`, "info");
      setLoadingSemanas(true);
      console.log("🗺️ [CACHE] Carregando semanas para descPk:", descPk);
      api.get(`semanas?desc_pk=${descPk}`)
        .then(res => {
          console.log("🗺️ [CACHE] Salvando semanas no cache para descPk:", descPk);
          
          // Filtrar semanas que têm valores null em semanaInicial_vl ou semanaFinal_vl
          const semanasValidas = (res.data.semanas || []).filter((semana: any) => 
            semana.semanaInicial_vl !== null && 
            semana.semanaInicial_vl !== undefined && 
            semana.semanaFinal_vl !== null && 
            semana.semanaFinal_vl !== undefined
          );
          
          console.log(`🗺️ Semanas filtradas: ${res.data.semanas?.length || 0} → ${semanasValidas.length} (removidas null/null)`);
          
          setSemanas(semanasValidas);
          setCacheSemanas(prev => ({ ...prev, [descPk]: semanasValidas }));
          if (semanasValidas.length > 0) {
            showStatus(`✅ ${semanasValidas.length} semana(s) válida(s) para ${cidadeSelecionada}`, "success");
          } else {
            showStatus(`⚠️ Nenhuma semana válida encontrada para ${cidadeSelecionada}. Esta praça pode não ter dados de planejamento.`, "warning");
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API semanas:", err);
          setSemanas([]);
          showStatus(`❌ Erro ao carregar semanas para ${cidadeSelecionada}`, "error");
        })
        .finally(() => {
          setLoadingSemanas(false);
        });
    } else {
      setSemanas([]);
      if (cidadeSelecionada && !descPks[cidadeSelecionada]) {
        showStatus(`⚠️ Dados da praça ${cidadeSelecionada} não encontrados`, "warning");
      }
    }
  }, [debouncedCidadeSelecionada, descPks]);

  // useEffect otimizado para buscar hexágonos com debounce
  React.useEffect(() => {
    console.log("🗺️ [DEBOUNCE] cidadeSelecionada:", cidadeSelecionada, "debounced:", debouncedCidadeSelecionada);
    console.log("🗺️ [DEBOUNCE] semanaSelecionada:", semanaSelecionada, "debounced:", debouncedSemanaSelecionada);
    
    // Se não há cidade selecionada mas há grupo, limpar hexágonos
    if (!debouncedCidadeSelecionada && grupo) {
      console.log("🗺️ [DEBUG] Limpando hexágonos - nenhuma cidade selecionada");
      setHexagonos([]);
      return;
    }
    
    // Só busca se houver cidadeSelecionada e descPks[cidadeSelecionada]
    if (debouncedCidadeSelecionada && descPks[debouncedCidadeSelecionada]) {
      const descPk = descPks[debouncedCidadeSelecionada];
      const cacheKey = `${descPk}_${debouncedSemanaSelecionada || 'all'}`;
      
      // Verificar cache primeiro (COM PRIORIDADE - mais rápido)
      if (cacheHexagonos[cacheKey]) {
        console.log("🗺️ [CACHE HIT] Usando hexágonos do cache para:", cacheKey);
        console.log(`🗺️ [CACHE] Total de hexágonos no cache: ${cacheHexagonos[cacheKey].length}`);
        setHexagonos(cacheHexagonos[cacheKey]);
        setLoadingHexagonos(false); // Garantir que loading está false
        setIsDebouncing(false); // Resetar debounce quando usa cache
        const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
        showStatus(`⚡ Cache: ${cacheHexagonos[cacheKey].length} pontos para ${debouncedCidadeSelecionada} (${semanaText})`, "success");
        return;
      }
      
      console.log("🗺️ [CACHE MISS] Não encontrado no cache:", cacheKey);

      const searchTerm = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
      showStatus(`🗺️ [DEBOUNCE] Carregando mapa para ${debouncedCidadeSelecionada} (${searchTerm})...`, "info");
      setLoadingHexagonos(true);
      
      // Construir URL da API de forma otimizada
      const apiUrl = debouncedSemanaSelecionada 
        ? `hexagonos?desc_pk=${descPk}&semana=${debouncedSemanaSelecionada}`
        : `hexagonos?desc_pk=${descPk}`;
      
      console.log("🗺️ [PERF] Carregando hexágonos para:", cacheKey);
      const startTime = performance.now();
      
      api.get(apiUrl)
        .then(res => {
          const endTime = performance.now();
          const loadTime = (endTime - startTime).toFixed(2);
          const hexagonosData = res.data.hexagonos || [];
          console.log(`🗺️ [CACHE] Salvando ${hexagonosData.length} hexágonos no cache (${loadTime}ms)`);
          setHexagonos(hexagonosData);
          setCacheHexagonos(prev => ({ ...prev, [cacheKey]: hexagonosData }));
          
          if (hexagonosData.length > 0) {
            const totalFluxo = hexagonosData.reduce((sum: number, hex: Hexagono) => sum + hex.calculatedFluxoEstimado_vl, 0);
            const fluxoMedio = totalFluxo / hexagonosData.length;
            
            const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
            showStatus(`✅ Carregado em ${loadTime}ms: ${formatNumber(hexagonosData.length)} pontos para ${debouncedCidadeSelecionada} (${semanaText}) - Fluxo médio: ${formatNumber(fluxoMedio)}`, "success");
            
            // Salvar informações da última busca
            setLastSearchInfo({
              cidade: debouncedCidadeSelecionada,
              semana: debouncedSemanaSelecionada,
              totalHexagonos: hexagonosData.length,
              timestamp: new Date()
            });
          } else {
            const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
            showStatus(`⚠️ Nenhum ponto encontrado para ${debouncedCidadeSelecionada} (${semanaText}). Esta combinação pode não ter dados de planejamento.`, "warning");
          }
        })
        .catch(err => {
          console.error("Erro ao carregar hexágonos:", err);
          setHexagonos([]);
          const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
          showStatus(`❌ Erro ao carregar mapa para ${debouncedCidadeSelecionada} (${semanaText})`, "error");
        })
        .finally(() => {
          setLoadingHexagonos(false);
        });
    }
  }, [debouncedCidadeSelecionada, debouncedSemanaSelecionada, descPks]);

  // useEffect para carregar pontos de mídia individuais
  // IMPORTANTE: Os pontos devem ser filtrados pelos grupos dos hexágonos
  React.useEffect(() => {
    if (!debouncedCidadeSelecionada) {
      setPontosMidia([]);
      return;
    }

    const descPk = descPks[debouncedCidadeSelecionada];
    if (!descPk) {
      setPontosMidia([]);
      return;
    }

    // Só carregar pontos se houver hexágonos carregados
    // Os pontos devem derivar dos grupos dos hexágonos
    if (hexagonos.length === 0) {
      setPontosMidia([]);
      return;
    }

    console.log("🗺️ Carregando pontos de mídia para desc_pk:", descPk);
    console.log("🗺️ Grupos dos hexágonos disponíveis:", Array.from(new Set(hexagonos.map(h => h.grupo_st).filter(Boolean))));
    setLoadingPontos(true);

    api.get(`pontos-midia?desc_pk=${descPk}`)
      .then(res => {
        const pontosData = res.data.pontos || [];
        const gruposHexagonos = new Set(hexagonos.map(h => h.grupo_st).filter(Boolean));
        
        const pontosFiltrados = pontosData
          .filter((p: PontoMidia) => p.grupo_st && gruposHexagonos.has(p.grupo_st))
          .map((p: PontoMidia) => {
            if (!p.grupoSub_st || !p.grupoSub_st.startsWith(p.grupo_st)) {
              const tipo = p.estaticoDigital_st || 'D';
              return { ...p, grupoSub_st: `${p.grupo_st}${tipo}` };
            }
            return p;
          });
        
        setPontosMidia(pontosFiltrados);
      })
      .catch(err => {
        console.error("Erro ao carregar pontos de mídia:", err);
        setPontosMidia([]);
      })
      .finally(() => {
        setLoadingPontos(false);
      });
  }, [debouncedCidadeSelecionada, descPks, hexagonos]);

  const getFluxoRealPonto = (p: PontoMidia) => {
    if (p.fluxoEstimado_vl != null && p.fluxoEstimado_vl > 0) return p.fluxoEstimado_vl;
    if (p.calculatedFluxoEstimado_vl != null && p.calculatedFluxoEstimado_vl > 0) return p.calculatedFluxoEstimado_vl;
    return 0;
  };

  // Pre-converter todas as geometrias WKT UMA vez (elimina recalculo a cada render)
  const geometriasConvertidas = React.useMemo(() => {
    const mapa = new Map<number, [number, number][]>();
    for (const hex of hexagonos) {
      if (hex.geometry_8) {
        mapa.set(hex.hexagon_pk, wktToLatLngs(hex.geometry_8));
      }
    }
    return mapa;
  }, [hexagonos]);

  // Index espacial: agrupar hexagonos por grupo para reduzir loops
  const hexagonosPorGrupo = React.useMemo(() => {
    const mapa = new Map<string, Hexagono[]>();
    for (const hex of hexagonos) {
      if (!hex.grupo_st) continue;
      const arr = mapa.get(hex.grupo_st);
      if (arr) arr.push(hex);
      else mapa.set(hex.grupo_st, [hex]);
    }
    return mapa;
  }, [hexagonos]);

  // Cores por grupo (pre-computado)
  const coresPorGrupo = React.useMemo(() => {
    const mapa = new Map<string, string>();
    for (const hex of hexagonos) {
      if (hex.grupo_st && !mapa.has(hex.grupo_st)) {
        mapa.set(hex.grupo_st, hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`);
      }
    }
    return mapa;
  }, [hexagonos]);

  // Pre-processar TODAS as validacoes de pontos FORA do render
  // Elimina O(n*m) do JSX, roda apenas quando dados mudam
  const pontosValidados = React.useMemo(() => {
    if (hexagonos.length === 0 || pontosMidia.length === 0) return [];

    const resultado: Array<{
      ponto: PontoMidia;
      cor: string;
      radius: number;
      hexagonoAssociado: Hexagono | null;
      fluxoAgregado: number;
      totalPontosNoHex: number;
    }> = [];

    const fluxoAgregadoPorHex = new Map<number, { total: number; count: number }>();

    // Calcular min/max fluxo para raio
    const fluxos = pontosMidia.map(getFluxoRealPonto);
    const minF = Math.min(...fluxos);
    const maxF = Math.max(...fluxos);

    for (const ponto of pontosMidia) {
      // Validacao 1: subgrupo deve derivar do grupo
      if (ponto.grupoSub_st && !ponto.grupoSub_st.startsWith(ponto.grupo_st)) continue;

      // Validacao 2: grupo do ponto deve existir nos hexagonos
      const corGrupo = coresPorGrupo.get(ponto.grupo_st);
      if (!corGrupo) continue;

      // Validacao 3: ponto dentro de hexagono do mesmo grupo (usando index espacial)
      const hexsDoGrupo = hexagonosPorGrupo.get(ponto.grupo_st) || [];
      const pontoCoords: [number, number] = [ponto.latitude_vl, ponto.longitude_vl];
      let hexValido: Hexagono | null = null;
      let dentroOutroGrupo = false;

      // Checar hexagonos do mesmo grupo primeiro
      for (const hex of hexsDoGrupo) {
        const poligono = geometriasConvertidas.get(hex.hexagon_pk);
        if (!poligono || poligono.length < 3) continue;
        if (pontoDentroPoligono(pontoCoords, poligono)) {
          hexValido = hex;
          break;
        }
      }

      // Se nao achou no mesmo grupo, verificar se esta dentro de outro grupo (bloqueio)
      if (!hexValido) {
        for (const [grp, hexs] of hexagonosPorGrupo) {
          if (grp === ponto.grupo_st) continue;
          for (const hex of hexs) {
            const poligono = geometriasConvertidas.get(hex.hexagon_pk);
            if (!poligono || poligono.length < 3) continue;
            if (pontoDentroPoligono(pontoCoords, poligono)) {
              dentroOutroGrupo = true;
              break;
            }
          }
          if (dentroOutroGrupo) break;
        }

        if (dentroOutroGrupo) continue;

        // Fallback: proximidade (1km) de hexagono do mesmo grupo
        let menorDist = Infinity;
        for (const hex of hexsDoGrupo) {
          const dist = calcularDistancia(ponto.latitude_vl, ponto.longitude_vl, hex.hex_centroid_lat, hex.hex_centroid_lon);
          if (dist < menorDist) {
            menorDist = dist;
            hexValido = hex;
          }
        }
        if (menorDist >= 1000) continue;
      }

      // Ponto validado — calcular dados
      const cor = ponto.hexColor_st || `rgb(${ponto.rgbColorR_vl},${ponto.rgbColorG_vl},${ponto.rgbColorB_vl})`;
      const fluxo = getFluxoRealPonto(ponto);
      const radius = tamanhoUniforme ? 10 : (maxF === minF ? 10 : 6 + 10 * ((fluxo - minF) / (maxF - minF)));

      // Agregar fluxo por hexagono
      if (hexValido) {
        const agg = fluxoAgregadoPorHex.get(hexValido.hexagon_pk);
        if (agg) { agg.total += fluxo; agg.count += 1; }
        else fluxoAgregadoPorHex.set(hexValido.hexagon_pk, { total: fluxo, count: 1 });
      }

      resultado.push({
        ponto,
        cor,
        radius,
        hexagonoAssociado: hexValido,
        fluxoAgregado: 0,
        totalPontosNoHex: 0,
      });
    }

    // Segunda passada: preencher fluxo agregado
    for (const r of resultado) {
      if (r.hexagonoAssociado) {
        const agg = fluxoAgregadoPorHex.get(r.hexagonoAssociado.hexagon_pk);
        if (agg) {
          r.fluxoAgregado = agg.total;
          r.totalPontosNoHex = agg.count;
        }
      }
    }

    return resultado;
  }, [pontosMidia, hexagonos, geometriasConvertidas, hexagonosPorGrupo, coresPorGrupo, tamanhoUniforme]);

  const minFluxo = hexagonos.length > 0 ? Math.min(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 0;
  const maxFluxo = hexagonos.length > 0 ? Math.max(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 1;
  
  function getRadius(fluxo: number) {
    if (maxFluxo === minFluxo) return 10;
    return 6 + 14 * ((fluxo - minFluxo) / (maxFluxo - minFluxo));
  }

  // Componente de Status para feedback do usuário
  const StatusMessage = () => {
    if (!statusMessage) return null;
    
    const configs = {
      info: { 
        bg: "bg-gradient-to-r from-blue-50 to-indigo-50", 
        border: "border-blue-300", 
        text: "text-blue-800",
        icon: "ℹ️",
        dotColor: "bg-blue-500"
      },
      success: { 
        bg: "bg-gradient-to-r from-green-50 to-emerald-50", 
        border: "border-green-300", 
        text: "text-green-800",
        icon: "✅",
        dotColor: "bg-green-500"
      },
      warning: { 
        bg: "bg-gradient-to-r from-yellow-50 to-amber-50", 
        border: "border-yellow-300", 
        text: "text-yellow-800",
        icon: "⚠️",
        dotColor: "bg-yellow-500"
      },
      error: { 
        bg: "bg-gradient-to-r from-red-50 to-pink-50", 
        border: "border-red-300", 
        text: "text-red-800",
        icon: "❌",
        dotColor: "bg-red-500"
      }
    };
    
    const config = configs[statusType];
    
    const icons = {
      info: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    };
    
    return (
      <div className={`mb-4 p-4 border-2 rounded-xl shadow-sm flex items-start gap-3 ${config.bg} ${config.border} ${config.text}`}>
        <div className={`w-8 h-8 ${config.dotColor} rounded-full flex items-center justify-center flex-shrink-0`}>
          {icons[statusType]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{statusMessage}</p>
          {statusType === "info" && (
            <button 
              onClick={clearStatus}
              className="text-xs underline mt-1 hover:no-underline opacity-80 hover:opacity-100"
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
            {semanaSelecionada && !loadingHexagonos ? (
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
        {/* Mapa fullscreen — ocupa toda a área após o topbar */}
        <div className="relative flex-1 overflow-hidden" style={{ marginTop: 72 }}>
            {/* Painel lateral flutuante sobre o mapa */}
            <div
              ref={painelRef}
              className="absolute z-[500] flex flex-col w-[300px] rounded-2xl shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', top: 16, left: 16 }}
            >
              {/* Handle de drag + botão colapso */}
              <div
                onMouseDown={onDragHandleMouseDown}
                className="flex items-center justify-between px-3 py-2 rounded-t-2xl cursor-grab active:cursor-grabbing select-none"
                style={{ background: 'rgba(240,240,240,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="4" cy="4" r="1.2" fill="#aaa"/>
                    <circle cx="10" cy="4" r="1.2" fill="#aaa"/>
                    <circle cx="4" cy="9" r="1.2" fill="#aaa"/>
                    <circle cx="10" cy="9" r="1.2" fill="#aaa"/>
                  </svg>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Painel</span>
              </div>
                  <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setPainelColapsado(v => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  title={painelColapsado ? 'Expandir painel' : 'Minimizar painel'}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    {painelColapsado
                      ? <path d="M2 4l4 4 4-4" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      : <path d="M2 8l4-4 4 4" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    }
                        </svg>
                  </button>
                        </div>

              {/* Conteúdo colapsável */}
              <div
                className="flex flex-col overflow-y-auto p-3"
                style={{
                  maxHeight: painelColapsado ? 0 : 'calc(100vh - 120px)',
                  overflow: painelColapsado ? 'hidden' : 'auto',
                  transition: 'max-height 0.25s ease',
                  gap: 0,
                }}
              >

              {/* Cabeçalho da campanha */}
              <div className="mb-4 rounded-xl border-2 border-gray-800 bg-white px-4 py-3">
                <div className="text-[10px] text-[#ff4600] uppercase tracking-wide font-semibold mb-0.5">● Campanha</div>
                <div className="text-sm font-bold text-gray-900 leading-tight break-all">
                  {nomeGrupo || <span className="italic text-gray-400">Carregando...</span>}
                    </div>
                {hexagonos.length > 0 && (
                  <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
                    <span><strong className="text-gray-600">{formatNumber(hexagonos.length)}</strong> hex</span>
                    <span>·</span>
                    <span><strong className="text-gray-600">{formatNumber(pontosValidados.length)}</strong> pontos</span>
                    <span>·</span>
                    <span>~{formatNumber(hexagonos.length * 0.36)} km²</span>
                </div>
              )}
              </div>

              {/* Status e erros */}
              <StatusMessage />
              {erro && (
                <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-xs">
                  {erro}
                        </div>
              )}

              {/* Resultados por praça — cards clicáveis substituem o combo */}
              {loadingResultados ? (
                <div className="flex items-center gap-3 py-6 justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#ff4600] border-solid flex-shrink-0" />
                  <span className="text-sm">Carregando resultados...</span>
                        </div>
              ) : dadosPorPraca.length > 0 ? (
                <div className="space-y-2 mb-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Praças — período completo
                  </p>
                  {dadosPorPraca.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCidadeSelecionada(item.cidade_st); setPontoSelecionado(null); }}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                        cidadeSelecionada === item.cidade_st
                          ? 'border-[#ff4600] bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[#222]">{item.cidade_st}</span>
                        {cidadeSelecionada === item.cidade_st ? (
                          <span className="text-[10px] text-[#ff4600] font-semibold">● selecionada</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Ver mapa →</span>
                        )}
                        </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Impactos</div>
                          <div className="text-xs font-semibold text-gray-700">
                            {Math.round(item.impactosTotal_vl ?? 0).toLocaleString('pt-BR')}
                        </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Cobertura</div>
                          <div className="text-xs font-semibold text-gray-700">
                            {item.coberturaProp_vl?.toFixed(1) ?? '—'}%
                      </div>
                          </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Freq.</div>
                          <div className="text-xs font-semibold text-gray-700">
                            {item.frequencia_vl?.toFixed(1) ?? '—'}x
                          </div>
                        </div>
                      </div>
                      
                      {/* Semana — só aparece dentro da praça selecionada */}
                      {cidadeSelecionada === item.cidade_st && semanas.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-orange-200" onClick={e => e.stopPropagation()}>
                          <div className="text-[10px] text-gray-400 uppercase mb-1.5">Filtrar semana</div>
                          <select
                            className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff4600]/30"
                            value={semanaSelecionada}
                            onChange={e => setSemanaSelecionada(e.target.value)}
                          >
                            <option value="">Período completo</option>
                            {semanas.map((semana, i) => (
                              <option key={i} value={semana.semanaInicial_vl}>
                                Semana {semana.semanaInicial_vl} – {semana.semanaFinal_vl}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </button>
                  ))}

                  {/* Total da campanha */}
                  {totaisGerais && (
                    <div className="mt-1 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5">
                        <span className="inline-block w-4 h-[2px] bg-gray-400 rounded" />
                        Total da campanha
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Impactos</div>
                          <div className="text-xs font-bold text-gray-800">
                            {Math.round(totaisGerais.impactosTotal_vl ?? 0).toLocaleString('pt-BR')}
                  </div>
                </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Cobertura</div>
                          <div className="text-xs font-bold text-gray-800">
                            {totaisGerais.coberturaProp_vl?.toFixed(1) ?? '—'}%
                    </div>
                  </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">GRP</div>
                          <div className="text-xs font-bold text-gray-800">
                            {totaisGerais.grp_vl?.toFixed(1) ?? '—'}
                    </div>
                  </div>
                    </div>
                  </div>
                )}
              </div>
              ) : grupo ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  Nenhum resultado disponível para esta campanha.
            </div>
              ) : null}

              {/* Painel de detalhes do ponto selecionado */}
              {pontoSelecionado && (() => {
                const corGrupo = pontoSelecionado.hexColor_st || `rgb(${pontoSelecionado.rgbColorR_vl},${pontoSelecionado.rgbColorG_vl},${pontoSelecionado.rgbColorB_vl})`;
                const isDigital = pontoSelecionado.estaticoDigital_st === 'D';
                const pontosDoGrupo = pontosValidados.filter(({ ponto }) => ponto.grupoSub_st === pontoSelecionado.grupoSub_st);
                const fluxoTotalGrupo = pontosDoGrupo.reduce((acc, { ponto }) => acc + getFluxoRealPonto(ponto), 0);
                const fluxoMedioGrupo = pontosDoGrupo.length > 0 ? fluxoTotalGrupo / pontosDoGrupo.length : 0;
                const nDigital = pontosDoGrupo.filter(({ ponto }) => ponto.estaticoDigital_st === 'D').length;
                const nEstatico = pontosDoGrupo.filter(({ ponto }) => ponto.estaticoDigital_st === 'E').length;
                const cidadesGrupo = [...new Set(pontosDoGrupo.map(({ ponto }) => ponto.cidade_st).filter(Boolean))];

                // grupoDesc_st vem dos hexagonos — descrição legível do grupo
                const hexDoGrupo = hexagonos.find(h => h.grupo_st === pontoSelecionado.grupo_st);
                const grupoDesc = hexDoGrupo?.grupoDesc_st;

                // Campos extras que chegam via SELECT * — filtra técnicos/internos e mapeia labels legíveis
                const camposConhecidos = new Set(['planoMidia_pk','latitude_vl','longitude_vl','fluxoEstimado_vl',
                  'calculatedFluxoEstimado_vl','estaticoDigital_st','grupoSub_st','grupo_st','hexColor_st',
                  'rgbColorR_vl','rgbColorG_vl','rgbColorB_vl','nome_st','tipo_st','formato_st',
                  'cidade_st','estado_st','bairro_st']);
                const camposInternos = /^(pk|ativo|filtrado|deleted|ativogrupo|is_|date|createdAt|updatedAt)/i;
                const labelExtras: Record<string, string> = {
                  tipomidia: 'Tipo de Mídia', tipomidia_st: 'Tipo de Mídia',
                  ipv: 'IPV', ipv_vl: 'IPV',
                  exibidor: 'Exibidor', exibidor_st: 'Exibidor',
                  operadora: 'Operadora', operadora_st: 'Operadora',
                  faces_vl: 'Faces', faces: 'Faces',
                  iluminacao_st: 'Iluminação', iluminacao: 'Iluminação',
                  logradouro_st: 'Logradouro', logradouro: 'Logradouro',
                  cep_st: 'CEP', cep: 'CEP',
                  dimensao_st: 'Dimensão', dimensao: 'Dimensão',
                  area_vl: 'Área (m²)', area: 'Área (m²)',
                };
                const camposExtras = Object.entries(pontoSelecionado)
                  .filter(([k, v]) =>
                    !camposConhecidos.has(k) &&
                    !camposInternos.test(k) &&
                    !k.endsWith('_pk') &&
                    !k.toLowerCase().includes('date') &&
                    !k.toLowerCase().includes('color') &&
                    v != null && v !== '' && v !== 0 && v !== 1 && v !== false
                  )
                  .map(([k, v]) => ({
                    chave: k,
                    label: labelExtras[k.toLowerCase()] || k.replace(/_st$|_vl$|_bl$|_dt$|_dh$/g, '').replace(/_/g, ' '),
                    valor: v
                  }));
                  
                    return (
                  <div className="mb-3 space-y-2">

                    {/* Card do GRUPO */}
                    <div className="rounded-xl border-2 bg-white p-3" style={{ borderColor: corGrupo }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: corGrupo }} />
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Grupo</span>
                          <span className="text-sm font-bold text-[#222]">{pontoSelecionado.grupoSub_st}</span>
                                </div>
                        <button
                          onClick={() => setPontoSelecionado(null)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                            </div>
                            
                      {/* Descrição legível do grupo (grupoDesc_st dos hexagonos) */}
                      {grupoDesc && (
                        <div className="text-xs font-medium text-gray-600 mb-1">{grupoDesc}</div>
                      )}
                      {pontoSelecionado.grupo_st && (
                        <div className="text-[10px] text-gray-400 mb-2">{pontoSelecionado.grupo_st}</div>
                      )}

                      <div className="grid grid-cols-3 gap-2 mb-2">
                                <div>
                          <div className="text-[10px] text-gray-400 uppercase">Pontos</div>
                          <div className="text-xs font-semibold text-gray-700">{pontosDoGrupo.length}</div>
                                </div>
                                <div>
                          <div className="text-[10px] text-gray-400 uppercase">Fluxo total</div>
                          <div className="text-xs font-semibold text-gray-700">{formatNumber(fluxoTotalGrupo)}</div>
                                </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Média/ponto</div>
                          <div className="text-xs font-semibold text-gray-700">{formatNumber(Math.round(fluxoMedioGrupo))}</div>
                          </div>
                        </div>

                      {/* Chips de tipo */}
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {nDigital > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{nDigital} digital{nDigital > 1 ? 'is' : ''}</span>}
                        {nEstatico > 0 && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{nEstatico} estático{nEstatico > 1 ? 's' : ''}</span>}
                          </div>

                      {/* Cidades cobertas pelo grupo */}
                      {cidadesGrupo.length > 0 && (
                        <div className="text-[10px] text-gray-400">
                          <span className="font-medium text-gray-500">Praças: </span>
                          {cidadesGrupo.join(' · ')}
                          </div>
                      )}
                    </div>

                    {/* Card do PONTO INDIVIDUAL */}
                    <div className={`rounded-xl border-2 bg-white p-3 ${isDigital ? 'border-blue-400' : 'border-emerald-400'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${isDigital ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Ponto</span>
                          <span className="text-[10px] text-gray-400">#{pontoSelecionado.planoMidia_pk}</span>
                                </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDigital ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isDigital ? 'Digital' : 'Estático'}
                        </span>
                        </div>

                      {/* Tipo de mídia */}
                      {pontoSelecionado.tipo_st && (
                        <div className="text-xs font-semibold text-gray-800 mb-0.5">{pontoSelecionado.tipo_st}</div>
                      )}

                      {/* Localização */}
                      {(pontoSelecionado.cidade_st || pontoSelecionado.bairro_st) && (
                        <div className="text-[10px] text-gray-400 mb-2">
                          {[pontoSelecionado.bairro_st, pontoSelecionado.cidade_st, pontoSelecionado.estado_st].filter(Boolean).join(' · ')}
                              </div>
                      )}

                      {/* Fluxo — dois valores lado a lado */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Fluxo estimado</div>
                          <div className="text-xs font-semibold text-gray-700">
                            {pontoSelecionado.fluxoEstimado_vl != null ? formatNumber(pontoSelecionado.fluxoEstimado_vl) : '—'}
                                  </div>
                                    </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Fluxo calculado</div>
                          <div className="text-xs font-semibold text-gray-700">
                            {pontoSelecionado.calculatedFluxoEstimado_vl != null ? formatNumber(pontoSelecionado.calculatedFluxoEstimado_vl) : '—'}
                                  </div>
                                    </div>
                                    </div>

                      {/* Formato + Coordenadas */}
                      <div className="grid grid-cols-2 gap-2">
                        {pontoSelecionado.formato_st && (
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase">Formato</div>
                            <div className="text-xs font-semibold text-gray-700">{pontoSelecionado.formato_st}</div>
                                      </div>
                                    )}
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">Coordenadas</div>
                          <div className="text-[10px] font-medium text-gray-500 font-mono">
                            {pontoSelecionado.latitude_vl.toFixed(5)}, {pontoSelecionado.longitude_vl.toFixed(5)}
                                      </div>
                                  </div>
                                    </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                        {googleMapsApiKey ? (
                          <button
                            onClick={() => setMostrarStreetView(true)}
                            className="w-full text-[11px] px-3 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors font-semibold"
                          >
                            Ver Street View no painel
                          </button>
                        ) : (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                            Street View embutido requer `VITE_GOOGLE_MAPS_API_KEY`
                          </div>
                        )}
                      </div>

                      {/* Campos extras vindos do SELECT * — filtrados e com labels legíveis */}
                      {camposExtras.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-[10px] text-gray-400 uppercase mb-1.5">Dados adicionais</div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            {camposExtras.map(({ chave, label, valor }) => (
                              <div key={chave}>
                                <div className="text-[9px] text-gray-400 uppercase leading-tight tracking-wide">{label}</div>
                                <div className="text-[10px] font-medium text-gray-700 break-words leading-snug">{String(valor)}</div>
                                      </div>
                            ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                            </div>
                          );
                        })()}

              {/* Dica contextual quando praça selecionada mas nenhum ponto */}
              {cidadeSelecionada && !pontoSelecionado && hexagonos.length > 0 && (
                <div className="mt-1 p-3 border-2 border-gray-200 rounded-xl text-[10px] text-gray-400 text-center">
                  Clique em um ponto no mapa para ver os detalhes.
                          </div>
                        )}

              {/* Otimizador */}
              {hexagonos.length > 0 && temDados && (
                <div className="mt-3">
                      <button
                    onClick={() => { analisar(); setMostrarSugestoes(true); }}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-[#ff4600] to-orange-500 text-white rounded-xl px-4 py-3 text-xs font-bold hover:from-[#e03700] hover:to-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Analisando...</span></>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg><span>Otimizar Plano</span><span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">BETA</span></>
                    )}
                      </button>
                  {analise && mostrarSugestoes && (
                    <div className="mt-2 p-3 border-2 border-gray-200 rounded-xl bg-white space-y-1.5">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Quick Insights</div>
                      <div className="text-xs text-gray-700">{analise.planoAtual.totalHexagonos} hexágonos · {analise.planoOtimizado.sugestoes.length} sugestões</div>
                      <div className="text-xs font-bold text-green-600">+{analise.planoOtimizado.ganhoPercentual.toFixed(1)}% ganho estimado</div>
                      <button
                        onClick={() => { setMostrarModalDetalhes(true); setMostrarSugestoes(false); }}
                        className="w-full text-[10px] text-[#ff4600] font-semibold hover:underline text-left"
                      >
                        Ver detalhes →
                      </button>
                    </div>
                  )}
                  </div>
                )}
                
              </div>{/* fim conteúdo colapsável */}
            </div>

            {/* Mapa — ocupa 100% da area */}
            <style>{`
              .leaflet-top.leaflet-left .leaflet-control-zoom { display: none !important; }
              .leaflet-praca-label {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                white-space: nowrap;
              }
              .leaflet-praca-label::before { display: none !important; }
            `}</style>
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              {/* Overlay enquanto nenhuma praça está selecionada */}
              <MapContainer
                center={[-15.7801, -47.9292]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <ZoomControl position="topright" />
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {/* Ajusta bounds para a praça selecionada */}
                <AjustarMapa hexagonos={hexagonos} />

                {/* Visão Brasil: bubbles de praças antes de qualquer seleção */}
                {showOverlay && pracasCentros.map((praca) => {
                  const dadosPraca = dadosPorPraca.find(
                    d => d.cidade_st?.trim().toUpperCase() === praca.cidade_st?.trim().toUpperCase()
                  );
                  const impactos = dadosPraca?.impactosTotal_vl ?? 0;
                  const cobertura = dadosPraca?.coberturaProp_vl;
                  const freq = dadosPraca?.frequencia_vl;
                  return (
                    <CircleMarker
                      key={praca.cidade_st}
                      center={[praca.lat, praca.lon]}
                      radius={18}
                      pathOptions={{
                        color: '#ff4600',
                        fillColor: '#ff4600',
                        fillOpacity: 0.85,
                        weight: 2,
                        opacity: 1,
                      }}
                      eventHandlers={{
                        click: () => { setCidadeSelecionada(praca.cidade_st); setPontoSelecionado(null); }
                      }}
                    >
                      <Tooltip permanent direction="bottom" offset={[0, 14]}
                        className="leaflet-praca-label"
                      >
                        <span style={{ fontWeight: 700, fontSize: 11, color: '#222' }}>
                          {praca.cidade_st}
                          {praca.estado_st ? `/${praca.estado_st}` : ''}
                          </span>
                      </Tooltip>
                      <Tooltip direction="top" offset={[0, -18]} opacity={1}>
                        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                          <strong>{praca.cidade_st}</strong><br />
                          <span style={{ color: '#555' }}>{praca.total_pontos} pontos</span><br />
                          {impactos > 0 && <><span style={{ color: '#ff4600' }}>{Math.round(impactos).toLocaleString('pt-BR')}</span> impactos<br /></>}
                          {cobertura != null && <>{cobertura.toFixed(1)}% cobertura · {freq?.toFixed(1)}x freq</>}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {/* Ajusta bounds para todas as praças na visão Brasil */}
                {showOverlay && pracasCentros.length > 0 && (
                  <AjustarMapaBrasil pracas={pracasCentros} />
                )}
                
                {/* Loading Overlay estilo Apple */}
                {loadingHexagonos && (
                  <MapLoadingOverlay message="Carregando pontos do mapa..." />
                )}
                {hexagonos.map((hex, idx) => {
                  const positions = geometriasConvertidas.get(hex.hexagon_pk);
                  if (!positions || positions.length < 3) return null;
                  return (
                    <Polygon
                      key={"poly-" + idx}
                      positions={positions}
                      pathOptions={{
                        color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`,
                        fillOpacity: 0.6,
                        weight: 2,
                        opacity: 0.8
                      }}
                    />
                  );
                })}

                {/* Pontos de midia — usa pontosValidados (pre-processado via useMemo) */}
                {pontosValidados.map(({ ponto, cor, radius }, idx) => {
                      const isSelected = pontoSelecionado?.planoMidia_pk === ponto.planoMidia_pk;
                      const isInGroup = !isSelected && pontoSelecionado != null && ponto.grupoSub_st === pontoSelecionado.grupoSub_st;
                      return (
                      <CircleMarker
                        key={`ponto-${ponto.planoMidia_pk}-${idx}`}
                        center={[ponto.latitude_vl, ponto.longitude_vl]}
                        pathOptions={{ 
                          color: isSelected ? '#ff4600' : isInGroup ? '#ff8c00' : '#ffffff',
                          fillColor: cor,
                          fillOpacity: isSelected ? 1 : isInGroup ? 0.95 : pontoSelecionado ? 0.3 : 0.85,
                          weight: isSelected ? 3 : isInGroup ? 2 : 1.5,
                          opacity: pontoSelecionado && !isSelected && !isInGroup ? 0.4 : 1,
                          dashArray: ponto.estaticoDigital_st === 'E' ? '3, 3' : undefined
                        }}
                        radius={isSelected ? radius + 3 : isInGroup ? radius + 1 : radius}
                        eventHandlers={{ click: () => setPontoSelecionado(ponto) }}
                      />
                      );
                })}
              </MapContainer>
            </div>
            {/* Mini-legenda compacta */}
            {hexagonos.length > 0 && pontosValidados.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 48, right: 16, zIndex: 500,
                background: 'rgba(255,255,255,0.95)', borderRadius: 8,
                padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }}>
                {/* Toggle tamanho */}
                <button
                  onClick={() => setTamanhoUniforme(!tamanhoUniforme)}
                  title={tamanhoUniforme ? 'Tamanho uniforme (clique para variável)' : 'Tamanho por fluxo (clique para uniforme)'}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1.5px solid #d1d5db',
                    background: tamanhoUniforme ? '#f3f4f6' : '#fff7ed',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, padding: 0
                  }}
                >
                  {tamanhoUniforme ? '⚪' : '📊'}
                </button>

                <span style={{ width: 1, height: 20, background: '#e5e7eb' }} />

                {/* Grupos em linha */}
                {(() => {
                  const gruposUnicos = new Map<string, { subgrupo: string; ponto: PontoMidia }>();
                  for (const { ponto } of pontosValidados) {
                    if (!gruposUnicos.has(ponto.grupoSub_st)) {
                      gruposUnicos.set(ponto.grupoSub_st, { subgrupo: ponto.grupoSub_st, ponto });
                    }
                  }
                  return Array.from(gruposUnicos.values())
                    .sort((a, b) => a.subgrupo.localeCompare(b.subgrupo))
                    .map(({ subgrupo, ponto }) => (
                      <div key={subgrupo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width={12} height={12}>
                          <circle cx={6} cy={6} r={5}
                            fill={ponto.hexColor_st || `rgb(${ponto.rgbColorR_vl},${ponto.rgbColorG_vl},${ponto.rgbColorB_vl})`}
                            stroke="#fff" strokeWidth={1}
                            strokeDasharray={ponto.estaticoDigital_st === 'E' ? '2,2' : undefined}
                              />
                            </svg>
                        <span style={{ fontSize: 10, color: '#555', fontWeight: 500 }}>{subgrupo}</span>
                          </div>
                    ));
                })()}

                <span style={{ width: 1, height: 20, background: '#e5e7eb' }} />

                {/* Tipo de midia compacto */}
                <span style={{ fontSize: 10, color: '#888' }}>
                  ● Digital &nbsp; ◌ Estático
                </span>
              </div>
            )}
          </div>
        <div className={`fixed bottom-0 z-[600] pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <footer className="w-full border-t border-[#e5e5e5] px-4 py-2 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white pointer-events-none">
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
      
      {/* Modal de Sugestões Detalhadas */}
      <SuggestionsModal 
        analise={analise}
        isOpen={mostrarModalDetalhes}
        onClose={() => setMostrarModalDetalhes(false)}
      />
      {mostrarStreetView && pontoSelecionado && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Street View do ponto</h3>
                <p className="text-xs text-gray-500">
                  {pontoSelecionado.latitude_vl.toFixed(5)}, {pontoSelecionado.longitude_vl.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => setMostrarStreetView(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="Fechar Street View"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              {streetViewEmbedUrl ? (
                <iframe
                  title="Street View"
                  src={streetViewEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center p-6 text-center">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Nao foi possivel carregar o Street View embutido.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Configure `VITE_GOOGLE_MAPS_API_KEY` no `.env` para habilitar.
                    </p>
                    {streetViewExternalUrl && (
                      <a
                        href={streetViewExternalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-xs px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Abrir no Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 