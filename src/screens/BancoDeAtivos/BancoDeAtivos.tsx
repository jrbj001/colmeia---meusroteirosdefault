import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import api from "../../config/axios";

interface DashboardData {
  total: {
    pontos_midia: number;
    pracas: number;
    exibidores: number;
  };
  vias_publicas: {
    pontos_midia: number;
    pracas: number;
    exibidores: number;
  };
  indoor: {
    pontos_midia: number;
    pracas: number;
    exibidores: number;
  };
}

interface PontoMidiaResultado {
  codigo_ponto: number;
  code: string;
  latitude: number | string;
  longitude: number | string;
  exibidor: string;
  categoria_exibidor: string;
  ambiente: string;
  formato: string;
  grupo_midia: string;
  tipo_midia: string;
  cidade: string;
  estado: string;
  endereco: string;
  bairro: string;
  cep: string;
  rating: string;
  passantes: number;
  impactos_ipv: number;
}

// Chave para o cache
const CACHE_KEY = 'banco_ativos_dashboard_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CacheData {
  data: DashboardData;
  timestamp: number;
}

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
          {/* Background blur circle */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 107, 53, 0.2) 0%, rgba(255, 107, 53, 0.05) 100%)',
              width: '80px',
              height: '80px',
              margin: '-10px',
              animation: 'apple-pulse 2s ease-in-out infinite'
            }}
          />
          
          {/* Spinner */}
          <div 
            className="relative"
            style={{ 
              width: 56, 
              height: 56,
              animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24">
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
          className="text-[#ff4600] font-medium text-base tracking-tight"
          style={{ letterSpacing: '-0.01em' }}
        >
          Carregando...
        </span>
      </div>
    </>
  );
};

export const BancoDeAtivos: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'busca'>('dashboard');
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [usandoCache, setUsandoCache] = useState(false);

  // Estados para a aba de busca
  const [filtros, setFiltros] = useState({
    praca: '',
    exibidor: '',
    bairro: '',
    rating: '',
    ambiente: '',
    grupo_midia: '',
    tipo_ambiente_indoor: '',
    tipo_midia_vias_publicas: '',
    formato: ''
  });
  const [resultadosBusca, setResultadosBusca] = useState<PontoMidiaResultado[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  
  // Estados para as opções dos dropdowns
  const [opcoesPracas, setOpcoesPracas] = useState<string[]>([]);
  const [opcoesExibidores, setOpcoesExibidores] = useState<string[]>([]);
  const [opcoesBairros, setOpcoesBairros] = useState<string[]>([]);
  const [opcoesGruposMidia, setOpcoesGruposMidia] = useState<Array<{id: number, name: string}>>([]);
  const [opcoesTiposMidiaIndoor, setOpcoesTiposMidiaIndoor] = useState<Array<{id: number, name: string}>>([]);
  const [opcoesTiposMidiaViasPublicas, setOpcoesTiposMidiaViasPublicas] = useState<Array<{id: number, name: string}>>([]);

  // Função para obter dados do cache
  const getCachedData = (): DashboardData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Verificar se o cache ainda é válido
        if (now - cacheData.timestamp < CACHE_DURATION) {
          return cacheData.data;
        } else {
          // Cache expirado, remover
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Erro ao ler cache:', error);
    }
    return null;
  };

  // Função para salvar dados no cache
  const setCachedData = (data: DashboardData) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async (forcarAtualizacao: boolean = false) => {
    try {
      // Verificar cache primeiro (se não forçar atualização)
      if (!forcarAtualizacao) {
        const cachedData = getCachedData();
        if (cachedData) {
          setDados(cachedData);
          setUsandoCache(true);
          setLoading(false);
          
          // Carregar dados atualizados em background (sem mostrar loading)
          carregarDadosDoServidor(false);
          return;
        }
      }

      // Se não há cache ou está forçando atualização, carregar do servidor
      await carregarDadosDoServidor();
    } catch (err: any) {
      console.error('❌ Erro ao carregar dados:', err);
      setErro(err.response?.data?.message || 'Erro ao carregar os dados do dashboard. Tente novamente.');
      setLoading(false);
    }
  };

  const carregarDadosDoServidor = async (mostrarLoading: boolean = true) => {
    try {
      if (mostrarLoading) {
        setLoading(true);
      }
      setErro(null);
      setUsandoCache(false);
      
      const response = await api.get('/banco-ativos-dashboard');
      console.log('📊 Resposta da API:', response.data);
      
      if (response.data && response.data.success && response.data.data) {
        setDados(response.data.data);
        setCachedData(response.data.data);
        setUsandoCache(false);
      } else {
        setErro('Formato de resposta inválido da API');
      }
    } catch (err: any) {
      console.error('❌ Erro ao carregar dados do servidor:', err);
      // Se estava usando cache e deu erro, manter os dados do cache
      if (!usandoCache) {
        throw err;
      }
    } finally {
      if (mostrarLoading) {
        setLoading(false);
      }
    }
  };

  const formatarNumero = (numero: number): string => {
    return new Intl.NumberFormat('pt-BR').format(numero);
  };

  // Função para carregar opções dos filtros
  const carregarOpcoesFiltros = async () => {
    try {
      console.log('🔄 Carregando opções dos filtros...');
      
      // Carregar todas as opções em paralelo
      const [
        responsePracas,
        responseExibidores,
        responseBairros,
        responseGruposMidia,
        responseTiposMidiaIndoor,
        responseTiposMidiaViasPublicas
      ] = await Promise.all([
        api.get('/cidades-praca').catch(err => { console.error('❌ Erro cidades-praca:', err); return { data: [] }; }),
        api.get('/exibidores').catch(err => { console.error('❌ Erro exibidores:', err); return { data: [] }; }),
        api.get('/bairros').catch(err => { console.error('❌ Erro bairros:', err); return { data: [] }; }),
        api.get('/grupos-midia').catch(err => { console.error('❌ Erro grupos-midia:', err); return { data: [] }; }),
        api.get('/tipos-midia-indoor').catch(err => { console.error('❌ Erro tipos-midia-indoor:', err); return { data: [] }; }),
        api.get('/tipos-midia-vias-publicas').catch(err => { console.error('❌ Erro tipos-midia-vias-publicas:', err); return { data: [] }; })
      ]);

      console.log('📊 Respostas recebidas:', {
        pracas: responsePracas.data?.length || 0,
        exibidores: responseExibidores.data?.length || 0,
        bairros: responseBairros.data?.length || 0,
        gruposMidia: responseGruposMidia.data?.length || 0,
        tiposMidiaIndoor: responseTiposMidiaIndoor.data?.length || 0,
        tiposMidiaViasPublicas: responseTiposMidiaViasPublicas.data?.length || 0
      });

      // Processar praças - usar nome_cidade da estrutura existente
      const pracas = (responsePracas.data || []).map((c: any) => c.nome_cidade || c.name || c);
      setOpcoesPracas([...new Set(pracas)].filter(Boolean).sort());

      // Processar exibidores
      const exibidores = (responseExibidores.data || []).map((e: any) => e.name || e);
      setOpcoesExibidores([...new Set(exibidores)].filter(Boolean).sort());

      // Processar bairros
      const bairros = (responseBairros.data || []).map((b: any) => b.name || b);
      setOpcoesBairros([...new Set(bairros)].filter(Boolean).sort());

      // Processar grupos de mídia
      setOpcoesGruposMidia(responseGruposMidia.data || []);

      // Processar tipos de mídia indoor
      setOpcoesTiposMidiaIndoor(responseTiposMidiaIndoor.data || []);

      // Processar tipos de mídia vias públicas
      setOpcoesTiposMidiaViasPublicas(responseTiposMidiaViasPublicas.data || []);

      console.log('✅ Opções de filtros carregadas com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro geral ao carregar opções dos filtros:', err);
      alert('Erro ao carregar opções dos filtros. Verifique o console.');
    }
  };

  // Função para realizar a busca
  const realizarBusca = async (e?: React.MouseEvent) => {
    // Prevenir qualquer comportamento padrão
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('🔍 [Frontend] Iniciando busca...');
      setLoadingBusca(true);
      setErroBusca(null);

      // Montar query params
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      console.log('🔍 [Frontend] Filtros aplicados:', filtros);
      console.log('🔍 [Frontend] Query string:', params.toString());
      
      const response = await api.get(`/busca-pontos-midia?${params.toString()}`);
      
      console.log('✅ [Frontend] Resposta recebida:', response.data);
      setResultadosBusca(response.data.data || []);
      
      console.log('✅ [Frontend] Resultados definidos. Total:', response.data.data?.length || 0);
    } catch (err: any) {
      console.error('❌ [Frontend] Erro ao buscar pontos:', err);
      setErroBusca(err.response?.data?.message || 'Erro ao buscar pontos de mídia');
    } finally {
      setLoadingBusca(false);
      console.log('🏁 [Frontend] Busca finalizada');
    }
  };

  // Função para exportar para Excel
  const exportarExcel = async () => {
    if (resultadosBusca.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const dadosExcel = resultadosBusca.map(item => ({
        'ID': item.codigo_ponto,
        'Código': item.code,
        'Latitude': item.latitude,
        'Longitude': item.longitude,
        'Exibidor': item.exibidor,
        'Categoria Exibidor': item.categoria_exibidor,
        'Ambiente': item.ambiente,
        'Formato': item.formato,
        'Grupo de mídia': item.grupo_midia,
        'Tipo de mídia': item.tipo_midia,
        'Cidade': item.cidade,
        'Estado': item.estado,
        'Endereço': item.endereco,
        'Bairro': item.bairro,
        'CEP': item.cep,
        'Rating': item.rating,
        'Passantes': item.passantes,
        'Impactos IPV': item.impactos_ipv
      }));

      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pontos de Mídia');
      XLSX.writeFile(wb, `pontos_midia_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Erro ao exportar para Excel');
    }
  };

  // Carregar opções dos filtros quando a aba de busca é aberta
  useEffect(() => {
    if (abaAtiva === 'busca' && opcoesPracas.length === 0) {
      carregarOpcoesFiltros();
    }
  }, [abaAtiva]);

  if (loading) {
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
                { label: "Banco de ativos" }
              ]
            }}
          />
          <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
          <div className="flex-1 flex items-center justify-center pt-20">
            <AppleLoading />
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
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
                { label: "Banco de ativos" }
              ]
            }}
          />
          <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
          <div className="flex-1 flex items-center justify-center pt-20">
            <div className="text-center">
              <p className="text-red-600 mb-4">{erro}</p>
              <button
                onClick={carregarDados}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              { label: "Banco de ativos" }
            ]
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        
        <div className="flex-1 pt-8 pb-32 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Título em laranja */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-[#ff4600] uppercase tracking-wide">Banco de Ativos</h1>
              {abaAtiva === 'dashboard' && usandoCache && (
                <div className="flex items-center gap-2 text-xs text-[#666]">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Dados em cache • Atualizando em background...</span>
                </div>
              )}
              {abaAtiva === 'dashboard' && !loading && dados && (
                <button
                  onClick={() => carregarDados(true)}
                  className="text-xs text-[#ff4600] hover:text-[#e03700] transition-colors font-medium"
                  title="Atualizar dados"
                >
                  ↻ Atualizar
                </button>
              )}
            </div>
            
            {/* Abas de navegação */}
            <div className="flex gap-4 border-b border-gray-300 mb-8">
              <button
                onClick={() => setAbaAtiva('dashboard')}
                className={`pb-3 px-4 font-bold text-sm transition-all uppercase tracking-wide ${
                  abaAtiva === 'dashboard'
                    ? 'text-[#ff4600] border-b-2 border-[#ff4600]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setAbaAtiva('busca')}
                className={`pb-3 px-4 font-bold text-sm transition-all uppercase tracking-wide ${
                  abaAtiva === 'busca'
                    ? 'text-[#ff4600] border-b-2 border-[#ff4600]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Busca de Pontos
              </button>
            </div>
            
            {/* Conteúdo da aba Dashboard */}
            {abaAtiva === 'dashboard' && dados && (
              <div className="space-y-8">
                {/* TOTAL */}
                <div>
                  <h2 className="text-lg font-bold text-[#3a3a3a] mb-4">TOTAL</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0066CC] text-white rounded-lg p-8 shadow-md">
                      <div className="text-xs font-medium mb-3 uppercase tracking-wide opacity-90">PONTOS DE MÍDIA</div>
                      <div className="text-5xl font-bold">{formatarNumero(dados.total.pontos_midia)}</div>
                    </div>
                    <div className="bg-[#0066CC] text-white rounded-lg p-8 shadow-md">
                      <div className="text-xs font-medium mb-3 uppercase tracking-wide opacity-90">PRAÇAS</div>
                      <div className="text-5xl font-bold">{formatarNumero(dados.total.pracas)}</div>
                    </div>
                    <div className="bg-[#0066CC] text-white rounded-lg p-8 shadow-md">
                      <div className="text-xs font-medium mb-3 uppercase tracking-wide opacity-90">EXIBIDORES</div>
                      <div className="text-5xl font-bold">{formatarNumero(dados.total.exibidores)}</div>
                    </div>
                  </div>
                </div>

                {/* VIAS PÚBLICAS */}
                <div>
                  <h2 className="text-lg font-bold text-[#3a3a3a] mb-4">Vias Públicas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">PONTOS DE MÍDIA</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.vias_publicas.pontos_midia)}</div>
                    </div>
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">PRAÇAS</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.vias_publicas.pracas)}</div>
                    </div>
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">EXIBIDORES</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.vias_publicas.exibidores)}</div>
                    </div>
                  </div>
                </div>

                {/* INDOOR */}
                <div>
                  <h2 className="text-lg font-bold text-[#3a3a3a] mb-4">Indoor</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">PONTOS DE MÍDIA</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.indoor.pontos_midia)}</div>
                    </div>
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">PRAÇAS</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.indoor.pracas)}</div>
                    </div>
                    <div className="bg-white border border-[#0066CC] rounded-lg p-8 shadow-sm">
                      <div className="text-xs font-medium text-[#0066CC] mb-3 uppercase tracking-wide">EXIBIDORES</div>
                      <div className="text-5xl font-bold text-[#0066CC]">{formatarNumero(dados.indoor.exibidores)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Busca por Pontos de Mídia */}
            {abaAtiva === 'busca' && (
              <div className="space-y-6">
                {/* Título da seção */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Filtros de Busca</h2>
                  <p className="text-sm text-gray-500">Selecione os filtros desejados para buscar pontos de mídia</p>
                </div>

                {/* Grid de Filtros - 4 colunas */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Filtro: Praça */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        Praça 
                        {opcoesPracas.length > 0 && <span className="text-xs text-gray-400 ml-2 font-normal normal-case">({opcoesPracas.length})</span>}
                      </label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                        value={filtros.praca}
                        onChange={(e) => setFiltros({...filtros, praca: e.target.value})}
                      >
                        <option value="">{opcoesPracas.length > 0 ? 'Selecione...' : 'Carregando...'}</option>
                        {opcoesPracas.map(praca => (
                          <option key={praca} value={praca}>{praca}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro: Exibidor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        Exibidor
                        {opcoesExibidores.length > 0 && <span className="text-xs text-gray-400 ml-2 font-normal normal-case">({opcoesExibidores.length})</span>}
                      </label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                      value={filtros.exibidor}
                      onChange={(e) => setFiltros({...filtros, exibidor: e.target.value})}
                    >
                      <option value="">{opcoesExibidores.length > 0 ? 'Selecione...' : 'Carregando...'}</option>
                      {opcoesExibidores.map(exibidor => (
                        <option key={exibidor} value={exibidor}>{exibidor}</option>
                      ))}
                    </select>
                  </div>

                    {/* Filtro: Bairro */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Bairro</label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                        value={filtros.bairro}
                        onChange={(e) => setFiltros({...filtros, bairro: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        {opcoesBairros.map(bairro => (
                          <option key={bairro} value={bairro}>{bairro}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro: Rating */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Rating</label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                        value={filtros.rating}
                        onChange={(e) => setFiltros({...filtros, rating: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </div>

                    {/* Filtro: Ambiente */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ambiente</label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                        value={filtros.ambiente}
                        onChange={(e) => setFiltros({...filtros, ambiente: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Indoor">Indoor</option>
                        <option value="Vias Públicas">Vias Públicas</option>
                      </select>
                    </div>

                    {/* Filtro: Grupo de mídia */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        Grupo de mídia
                        <span className="block text-xs text-gray-400 font-normal mt-1 normal-case">
                          (válido somente para vias públicas)
                        </span>
                      </label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        value={filtros.grupo_midia}
                        onChange={(e) => setFiltros({...filtros, grupo_midia: e.target.value})}
                        disabled={filtros.ambiente !== 'Vias Públicas'}
                      >
                        <option value="">Selecione...</option>
                        {opcoesGruposMidia.map(grupo => (
                          <option key={grupo.id} value={grupo.name}>{grupo.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro: Tipo de Ambiente - Indoor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        Tipo de Ambiente - Indoor
                        <span className="block text-xs text-gray-400 font-normal mt-1 normal-case">
                          (válido somente para indoor)
                        </span>
                      </label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        value={filtros.tipo_ambiente_indoor}
                        onChange={(e) => setFiltros({...filtros, tipo_ambiente_indoor: e.target.value})}
                        disabled={filtros.ambiente !== 'Indoor'}
                      >
                        <option value="">Selecione...</option>
                        {opcoesTiposMidiaIndoor.map(tipo => (
                          <option key={tipo.id} value={tipo.name}>{tipo.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro: Tipo de mídia - Vias Públicas */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        Tipo de mídia - Vias Públicas
                        <span className="block text-xs text-gray-400 font-normal mt-1 normal-case">
                          (válido somente para vias públicas)
                        </span>
                      </label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        value={filtros.tipo_midia_vias_publicas}
                        onChange={(e) => setFiltros({...filtros, tipo_midia_vias_publicas: e.target.value})}
                        disabled={filtros.ambiente !== 'Vias Públicas'}
                      >
                        <option value="">Selecione...</option>
                        {opcoesTiposMidiaViasPublicas.map(tipo => (
                          <option key={tipo.id} value={tipo.name}>{tipo.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro: Formato */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Formato</label>
                      <select 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#ff4600] bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                        value={filtros.formato}
                        onChange={(e) => setFiltros({...filtros, formato: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Estático">Estático</option>
                        <option value="Digital">Digital</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap gap-3 items-center">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      realizarBusca(e);
                    }}
                    disabled={loadingBusca}
                    className="bg-[#ff4600] hover:bg-[#e03700] text-white font-bold py-3 px-8 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
                  >
                    {loadingBusca ? 'Buscando...' : 'Buscar'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setFiltros({
                        praca: '',
                        exibidor: '',
                        bairro: '',
                        rating: '',
                        ambiente: '',
                        grupo_midia: '',
                        tipo_ambiente_indoor: '',
                        tipo_midia_vias_publicas: '',
                        formato: ''
                      });
                      setResultadosBusca([]);
                    }}
                    className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold py-3 px-6 rounded transition-all text-sm"
                  >
                    Limpar
                  </button>

                  {resultadosBusca.length > 0 && (
                    <button 
                      type="button"
                      onClick={exportarExcel}
                      className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-8 rounded transition-all text-sm uppercase tracking-wide"
                    >
                      Exportar Excel
                    </button>
                  )}
                  
                  {Object.values(filtros).filter(Boolean).length > 0 && (
                    <div className="ml-auto text-xs text-gray-500 font-medium">
                      {Object.values(filtros).filter(Boolean).length} filtro{Object.values(filtros).filter(Boolean).length > 1 ? 's' : ''} selecionado{Object.values(filtros).filter(Boolean).length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Área de Resultados */}
                <div className="mt-10">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Resultados
                      {resultadosBusca.length > 0 && (
                        <span className="ml-3 text-base font-normal text-gray-500">
                          {resultadosBusca.length} {resultadosBusca.length === 1 ? 'ponto' : 'pontos'}
                        </span>
                      )}
                    </h2>
                  </div>
                  
                  <div className="bg-white rounded border border-gray-300 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 border-b-2 border-gray-300">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">ID</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Código</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Latitude</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Longitude</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Exibidor</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Categoria</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Ambiente</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Formato</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Grupo</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Tipo</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Cidade</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Estado</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Endereço</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Bairro</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">CEP</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Rating</th>
                            <th className="px-4 py-3 text-right font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Passantes</th>
                            <th className="px-4 py-3 text-right font-bold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Impactos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {loadingBusca ? (
                            <tr>
                              <td colSpan={18} className="px-4 py-16 text-center">
                                <AppleLoading />
                              </td>
                            </tr>
                          ) : erroBusca ? (
                            <tr>
                              <td colSpan={18} className="px-4 py-12 text-center">
                                <div className="text-red-600 font-semibold">{erroBusca}</div>
                              </td>
                            </tr>
                          ) : resultadosBusca.length === 0 ? (
                            <tr>
                              <td colSpan={18} className="px-4 py-20 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="text-gray-400 font-semibold text-sm">Nenhum resultado encontrado</div>
                                  <div className="text-xs text-gray-500 max-w-lg">
                                    {Object.values(filtros).filter(Boolean).length > 0 ? (
                                      <div className="space-y-2">
                                        <p>A combinação de filtros não retornou resultados.</p>
                                        <div className="text-left inline-block">
                                          <p className="font-semibold mb-1">Sugestões:</p>
                                          <ul className="list-disc list-inside space-y-1">
                                            <li>Remover alguns filtros</li>
                                            <li>Buscar apenas por Praça ou Exibidor</li>
                                            <li>Verificar se o Ambiente está correto</li>
                                          </ul>
                                        </div>
                                      </div>
                                    ) : (
                                      'Selecione os filtros desejados e clique em Buscar.'
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            resultadosBusca.map((resultado, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-[#ff4600] font-bold">{resultado.codigo_ponto || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.code || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{resultado.latitude ? Number(resultado.latitude).toFixed(6) : '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{resultado.longitude ? Number(resultado.longitude).toFixed(6) : '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">{resultado.exibidor || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.categoria_exibidor || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{resultado.ambiente || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.formato || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.grupo_midia || '-'}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{resultado.tipo_midia || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">{resultado.cidade || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.estado || '-'}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{resultado.endereco || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{resultado.bairro || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{resultado.cep || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-semibold">{resultado.rating || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-semibold">{resultado.passantes ? formatarNumero(resultado.passantes) : '0'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-semibold">{resultado.impactos_ipv ? formatarNumero(resultado.impactos_ipv) : '0'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer padrão - mesmo das outras páginas */}
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
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

