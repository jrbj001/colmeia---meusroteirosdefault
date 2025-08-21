import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useAuth } from "../../contexts/AuthContext";
import axios from "../../config/axios";

interface Agencia {
  id_agencia: number;
  nome_agencia: string;
}

interface Marca {
  id_marca: number;
  nome_marca: string;
}

interface Categoria {
  id_categoria: number;
  nome_categoria: string;
}

interface Cidade {
  id_cidade: number;
  nome_cidade: string;
  nome_estado: string;
  codigo_ibge?: string;
}

interface TargetGenero {
  gender: string;
}

interface TargetClasse {
  class: string;
}

interface TargetFaixaEtaria {
  age: string;
}

export const CriarRoteiro: React.FC = () => {
  const { user } = useAuth();
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [tipoRoteiro, setTipoRoteiro] = useState("");
  const [nomeRoteiro, setNomeRoteiro] = useState("");
  const [agencia, setAgencia] = useState("");
  const [valorCampanha, setValorCampanha] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");

  // Estados para os dados dos combos
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // Estados para dados de target
  const [generos, setGeneros] = useState<TargetGenero[]>([]);
  const [classes, setClasses] = useState<TargetClasse[]>([]);
  const [faixasEtarias, setFaixasEtarias] = useState<TargetFaixaEtaria[]>([]);

  // Estados de loading
  const [loadingAgencias, setLoadingAgencias] = useState(false);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingGeneros, setLoadingGeneros] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingFaixasEtarias, setLoadingFaixasEtarias] = useState(false);

  // Estados para as abas
  const [abaAtiva, setAbaAtiva] = useState(1);
  
  // Estados para aba 2 - Configurar target
  const [genero, setGenero] = useState("");
  const [classe, setClasse] = useState("");
  const [faixaEtaria, setFaixaEtaria] = useState("");

  // Estados para aba 3 - Configurar praça
  const [searchPraca, setSearchPraca] = useState("");
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [cidadesFiltradas, setCidadesFiltradas] = useState<Cidade[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [showDropdownCidades, setShowDropdownCidades] = useState(false);
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<Cidade[]>([]);
  const [inventarioCidades, setInventarioCidades] = useState<{[key: string]: any}>({});
  
  // Estados para controle de salvamento
  const [planoMidiaGrupo_pk, setPlanoMidiaGrupo_pk] = useState<number | null>(null);
  const [planoMidiaDesc_pks, setPlanoMidiaDesc_pks] = useState<number[]>([]);
  const [planoMidia_pks, setPlanoMidia_pks] = useState<number[]>([]);
  const [salvandoAba1, setSalvandoAba1] = useState(false);
  const [salvandoAba2, setSalvandoAba2] = useState(false);
  const [salvandoAba3, setSalvandoAba3] = useState(false);
  const [cidadesSalvas, setCidadesSalvas] = useState<Cidade[]>([]);

  // Carregar dados dos combos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingAgencias(true);
        setLoadingMarcas(true);
        setLoadingCategorias(true);
        const [agenciasRes, marcasRes, categoriasRes] = await Promise.all([
          axios.get('/agencia'),
          axios.get('/marca'),
          axios.get('/categoria')
        ]);

        setAgencias(agenciasRes.data);
        setMarcas(marcasRes.data);
        setCategorias(categoriasRes.data);
        
        setLoadingAgencias(false);
        setLoadingMarcas(false);
        setLoadingCategorias(false);
      } catch (error) {
        console.error('Erro ao carregar dados dos combos:', error);
        setLoadingAgencias(false);
        setLoadingMarcas(false);
        setLoadingCategorias(false);
      }
    };

    fetchData();
  }, []);

  // Carregar dados de target
  useEffect(() => {
    const fetchTargetData = async () => {
      try {
        setLoadingGeneros(true);
        setLoadingClasses(true);
        setLoadingFaixasEtarias(true);
        
        const [generosRes, classesRes, faixasEtariasRes] = await Promise.all([
          axios.get('/target-genero'),
          axios.get('/target-classe'),
          axios.get('/target-faixa-etaria')
        ]);

        setGeneros(generosRes.data);
        setClasses(classesRes.data);
        setFaixasEtarias(faixasEtariasRes.data);
        
        setLoadingGeneros(false);
        setLoadingClasses(false);
        setLoadingFaixasEtarias(false);
      } catch (error) {
        console.error('Erro ao carregar dados de target:', error);
        setLoadingGeneros(false);
        setLoadingClasses(false);
        setLoadingFaixasEtarias(false);
      }
    };

    fetchTargetData();
  }, []);

  // Carregar cidades para aba 3
  useEffect(() => {
    const fetchCidades = async () => {
      try {
        setLoadingCidades(true);
        const response = await axios.get('/cidades-praca');
        setCidades(response.data);
        setCidadesFiltradas(response.data);
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
      } finally {
        setLoadingCidades(false);
      }
    };

    fetchCidades();
  }, []);

  // Filtrar cidades baseado na busca
  useEffect(() => {
    if (!searchPraca.trim()) {
      setCidadesFiltradas(cidades);
      return;
    }

    const filtered = cidades.filter(cidade =>
      cidade.nome_cidade.toLowerCase().includes(searchPraca.toLowerCase()) ||
      cidade.nome_estado.toLowerCase().includes(searchPraca.toLowerCase())
    );
    setCidadesFiltradas(filtered);
  }, [searchPraca, cidades]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.cidade-dropdown-container')) {
        setShowDropdownCidades(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para buscar inventário de uma cidade
  const buscarInventarioCidade = async (nomeCidade: string) => {
    try {
      const response = await axios.get(`/inventario-cidade?cidade=${encodeURIComponent(nomeCidade)}`);
      setInventarioCidades(prev => ({
        ...prev,
        [nomeCidade]: response.data
      }));
    } catch (error) {
      console.error(`Erro ao buscar inventário de ${nomeCidade}:`, error);
    }
  };

  // Funções para lidar com seleção de cidades
  const handleSelecionarCidade = (cidade: Cidade) => {
    const jaExiste = cidadesSelecionadas.find(c => c.id_cidade === cidade.id_cidade);
    if (!jaExiste) {
      setCidadesSelecionadas([...cidadesSelecionadas, cidade]);
      // Buscar inventário da cidade selecionada
      buscarInventarioCidade(cidade.nome_cidade);
    }
    setSearchPraca("");
    setShowDropdownCidades(false);
  };

  const handleRemoverCidade = (id_cidade: number) => {
    setCidadesSelecionadas(cidadesSelecionadas.filter(c => c.id_cidade !== id_cidade));
  };

  // Função para verificar se as cidades mudaram desde o último salvamento
  const cidadesMudaram = () => {
    if (cidadesSelecionadas.length !== cidadesSalvas.length) return true;
    
    return cidadesSelecionadas.some(cidade => 
      !cidadesSalvas.find(salva => salva.id_cidade === cidade.id_cidade)
    );
  };

  // Função para gerar o string do plano mídia grupo
  const gerarPlanoMidiaGrupoString = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}${mes}${dia}`;
    
    // Remover caracteres especiais e espaços do nome do roteiro
    const nomeFormatado = nomeRoteiro.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
    return `${dataFormatada}_${nomeFormatado}`;
  };

  // Função para salvar Aba 1 - Criar Plano Mídia Grupo
  const salvarAba1 = async () => {
    if (!nomeRoteiro.trim()) {
      alert('Nome do roteiro é obrigatório');
      return;
    }

    setSalvandoAba1(true);
    try {
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      
      const response = await axios.post('/plano-midia-grupo', {
        planoMidiaGrupo_st
      });

      if (response.data && response.data[0]?.new_pk) {
        const newPk = response.data[0].new_pk;
        setPlanoMidiaGrupo_pk(newPk);
        alert(`Roteiro criado com sucesso! PK: ${newPk}`);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao salvar Aba 1:', error);
      alert('Erro ao salvar roteiro. Tente novamente.');
    } finally {
      setSalvandoAba1(false);
    }
  };

  // Função para salvar Aba 2 - Salvar apenas configurações de target
  const salvarAba2 = async () => {
    if (!planoMidiaGrupo_pk) {
      alert('É necessário salvar a Aba 1 primeiro');
      return;
    }

    if (!genero || !classe || !faixaEtaria) {
      alert('Todos os campos de target são obrigatórios');
      return;
    }

    if (!user) {
      alert('Usuário não está logado');
      return;
    }

    setSalvandoAba2(true);
    try {
      // Por enquanto, apenas salvamos a configuração de target
      // As cidades serão associadas quando a aba 3 for salva
      alert(`Target configurado com sucesso!\nGênero: ${genero}\nClasse: ${classe}\nFaixa Etária: ${faixaEtaria}`);
      
      // Marcar como configurado (você pode adicionar um estado específico se necessário)
      setPlanoMidiaDesc_pks([1]); // Valor temporário para indicar que foi configurado
    } catch (error) {
      console.error('Erro ao salvar Aba 2:', error);
      alert('Erro ao salvar configuração de target. Tente novamente.');
    } finally {
      setSalvandoAba2(false);
    }
  };

  // Função para salvar Aba 3 - Criar Plano Mídia Desc e Plano Mídia com cidades
  const salvarAba3 = async () => {
    if (planoMidiaDesc_pks.length === 0) {
      alert('É necessário salvar a Aba 2 primeiro');
      return;
    }

    if (cidadesSelecionadas.length === 0) {
      alert('É necessário selecionar pelo menos uma cidade');
      return;
    }

    if (!user) {
      alert('Usuário não está logado');
      return;
    }

    setSalvandoAba3(true);
    try {
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      
      // 1. Criar plano mídia desc para cada cidade
      const recordsJson = cidadesSelecionadas.map(cidade => ({
        planoMidiaDesc_st: `${planoMidiaGrupo_st}_${cidade.nome_cidade.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
        usuarioId_st: user.id,
        usuarioName_st: user.name,
        gender_st: genero,
        class_st: classe,
        age_st: faixaEtaria,
        ibgeCode_vl: cidade.codigo_ibge || cidade.id_cidade.toString()
      }));

      const descResponse = await axios.post('/plano-midia-desc', {
        planoMidiaGrupo_pk,
        recordsJson
      });

      if (descResponse.data && Array.isArray(descResponse.data)) {
        const descPks = descResponse.data.map(item => item.new_pk);
        
        // 2. Criar plano mídia para cada desc criado
        const periodsJson = descPks.map(pk => ({
          planoMidiaDesc_pk: pk.toString(),
          semanaInicial_vl: "1",
          semanaFinal_vl: "12",
          versao_vl: "1"
        }));

        const midiaResponse = await axios.post('/plano-midia', {
          periodsJson
        });

        if (midiaResponse.data && Array.isArray(midiaResponse.data)) {
          const midiaPks = midiaResponse.data.map(item => item.new_pk);
          
          // Salvar os dados para controlar o estado do botão
          setPlanoMidia_pks(midiaPks);
          setCidadesSalvas([...cidadesSelecionadas]);
          
          alert(`Roteiro criado com sucesso!\n\nCidades: ${cidadesSelecionadas.map(c => c.nome_cidade).join(', ')}\nPlano Mídia Desc PKs: ${descPks.join(', ')}\nPlano Mídia PKs: ${midiaPks.join(', ')}`);
        } else {
          throw new Error('Erro na criação do plano mídia');
        }
      } else {
        throw new Error('Erro na criação do plano mídia desc');
      }
    } catch (error) {
      console.error('Erro ao salvar Aba 3:', error);
      alert('Erro ao criar roteiro com cidades. Tente novamente.');
    } finally {
      setSalvandoAba3(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Esta função não será mais utilizada, cada aba tem seu próprio botão salvar
  };



  return (
    <>
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
                { label: "Criar roteiro", path: "/criar-roteiro" },
                { label: "Nomear roteiro" }
              ]
            }}
          />
          <div
            className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
          />
          
          {/* Conteúdo principal */}
          <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
            {/* Header da seção */}
            <div className="bg-white px-16 py-12">
              <h1 className="text-base font-bold text-[#ff4600] tracking-[0.50px] leading-[19.2px] mb-8">
                CRIAR ROTEIRO
              </h1>
              
              <p className="text-base text-[#3a3a3a] tracking-[0.50px] leading-[19.2px] mb-16 max-w-[1135px]">
                Nesta seção, é possível criar novos roteiros na Colmeia. Complete as etapas a seguir para finalizar a configuração.
              </p>

              {/* Tipo de roteiro */}
              <div className="w-[500px] mb-8">
                <label className="block text-base text-[#3a3a3a] mb-2">
                  Tipo de roteiro
                </label>
                <div className="relative">
                  <select
                    value={tipoRoteiro}
                    onChange={(e) => setTipoRoteiro(e.target.value)}
                    className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                  >
                    <option value="">Selecione qual tipo do roteiro irá criar</option>
                    <option value="campanha">Campanha</option>
                    <option value="roteiro">Roteiro</option>
                    <option value="planejamento">Planejamento</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador de progresso - Tabs */}
            <div className="px-16 mb-8">
              <div className="flex items-center">
                {/* Aba 01 - Nomear roteiro */}
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 1 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => setAbaAtiva(1)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 1 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>01</span>
                  <span className={`font-medium ${abaAtiva === 1 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Nomear roteiro</span>
                  {abaAtiva === 1 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                {/* Aba 02 - Configurar target */}
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 2 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => setAbaAtiva(2)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 2 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>02</span>
                  <span className={`font-medium ${abaAtiva === 2 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Configurar target</span>
                  {abaAtiva === 2 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                {/* Aba 03 - Configurar praça */}
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 3 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => setAbaAtiva(3)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 3 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>03</span>
                  <span className={`font-medium ${abaAtiva === 3 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Configurar praça</span>
                  {abaAtiva === 3 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                <div className="flex items-center text-[#3a3a3a] mr-8">
                  <span className="font-bold text-sm mr-2">04</span>
                  <span>Definir vias públicas</span>
                </div>
                
                <div className="flex items-center text-[#3a3a3a] mr-8">
                  <span className="font-bold text-sm mr-2">05</span>
                  <span>Definir indoor</span>
                </div>
                
                <div className="flex items-center text-[#3a3a3a]">
                  <span className="font-bold text-sm mr-2">06</span>
                  <span>Resultados</span>
                </div>
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="px-16 pb-20">
              {/* Aba 1 - Nomear roteiro */}
              {abaAtiva === 1 && (
                <>
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-[#ff4600] mb-2">
                      CRIAR ROTEIRO
                    </h2>
                    <p className="text-sm text-[#3a3a3a] mb-6">
                      Nesta seção, é possível criar novos roteiros na Colmeia. Complete as etapas a seguir para finalizar a configuração.
                    </p>
                    
                    {/* Tipo de roteiro */}
                    <div className="mb-6">
                      <label className="block text-base text-[#3a3a3a] mb-2">
                        Tipo de roteiro
                      </label>
                      <div className="relative w-[500px]">
                        <select
                          value={tipoRoteiro}
                          onChange={(e) => setTipoRoteiro(e.target.value)}
                          className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                        >
                          <option value="">Selecione qual tipo do roteiro irá criar</option>
                          <option value="outdoor">Outdoor</option>
                          <option value="indoor">Indoor</option>
                          <option value="misto">Misto</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Cadastre os dados do seu novo roteiro
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-8">
                      {/* Coluna esquerda */}
                      <div className="space-y-8">
                        {/* Nome do roteiro */}
                        <div className="w-[500px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Nome do roteiro
                          </label>
                          <input
                            type="text"
                            value={nomeRoteiro}
                            onChange={(e) => setNomeRoteiro(e.target.value)}
                            placeholder="Ex.: J6574_carnaval_sao_paulo"
                            className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal"
                          />
                        </div>

                        {/* Agência */}
                        <div className="w-[430px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Agência
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <select
                                value={agencia}
                                onChange={(e) => setAgencia(e.target.value)}
                                className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                                disabled={loadingAgencias}
                              >
                                <option value="">
                                  {loadingAgencias ? "Carregando..." : "Ex.: Agência GUT"}
                                </option>
                                {agencias.map((ag) => (
                                  <option key={ag.id_agencia} value={ag.nome_agencia}>
                                    {ag.nome_agencia}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              className="w-[50px] h-[50px] bg-[#ff4600] text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Valor da campanha */}
                        <div className="w-[500px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Valor aprovado da campanha (R$)
                          </label>
                          <input
                            type="text"
                            value={valorCampanha}
                            onChange={(e) => setValorCampanha(e.target.value)}
                            placeholder="Ex.: R$ 10.000,00"
                            className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal"
                          />
                        </div>
                      </div>

                      {/* Coluna direita */}
                      <div className="space-y-8">
                        {/* Marca */}
                        <div className="w-[430px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Marca
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <select
                                value={marca}
                                onChange={(e) => setMarca(e.target.value)}
                                className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                                disabled={loadingMarcas}
                              >
                                <option value="">
                                  {loadingMarcas ? "Carregando..." : "Ex.: Ambev"}
                                </option>
                                {marcas.map((m) => (
                                  <option key={m.id_marca} value={m.nome_marca}>
                                    {m.nome_marca}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              className="w-[50px] h-[50px] bg-[#ff4600] text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Categoria */}
                        <div className="w-[430px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Categoria
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <select
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value)}
                                className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                                disabled={loadingCategorias}
                              >
                                <option value="">
                                  {loadingCategorias ? "Carregando..." : "Ex.: Bebidas"}
                                </option>
                                {categorias.map((c) => (
                                  <option key={c.id_categoria} value={c.nome_categoria}>
                                    {c.nome_categoria}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              className="w-[50px] h-[50px] bg-[#ff4600] text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <div className="mt-16 flex justify-start">
                      <button
                        type="button"
                        onClick={salvarAba1}
                        disabled={salvandoAba1 || !nomeRoteiro.trim()}
                        className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${
                          salvandoAba1 || !nomeRoteiro.trim()
                            ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                            : planoMidiaGrupo_pk
                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                            : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                        }`}
                      >
                        {salvandoAba1 ? 'Salvando...' : planoMidiaGrupo_pk ? '✓ Salvo' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Aba 2 - Configurar target */}
              {abaAtiva === 2 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Defina o target que fará parte do seu roteiro
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-3 gap-8">
                      {/* Gênero */}
                      <div className="w-full">
                        <label className="block text-base text-[#3a3a3a] mb-2">
                          Gênero
                        </label>
                        <div className="relative">
                          <select
                            value={genero}
                            onChange={(e) => setGenero(e.target.value)}
                            className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                            disabled={loadingGeneros}
                          >
                            <option value="">
                              {loadingGeneros ? "Carregando..." : "Selecione um gênero"}
                            </option>
                            {generos.map((g, index) => (
                              <option key={index} value={g.gender}>
                                {g.gender}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Classe */}
                      <div className="w-full">
                        <label className="block text-base text-[#3a3a3a] mb-2">
                          Classe
                        </label>
                        <div className="relative">
                          <select
                            value={classe}
                            onChange={(e) => setClasse(e.target.value)}
                            className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                            disabled={loadingClasses}
                          >
                            <option value="">
                              {loadingClasses ? "Carregando..." : "Selecione uma classe"}
                            </option>
                            {classes.map((c, index) => (
                              <option key={index} value={c.class}>
                                {c.class}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Faixa etária */}
                      <div className="w-full">
                        <label className="block text-base text-[#3a3a3a] mb-2">
                          Faixa etária
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <select
                              value={faixaEtaria}
                              onChange={(e) => setFaixaEtaria(e.target.value)}
                              className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                              disabled={loadingFaixasEtarias}
                            >
                              <option value="">
                                {loadingFaixasEtarias ? "Carregando..." : "Selecione uma faixa etária"}
                              </option>
                              {faixasEtarias.map((f, index) => (
                                <option key={index} value={f.age}>
                                  {f.age}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            className="w-[50px] h-[50px] bg-[#ff4600] text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <div className="mt-16 flex justify-start">
                      <button
                        type="button"
                        onClick={salvarAba2}
                        disabled={salvandoAba2 || !planoMidiaGrupo_pk || !genero || !classe || !faixaEtaria}
                        className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${
                          salvandoAba2 || !planoMidiaGrupo_pk || !genero || !classe || !faixaEtaria
                            ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                            : planoMidiaDesc_pks.length > 0
                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                            : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                        }`}
                      >
                        {salvandoAba2 ? 'Salvando...' : planoMidiaDesc_pks.length > 0 ? '✓ Salvo' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Aba 3 - Configurar praça */}
              {abaAtiva === 3 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Defina as praças (cidade / estado) que estarão no seu roteiro.
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    {/* Campo de busca de cidades */}
                    <div className="mb-8">
                      <label className="block text-base text-[#3a3a3a] mb-2">
                        Digite o nome da praça
                      </label>
                      <div className="relative w-[600px] cidade-dropdown-container">
                        <input
                          type="text"
                          value={searchPraca}
                          onChange={(e) => {
                            setSearchPraca(e.target.value);
                            setShowDropdownCidades(e.target.value.length > 0);
                          }}
                          onFocus={() => setShowDropdownCidades(searchPraca.length > 0)}
                          placeholder="Ex.: Sorocaba - SP"
                          className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal"
                          disabled={loadingCidades}
                        />
                        
                        {/* Tags de cidades selecionadas */}
                        <div className="absolute right-12 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                          {cidadesSelecionadas.slice(-2).map((cidade) => (
                            <div
                              key={cidade.id_cidade}
                              className="flex items-center bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                            >
                              <span className="mr-1 font-bold">
                                {cidade.nome_cidade.charAt(0).toUpperCase()}
                              </span>
                              <span className="mr-1 font-bold">
                                {cidade.nome_estado.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {cidadesSelecionadas.length > 2 && (
                            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              +{cidadesSelecionadas.length - 2}
                            </div>
                          )}
                        </div>

                        {/* Dropdown de cidades */}
                        {showDropdownCidades && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-[#d9d9d9] rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 mt-1">
                            {loadingCidades ? (
                              <div className="p-4 text-center text-[#b3b3b3]">
                                Carregando cidades...
                              </div>
                            ) : cidadesFiltradas.length > 0 ? (
                              cidadesFiltradas.slice(0, 10).map((cidade) => (
                                <div
                                  key={cidade.id_cidade}
                                  onClick={() => handleSelecionarCidade(cidade)}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="text-[#3a3a3a]">
                                    {cidade.nome_cidade} - {cidade.nome_estado}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-[#b3b3b3]">
                                Nenhuma cidade encontrada
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lista de cidades selecionadas */}
                    {cidadesSelecionadas.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-sm font-medium text-[#3a3a3a] mb-4">
                          Cidades selecionadas ({cidadesSelecionadas.length}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {cidadesSelecionadas.map((cidade) => (
                            <div
                              key={cidade.id_cidade}
                              className="flex items-center bg-gray-100 text-[#3a3a3a] px-3 py-1 rounded-full text-sm"
                            >
                              <span>{cidade.nome_cidade} - {cidade.nome_estado}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoverCidade(cidade.id_cidade)}
                                className="ml-2 text-red-500 hover:text-red-700 text-lg leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inventário das cidades selecionadas */}
                    {cidadesSelecionadas.length > 0 && (
                      <div className="mt-12">
                        <h4 className="text-base font-bold text-blue-600 mb-6 uppercase">
                          INVENTÁRIO CADASTRADO DA PRAÇA
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-8">
                          {cidadesSelecionadas.map((cidade) => {
                            const inventario = inventarioCidades[cidade.nome_cidade];
                            if (!inventario) return null;
                            
                            return (
                              <div key={cidade.id_cidade} className="mb-8">
                                <h5 className="text-sm font-bold text-[#3a3a3a] mb-4">
                                  • {cidade.nome_cidade}, {cidade.nome_estado}
                                </h5>
                                
                                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-600 text-white">
                                        <th className="px-3 py-2 text-left font-bold">Grupo</th>
                                        <th className="px-3 py-2 text-left font-bold">Descrição</th>
                                        <th className="px-3 py-2 text-right font-bold">Quantidade</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(inventario.grupos).map(([grupoKey, grupoData]: [string, any]) => 
                                        grupoData.subgrupos.map((subgrupo: any, index: number) => (
                                          <tr key={`${grupoKey}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium text-[#3a3a3a]">
                                              {subgrupo.codigo}
                                            </td>
                                            <td className="px-3 py-2 text-[#3a3a3a]">
                                              {subgrupo.descricao}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-[#3a3a3a]">
                                              {subgrupo.quantidade.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                      <tr className="bg-gray-500 text-white font-bold">
                                        <td className="px-3 py-2">TOTAL</td>
                                        <td className="px-3 py-2"></td>
                                        <td className="px-3 py-2 text-right">
                                          {inventario.total.toLocaleString()}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                
                                <div className="mt-3 flex justify-center">
                                  <button className="px-4 py-2 bg-gray-300 text-[#3a3a3a] text-xs rounded border border-gray-400 hover:bg-gray-400 transition-colors">
                                    Solicitar revisão de inventário
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Botão Salvar */}
                    <div className="mt-16 flex justify-start">
                      <button
                        type="button"
                        onClick={salvarAba3}
                        disabled={salvandoAba3 || planoMidiaDesc_pks.length === 0 || cidadesSelecionadas.length === 0}
                        className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base font-medium ${
                          salvandoAba3 || planoMidiaDesc_pks.length === 0 || cidadesSelecionadas.length === 0
                            ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                            : planoMidia_pks.length > 0 && !cidadesMudaram()
                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                            : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                        }`}
                      >
                        {salvandoAba3 ? 'Salvando...' : planoMidia_pks.length > 0 && !cidadesMudaram() ? '✓ Salvo' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer padrão */}
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </>
  );
};
