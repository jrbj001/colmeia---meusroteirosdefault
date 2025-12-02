import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";
import { useSearchParams, useLocation } from "react-router-dom";
import api from "../../config/axios";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon } from 'react-leaflet';
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
  calculatedFluxoEstimado_vl?: number; // Fluxo calculado (fallback)
  fluxo_vl?: number; // Fluxo real do ponto (prioridade 1)
  fluxoPassantes_vl?: number; // Fluxo de passantes real (prioridade 2)
  fluxoEstimado_vl?: number; // Fluxo estimado (prioridade 3)
  estaticoDigital_st: 'D' | 'E'; // Digital ou Estático
  grupoSub_st: string;
  grupo_st: string;
  hexColor_st: string;
  rgbColorR_vl: number;
  rgbColorG_vl: number;
  rgbColorB_vl: number;
  // Outros campos disponíveis na view
  [key: string]: any;
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
function validarPontoNoHexagonoCorreto(
  ponto: PontoMidia, 
  hexagonos: Hexagono[]
): boolean {
  const pontoCoords: [number, number] = [ponto.latitude_vl, ponto.longitude_vl];
  let estaDentroHexagonoMesmoGrupo = false;
  let estaDentroHexagonoOutroGrupo = false;
  let hexagonoConflitante: Hexagono | null = null;
  let hexagonoValido: Hexagono | null = null; // Armazenar hexágono válido para debug
  
  // Verificar TODOS os hexágonos para ver se o ponto está dentro de algum
  // NOTA: Um hexágono pode conter MÚLTIPLOS pontos do mesmo grupo
  for (const hex of hexagonos) {
    if (!hex.geometry_8) continue;
    
    const poligono = wktToLatLngs(hex.geometry_8);
    if (poligono.length < 3) continue;
    
    const estaDentro = pontoDentroPoligono(pontoCoords, poligono);
    
    if (estaDentro) {
      if (hex.grupo_st === ponto.grupo_st) {
        // Está dentro de hexágono do mesmo grupo
        // Múltiplos pontos podem estar no mesmo hexágono - isso é esperado e correto
        estaDentroHexagonoMesmoGrupo = true;
        hexagonoValido = hex;
      } else {
        // Está dentro de hexágono de OUTRO grupo - isso é um problema
        estaDentroHexagonoOutroGrupo = true;
        hexagonoConflitante = hex;
      }
    }
  }
  
  // Se está dentro de hexágono de outro grupo, NÃO renderizar
  if (estaDentroHexagonoOutroGrupo) {
    console.warn(`🚫 [Mapa] Ponto ${ponto.planoMidia_pk} (grupo ${ponto.grupo_st}, subgrupo ${ponto.grupoSub_st}) está dentro de hexágono ${hexagonoConflitante?.hexagon_pk} do grupo ${hexagonoConflitante?.grupo_st} - BLOQUEADO`);
    return false;
  }
  
  // Se está dentro de hexágono do mesmo grupo, renderizar
  // NOTA: Múltiplos pontos do mesmo grupo podem estar no mesmo hexágono
  if (estaDentroHexagonoMesmoGrupo) {
    if (hexagonoValido) {
      console.log(`✅ [Mapa] Ponto ${ponto.planoMidia_pk} (grupo ${ponto.grupo_st}, subgrupo ${ponto.grupoSub_st}) está dentro de hexágono ${hexagonoValido.hexagon_pk} do mesmo grupo - permitindo renderizar (múltiplos pontos por hexágono são permitidos)`);
    }
    return true;
  }
  
  // Ponto não está dentro de nenhum hexágono
  // Verificar se está próximo de algum hexágono do mesmo grupo
  const hexagonosMesmoGrupo = hexagonos.filter(h => h.grupo_st === ponto.grupo_st);
  
  if (hexagonosMesmoGrupo.length === 0) {
    console.warn(`⚠️ [Mapa] Ponto ${ponto.planoMidia_pk} (grupo ${ponto.grupo_st}) não tem hexágonos do mesmo grupo disponíveis - não renderizando`);
    return false;
  }
  
  // Calcular distância para o hexágono mais próximo do mesmo grupo
  let menorDistancia = Infinity;
  let hexagonoMaisProximo: Hexagono | null = null;
  
  for (const hex of hexagonosMesmoGrupo) {
    const distancia = calcularDistancia(
      ponto.latitude_vl, 
      ponto.longitude_vl,
      hex.hex_centroid_lat,
      hex.hex_centroid_lon
    );
    
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      hexagonoMaisProximo = hex;
    }
  }
  
  // Se está próximo (dentro de 1km) de um hexágono do mesmo grupo, permitir renderizar
  // Aumentamos a tolerância para 1km para considerar imprecisões de coordenadas
  if (menorDistancia < 1000 && hexagonoMaisProximo) {
    console.log(`✅ [Mapa] Ponto ${ponto.planoMidia_pk} (grupo ${ponto.grupo_st}) está próximo (${menorDistancia.toFixed(0)}m) de hexágono ${hexagonoMaisProximo.hexagon_pk} do mesmo grupo - permitindo renderizar`);
    return true;
  }
  
  // Ponto não está dentro nem próximo de hexágono do mesmo grupo - não renderizar
  console.warn(`⚠️ [Mapa] Ponto ${ponto.planoMidia_pk} (grupo ${ponto.grupo_st}, subgrupo ${ponto.grupoSub_st}) não está dentro nem próximo (distância mínima: ${menorDistancia.toFixed(0)}m) de hexágono do mesmo grupo - não renderizando`);
  return false;
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
  const [pontosMidia, setPontosMidia] = React.useState<PontoMidia[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHexagonos, setLoadingHexagonos] = React.useState(false);
  const [loadingPontos, setLoadingPontos] = React.useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = React.useState(false);
  const [mostrarModalDetalhes, setMostrarModalDetalhes] = React.useState(false);
  
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
        console.log(`🗺️ Pontos de mídia carregados (antes do filtro): ${pontosData.length}`);
        
        // Filtrar pontos pelos grupos dos hexágonos
        // Garantir que apenas pontos dos grupos dos hexágonos sejam exibidos
        const gruposHexagonos = new Set(hexagonos.map(h => h.grupo_st).filter(Boolean));
        
        // Processar e normalizar pontos para garantir que subgrupos derivem dos grupos
        const pontosFiltrados = pontosData
          .filter((p: PontoMidia) => {
            // O ponto deve pertencer a um dos grupos dos hexágonos
            if (!p.grupo_st || !gruposHexagonos.has(p.grupo_st)) {
              return false;
            }
            return true;
          })
          .map((p: PontoMidia) => {
            // Garantir que o subgrupo derive do grupo
            // O subgrupo DEVE começar com o código do grupo (ex: G1D, G1E, G2D, etc)
            if (!p.grupoSub_st) {
              // Se não tem subgrupo, derivar do grupo + tipo
              const tipo = p.estaticoDigital_st || 'D';
              const novoSubgrupo = `${p.grupo_st}${tipo}`;
              console.log(`🔧 [Frontend] Derivando subgrupo para ponto ${p.planoMidia_pk}: ${novoSubgrupo}`);
              return {
                ...p,
                grupoSub_st: novoSubgrupo
              };
            }
            
            // Verificar se o subgrupo deriva do grupo
            if (!p.grupoSub_st.startsWith(p.grupo_st)) {
              console.warn(`⚠️ [Frontend] Ponto ${p.planoMidia_pk}: subgrupo "${p.grupoSub_st}" não deriva do grupo "${p.grupo_st}"`);
              
              // Corrigir derivando do grupo + tipo
              const tipo = p.estaticoDigital_st || 'D';
              const novoSubgrupo = `${p.grupo_st}${tipo}`;
              console.log(`🔧 [Frontend] Corrigindo subgrupo: "${p.grupoSub_st}" → "${novoSubgrupo}"`);
              
              return {
                ...p,
                grupoSub_st: novoSubgrupo
              };
            }
            
            // Subgrupo válido, retornar como está
            return p;
          });
        
        console.log(`🗺️ Pontos de mídia após filtro por grupos: ${pontosFiltrados.length}`);
        
        // Debug: contar por Grupo (agora priorizando grupo sobre subgrupo)
        const porGrupo = pontosFiltrados.reduce((acc: any, p: PontoMidia) => {
          const grupo = p.grupo_st || 'Sem Grupo';
          acc[grupo] = (acc[grupo] || 0) + 1;
          return acc;
        }, {});
        console.log(`🗺️ [Frontend] Pontos por Grupo:`, porGrupo);
        
        // Debug: contar por SubGrupo (derivado do grupo)
        const porSubGrupo = pontosFiltrados.reduce((acc: any, p: PontoMidia) => {
          const sub = p.grupoSub_st || 'Sem SubGrupo';
          acc[sub] = (acc[sub] || 0) + 1;
          return acc;
        }, {});
        console.log(`🗺️ [Frontend] Pontos por SubGrupo:`, porSubGrupo);
        
        // Debug: contar por tipo
        const porTipo = pontosFiltrados.reduce((acc: any, p: PontoMidia) => {
          const tipo = p.estaticoDigital_st || 'Sem Tipo';
          acc[tipo] = (acc[tipo] || 0) + 1;
          return acc;
        }, {});
        console.log(`🗺️ [Frontend] Pontos por Tipo (D/E):`, porTipo);
        
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

  // Calcular o range de fluxo para normalizar o tamanho dos pontos
  const minFluxo = hexagonos.length > 0 ? Math.min(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 0;
  const maxFluxo = hexagonos.length > 0 ? Math.max(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 1;
  
  function getRadius(fluxo: number) {
    // Raio mínimo 6, máximo 20
    if (maxFluxo === minFluxo) return 10;
    return 6 + 14 * ((fluxo - minFluxo) / (maxFluxo - minFluxo));
  }

  // Calcular tamanho dos pontos de mídia baseado no fluxo REAL do ponto
  // Função auxiliar para obter o fluxo do ponto com priorização correta
  // Baseado na análise: fluxoEstimado_vl parece ser o campo mais completo e confiável
  // Prioridade: fluxo_vl > fluxoPassantes_vl > fluxoEstimado_vl > calculatedFluxoEstimado_vl
  // IMPORTANTE: Esta função DEVE retornar o fluxo INDIVIDUAL do ponto, nunca o do hexágono
  const getFluxoRealPonto = (p: PontoMidia) => {
    // Verificar se o campo existe e tem valor válido (não null, não undefined)
    // NUNCA usar valores do hexágono aqui - apenas campos do próprio ponto
    if (p.fluxo_vl !== null && p.fluxo_vl !== undefined && p.fluxo_vl > 0) {
      return p.fluxo_vl;
    }
    if (p.fluxoPassantes_vl !== null && p.fluxoPassantes_vl !== undefined && p.fluxoPassantes_vl > 0) {
      return p.fluxoPassantes_vl;
    }
    // fluxoEstimado_vl parece ser o campo mais completo baseado na análise
    if (p.fluxoEstimado_vl !== null && p.fluxoEstimado_vl !== undefined && p.fluxoEstimado_vl > 0) {
      return p.fluxoEstimado_vl;
    }
    // calculatedFluxoEstimado_vl como último recurso
    if (p.calculatedFluxoEstimado_vl !== null && p.calculatedFluxoEstimado_vl !== undefined && p.calculatedFluxoEstimado_vl > 0) {
      return p.calculatedFluxoEstimado_vl;
    }
    return 0;
  };
  
  const minFluxoPontos = pontosMidia.length > 0 ? Math.min(...pontosMidia.map(getFluxoRealPonto)) : 0;
  const maxFluxoPontos = pontosMidia.length > 0 ? Math.max(...pontosMidia.map(getFluxoRealPonto)) : 1;

  function getRadiusPonto(fluxo: number) {
    // Raio mínimo 6, máximo 16 - Pontos menores para melhor visualização geral
    if (maxFluxoPontos === minFluxoPontos) return 10;
    return 6 + 10 * ((fluxo - minFluxoPontos) / (maxFluxoPontos - minFluxoPontos));
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
              
              {/* Botão de Otimização - Low Profile */}
              {hexagonos.length > 0 && temDados && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      analisar();
                      setMostrarSugestoes(true);
                      console.log('🎯 Análise:', analise);
                    }}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-[#ff4600] to-orange-600 text-white rounded-xl px-6 py-4 text-base font-bold hover:from-[#e03700] hover:to-orange-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                        <span>Analisando mapa...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Otimizar Plano</span>
                        <span className="bg-white/20 px-2 py-1 rounded-lg text-xs font-bold">BETA</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Sugestões inteligentes para melhorar seu plano de mídia
                  </p>
                  
                  {/* Preview rápido dos insights quando disponível */}
                  {analise && mostrarSugestoes && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 border-2 border-purple-300 rounded-xl shadow-md">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="font-bold text-purple-900 text-sm uppercase tracking-wide">Quick Insights</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="bg-white p-2 rounded-lg border border-purple-200">
                          <span className="text-purple-800 text-xs font-medium">{analise.planoAtual.totalHexagonos} hexágonos analisados</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-purple-200">
                          <span className="text-purple-800 text-xs font-medium">{analise.planoOtimizado.sugestoes.length} sugestões de melhoria</span>
                        </div>
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-2 rounded-lg border border-green-300">
                          <span className="text-green-800 text-xs font-bold">
                            Ganho estimado: <span className="text-green-600 font-black">+{analise.planoOtimizado.ganhoPercentual.toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMostrarModalDetalhes(true);
                          setMostrarSugestoes(false);
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
                      >
                        Ver detalhes completos →
                      </button>
                    </div>
                  )}
                </div>
              )}
              
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
                    <div className="mb-4 p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 rounded-xl shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-bold text-orange-900 uppercase tracking-wide">Resumo dos Dados</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Pontos no mapa</div>
                          <div className="text-green-600 font-bold text-lg">{formatNumber(hexagonos.length)}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Área coberta</div>
                          <div className="text-blue-600 font-bold text-lg">~{formatNumber(areaCoberta)} km²</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Fluxo total</div>
                          <div className="text-purple-600 font-bold text-lg">{formatNumber(totalFluxo)}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Fluxo médio</div>
                          <div className="text-orange-600 font-bold text-lg">{formatNumber(fluxoMedio)}</div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                        <div className="text-xs text-gray-700 mb-2">
                          <strong className="text-gray-900">📈 Extremos de Fluxo:</strong> 
                          <div className="mt-1">
                            {formatNumber(minHex.calculatedFluxoEstimado_vl)} (mín) → {formatNumber(maxHex.calculatedFluxoEstimado_vl)} (máx)
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 border-t border-gray-200 pt-2 mt-2">
                          <strong className="text-gray-900">🎨 Grupos:</strong> 
                          <div className="mt-1 text-gray-600">
                            {grupos.length > 0 ? grupos.join(', ') : 'Nenhum grupo definido'}
                          </div>
                        </div>
                      </div>
                      
                      {lastSearchInfo && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                          <span className="italic">Última atualização: {getTimeAgo(lastSearchInfo.timestamp)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
              
              {/* Seção de Dicas e Ajuda */}
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Dicas de Uso</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <span className="text-xs text-blue-900 font-medium">Clique nos pontos do mapa para ver detalhes</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <span className="text-xs text-blue-900 font-medium">Use o zoom para explorar áreas específicas</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs text-blue-900 font-medium">Selecione uma semana para filtrar dados específicos</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <span className="text-xs text-blue-900 font-medium">As cores indicam diferentes grupos de planejamento</span>
                  </div>
                </div>
                
                {hexagonos.length === 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg shadow-sm">
                    <p className="text-xs font-bold text-yellow-900 mb-2">Não encontrou dados?</p>
                    <div className="space-y-1 text-xs text-yellow-800">
                      <div>✓ Verifique se a praça possui planejamento cadastrado</div>
                      <div>✓ Tente selecionar outra semana</div>
                      <div>✓ Entre em contato com o suporte se o problema persistir</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Coluna do mapa */}
            <div className="flex-1 h-full w-full" style={{ minHeight: 320, background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', marginBottom: 48, position: 'relative' }}>
              {/* Overlay/modal para seleção de praça e semana */}
              {showOverlay && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-orange-50 z-50 flex items-center justify-center p-8">
                  <div className="text-center max-w-lg">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      Mapa de Roteiros
                    </h3>
                    <p className="text-base text-gray-600 mb-8 leading-relaxed">
                      Para visualizar o mapa interativo, selecione uma praça no painel à esquerda e opcionalmente uma semana específica.
                    </p>
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#ff4600] to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Dica: Comece selecionando uma praça</span>
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
                
                {/* Loading Overlay estilo Apple */}
                {loadingHexagonos && (
                  <MapLoadingOverlay message="Carregando pontos do mapa..." />
                )}
                {hexagonos.map((hex, idx) => (
                  <Polygon
                    key={"poly-" + idx}
                    positions={wktToLatLngs(hex.geometry_8)}
                    pathOptions={{
                      color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`,
                      fillOpacity: 0.6,
                      weight: 2,
                      opacity: 0.8
                    }}
                  >
                  </Polygon>
                ))}

                {/* Pontos de mídia individuais com bordas diferentes */}
                {/* IMPORTANTE: Os pontos já foram filtrados pelos grupos dos hexágonos */}
                {/* Só renderizar pontos se houver hexágonos disponíveis */}
                {hexagonos.length > 0 && pontosMidia.length > 0 && (() => {
                  // Criar um mapa de cores por grupo dos hexágonos para acesso rápido
                  const coresPorGrupo = new Map<string, string>();
                  hexagonos.forEach(hex => {
                    if (hex.grupo_st && !coresPorGrupo.has(hex.grupo_st)) {
                      const cor = hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`;
                      coresPorGrupo.set(hex.grupo_st, cor);
                    }
                  });
                  
                  console.log(`🎨 [Mapa] Cores por grupo disponíveis:`, Array.from(coresPorGrupo.entries()));
                  console.log(`🎨 [Mapa] Total de pontos para renderizar: ${pontosMidia.length}`);
                  console.log(`🔷 [Mapa] Total de hexágonos: ${hexagonos.length}`);
                  
                  // Armazenar pontos que foram realmente renderizados para usar na legenda
                  const pontosRenderizados: PontoMidia[] = [];
                  
                  // IMPORTANTE: O fluxo agregado será calculado DURANTE a renderização
                  // Isso garante que apenas pontos que passaram em TODAS as validações sejam contados
                  const fluxoAgregadoPorHexagono = new Map<number, { total: number, count: number, pontos: PontoMidia[] }>();
                  
                  console.log(`📊 [Mapa] Total de pontos recebidos: ${pontosMidia.length}`);
                  console.log(`📊 [Mapa] Fluxo agregado será calculado apenas para pontos RENDERIZADOS`);
                  
                  // Mapa para rastrear quantos pontos estão em cada hexágono
                  const pontosPorHexagono = new Map<number, number>();
                  
                  const pontosJSX = pontosMidia.map((ponto, idx) => {
                    // VALIDAÇÃO 1: Garantir que o subgrupo deriva do grupo
                    if (ponto.grupoSub_st && !ponto.grupoSub_st.startsWith(ponto.grupo_st)) {
                      console.warn(`⚠️ [Mapa] Ponto ${ponto.planoMidia_pk} com subgrupo "${ponto.grupoSub_st}" que não deriva do grupo "${ponto.grupo_st}" - não renderizando`);
                      return null;
                    }
                    
                    // VALIDAÇÃO 2: Verificar se o grupo do ponto existe nos hexágonos
                    const corGrupo = coresPorGrupo.get(ponto.grupo_st);
                    if (!corGrupo) {
                      console.warn(`⚠️ [Mapa] Ponto ${ponto.planoMidia_pk} com grupo ${ponto.grupo_st} não encontrado nos hexágonos. Grupos disponíveis:`, Array.from(coresPorGrupo.keys()));
                      return null;
                    }
                    
                    // VALIDAÇÃO 3: Verificar se o ponto está dentro de um hexágono do mesmo grupo
                    // Isso garante que não apareçam pontos de um grupo dentro de hexágonos de outro grupo
                    const podeRenderizar = validarPontoNoHexagonoCorreto(ponto, hexagonos);
                    if (!podeRenderizar) {
                      // Ponto está dentro de hexágono de outro grupo ou não há hexágonos do mesmo grupo
                      return null;
                    }
                    
                    // Usar a cor própria do ponto vinda da view/banco de dados
                    const cor = ponto.hexColor_st || `rgb(${ponto.rgbColorR_vl},${ponto.rgbColorG_vl},${ponto.rgbColorB_vl})`;
                    
                    // Adicionar à lista de pontos renderizados para usar na legenda
                    pontosRenderizados.push(ponto);
                    
                    // Identificar em qual hexágono este ponto está (para estatísticas e exibição)
                    const pontoCoords: [number, number] = [ponto.latitude_vl, ponto.longitude_vl];
                    let hexagonoDoPonto: Hexagono | null = null;
                    for (const hex of hexagonos) {
                      if (hex.grupo_st === ponto.grupo_st && hex.geometry_8) {
                        const poligono = wktToLatLngs(hex.geometry_8);
                        if (poligono.length >= 3 && pontoDentroPoligono(pontoCoords, poligono)) {
                          pontosPorHexagono.set(hex.hexagon_pk, (pontosPorHexagono.get(hex.hexagon_pk) || 0) + 1);
                          hexagonoDoPonto = hex;
                          
                          // IMPORTANTE: Adicionar este ponto ao fluxo agregado APENAS se ele passou em todas as validações
                          // Isso garante que o fluxo agregado reflita apenas os pontos realmente renderizados
                          if (!fluxoAgregadoPorHexagono.has(hex.hexagon_pk)) {
                            fluxoAgregadoPorHexagono.set(hex.hexagon_pk, { total: 0, count: 0, pontos: [] });
                    }
                    const fluxoPontoIndividual = getFluxoRealPonto(ponto);
                          const agregado = fluxoAgregadoPorHexagono.get(hex.hexagon_pk)!;
                    agregado.total += fluxoPontoIndividual;
                    agregado.count += 1;
                    agregado.pontos.push(ponto);
                          
                          console.log(`✅ [Mapa] Ponto ${ponto.planoMidia_pk} (fluxo: ${fluxoPontoIndividual.toLocaleString('pt-BR')}, grupo: ${ponto.grupo_st}, subgrupo: ${ponto.grupoSub_st}) RENDERIZADO no hexágono ${hex.hexagon_pk}. Total agregado agora: ${agregado.total.toLocaleString('pt-BR')} (${agregado.count} pontos renderizados)`);
                          break;
                        }
                      }
                    }
                    
                    // Armazenar hexágono do ponto para usar no popup
                    // Também armazenar o fluxo agregado calculado (agora calculado apenas dos pontos renderizados)
                    (ponto as any).hexagonoAssociado = hexagonoDoPonto;
                    if (hexagonoDoPonto && fluxoAgregadoPorHexagono.has(hexagonoDoPonto.hexagon_pk)) {
                      const agregado = fluxoAgregadoPorHexagono.get(hexagonoDoPonto.hexagon_pk)!;
                    (ponto as any).hexagonoFluxoAgregado = agregado.total;
                    (ponto as any).hexagonoTotalPontos = agregado.count;
                    }
                    
                    // Debug: verificar se a cor está correta
                    if (idx < 5) { // Log apenas os primeiros 5 pontos
                      console.log(`✅ [Mapa] Ponto ${ponto.planoMidia_pk}: grupo=${ponto.grupo_st}, subgrupo=${ponto.grupoSub_st}, cor=${cor}`);
                    }
                  
                    return (
                      <CircleMarker
                        key={`ponto-${ponto.planoMidia_pk}-${idx}`}
                        center={[ponto.latitude_vl, ponto.longitude_vl]}
                        pathOptions={{ 
                          color: '#ffffff', // Borda branca fina
                          fillColor: cor, // Cor própria do ponto vinda da view/banco
                          fillOpacity: 0.85,
                          weight: 1.5,
                          opacity: 1,
                          dashArray: ponto.estaticoDigital_st === 'E' ? '3, 3' : undefined // Tracejado para Estático
                        }}
                        radius={getRadiusPonto(getFluxoRealPonto(ponto))}
                      >
                    <Popup maxWidth={350}>
                      <div style={{ 
                        minWidth: 280, 
                        maxWidth: 350,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        {/* Header com tipo */}
                        <div style={{ 
                          background: ponto.estaticoDigital_st === 'D' ? '#3b82f6' : '#10b981',
                          color: 'white',
                          padding: '12px',
                          marginBottom: '12px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {ponto.estaticoDigital_st === 'D' ? '📱' : '🏢'}
                          {ponto.estaticoDigital_st === 'D' ? 'Mídia Digital' : 'Mídia Estática'}
                        </div>

                        {/* Informações principais */}
                        <div style={{ 
                          background: '#f9fafb',
                          padding: '12px',
                          borderRadius: '6px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                            {/* Grupo e SubGrupo */}
                            <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                              <div style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Grupo</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ 
                                  display: 'inline-block', 
                                    width: 16, 
                                    height: 16, 
                                  borderRadius: '50%', 
                                  background: cor,
                                  border: '2px solid #fff',
                                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                                }}></span>
                                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{ponto.grupo_st || 'N/A'}</span>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>SubGrupo</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{ponto.grupoSub_st || 'N/A'}</span>
                                  {ponto.grupo_st && ponto.grupoSub_st && (
                                    ponto.grupoSub_st.startsWith(ponto.grupo_st) ? (
                                      <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600, padding: '2px 6px', background: '#d1fae5', borderRadius: '4px' }}>
                                        ✓ Derivado de {ponto.grupo_st}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600, padding: '2px 6px', background: '#fee2e2', borderRadius: '4px' }}>
                                        ⚠ Não deriva de {ponto.grupo_st}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Hexágono associado */}
                            {(() => {
                              const hexAssociado = (ponto as any).hexagonoAssociado;
                              if (hexAssociado) {
                                return (
                                  <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Hexágono</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontWeight: 500, color: '#111827', fontSize: 11 }}>
                                        #{hexAssociado.hexagon_pk}
                                      </span>
                                      <span style={{ fontSize: 9, color: '#6b7280' }}>
                                        ({hexAssociado.grupo_st})
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Informações do ponto */}
                            {ponto.nome_st && (
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Nome do Ponto</div>
                                <div style={{ fontWeight: 500, color: '#111827', fontSize: 11 }}>{ponto.nome_st}</div>
                              </div>
                            )}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                              {ponto.tipo_st && (
                                <div>
                                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Tipo</div>
                                  <div style={{ fontWeight: 500, color: '#111827', fontSize: 11 }}>{ponto.tipo_st}</div>
                                </div>
                              )}
                              {ponto.formato_st && (
                                <div>
                                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Formato</div>
                                  <div style={{ fontWeight: 500, color: '#111827', fontSize: 11 }}>{ponto.formato_st}</div>
                                </div>
                              )}
                            </div>
                            
                            {ponto.planoMidia_pk && (
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af' }}>
                                ID do Ponto: {ponto.planoMidia_pk}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fluxo - Usar o fluxo real do ponto */}
                        <div style={{ 
                          background: '#eff6ff',
                          padding: '10px',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          border: '1px solid #dbeafe'
                        }}>
                          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>
                            👥 Fluxo do Ponto
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a' }}>
                            {(() => {
                              // CRÍTICO: Garantir que estamos usando o fluxo INDIVIDUAL do ponto
                              // Não usar valores do hexágono aqui - apenas campos do próprio ponto
                              const fluxoReal = getFluxoRealPonto(ponto);
                              
                              // DEBUG: Verificar se o fluxo está correto e não foi alterado pelo hexágono
                              if ((ponto as any).hexagonoAssociado) {
                                const hex = (ponto as any).hexagonoAssociado;
                                const fluxoHex = hex.fluxoEstimado_vl || hex.calculatedFluxoEstimado_vl || 0;
                                
                                // Se o fluxo do ponto for igual ao do hexágono, pode ser um problema
                                if (Math.abs(fluxoReal - fluxoHex) < 1 && fluxoReal > 0) {
                                  console.warn(`⚠️ [Popup] ATENÇÃO: Ponto ${ponto.planoMidia_pk} tem fluxo igual ao hexágono ${hex.hexagon_pk}!`);
                                  console.warn(`   Fluxo do Ponto: ${fluxoReal.toLocaleString('pt-BR')}`);
                                  console.warn(`   Fluxo do Hexágono: ${fluxoHex.toLocaleString('pt-BR')}`);
                                  console.warn(`   Campos do ponto:`, {
                                    fluxo_vl: ponto.fluxo_vl,
                                    fluxoPassantes_vl: ponto.fluxoPassantes_vl,
                                    fluxoEstimado_vl: ponto.fluxoEstimado_vl,
                                    calculatedFluxoEstimado_vl: ponto.calculatedFluxoEstimado_vl
                                  });
                                }
                              }
                              
                              return fluxoReal.toLocaleString('pt-BR');
                            })()}
                          </div>
                          {/* Mostrar fonte do fluxo */}
                          {(() => {
                            const temFluxoVl = ponto.fluxo_vl !== null && ponto.fluxo_vl !== undefined && ponto.fluxo_vl > 0;
                            const temFluxoPassantes = ponto.fluxoPassantes_vl !== null && ponto.fluxoPassantes_vl !== undefined && ponto.fluxoPassantes_vl > 0;
                            const temFluxoEstimado = ponto.fluxoEstimado_vl !== null && ponto.fluxoEstimado_vl !== undefined && ponto.fluxoEstimado_vl > 0;
                            const usaCalculated = ponto.calculatedFluxoEstimado_vl !== null && ponto.calculatedFluxoEstimado_vl !== undefined && ponto.calculatedFluxoEstimado_vl > 0 && !temFluxoVl && !temFluxoPassantes && !temFluxoEstimado;
                            
                            let fonteTexto = '';
                            if (temFluxoVl) {
                              fonteTexto = 'Fluxo real (fluxo_vl)';
                            } else if (temFluxoPassantes) {
                              fonteTexto = 'Fluxo de passantes (fluxoPassantes_vl)';
                            } else if (temFluxoEstimado) {
                              fonteTexto = 'Fluxo estimado (fluxoEstimado_vl)';
                            } else if (usaCalculated) {
                              fonteTexto = 'Fluxo calculado (calculatedFluxoEstimado_vl)';
                            }
                            
                            if (fonteTexto) {
                              return (
                                <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                  {fonteTexto}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Informações do Hexágono - Comparação de Fluxos */}
                        {(ponto as any).hexagonoAssociado && (() => {
                          const hex = (ponto as any).hexagonoAssociado;
                          
                          // CRÍTICO: O fluxo do ponto DEVE ser o fluxo INDIVIDUAL do ponto, não do hexágono
                          // Garantir que estamos usando o fluxo REAL do ponto, não o do hexágono
                          const fluxoPonto = getFluxoRealPonto(ponto);
                          
                          // DEBUG: Log para verificar se o fluxo está correto
                          console.log(`🔍 [Popup] Ponto ${ponto.planoMidia_pk}: fluxo individual = ${fluxoPonto.toLocaleString('pt-BR')}, hexágono ${hex.hexagon_pk}`);
                          
                          // PRIORIDADE 1: Usar fluxo agregado calculado dos pontos dentro do hexágono
                          // Isso representa a soma real dos fluxos de todos os pontos dentro do hexágono
                          const fluxoAgregadoPontos = (ponto as any).hexagonoFluxoAgregado;
                          const totalPontosNoHexagono = (ponto as any).hexagonoTotalPontos || 1;
                          
                          console.log(`🔍 [Popup] Hexágono ${hex.hexagon_pk}: fluxo agregado = ${fluxoAgregadoPontos?.toLocaleString('pt-BR') || 'N/A'}, total pontos = ${totalPontosNoHexagono}`);
                          
                          // PRIORIDADE 2: Usar fluxo do hexágono do banco (fluxoEstimado_vl ou calculatedFluxoEstimado_vl)
                          // Este é o fluxo da área geográfica do hexágono
                          const fluxoHexagonoBanco = (hex.fluxoEstimado_vl !== null && hex.fluxoEstimado_vl !== undefined && hex.fluxoEstimado_vl > 0) 
                            ? hex.fluxoEstimado_vl 
                            : (hex.calculatedFluxoEstimado_vl || 0);
                          
                          // Usar o fluxo agregado se disponível, senão usar o do banco
                          const fluxoHexagono = fluxoAgregadoPontos || fluxoHexagonoBanco;
                          const usandoFluxoAgregado = !!fluxoAgregadoPontos;
                          
                          // Identificar qual campo está sendo usado
                          const campoHexagono = usandoFluxoAgregado 
                            ? `${totalPontosNoHexagono} ponto${totalPontosNoHexagono > 1 ? 's' : ''} renderizado${totalPontosNoHexagono > 1 ? 's' : ''} no hexágono`
                            : ((hex.fluxoEstimado_vl !== null && hex.fluxoEstimado_vl !== undefined && hex.fluxoEstimado_vl > 0)
                              ? 'fluxoEstimado_vl (banco)'
                              : 'calculatedFluxoEstimado_vl (banco)');
                          
                          const campoPonto = (() => {
                            if (ponto.fluxo_vl !== null && ponto.fluxo_vl !== undefined && ponto.fluxo_vl > 0) return 'fluxo_vl';
                            if (ponto.fluxoPassantes_vl !== null && ponto.fluxoPassantes_vl !== undefined && ponto.fluxoPassantes_vl > 0) return 'fluxoPassantes_vl';
                            if (ponto.fluxoEstimado_vl !== null && ponto.fluxoEstimado_vl !== undefined && ponto.fluxoEstimado_vl > 0) return 'fluxoEstimado_vl';
                            return 'calculatedFluxoEstimado_vl';
                          })();
                          
                          const diferenca = fluxoHexagono - fluxoPonto;
                          const percentualDiferenca = fluxoPonto > 0 ? ((diferenca / fluxoPonto) * 100) : 0;
                          
                          // Verificar se estão usando campos compatíveis
                          const camposCompatíveis = campoPonto === 'fluxoEstimado_vl' && campoHexagono.includes('fluxoEstimado_vl');
                          
                          return (
                            <div style={{ 
                              background: '#f0f9ff',
                              padding: '10px',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              border: '1px solid #bae6fd'
                            }}>
                              <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Hexágono Associado
                              </div>
                              <div style={{ fontSize: 10, color: '#0c4a6e', lineHeight: 1.5 }}>
                                <div style={{ marginBottom: 4 }}>
                                  <strong>ID:</strong> #{hex.hexagon_pk}
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                  <strong>Grupo:</strong> {hex.grupo_st} ({hex.grupoDesc_st || 'N/A'})
                                </div>
                                
                                {/* Comparação de Fluxos */}
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #bae6fd' }}>
                                  <div style={{ fontSize: 9, color: '#0369a1', marginBottom: 4, fontWeight: 600 }}>
                                    📊 Comparação de Fluxos
                                  </div>
                                  <div style={{ marginBottom: 3 }}>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>Fluxo do Ponto ({campoPonto}):</div>
                                    <div style={{ fontWeight: 600, color: '#059669' }}>
                                      {formatNumber(fluxoPonto)}
                                    </div>
                                  </div>
                                  <div style={{ marginBottom: 3 }}>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>
                                      Fluxo do Hexágono ({campoHexagono}):
                                      {usandoFluxoAgregado && totalPontosNoHexagono > 1 && (
                                        <span style={{ fontSize: 8, color: '#059669', marginLeft: 4, fontWeight: 600 }}>
                                          ({totalPontosNoHexagono} ponto{totalPontosNoHexagono > 1 ? 's' : ''} renderizado{totalPontosNoHexagono > 1 ? 's' : ''})
                                        </span>
                                      )}
                                      {usandoFluxoAgregado && totalPontosNoHexagono === 1 && (
                                        <span style={{ fontSize: 8, color: '#64748b', marginLeft: 4, fontStyle: 'italic' }}>
                                          (1 ponto renderizado)
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                                      {formatNumber(fluxoHexagono)}
                                    </div>
                                    {usandoFluxoAgregado && (
                                      <div style={{ fontSize: 8, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                        {totalPontosNoHexagono > 1 
                                          ? `Soma dos fluxos dos ${totalPontosNoHexagono} pontos renderizados dentro do hexágono`
                                          : 'Fluxo do único ponto renderizado dentro do hexágono'}
                                      </div>
                                    )}
                                    {!usandoFluxoAgregado && fluxoHexagonoBanco > 0 && (
                                      <div style={{ fontSize: 8, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                        Fluxo da área geográfica (do banco de dados)
                                      </div>
                                    )}
                                  </div>
                                  {!camposCompatíveis && !usandoFluxoAgregado && (
                                    <div style={{ 
                                      marginTop: 4, 
                                      padding: '4px 6px', 
                                      background: '#fef3c7',
                                      borderRadius: '4px',
                                      fontSize: 8,
                                      color: '#92400e'
                                    }}>
                                      ⚠️ Campos diferentes: Ponto usa {campoPonto}, Hexágono usa {campoHexagono}
                                    </div>
                                  )}
                                  {diferenca !== 0 && (
                                    <div style={{ 
                                      marginTop: 4, 
                                      padding: '4px 6px', 
                                      background: diferenca > 0 ? '#dbeafe' : '#fee2e2',
                                      borderRadius: '4px',
                                      fontSize: 9
                                    }}>
                                      <div style={{ color: diferenca > 0 ? '#1e40af' : '#991b1b' }}>
                                        {diferenca > 0 ? '✓' : '⚠️'} Diferença: {diferenca > 0 ? '+' : ''}{formatNumber(diferenca)}
                                        {Math.abs(percentualDiferenca) > 10 && (
                                          <span> ({percentualDiferenca > 0 ? '+' : ''}{percentualDiferenca.toFixed(1)}%)</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>
                                        {diferenca > 0 
                                          ? 'Hexágono contém fluxo agregado da área' 
                                          : 'Verificar dados - hexágono menor que ponto'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Localização */}
                        {(ponto.cidade_st || ponto.estado_st || ponto.bairro_st) && (
                          <div style={{ 
                            fontSize: 11, 
                            color: '#6b7280',
                            marginBottom: 8,
                            paddingTop: 8,
                            borderTop: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>Localização</div>
                            {ponto.cidade_st && ponto.estado_st && (
                              <div style={{ marginBottom: 3 }}>📍 {ponto.cidade_st}/{ponto.estado_st}</div>
                            )}
                            {ponto.bairro_st && (
                              <div>🏘️ {ponto.bairro_st}</div>
                            )}
                          </div>
                        )}

                        {/* Coordenadas (colapsadas) */}
                        <details style={{ fontSize: 10, color: '#9ca3af' }}>
                          <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                            📐 Coordenadas
                          </summary>
                          <div style={{ marginTop: 4, padding: 6, background: '#f3f4f6', borderRadius: 4 }}>
                            <div><strong>Lat:</strong> {ponto.latitude_vl.toFixed(6)}</div>
                            <div><strong>Lon:</strong> {ponto.longitude_vl.toFixed(6)}</div>
                          </div>
                        </details>
                      </div>
                    </Popup>
                  </CircleMarker>
                    );
                  })
                  .filter(Boolean); // Remover nulls
                  
                  console.log(`✅ [Mapa] Total de pontos renderizados: ${pontosRenderizados.length} de ${pontosMidia.length}`);
                  
                  // Identificar hexágonos sem pontos
                  const hexagonosSemPontos = hexagonos.filter(hex => !pontosPorHexagono.has(hex.hexagon_pk));
                  if (hexagonosSemPontos.length > 0) {
                    console.log(`ℹ️ [Mapa] ${hexagonosSemPontos.length} hexágono(s) sem pontos de mídia (isso pode ser normal se a área não tem pontos cadastrados):`, 
                      hexagonosSemPontos.map(h => `Hex ${h.hexagon_pk} (${h.grupo_st})`).join(', '));
                  }
                  
                  // Estatísticas de pontos por hexágono
                  const hexagonosComPontos = Array.from(pontosPorHexagono.entries());
                  if (hexagonosComPontos.length > 0) {
                    const maxPontosPorHex = Math.max(...hexagonosComPontos.map(([_, count]) => count));
                    const hexagonosComMultiplosPontos = hexagonosComPontos.filter(([_, count]) => count > 1);
                    console.log(`📊 [Mapa] Estatísticas: Máximo de pontos por hexágono: ${maxPontosPorHex}, Hexágonos com múltiplos pontos: ${hexagonosComMultiplosPontos.length}`);
                  }
                  
                  // Log final do fluxo agregado calculado (apenas pontos renderizados)
                  console.log(`\n📊 [Mapa] RESUMO FINAL - Fluxo agregado por hexágono (apenas pontos RENDERIZADOS):`);
                  fluxoAgregadoPorHexagono.forEach((agregado, hexPk) => {
                    const hex = hexagonos.find(h => h.hexagon_pk === hexPk);
                    const fluxoHexBanco = hex?.fluxoEstimado_vl || hex?.calculatedFluxoEstimado_vl || 0;
                    console.log(`   Hexágono ${hexPk} (${hex?.grupo_st || 'N/A'}):`);
                    console.log(`      - Pontos RENDERIZADOS: ${agregado.count}`);
                    console.log(`      - Fluxo agregado (soma dos pontos): ${agregado.total.toLocaleString('pt-BR')}`);
                    console.log(`      - Fluxo do banco: ${fluxoHexBanco.toLocaleString('pt-BR')}`);
                    agregado.pontos.forEach((p, idx) => {
                      const fluxoP = getFluxoRealPonto(p);
                      console.log(`      - Ponto ${idx + 1}: ${p.planoMidia_pk} (fluxo: ${fluxoP.toLocaleString('pt-BR')})`);
                    });
                  });
                  
                  return pontosJSX;
                })()}
              </MapContainer>
            </div>
            {/* Legendas agrupadas no canto inferior direito */}
            {hexagonos.length > 0 && (
              <div style={{ position: 'absolute', bottom: 96, right: 64, display: 'flex', gap: 24, flexWrap: 'wrap', zIndex: 1000 }}>
                {/* Legenda do tamanho - usando fluxo real dos pontos */}
                {pontosMidia.length > 0 && (() => {
                  const fluxosReais = pontosMidia.map(getFluxoRealPonto);
                  const minFluxoReal = Math.min(...fluxosReais);
                  const maxFluxoReal = Math.max(...fluxosReais);
                  
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>📏 Tamanho dos Pontos</div>
                      <div style={{ fontSize: 9, color: '#666', marginBottom: 6, fontStyle: 'italic' }}>
                        Baseado no fluxo real
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <svg width={24} height={24} style={{ display: 'block' }}>
                          <circle cx={12} cy={12} r={6} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                        </svg>
                        <span style={{ fontSize: 11, color: '#444' }}>Menor fluxo<br/><strong>{formatNumber(minFluxoReal)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width={40} height={40} style={{ display: 'block' }}>
                          <circle cx={20} cy={20} r={20} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                        </svg>
                        <span style={{ fontSize: 11, color: '#444' }}>Maior fluxo<br/><strong>{formatNumber(maxFluxoReal)}</strong></span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Legenda de Grupos (Pontos) */}
                {(() => {
                  // Usar apenas os pontos que foram realmente renderizados no mapa
                  const pontosParaLegenda = pontosMidia.filter(ponto => {
                    // Aplicar as mesmas validações usadas na renderização
                    if (!ponto.grupo_st || !ponto.grupoSub_st) return false;
                    if (!ponto.grupoSub_st.startsWith(ponto.grupo_st)) return false;
                    
                    // Verificar se o grupo existe nos hexágonos
                      const hexagonoComGrupo = hexagonos.find(h => h.grupo_st === ponto.grupo_st);
                    if (!hexagonoComGrupo) return false;
                    
                    // Validar se o ponto está no hexágono correto
                    return validarPontoNoHexagonoCorreto(ponto, hexagonos);
                  });
                  
                  if (pontosParaLegenda.length === 0) return null;
                  
                  // Agrupar por subgrupo (que agora chamamos de "grupo")
                  const gruposUnicos = new Map<string, { subgrupo: string; ponto: PontoMidia }>();
                  
                  pontosParaLegenda.forEach((ponto: PontoMidia) => {
                    if (!gruposUnicos.has(ponto.grupoSub_st)) {
                      gruposUnicos.set(ponto.grupoSub_st, { subgrupo: ponto.grupoSub_st, ponto });
                    }
                  });
                  
                  // Ordenar grupos
                  const gruposOrdenados = Array.from(gruposUnicos.values()).sort((a, b) => 
                    a.subgrupo.localeCompare(b.subgrupo)
                  );
                  
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 8 }}>📍 Grupos (Pontos)</div>
                      {gruposOrdenados.map(({ subgrupo, ponto }) => {
                        // Usar a cor própria do ponto vinda da view/banco
                        const corPonto = ponto.hexColor_st || `rgb(${ponto.rgbColorR_vl},${ponto.rgbColorG_vl},${ponto.rgbColorB_vl})`;
                        
                        const isDigital = ponto.estaticoDigital_st === 'D';
                        
                        return (
                          <div key={subgrupo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <svg width={18} height={18} style={{ display: 'block' }}>
                              <circle 
                                cx={9} 
                                cy={9} 
                                r={7} 
                                fill={corPonto}
                                stroke="#ffffff" 
                                strokeWidth={1.5}
                                strokeDasharray={isDigital ? undefined : '3,3'}
                              />
                            </svg>
                            <span style={{ fontSize: 11, color: '#444' }}>
                              {subgrupo}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Legenda de tipos de mídia */}
                {pontosMidia.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>🔵 Tipos de Mídia</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <svg width={18} height={18} style={{ display: 'block' }}>
                        <circle cx={9} cy={9} r={7} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} />
                      </svg>
                      <span style={{ fontSize: 11, color: '#444' }}>Digital (borda sólida)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width={18} height={18} style={{ display: 'block' }}>
                        <circle cx={9} cy={9} r={7} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3,3" />
                      </svg>
                      <span style={{ fontSize: 11, color: '#444' }}>Estático (borda tracejada)</span>
                    </div>
                  </div>
                )}
                
                {/* Informações rápidas */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>ℹ️ Informações</div>
                  <div style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
                    <div><strong>Hexágonos:</strong> {formatNumber(hexagonos.length)} áreas</div>
                    {pontosMidia.length > 0 && (
                      <div><strong>Pontos de Mídia:</strong> {formatNumber(pontosMidia.length)} unidades</div>
                    )}
                    <div><strong>Área:</strong> ~{formatNumber(hexagonos.length * 0.36)} km²</div>
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #e5e7eb' }}>
                      <strong>Última atualização:</strong>
                    </div>
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
      
      {/* Modal de Sugestões Detalhadas */}
      <SuggestionsModal 
        analise={analise}
        isOpen={mostrarModalDetalhes}
        onClose={() => setMostrarModalDetalhes(false)}
      />
    </div>
  );
}; 