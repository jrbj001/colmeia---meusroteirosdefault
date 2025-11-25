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
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [usandoCache, setUsandoCache] = useState(false);

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
            {/* Título DASHBOARD em laranja */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-[#ff4600] uppercase tracking-wide">Dashboard</h1>
              {usandoCache && (
                <div className="flex items-center gap-2 text-xs text-[#666]">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Dados em cache • Atualizando em background...</span>
                </div>
              )}
              {!loading && dados && (
                <button
                  onClick={() => carregarDados(true)}
                  className="text-xs text-[#ff4600] hover:text-[#e03700] transition-colors font-medium"
                  title="Atualizar dados"
                >
                  ↻ Atualizar
                </button>
              )}
            </div>
            
            {dados && (
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

