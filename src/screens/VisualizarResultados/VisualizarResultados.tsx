import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../../config/axios";

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

export const VisualizarResultados: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuReduzido, setMenuReduzido] = useState(false);
  
  const [roteiroData, setRoteiroData] = useState<RoteiroData | null>(null);
  const [dadosResultados, setDadosResultados] = useState<ResultadoData[]>([]);
  const [totaisResultados, setTotaisResultados] = useState<TotaisData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  

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
                              <a 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  alert('🔴 CLIQUE DETECTADO! Cidade: ' + item.cidade_st);
                                  console.log('🗺️ [DEBUG] Navegando para Mapa com cidade:', item.cidade_st);
                                  console.log('🗺️ [DEBUG] RoteiroData:', roteiroData);
                                  navigate('/mapa', {
                                    state: {
                                      cidadePreSelecionada: item.cidade_st,
                                      semanaPreSelecionada: '1', // Semana padrão
                                      roteiroData: roteiroData
                                    }
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                View mapa
                              </a>
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
