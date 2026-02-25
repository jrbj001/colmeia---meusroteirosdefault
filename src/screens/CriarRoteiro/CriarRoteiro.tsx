import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../../config/axios";
import * as XLSX from "xlsx";
import { useRoteiroStatusPolling } from "../../hooks/useRoteiroStatusPolling";
import { ProcessingResultsLoader } from "../../components/ProcessingResultsLoader/ProcessingResultsLoader";
import { AppleSaveLoader } from "../../components/AppleSaveLoader/AppleSaveLoader";
import { Modal } from "../../components/Modal/Modal";
import { ModalAdicionarMarca } from "../../components/ModalAdicionarMarca/ModalAdicionarMarca";
import { ImportarPlanoMidia } from "../../components/ImportarPlanoMidia";
import { ImportarPlanoAba1 } from "../../components/ImportarPlanoAba1";
import type { ParsedPlanoRow } from "../../utils/parsePlanoOohExcel";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [menuReduzido, setMenuReduzido] = useState(false);
  
  // Estados para modo visualização
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [roteiroData, setRoteiroData] = useState<any>(null);
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
  
  // Estados para controle de abas preenchidas
  const [aba1Preenchida, setAba1Preenchida] = useState(false);
  const [aba2Preenchida, setAba2Preenchida] = useState(false);
  const [aba3Preenchida, setAba3Preenchida] = useState(false);
  const [aba4Preenchida, setAba4Preenchida] = useState(false);
  
  // Estados para aba 6 - Resultados
  const [dadosResultados, setDadosResultados] = useState<any[]>([]);
  const [totaisResultados, setTotaisResultados] = useState<any>(null);
  const [aba6Habilitada, setAba6Habilitada] = useState(false);
  
  // Estados para visão semanal
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'geral' | 'praca'>('geral');
  const [dadosSemanais, setDadosSemanais] = useState<any[]>([]);
  const [dadosSemanaisSummary, setDadosSemanaisSummary] = useState<any[]>([]);
  
  // Estados para dados de target
  const [dadosTarget, setDadosTarget] = useState<any[]>([]);
  const [totaisTarget, setTotaisTarget] = useState<any>(null);
  const [dadosSemanaisTarget, setDadosSemanaisTarget] = useState<any[]>([]);
  const [dadosSemanaisTargetSummary, setDadosSemanaisTargetSummary] = useState<any[]>([]);
  const [carregandoSemanaisTarget, setCarregandoSemanaisTarget] = useState(false);
  
  // Estado unificado de loading para dados prontos (não processamento)
  const [carregandoDadosGerais, setCarregandoDadosGerais] = useState(false);
  
  // Estados para Modal de avisos
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title?: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
  }>({
    message: '',
    type: 'info'
  });
  
  // Função helper para mostrar modal
  const mostrarModal = (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'warning', title?: string) => {
    setModalConfig({ message, type, title });
    setModalAberto(true);
  };
  
  // Estado para Modal de Adicionar Marca
  const [modalMarcaAberto, setModalMarcaAberto] = useState(false);
  
  // Função para lidar com sucesso ao adicionar marca
  const handleMarcaAdicionada = (novaMarca: { id_marca: number; nome_marca: string }) => {
    console.log('✅ Nova marca adicionada:', novaMarca);
    
    // Adicionar a nova marca à lista existente
    setMarcas(prev => {
      const novaLista = [...prev, novaMarca].sort((a, b) => 
        a.nome_marca.localeCompare(b.nome_marca)
      );
      return novaLista;
    });
    
    // Selecionar automaticamente a marca recém-criada
    setMarca(novaMarca.nome_marca);
    
    // Mostrar mensagem de sucesso
    mostrarModal(`Marca "${novaMarca.nome_marca}" adicionada com sucesso!`, 'success');
  };
  
  // Estados para controle de processamento em background
  const [aguardandoProcessamento, setAguardandoProcessamento] = useState(false);
  const [planoMidiaGrupo_pk, setPlanoMidiaGrupo_pk] = useState<number | null>(null);

  // Hook de polling para verificar status do processamento
  // ✅ Usa dataCriacao do banco como timestamp - sempre consistente!
  const { isProcessing, tempoDecorrido } = useRoteiroStatusPolling({
    roteiroPk: planoMidiaGrupo_pk,
    enabled: aguardandoProcessamento, // Polling funciona em background
    onComplete: () => {
      console.log('✅ Processamento concluído! Carregando resultados...');
      setAguardandoProcessamento(false);
      if (planoMidiaGrupo_pk) {
        carregarDadosResultados(planoMidiaGrupo_pk);
      }
    },
    interval: 3000 // Verificar a cada 3 segundos
  });

  // Debug: Monitorar mudanças no tempoDecorrido
  useEffect(() => {
    console.log('🕐 CriarRoteiro - tempoDecorrido atualizado para:', tempoDecorrido, 'segundos');
    console.log('📍 aguardandoProcessamento:', aguardandoProcessamento);
    console.log('📍 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
  }, [tempoDecorrido, aguardandoProcessamento, planoMidiaGrupo_pk]);

  // Detectar modo visualização e carregar dados
  useEffect(() => {
    if (location.state?.modoVisualizacao && location.state?.roteiroData) {
      console.log('👁️ Modo visualização detectado:', location.state.roteiroData);
      setModoVisualizacao(true);
      setRoteiroData(location.state.roteiroData);
      
      // Carregar dados do roteiro
      const roteiro = location.state.roteiroData;
      console.log('👁️ Dados do roteiro recebidos:', roteiro);
      
      // Carregar dados básicos disponíveis
      setNomeRoteiro(roteiro.planoMidiaGrupo_st || '');
      setGenero(roteiro.gender_st || '');
      setClasse(roteiro.class_st || '');
      setFaixaEtaria(roteiro.age_st || '');
      
      // Carregar semanas para o período da campanha
      if (roteiro.semanasMax_vl) {
        setSemanasUnicas(Array.from({length: roteiro.semanasMax_vl}, (_, i) => `Semana ${i + 1}`));
      }
      
      // Campos que não estão disponíveis - deixar vazios
      setAgencia('');
      setMarca('');
      setCategoria('');
      setValorCampanha('');
      
      // Buscar dados completos usando a PK (apenas para dados adicionais se necessário)
      if (roteiro.planoMidiaGrupo_pk) {
        carregarDadosCompletosRoteiro(roteiro.planoMidiaGrupo_pk);
      }
      
      // Ir direto para a Aba 6
      if (location.state.abaInicial === 6) {
        console.log('🎯 Configurando Aba 6...');
        setAbaAtiva(6);
        setAba6Habilitada(true);
        
        // Carregar dados dos resultados
        if (roteiro.planoMidiaGrupo_pk) {
          console.log('📊 Definindo planoMidiaGrupo_pk:', roteiro.planoMidiaGrupo_pk);
          setPlanoMidiaGrupo_pk(roteiro.planoMidiaGrupo_pk);
          
          // Verificar se está em processamento
          if (roteiro.inProgress_bl === 1) {
            console.log('⏳ Roteiro em processamento. Ativando polling...');
            setAguardandoProcessamento(true);
          } else {
            console.log('✅ Roteiro finalizado. Carregando dados...');
            carregarDadosResultados(roteiro.planoMidiaGrupo_pk);
          }
        } else {
          console.log('⚠️ planoMidiaGrupo_pk não encontrado no roteiro');
        }
      }
    }
  }, [location.state]);

  // useEffect removido - não é mais necessário forçar re-render
  // O estado unificado carregandoDadosGerais é gerenciado pela função carregarDadosResultados

  // Verificar status e carregar dados ao entrar na Aba 6
  useEffect(() => {
    if (abaAtiva === 6 && aba6Habilitada && planoMidiaGrupo_pk && !modoVisualizacao) {
      // Verificar se já tem dados carregados ou se está em algum processo
      // ✅ IMPORTANTE: NÃO verificar status se JÁ ESTÁ aguardando processamento
      // Isso evita resetar o polling quando volta para a aba
      if (dadosResultados.length === 0 && !aguardandoProcessamento && !carregandoDadosGerais) {
        console.log('📊 Entrando na Aba 6 sem dados e sem processamento ativo. Verificando status do roteiro...');
        verificarStatusECarregarDados();
      } else if (aguardandoProcessamento) {
        console.log('⏳ Retornando para Aba 6 com processamento JÁ EM ANDAMENTO. Continuando polling...');
        // Não fazer nada - o polling já está ativo em background
      }
    }
  }, [abaAtiva, aba6Habilitada, planoMidiaGrupo_pk]);

  
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
  const [planoMidiaDesc_pks, setPlanoMidiaDesc_pks] = useState<number[]>([]);
  const [planoMidia_pks, setPlanoMidia_pks] = useState<number[]>([]);
  
  // Estados para salvamento local do target (sem tocar na base)
  const [targetSalvoLocal, setTargetSalvoLocal] = useState<{
    genero: string;
    classe: string;
    faixaEtaria: string;
    salvo: boolean;
  } | null>(null);
  const [salvandoAba1, setSalvandoAba1] = useState(false);
  const [salvandoAba2, setSalvandoAba2] = useState(false);
  const [salvandoAba3, setSalvandoAba3] = useState(false);
  const [salvandoAba4, setSalvandoAba4] = useState(false);
  const [roteiroSimuladoSalvo, setRoteiroSimuladoSalvo] = useState(false);
  
  // Estados para loading Apple do roteiro simulado
  const [showAppleLoader, setShowAppleLoader] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveSteps, setSaveSteps] = useState<Array<{
    id: string;
    label: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    detail?: string;
  }>>([]);
  
  // 📊 LOADING EM TEMPO REAL - Aba 4
  const [loadingAba4, setLoadingAba4] = useState({
    etapa: '',
    progresso: 0,
    detalhes: '',
    tempoInicio: null as Date | null,
    ativo: false
  });

  // Estados para controle específico do Banco de Ativos
  const [bancoAtivosStatus, setBancoAtivosStatus] = useState({
    ativo: false,
    etapa: '',
    coordenadasProcessadas: 0,
    coordenadasTotal: 0,
    lotesProcessados: 0,
    lotesTotal: 0,
    sucessos: 0,
    falhas: 0,
    tempoInicio: null as Date | null,
    detalhes: '',
    modoProcessamento: '',
    taxaSucesso: 0
  });
  const [cidadesSalvas, setCidadesSalvas] = useState<Cidade[]>([]);
  
  // Estados para Aba 4 - Definir vias públicas
  const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
  const [roteirosCarregados, setRoteirosCarregados] = useState<any[]>([]);
  const [roteirosSalvos, setRoteirosSalvos] = useState<any[]>([]);
  const [uploadRoteiros_pks, setUploadRoteiros_pks] = useState<number[]>([]);
  const [processandoExcel, setProcessandoExcel] = useState(false);
  const [mensagemProcessamento, setMensagemProcessamento] = useState<string>('');
  
  // Estados para Roteiro Simulado
  const [modoSimulado, setModoSimulado] = useState<'manual' | 'importar'>('manual');
  const [importPlanoData, setImportPlanoData] = useState<{ records: ParsedPlanoRow[]; filename: string } | null>(null);
  const [pracasSelecionadasSimulado, setPracasSelecionadasSimulado] = useState<any[]>([]);
  const [quantidadeSemanas, setQuantidadeSemanas] = useState<number>(12);
  const [tabelaSimulado, setTabelaSimulado] = useState<Record<number, any[]>>({}); // Objeto: id_cidade -> array de linhas
  
  // Estados para o novo fluxo pós-upload
  const [uploadCompleto, setUploadCompleto] = useState(false);
  const [dadosUpload, setDadosUpload] = useState<{pk: number, date_dh: string} | null>(null);
  const [dadosPlanoMidia, setDadosPlanoMidia] = useState<any[]>([]);
  const [processandoFluxoCompleto, setProcessandoFluxoCompleto] = useState(false);
  
  // Estados para as tabelas dinâmicas de vias públicas
  const [dadosMatrix, setDadosMatrix] = useState<any[]>([]);
  const [dadosMatrixRow, setDadosMatrixRow] = useState<any[]>([]);
  const [dadosSubGrupos, setDadosSubGrupos] = useState<any[]>([]);
  const [semanasUnicas, setSemanasUnicas] = useState<string[]>([]);
  const [pracasUnicas, setPracasUnicas] = useState<{praca: string, uf: string}[]>([]);
  const [carregandoDadosMatrix, setCarregandoDadosMatrix] = useState(false);

  // useEffect removido - as tabelas serão carregadas apenas após salvar os dados

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

        // Ordenar alfabeticamente
        const agenciasOrdenadas = [...agenciasRes.data].sort((a, b) => 
          (a.agencia_st || '').localeCompare(b.agencia_st || '', 'pt-BR')
        );
        const marcasOrdenadas = [...marcasRes.data].sort((a, b) => 
          (a.marca_st || '').localeCompare(b.marca_st || '', 'pt-BR')
        );
        const categoriasOrdenadas = [...categoriasRes.data].sort((a, b) => 
          (a.categoria_st || '').localeCompare(b.categoria_st || '', 'pt-BR')
        );

        setAgencias(agenciasOrdenadas);
        setMarcas(marcasOrdenadas);
        setCategorias(categoriasOrdenadas);
        
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

        // Ordenar alfabeticamente
        const generosOrdenados = [...generosRes.data].sort((a, b) => 
          (a.gender || '').localeCompare(b.gender || '', 'pt-BR')
        );
        const classesOrdenadas = [...classesRes.data].sort((a, b) => 
          (a.class || '').localeCompare(b.class || '', 'pt-BR')
        );
        const faixasOrdenadas = [...faixasEtariasRes.data].sort((a, b) => 
          (a.age || '').localeCompare(b.age || '', 'pt-BR')
        );

        setGeneros(generosOrdenados);
        setClasses(classesOrdenadas);
        setFaixasEtarias(faixasOrdenadas);
        
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


  // Função para gerar estrutura da tabela simulada
  const gerarTabelaSimulado = async (semanas: number) => {
    try {
      console.log('🏗️ Gerando tabelas simuladas por praça...', { cidadesSalvas, semanas });
      
      if (cidadesSalvas.length === 0) {
        alert('Configure as praças na Aba 3 primeiro');
        return;
      }
      
      // Objeto para armazenar tabelas por praça: id_cidade -> array de linhas
      const tabelasPorPraca: Record<number, any[]> = {};
      
      // Gerar uma tabela separada para cada praça configurada na Aba 3
      for (const praca of cidadesSalvas) {
        try {
          const estruturaTabela: any[] = [];
          
          const inventarioResponse = await axios.get(`/inventario-cidade?cidade=${encodeURIComponent(praca.nome_cidade)}`);
          
          if (!inventarioResponse.data.grupos) {
            console.warn(`⚠️ Nenhum inventário encontrado para ${praca.nome_cidade}`);
            continue;
          }
          
          // Filtrar grupos diretamente do inventário (igual Aba 3)
          const gruposFiltrados = Object.entries(inventarioResponse.data.grupos)
            .filter(([grupoKey]) => !grupoKey.toUpperCase().startsWith('P'));
          
          console.log(`📊 Grupos filtrados do inventário de ${praca.nome_cidade}:`, gruposFiltrados.map(([k]) => k));
          
          // Processar grupos do inventário desta praça
          gruposFiltrados.forEach(([grupoKey, grupoData]: [string, any]) => {
            grupoData.subgrupos.forEach((subgrupo: any) => {
              // Criar array de semanas com valores vazios
              const semanasArray = Array.from({length: semanas}, (_, i) => ({
                semana: i + 1,
                insercaoComprada: 0,
                insercaoOferecida: 0,
                seDigitalInsercoes_vl: 0,
                seDigitalMaximoInsercoes_vl: 0
              }));
              
              estruturaTabela.push({
                grupo_st: grupoKey,
                grupoSub_st: subgrupo.codigo,
                grupoDesc_st: subgrupo.descricao,
                estaticoDigital_st: subgrupo.estaticoDigital_st || 'E', // 'D' = Digital, 'E' = Estático
                visibilidade: '100', // Valor padrão - Alta
                // Campos da BaseCalculadora para configuração geral
                seDigitalInsercoes_vl: 0, // Digital Inserções
                seDigitalMaximoInsercoes_vl: 0, // Digital Máx. Inserções
                quantidade: subgrupo.quantidade || 0, // Total de Ativos
                // Array de semanas
                semanas: semanasArray
              });
            });
          });
          
          // Armazenar tabela desta praça - garantir que usamos número como chave
          const idPraca = Number(praca.id_cidade);
          tabelasPorPraca[idPraca] = estruturaTabela;
          console.log(`✅ Tabela gerada para ${praca.nome_cidade}: ${estruturaTabela.length} subgrupos`);
          console.log(`✅ Tabela salva com chave ID: ${idPraca} (tipo: ${typeof idPraca})`);
        } catch (error) {
          console.error(`❌ Erro ao buscar inventário de ${praca.nome_cidade}:`, error);
          // Continuar com outras praças mesmo se uma falhar
        }
      }
      
      if (Object.keys(tabelasPorPraca).length === 0) {
        alert('Nenhum inventário encontrado para as praças selecionadas');
        return;
      }
        
      setTabelaSimulado(tabelasPorPraca);
      const totalSubgrupos = Object.values(tabelasPorPraca).reduce((sum, tabela) => sum + tabela.length, 0);
      console.log(`✅ ${Object.keys(tabelasPorPraca).length} tabela(s) simulada(s) gerada(s): ${totalSubgrupos} subgrupos no total`);
    } catch (error) {
      console.error('❌ Erro ao gerar tabelas simuladas:', error);
      alert('Erro ao gerar estrutura das tabelas. Tente novamente.');
    }
  };

  // Nomes de praça pendentes de match (salvos ao fazer upload antes de cidades carregar)
  const [pendingPracaNomes, setPendingPracaNomes] = React.useState<string[]>([]);

  // Quando cidades carrega (ou muda) e há nomes pendentes, resolve o match
  React.useEffect(() => {
    if (!pendingPracaNomes.length || !cidades.length) return;
    const normalizeName = (s: string) =>
      s.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectadas = pendingPracaNomes
      .map((nome) => cidades.find((c) => normalizeName(c.nome_cidade) === normalizeName(nome)))
      .filter((c): c is typeof cidades[0] => c !== undefined);
    if (detectadas.length > 0) {
      setCidadesSelecionadas(detectadas);
      setCidadesSalvas(detectadas);
      setAba3Preenchida(true);
    }
    setPendingPracaNomes([]);
  }, [cidades, pendingPracaNomes]);

  // Callback do ImportarPlanoMidia/ImportarPlanoAba1: popula Aba 3 com as praças detectadas no Excel
  const handlePracasDetectadas = (pracaNomes: string[]) => {
    if (!pracaNomes.length) return;
    if (!cidades.length) {
      setPendingPracaNomes(pracaNomes);
      return;
    }
    const normalizeName = (s: string) =>
      s.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectadas = pracaNomes
      .map((nome) => cidades.find((c) => normalizeName(c.nome_cidade) === normalizeName(nome)))
      .filter((c): c is typeof cidades[0] => c !== undefined);
    if (detectadas.length > 0) {
      setCidadesSelecionadas(detectadas);
      setCidadesSalvas(detectadas);
      setAba3Preenchida(true);
    }
  };

  // Callback do ImportarPlanoAba1: armazena dados parseados e preenche Aba 1/3
  const handleDataParsedImport = (data: {
    records: ParsedPlanoRow[];
    filename: string;
    campanhaSuggestion: string;
    valorTotalSuggestion: number;
  }) => {
    setImportPlanoData({ records: data.records, filename: data.filename });
    setModoSimulado('importar');
    if (!nomeRoteiro.trim() && data.campanhaSuggestion) setNomeRoteiro(data.campanhaSuggestion);
    if ((!valorCampanha || valorCampanha === 'R$ 0,00') && data.valorTotalSuggestion > 0) {
      setValorCampanha(
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.valorTotalSuggestion)
      );
    }
  };

  // Callback do ImportarPlanoMidia: navega para Aba 6 após importação
  const handleImportacaoCompleta = (_planoMidiaImportFile_pk: number | null) => {
    setAba6Habilitada(true);
    setAbaAtiva(6);
  };

  // Função para salvar roteiro simulado
  const salvarRoteiroSimulado = async () => {
    try {
      setSalvandoAba4(true);
      setShowAppleLoader(true);
      setSaveProgress(0);
      
      // Inicializar etapas
      const initialSteps = [
        { id: 'validacao', label: 'Validando dados', status: 'processing' as const, detail: 'Verificando configurações' },
        { id: 'criar-pks', label: 'Criando registros', status: 'pending' as const, detail: `${cidadesSalvas.length} praça(s)` },
        { id: 'salvar-dados', label: 'Salvando dados das praças', status: 'pending' as const, detail: 'Processando vias públicas' },
        { id: 'databricks', label: 'Processamento Databricks', status: 'pending' as const, detail: 'Gerando resultados' },
        { id: 'finalizar', label: 'Finalizando', status: 'pending' as const, detail: 'Concluindo salvamento' }
      ];
      setSaveSteps(initialSteps);
      
      console.log('🚀 Iniciando salvamento do roteiro simulado...');
      
      // Validações básicas
      if (!planoMidiaGrupo_pk) {
        mostrarModal('Preencha os dados básicos do seu roteiro antes de continuar.', 'warning', 'Complete a primeira etapa');
        setSalvandoAba4(false);
        setShowAppleLoader(false);
        return;
      }

      if (!targetSalvoLocal?.salvo) {
        mostrarModal('Defina o público-alvo do seu plano antes de prosseguir.', 'warning', 'Configure o target');
        setSalvandoAba4(false);
        setShowAppleLoader(false);
        return;
      }

      if (cidadesSalvas.length === 0) {
        mostrarModal('Selecione pelo menos uma cidade para o seu roteiro.', 'warning', 'Escolha as praças');
        setSalvandoAba4(false);
        setShowAppleLoader(false);
        return;
      }

      if (Object.keys(tabelaSimulado).length === 0) {
        mostrarModal('Gere a tabela de vias públicas antes de salvar.', 'warning', 'Tabela não gerada');
        setSalvandoAba4(false);
        setShowAppleLoader(false);
        return;
      }

      // Verificar se todas as praças configuradas têm tabela (usando número como chave)
      const pracasSemTabela = cidadesSalvas.filter(p => {
        const idPraca = Number(p.id_cidade);
        const tabela = tabelaSimulado[idPraca] || tabelaSimulado[p.id_cidade as any];
        return !tabela || tabela.length === 0;
      });
      if (pracasSemTabela.length > 0) {
        alert(`As seguintes praças não possuem tabela configurada: ${pracasSemTabela.map(p => p.nome_cidade).join(', ')}`);
        setSalvandoAba4(false);
        setShowAppleLoader(false);
        return;
      }
      
      // Validação concluída
      setSaveSteps(prev => prev.map(step => 
        step.id === 'validacao' ? { ...step, status: 'completed' as const } : step
      ));
      setSaveProgress(10);

      console.log('📊 Total de semanas configuradas:', quantidadeSemanas);
      console.log('📊 Total de praças configuradas:', cidadesSalvas.length);
      console.log('📊 Praças configuradas:', cidadesSalvas.map(p => `${p.nome_cidade} (ID: ${p.id_cidade}, tipo: ${typeof p.id_cidade})`).join(', '));
      console.log('📊 Tabelas disponíveis:', Object.keys(tabelaSimulado).map(id => `ID ${id} (tipo: ${typeof id})`).join(', '));
      
      // Validar correspondência entre IDs das praças e tabelas
      cidadesSalvas.forEach(praca => {
        const idNumero = Number(praca.id_cidade);
        const idString = String(praca.id_cidade);
        const tabelaPorNumero = tabelaSimulado[idNumero];
        const tabelaPorString = tabelaSimulado[idString];
        const tabelaPorIdOriginal = tabelaSimulado[praca.id_cidade as any];
        
        console.log(`🔍 Validação para ${praca.nome_cidade}:`);
        console.log(`  - ID original: ${praca.id_cidade} (${typeof praca.id_cidade})`);
        console.log(`  - Tabela por número (${idNumero}): ${tabelaPorNumero ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`);
        console.log(`  - Tabela por string (${idString}): ${tabelaPorString ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`);
        console.log(`  - Tabela por ID original: ${tabelaPorIdOriginal ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`);
      });

      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      const planosMidiaDescPk: number[] = [];
      const resultadosPraças: any[] = [];
      const errosPraças: any[] = [];

      console.log(`🔄 ETAPA 1: Criando planoMidiaDesc_pk para ${cidadesSalvas.length} praça(s) em UMA ÚNICA CHAMADA...`);
      console.log(`🔄 Lista de praças a processar:`, cidadesSalvas.map((p, idx) => `${idx + 1}. ${p.nome_cidade} (ID: ${p.id_cidade})`).join('\n'));

      // Atualizar etapa: Criar PKs
      setSaveSteps(prev => prev.map(step => 
        step.id === 'criar-pks' ? { ...step, status: 'processing' as const } : step
      ));
      setSaveProgress(15);

      // ETAPA 1: Preparar recordsJson com TODAS as cidades
      const allRecordsJson: any[] = [];
      const pracasComIbge: any[] = [];
      
      for (let i = 0; i < cidadesSalvas.length; i++) {
        const praca = cidadesSalvas[i];
        console.log(`\n📍 ===== INICIANDO PROCESSAMENTO DA PRAÇA ${i + 1}/${cidadesSalvas.length} =====`);
        console.log(`📍 Nome: ${praca.nome_cidade} - ${praca.nome_estado}`);
        console.log(`📍 ID Cidade: ${praca.id_cidade}`);
        console.log(`📍 Praça completa:`, JSON.stringify(praca));
        
        try {
          const cidadeFormatada = (praca.nome_cidade || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          
          // Buscar código IBGE correto por nome da cidade
          let ibgeCode = praca.id_cidade; // Fallback
          
          try {
            const ibgeResponse = await axios.post('/cidades-ibge', {
              cidade_st: praca.nome_cidade,
              estado_st: praca.nome_estado
            });
            
            if (ibgeResponse.data.success && ibgeResponse.data.ibgeCode) {
              ibgeCode = ibgeResponse.data.ibgeCode;
              console.log(`✅ IBGE Code encontrado: ${ibgeCode} para ${praca.nome_cidade}`);
            } else {
              console.warn(`⚠️ IBGE Code não encontrado, usando id_cidade: ${ibgeCode}`);
            }
          } catch (error: any) {
            console.warn(`⚠️ Erro ao buscar IBGE Code, usando id_cidade: ${ibgeCode}`, error.response?.data || error.message);
            
            // Se for erro 400 (múltiplas cidades), tentar novamente
            if (error.response?.status === 400 && error.response?.data?.error?.includes('Múltiplas cidades')) {
              try {
                const retryResponse = await axios.post('/cidades-ibge', {
                  cidade_st: praca.nome_cidade,
                  estado_st: praca.nome_estado
                });
                
                if (retryResponse.data.success && retryResponse.data.ibgeCode) {
                  ibgeCode = retryResponse.data.ibgeCode;
                  console.log(`✅ IBGE Code encontrado na segunda tentativa: ${ibgeCode}`);
                }
              } catch (retryError: any) {
                console.warn(`⚠️ Erro na segunda tentativa:`, retryError.response?.data || retryError.message);
              }
            }
          }
          
          // Adicionar ao array de todas as cidades
          allRecordsJson.push({
            planoMidiaDesc_st: `${planoMidiaGrupo_st}_${cidadeFormatada}`,
            usuarioId_st: user?.id || '',
            usuarioName_st: user?.name || '',
            gender_st: targetSalvoLocal.genero,
            class_st: targetSalvoLocal.classe,
            age_st: targetSalvoLocal.faixaEtaria,
            ibgeCode_vl: ibgeCode
          });
          
          pracasComIbge.push({
            praca,
            ibgeCode,
            cidadeFormatada
          });
          
          console.log(`✅ Cidade ${praca.nome_cidade} preparada (IBGE: ${ibgeCode})`);
        } catch (error) {
          console.error(`❌ Erro ao preparar ${praca.nome_cidade}:`, error);
          errosPraças.push({
            praca,
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
      
      // ETAPA 2: Criar TODOS os planoMidiaDesc_pk em UMA ÚNICA CHAMADA
      if (allRecordsJson.length === 0) {
        throw new Error('Nenhuma cidade foi preparada com sucesso');
      }
      
      console.log(`\n📋 Criando ${allRecordsJson.length} planoMidiaDesc_pk em UMA ÚNICA CHAMADA...`);
      console.log(`📊 Records JSON:`, JSON.stringify(allRecordsJson, null, 2));

      const descResponse = await axios.post('/plano-midia-desc', {
        planoMidiaGrupo_pk,
        recordsJson: allRecordsJson  // ← TODAS AS CIDADES DE UMA VEZ!
      });

      if (!descResponse.data || !Array.isArray(descResponse.data) || descResponse.data.length === 0) {
        throw new Error(`Erro ao criar planoMidiaDesc_pk`);
      }

      // Armazenar todos os PKs criados
      descResponse.data.forEach((item: any, idx: number) => {
        planosMidiaDescPk.push(item.new_pk);
        console.log(`✅ planoMidiaDesc_pk criado para ${pracasComIbge[idx]?.praca.nome_cidade || `Cidade ${idx + 1}`}: ${item.new_pk}`);
      });
      
      console.log(`📊 Todos os PKs criados:`, planosMidiaDescPk.join(', '));
      console.log(`📊 Response completo da API:`, JSON.stringify(descResponse.data));
      
      // PKs criados com sucesso
      setSaveSteps(prev => prev.map(step => 
        step.id === 'criar-pks' ? { ...step, status: 'completed' as const } : step
      ));
      setSaveProgress(30);
      
      // Iniciar salvamento de dados
      setSaveSteps(prev => prev.map(step => 
        step.id === 'salvar-dados' ? { ...step, status: 'processing' as const } : step
      ));
      
      // ETAPA 3: Salvar roteiro simulado para cada cidade (isso precisa ser loop)
      for (let i = 0; i < pracasComIbge.length; i++) {
        const { praca, ibgeCode } = pracasComIbge[i];
        const planoMidiaDesc_pk = planosMidiaDescPk[i];
        
        try {

          console.log(`🔄 ETAPA 2.${i + 1}: Salvando roteiro simulado para ${praca.nome_cidade}...`);

          // Coletar dados da tabela específica desta praça
          console.log(`🔍 Buscando tabela para praça ID ${praca.id_cidade} (tipo: ${typeof praca.id_cidade})...`);
          
          // Tentar buscar a tabela usando diferentes formatos de ID para garantir compatibilidade
          let tabelaDaPraca = tabelaSimulado[praca.id_cidade as any];
          
          // Se não encontrou, tentar como número
          if (!tabelaDaPraca) {
            const idNumero = Number(praca.id_cidade);
            tabelaDaPraca = tabelaSimulado[idNumero];
            if (tabelaDaPraca) {
              console.log(`✅ Tabela encontrada usando ID numérico: ${idNumero}`);
            }
          }
          
          // Se ainda não encontrou, tentar como string
          if (!tabelaDaPraca) {
            const idString = String(praca.id_cidade);
            tabelaDaPraca = tabelaSimulado[idString as any];
            if (tabelaDaPraca) {
              console.log(`✅ Tabela encontrada usando ID string: ${idString}`);
            }
          }
          
          // Se ainda não encontrou, tentar todas as chaves disponíveis
          if (!tabelaDaPraca) {
            console.log(`⚠️ Tentando buscar tabela comparando IDs manualmente...`);
            const todasChaves = Object.keys(tabelaSimulado);
            console.log(`📋 Chaves disponíveis:`, todasChaves);
            console.log(`📋 ID da praça (original):`, praca.id_cidade);
            console.log(`📋 ID da praça (número):`, Number(praca.id_cidade));
            console.log(`📋 ID da praça (string):`, String(praca.id_cidade));
            
            // Tentar comparar valores (não tipos)
            for (const chave of todasChaves) {
              if (Number(chave) === Number(praca.id_cidade) || String(chave) === String(praca.id_cidade)) {
                tabelaDaPraca = tabelaSimulado[Number(chave) || chave as any];
                if (tabelaDaPraca) {
                  console.log(`✅ Tabela encontrada na chave: ${chave}`);
                  break;
                }
              }
            }
          }
          
          if (!tabelaDaPraca) {
            const todasChaves = Object.keys(tabelaSimulado);
            throw new Error(
              `Tabela não encontrada para a praça ${praca.nome_cidade} (ID: ${praca.id_cidade}, tipo: ${typeof praca.id_cidade}). ` +
              `Chaves disponíveis: ${todasChaves.join(', ')}`
            );
          }
          
          if (tabelaDaPraca.length === 0) {
            throw new Error(`Tabela vazia para a praça ${praca.nome_cidade} (ID: ${praca.id_cidade})`);
          }
          
          console.log(`✅ Tabela encontrada para ${praca.nome_cidade}: ${tabelaDaPraca.length} linhas`);
          
          const dadosTabela = tabelaDaPraca.map((linha) => {
            return {
              grupoSub_st: linha.grupoSub_st || linha.grupo_st,
              visibilidade: linha.visibilidade,
              seDigitalInsercoes_vl: linha.seDigitalInsercoes_vl || 0,
              seDigitalMaximoInsercoes_vl: linha.seDigitalMaximoInsercoes_vl || 0,
              // Enviar array de semanas (agora configurável na interface)
              semanas: linha.semanas || []
            };
          });

          console.log(`📊 Dados da tabela para ${praca.nome_cidade}: ${dadosTabela.length} linhas`);

          // Chamar API para salvar roteiro simulado desta praça
          console.log(`📤 Enviando para API /roteiro-simulado:`);
          console.log(`   - planoMidiaDesc_pk: ${planoMidiaDesc_pk}`);
          console.log(`   - Praça: ${praca.nome_cidade}`);
          console.log(`   - Linhas de dados: ${dadosTabela.length}`);
          
          const response = await axios.post('/roteiro-simulado', {
            planoMidiaDesc_pk,
            dadosTabela,
            pracasSelecionadas: [praca],
            quantidadeSemanas
          }, {
            timeout: 60000 // 60 segundos de timeout
          });

          if (response.data.success) {
            resultadosPraças.push({
              praca: praca,
              planoMidiaDesc_pk,
              resultado: response.data.data
            });
            console.log(`✅ Roteiro simulado salvo para ${praca.nome_cidade}`);
            console.log(`📍 ===== FINALIZANDO PROCESSAMENTO DA PRAÇA ${i + 1}/${cidadesSalvas.length} =====\n`);
            
            // Atualizar progresso de salvamento (30% a 60% distribuído entre as praças)
            const progressoPorPraca = 30 / cidadesSalvas.length;
            setSaveProgress(prev => Math.min(prev + progressoPorPraca, 60));
            setSaveSteps(prev => prev.map(step => 
              step.id === 'salvar-dados' ? { ...step, detail: `${i + 1}/${cidadesSalvas.length} praça(s) processada(s)` } : step
            ));
          } else {
            throw new Error(response.data.message || 'Erro desconhecido ao salvar roteiro simulado');
          }

        } catch (error: any) {
          console.error(`\n❌ ===== ERRO AO PROCESSAR PRAÇA ${i + 1}/${cidadesSalvas.length} =====`);
          console.error(`❌ Praça: ${praca.nome_cidade} (ID: ${praca.id_cidade})`);
          console.error(`❌ Erro:`, error);
          console.error(`❌ Erro completo:`, error.response?.data || error.message || 'Erro desconhecido');
          console.error(`❌ ===== FIM DO ERRO =====\n`);
          
          errosPraças.push({
            praca: praca,
            erro: error.response?.data?.message || error.message || 'Erro desconhecido'
          });
          
          // Continuar processando as outras praças mesmo se uma falhar
          console.log(`⚠️ Continuando processamento das outras praças...`);
        }
      }
      
      console.log(`\n📊 ===== RESUMO DO PROCESSAMENTO =====`);
      console.log(`📊 Total de praças configuradas: ${cidadesSalvas.length}`);
      console.log(`📊 Praças processadas com sucesso: ${planosMidiaDescPk.length}`);
      console.log(`📊 Praças com erro: ${errosPraças.length}`);
      console.log(`📊 Planos criados:`, planosMidiaDescPk.join(', '));

      if (planosMidiaDescPk.length === 0) {
        throw new Error('Nenhuma praça foi processada com sucesso');
      }

      console.log(`✅ ETAPAS 1, 2 e 3 CONCLUÍDAS - ${planosMidiaDescPk.length} praça(s) processada(s) com sucesso`);
      
      // Dados salvos com sucesso
      setSaveSteps(prev => prev.map(step => 
        step.id === 'salvar-dados' ? { ...step, status: 'completed' as const, detail: `${planosMidiaDescPk.length} praça(s) processada(s)` } : step
      ));
      setSaveProgress(60);
      
      console.log('⏳ Aguardando 2 segundos para garantir que todos os dados foram persistidos...');
      
      // Aguardar um pouco para garantir que o SQL Server commitou todos os dados
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔄 ETAPA 4: Executando processamento Databricks para o grupo...');

      // Iniciar Databricks
      setSaveSteps(prev => prev.map(step => 
        step.id === 'databricks' ? { ...step, status: 'processing' as const } : step
      ));
      setSaveProgress(70);

      // Executar Databricks UMA VEZ para o GRUPO (não para cada cidade individual)
      try {
        console.log(`🚀 Executando Databricks para o grupo ${planoMidiaGrupo_pk}...`);
        
        const databricksResponse = await axios.post('/databricks-roteiro-simulado', {
          planoMidiaGrupo_pk: planoMidiaGrupo_pk,  // ← CORRETO! Nome do parâmetro corrigido
          date_dh: new Date().toISOString().slice(0, 19).replace('T', ' '),
          date_dt: new Date().toISOString().slice(0, 10)
        });

        console.log(`✅ Databricks executado com sucesso para o grupo ${planoMidiaGrupo_pk}`);
        console.log(`📊 Run ID: ${databricksResponse.data?.run_id || 'N/A'}`);
        
        // DEBUG DESABILITADO TEMPORARIAMENTE (erro na query da tabela)
        console.log('🔍 ETAPA 5 (DEBUG): Pulando debug automático...');
        console.log('📊 Use o endpoint /teste-view-resultados manualmente se precisar investigar');

        let mensagemSucesso = `🎉 ROTEIRO SIMULADO PROCESSADO COM SUCESSO!\n\n`;
        mensagemSucesso += `📊 RESUMO:\n`;
        mensagemSucesso += `• ${planosMidiaDescPk.length} ${planosMidiaDescPk.length === 1 ? 'praça processada' : 'praças processadas'}\n`;
        
        let totalRegistros = 0;
        let totalInsecoes = 0;
        resultadosPraças.forEach(r => {
          totalRegistros += r.resultado.registrosProcessados || 0;
          totalInsecoes += r.resultado.detalhes?.totalInsecoesCompradas || 0;
        });
        
        mensagemSucesso += `• ${totalRegistros} registros processados no total\n`;
        mensagemSucesso += `• ${resultadosPraças[0]?.resultado.semanasConfiguradas || quantidadeSemanas} semanas configuradas\n`;
        mensagemSucesso += `• ${totalInsecoes} inserções compradas no total\n\n`;
        
        mensagemSucesso += `🏙️ PRAÇAS CONFIGURADAS:\n`;
        resultadosPraças.forEach((r, idx) => {
          mensagemSucesso += `  ${idx + 1}. ${r.praca.nome_cidade} - ${r.praca.nome_estado} (PK: ${r.planoMidiaDesc_pk})\n`;
        });
        
        if (errosPraças.length > 0) {
          mensagemSucesso += `\n⚠️ ERROS EM ${errosPraças.length} PRAÇA(S):\n`;
          errosPraças.forEach((e, idx) => {
            mensagemSucesso += `  ${idx + 1}. ${e.praca.nome_cidade}: ${e.erro}\n`;
          });
        }
        
        mensagemSucesso += `\n✅ PLANO MÍDIA DESC CRIADO PARA ${planosMidiaDescPk.length} PRAÇA(S)!\n`;
        mensagemSucesso += `✅ DADOS SALVOS NA BASE CALCULADORA!\n`;
        mensagemSucesso += `✅ PROCESSAMENTO DATABRICKS EXECUTADO!\n`;
        mensagemSucesso += `🎯 ROTEIRO SIMULADO PRONTO PARA VISUALIZAÇÃO!`;

        // Databricks concluído
        setSaveSteps(prev => prev.map(step => 
          step.id === 'databricks' ? { ...step, status: 'completed' as const } : step
        ));
        setSaveProgress(85);
        
        // Finalizando
        setSaveSteps(prev => prev.map(step => 
          step.id === 'finalizar' ? { ...step, status: 'processing' as const } : step
        ));
        setSaveProgress(95);
        
        // Aguardar um momento para mostrar o progresso final
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Concluído!
        setSaveSteps(prev => prev.map(step => 
          step.id === 'finalizar' ? { ...step, status: 'completed' as const } : step
        ));
        setSaveProgress(100);
        
        // Aguardar mais um momento antes de fechar o loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setShowAppleLoader(false);
        
        // Mensagem amigável e resumida
        const cidadesLista = resultadosPraças.map(r => r.praca.nome_cidade).join(', ');
        mostrarModal(
          `Seu roteiro simulado foi criado com sucesso! ${planosMidiaDescPk.length} ${planosMidiaDescPk.length === 1 ? 'cidade processada' : 'cidades processadas'}: ${cidadesLista}.`,
          'success',
          '🎉 Roteiro Simulado Pronto!'
        );

        // Marcar roteiro simulado como salvo
        setRoteiroSimuladoSalvo(true);
        
        // Marcar Aba 4 como preenchida (permite ir para Aba 6)
        setAba4Preenchida(true);
        
        // Ativar Aba 6 e navegar para ela
        setAba6Habilitada(true);
        setAbaAtiva(6);
        
        // Ativar polling para aguardar processamento do Databricks
        console.log('⏳ Roteiro simulado publicado. Ativando polling para aguardar processamento...');
        console.log('📊 PK do roteiro para polling:', planoMidiaGrupo_pk);
        console.log('📊 Tipo de planoMidiaGrupo_pk:', typeof planoMidiaGrupo_pk);
        
        if (!planoMidiaGrupo_pk) {
          console.error('❌ ERRO CRÍTICO: planoMidiaGrupo_pk está null ao tentar ativar polling!');
          alert('Erro: PK do roteiro não encontrado. O polling não funcionará.');
        } else {
          console.log('✅ PK válido encontrado:', planoMidiaGrupo_pk);
        }
        
        setAguardandoProcessamento(true);

      } catch (databricksError) {
        console.error('❌ Erro no processamento Databricks:', databricksError);
        
        // Marcar Databricks como erro
        setSaveSteps(prev => prev.map(step => 
          step.id === 'databricks' ? { ...step, status: 'error' as const, detail: 'Erro no processamento' } : step
        ));
        
        // Fechar loading após um momento
        await new Promise(resolve => setTimeout(resolve, 1500));
        setShowAppleLoader(false);
        
        let mensagemErro = `⚠️ ROTEIRO SIMULADO SALVO, MAS ERRO NO PROCESSAMENTO!\n\n`;
        mensagemErro += `✅ Dados salvos na base calculadora para ${planosMidiaDescPk.length} praça(s)\n`;
        mensagemErro += `❌ Erro no processamento Databricks\n\n`;
        
        if (errosPraças.length > 0) {
          mensagemErro += `⚠️ ERROS EM ${errosPraças.length} PRAÇA(S):\n`;
          errosPraças.forEach((e, idx) => {
            mensagemErro += `  ${idx + 1}. ${e.praca.nome_cidade}: ${e.erro}\n`;
          });
          mensagemErro += `\n`;
        }
        
        mensagemErro += `💡 Contate o suporte para verificar o processamento.`;
        
        alert(mensagemErro);
        
        // Marcar roteiro simulado como salvo (mesmo com erro no Databricks)
        setRoteiroSimuladoSalvo(true);
        
        // Marcar Aba 4 como preenchida (permite ir para Aba 6)
        setAba4Preenchida(true);
      }

    } catch (error) {
      console.error('❌ Erro ao salvar roteiro simulado:', error);
      
      // Marcar etapa atual como erro
      setSaveSteps(prev => prev.map(step => {
        if (step.status === 'processing') {
          return { ...step, status: 'error' as const, detail: 'Erro no processamento' };
        }
        return step;
      }));
      
      // Fechar loading após um momento
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowAppleLoader(false);
      
      let mensagemErro = 'Erro ao salvar roteiro simulado:\n\n';
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          mensagemErro += axiosError.response.data.message;
        } else {
          mensagemErro += axiosError.message;
        }
      } else {
        mensagemErro += error instanceof Error ? error.message : 'Erro desconhecido';
      }
      
      alert(mensagemErro);
    } finally {
      setSalvandoAba4(false);
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

  // Função para verificar se os roteiros mudaram desde o último salvamento
  const roteirosMudaram = () => {
    if (roteirosCarregados.length !== roteirosSalvos.length) return true;
    
    return roteirosCarregados.some(roteiro => 
      !roteirosSalvos.find(salvo => salvo.pk === roteiro.pk)
    );
  };

  // Função para validar consistência entre cidades da Aba 3 e praças do Excel na Aba 4
  const validarConsistenciaCidades = () => {
    if (cidadesSelecionadas.length === 0 || roteirosCarregados.length === 0) {
      return { valido: true, detalhes: null };
    }

    // Extrair praças únicas do Excel (normalizar texto)
    const pracasExcel = [...new Set(
      roteirosCarregados.map(roteiro => 
        roteiro.praca_st?.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      ).filter(Boolean)
    )].sort();

    // Extrair cidades selecionadas na Aba 3 (normalizar texto)
    const cidadesAba3 = cidadesSelecionadas.map(cidade => 
      (cidade.nome_cidade || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    ).filter(Boolean).sort();

    // Comparar arrays
    const cidadesFaltandoNoExcel = cidadesAba3.filter(cidade => !pracasExcel.includes(cidade));
    const pracasSobrandoNoExcel = pracasExcel.filter(praca => !cidadesAba3.includes(praca));

    const valido = cidadesFaltandoNoExcel.length === 0 && pracasSobrandoNoExcel.length === 0;

    return {
      valido,
      detalhes: {
        cidadesAba3,
        pracasExcel,
        cidadesFaltandoNoExcel,
        pracasSobrandoNoExcel,
        totalCidadesAba3: cidadesAba3.length,
        totalPracasExcel: pracasExcel.length
      }
    };
  };

  // Função para processar arquivo Excel com múltiplas abas
  const processarArquivoExcel = (file: File) => {
    setProcessandoExcel(true);
    setMensagemProcessamento('Lendo arquivo Excel...');
    setRoteirosCarregados([]);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setMensagemProcessamento('Analisando estrutura do arquivo...');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        
        // Processar o arquivo Excel usando a biblioteca xlsx
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Verificar se as abas obrigatórias existem
        setMensagemProcessamento('Verificando abas obrigatórias...');
        const requiredSheets = ['Template', 'Param', 'IPV_vias públicas'];
        const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
        
        if (missingSheets.length > 0) {
          setMensagemProcessamento(`❌ Erro: Abas faltando - ${missingSheets.join(', ')}`);
          setProcessandoExcel(false);
          setTimeout(() => setMensagemProcessamento(''), 5000);
          alert(`Excel deve conter as seguintes abas: ${requiredSheets.join(', ')}\n\nAbas faltando: ${missingSheets.join(', ')}`);
          return;
        }
        
        // Ler dados das abas
        setMensagemProcessamento('Lendo dados das abas...');
        const templateSheet = workbook.Sheets['Template'];
        const paramSheet = workbook.Sheets['Param'];
        const ipvSheet = workbook.Sheets['IPV_vias públicas'];
        
        // Converter para JSON com cabeçalhos - forçar leitura de todas as colunas
        setMensagemProcessamento('Convertendo dados para processamento...');
        const templateData = XLSX.utils.sheet_to_json(templateSheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          range: 0 
        });
        const paramData = XLSX.utils.sheet_to_json(paramSheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          range: 0 
        });
        const ipvData = XLSX.utils.sheet_to_json(ipvSheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          range: 0 
        });
        
        // Função para encontrar linha de cabeçalhos
        const findHeaderRow = (data: any[], expectedHeaders: string[]): number => {
          for (let i = 0; i < Math.min(data.length, 5); i++) {
            const row = data[i] as string[];
            if (row && Array.isArray(row)) {
              const foundHeaders = expectedHeaders.filter(header => 
                row.some(cell => cell && cell.toString().toLowerCase().includes(header.toLowerCase()))
              );
              if (foundHeaders.length >= 3) { // Pelo menos 3 cabeçalhos esperados
                return i;
              }
            }
          }
          return 0; // Default para primeira linha
        };
        
        // Encontrar linhas de cabeçalhos
        const templateHeaderRow = findHeaderRow(templateData, ['Praça', 'UF', 'Ambiente']);
        const paramHeaderRow = findHeaderRow(paramData, ['Ambiente', 'Descrição']);
        const ipvHeaderRow = findHeaderRow(ipvData, ['Formato', 'GRUPO', 'IPV']);
        
        // Processar cabeçalhos e dados
        const templateHeaders = (templateData[templateHeaderRow] || []) as string[];
        const paramHeaders = (paramData[paramHeaderRow] || []) as string[];
        const ipvHeaders = (ipvData[ipvHeaderRow] || []) as string[];
        
        // Debug: mostrar cabeçalhos detectados
        console.log('Template - Linha de cabeçalho:', templateHeaderRow, 'Cabeçalhos:', templateHeaders);
        console.log('Param - Linha de cabeçalho:', paramHeaderRow, 'Cabeçalhos:', paramHeaders);
        console.log('IPV - Linha de cabeçalho:', ipvHeaderRow, 'Cabeçalhos:', ipvHeaders);
        
        // Função para normalizar texto (remover acentos, maiúsculas)
        const normalizeText = (text: string): string => {
          if (!text) return '';
          return text.toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .toUpperCase()
            .trim();
        };
        
        // Verificar cabeçalhos obrigatórios do Template
        setMensagemProcessamento('Verificando cabeçalhos obrigatórios...');
        const requiredTemplateHeaders = ['Praça', 'UF', 'Ambiente', 'Grupo formatos de mídia', 'Tipo de mídia'];
        const missingTemplateHeaders = requiredTemplateHeaders.filter(header => 
          !templateHeaders.some(h => {
            if (!h) return false;
            const headerNormalized = normalizeText(h.toString());
            const searchNormalized = normalizeText(header);
            return headerNormalized.includes(searchNormalized) || headerNormalized === searchNormalized;
          })
        );
        
        if (missingTemplateHeaders.length > 0) {
          setMensagemProcessamento(`❌ Erro: Cabeçalhos faltando - ${missingTemplateHeaders.join(', ')}`);
          setProcessandoExcel(false);
          setTimeout(() => setMensagemProcessamento(''), 5000);
          alert(`Template deve conter os seguintes cabeçalhos: ${requiredTemplateHeaders.join(', ')}\n\nCabeçalhos faltando: ${missingTemplateHeaders.join(', ')}\n\nCabeçalhos encontrados: ${templateHeaders.filter(h => h).join(', ')}`);
          return;
        }
        
        // Função para encontrar índice da coluna
        const findColumnIndex = (headers: string[], searchTerms: string[]): number => {
          for (let i = 0; i < headers.length; i++) {
            const header = normalizeText(headers[i]?.toString() || '');
            if (searchTerms.some(term => {
              const searchTerm = normalizeText(term);
              return header.includes(searchTerm) || header === searchTerm;
            })) {
              return i;
            }
          }
          return -1;
        };
        
        // Mapear índices das colunas do Template
        const templateIndices = {
          cidade: findColumnIndex(templateHeaders, ['Praça']),
          uf: findColumnIndex(templateHeaders, ['UF']),
          ambiente: findColumnIndex(templateHeaders, ['Ambiente']),
          grupo_midia: findColumnIndex(templateHeaders, ['Grupo formatos de mídia']),
          formato_categoria: findColumnIndex(templateHeaders, ['Formato']),
          tipo_midia: findColumnIndex(templateHeaders, ['Tipo de mídia']),
          latitude: findColumnIndex(templateHeaders, ['Latitude']),
          longitude: findColumnIndex(templateHeaders, ['Longitude']),
          insercoes_compradas: findColumnIndex(templateHeaders, ['Inserções compradas', 'Se digital: Inserções compradas']),
          max_insercoes: findColumnIndex(templateHeaders, ['Máximo de inserções', 'Se digital: Máximo de inserções']),
          visibilidade_estatico: findColumnIndex(templateHeaders, ['Visibilidade', 'Se estático: visibilidade']),
          semana: findColumnIndex(templateHeaders, ['Semana'])
        };
        
        // Mapear índices das colunas do Param
        const paramIndices = {
          ambiente: findColumnIndex(paramHeaders, ['Ambiente']),
          descricao: findColumnIndex(paramHeaders, ['Descrição']),
          grupo_midia: findColumnIndex(paramHeaders, ['Grupo formatos de mídia']),
          semana: findColumnIndex(paramHeaders, ['Semana']),
          deflator_visibilidade: findColumnIndex(paramHeaders, ['Deflator de visibilidade'])
        };
        
        // Mapear índices das colunas do IPV
        const ipvIndices = {
          formato_colmeia: findColumnIndex(ipvHeaders, ['Formato Colmeia']),
          grupo_midia: findColumnIndex(ipvHeaders, ['GRUPO']),
          ipv: findColumnIndex(ipvHeaders, ['IPV'])
        };
        
        // Criar lookup tables para Param e IPV
        const paramLookup = new Map<string, any>();
        const ipvLookup = new Map<string, any>();
        
        // Processar dados do Param
        for (let i = paramHeaderRow + 1; i < paramData.length; i++) {
          const row = paramData[i] as any[];
          if (row[paramIndices.ambiente] && row[paramIndices.grupo_midia]) {
            const key = `${normalizeText(row[paramIndices.ambiente])}_${normalizeText(row[paramIndices.grupo_midia])}`;
            paramLookup.set(key, {
              descricao: row[paramIndices.descricao] || null,
              deflator_visibilidade: row[paramIndices.deflator_visibilidade] || null
            });
          }
        }
        
        // Processar dados do IPV
        for (let i = ipvHeaderRow + 1; i < ipvData.length; i++) {
          const row = ipvData[i] as any[];
          if (row[ipvIndices.formato_colmeia] && row[ipvIndices.grupo_midia]) {
            const key = `${normalizeText(row[ipvIndices.formato_colmeia])}_${normalizeText(row[ipvIndices.grupo_midia])}`;
            ipvLookup.set(key, {
              ipv: parseFloat(row[ipvIndices.ipv]) || 0
            });
          }
        }
        
        // Processar dados do Template com joins
        const roteirosProcessados = [];
        const semanasEncontradas = new Set<string>(); // Para coletar semanas únicas
        
        for (let i = templateHeaderRow + 1; i < templateData.length; i++) {
          const row = templateData[i] as any[];
          
          // Verificar campos obrigatórios
          if (!row[templateIndices.cidade] || !row[templateIndices.uf] || 
              !row[templateIndices.ambiente] || !row[templateIndices.grupo_midia] || 
              !row[templateIndices.formato_categoria] || !row[templateIndices.tipo_midia]) {
            console.warn(`Linha ${i + 1} ignorada - campos obrigatórios faltando`);
            continue;
          }
          
          // Normalizar chaves para lookup
          const paramKey = `${normalizeText(row[templateIndices.ambiente])}_${normalizeText(row[templateIndices.grupo_midia])}`;
          const ipvKey = `${normalizeText(row[templateIndices.tipo_midia])}_${normalizeText(row[templateIndices.grupo_midia])}`;
          
          // Buscar dados enriquecidos
          const paramData = paramLookup.get(paramKey) || { descricao: null, deflator_visibilidade: null };
          const ipvData = ipvLookup.get(ipvKey) || { ipv: null };
          
          // Extrair e processar semana do Excel
          const semanaExcel = templateIndices.semana >= 0 ? 
            (row[templateIndices.semana]?.toString().trim() || 'W1') : 'W1';
          
          // Coletar semana única para estatísticas
          semanasEncontradas.add(semanaExcel);

          // Criar objeto enriquecido
          const roteiro = {
            pk2: 0, // Será preenchido ao salvar
            praca_st: row[templateIndices.cidade]?.toString().trim() || '',
            uf_st: row[templateIndices.uf]?.toString().toUpperCase().trim() || '',
            ambiente_st: row[templateIndices.ambiente]?.toString().trim() || '',
            grupoFormatosMidia_st: row[templateIndices.grupo_midia]?.toString().trim() || '',
            formato_st: row[templateIndices.formato_categoria]?.toString().trim() || '',
            tipoMidia_st: row[templateIndices.tipo_midia]?.toString().trim() || '',
            latitude_vl: templateIndices.latitude >= 0 ? parseFloat(row[templateIndices.latitude]) || null : null,
            longitude_vl: templateIndices.longitude >= 0 ? parseFloat(row[templateIndices.longitude]) || null : null,
            seDigitalInsercoes_vl: templateIndices.insercoes_compradas >= 0 ? 
              (row[templateIndices.insercoes_compradas] ? parseInt(row[templateIndices.insercoes_compradas]) : null) : null,
            seDigitalMaximoInsercoes_vl: templateIndices.max_insercoes >= 0 ? 
              (row[templateIndices.max_insercoes] ? parseInt(row[templateIndices.max_insercoes]) : null) : null,
            seEstaticoVisibilidade_vl: (() => {
              if (templateIndices.visibilidade_estatico < 0) return null;
              const visibilidadeTexto = row[templateIndices.visibilidade_estatico]?.toString().trim().toUpperCase();
              if (!visibilidadeTexto) return null;
              
              // Mapear texto para valor numérico (ordem importa! Verificar BAIXA antes de ALTA)
              if (visibilidadeTexto.includes('BAIXA')) return 25;
              if (visibilidadeTexto.includes('MÉDIA') || visibilidadeTexto.includes('MEDIA')) return 50;
              if (visibilidadeTexto.includes('MODERADA')) return 75;
              if (visibilidadeTexto.includes('ALTA')) return 100;
              
              // "Não visibilidade" ou "Sem visibilidade" = null (sem info)
              if (visibilidadeTexto.includes('NÃO') || visibilidadeTexto.includes('NAO') || visibilidadeTexto.includes('SEM')) return null;
              
              // Se for número direto, usar o número
              const numero = parseFloat(visibilidadeTexto);
              if (!isNaN(numero)) return numero;
              
              // Log para valores não mapeados
              console.warn(`⚠️ Visibilidade não mapeada na linha ${i + 1}: "${visibilidadeTexto}"`);
              
              // Caso contrário, retornar null (sem info)
              return null;
            })(),
            semana_st: semanaExcel, // ✅ Usar semana real do Excel
            // Dados enriquecidos
            param_descricao: paramData.descricao,
            param_deflator_visibilidade: paramData.deflator_visibilidade,
            ipv_valor: ipvData.ipv
          };
          
          roteirosProcessados.push(roteiro);
        }
        
        // Converter semanas para array ordenado
        const semanasUnicas = Array.from(semanasEncontradas).sort();
        
        console.log(`Excel processado: ${roteirosProcessados.length} roteiros encontrados`);
        console.log('Semanas encontradas no Excel:', semanasUnicas);
        console.log('Primeiros roteiros:', roteirosProcessados.slice(0, 3));
        console.log('Lookup Param:', paramLookup.size, 'entradas');
        console.log('Lookup IPV:', ipvLookup.size, 'entradas');
        
        setMensagemProcessamento('Finalizando processamento...');
        
        if (roteirosProcessados.length === 0) {
          setMensagemProcessamento('❌ Nenhum roteiro válido encontrado');
          setProcessandoExcel(false);
          setTimeout(() => setMensagemProcessamento(''), 5000);
          mostrarModal('Verifique se o arquivo está preenchido corretamente e tente novamente.', 'error', 'Nenhum roteiro encontrado');
        } else {
          setRoteirosCarregados(roteirosProcessados);
          setArquivoExcel(file);
          setMensagemProcessamento(`✅ Excel processado com sucesso! ${roteirosProcessados.length} roteiros carregados`);
          setProcessandoExcel(false);
          setTimeout(() => setMensagemProcessamento(''), 5000);
          
          // O carregamento das tabelas será feito automaticamente pelo useEffect
          
          mostrarModal(
            `Arquivo carregado com sucesso! ${roteirosProcessados.length} roteiros encontrados em ${semanasUnicas.length} ${semanasUnicas.length === 1 ? 'semana' : 'semanas'}.`,
            'success',
            '✅ Excel Processado!'
          );
        }
        
      } catch (error) {
        console.error('Erro ao processar arquivo Excel:', error);
        setMensagemProcessamento(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setProcessandoExcel(false);
        setTimeout(() => setMensagemProcessamento(''), 8000);
        mostrarModal('Não foi possível processar o arquivo. Verifique o formato e tente novamente.', 'error', 'Erro ao processar Excel');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Função para carregar dados das tabelas dinâmicas
  const carregarDadosMatrix = async () => {
    if (!planoMidiaGrupo_pk || roteirosCarregados.length === 0) {
      console.log('❌ Não é possível carregar dados matrix: planoMidiaGrupo_pk ou roteirosCarregados não disponíveis');
      return;
    }

    setCarregandoDadosMatrix(true);
    
    try {
      // Extrair semanas e praças únicas dos roteiros carregados
      const semanas = [...new Set(roteirosCarregados.map(r => r.semana_st).filter(Boolean))].sort();
      
      // Extrair praças únicas usando Map para evitar duplicatas
      const pracasMap = new Map();
      roteirosCarregados.forEach(r => {
        if (r.praca_st && r.uf_st) {
          const key = `${r.praca_st}-${r.uf_st}`;
          if (!pracasMap.has(key)) {
            pracasMap.set(key, { praca: r.praca_st, uf: r.uf_st });
          }
        }
      });
      const pracas = Array.from(pracasMap.values());
      
      setSemanasUnicas(semanas);
      setPracasUnicas(pracas);

      console.log(`📊 Semanas encontradas: ${semanas.join(', ')}`);
      console.log(`🏙️ Praças encontradas: ${pracas.map(p => `${p.praca}-${p.uf}`).join(', ')}`);

      // Chamar as 3 APIs em paralelo
      const [matrixResponse, matrixRowResponse, subGruposResponse] = await Promise.all([
        axios.post('/matrix-data-query', { planoMidiaGrupo_pk }),
        axios.post('/matrix-data-row-query', { planoMidiaGrupo_pk }),
        axios.get('/grupo-sub-distinct')
      ]);

      if (matrixResponse.data.success) {
        // sp_baseCalculadoraMatrixDataQuery JÁ retorna os campos corretos
        setDadosMatrix(matrixResponse.data.data);
        console.log(`✅ Dados matrix carregados: ${matrixResponse.data.data.length} registros`);
        console.log(`📋 TODOS os registros matrix:`, JSON.stringify(matrixResponse.data.data, null, 2));
      }

      if (matrixRowResponse.data.success) {
        setDadosMatrixRow(matrixRowResponse.data.data);
        console.log(`✅ Dados matrix row carregados: ${matrixRowResponse.data.data.length} registros`);
      }

      if (subGruposResponse.data.success) {
        setDadosSubGrupos(subGruposResponse.data.data);
        console.log(`✅ Subgrupos carregados: ${subGruposResponse.data.data.length} registros`);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dados matrix:', error);
      alert('Erro ao carregar dados das tabelas. Tente novamente.');
    } finally {
      setCarregandoDadosMatrix(false);
    }

  };

  // Função para carregar dados completos do roteiro
  const carregarDadosCompletosRoteiro = async (planoMidiaGrupo_pk: number) => {
    try {
      console.log('🔄 Carregando dados completos do roteiro...');
      console.log('📊 PK sendo usada:', planoMidiaGrupo_pk);

      const response = await axios.post('/roteiro-completo', {
        planoMidiaGrupo_pk: planoMidiaGrupo_pk
      });

      console.log('📊 Resposta da API roteiro-completo:', response.data);

      if (response.data.success) {
        const dadosCompletos = response.data.data;
        
        // Apenas atualizar dados que não foram carregados anteriormente
        // Os dados básicos já foram carregados no useEffect
        
        // Carregar semanas para o período da campanha (se não foi carregado antes)
        if (dadosCompletos.semanasMax_vl && !semanasUnicas.length) {
          setSemanasUnicas(Array.from({length: dadosCompletos.semanasMax_vl}, (_, i) => `Semana ${i + 1}`));
        }
        
        console.log('✅ Dados completos carregados:', dadosCompletos);
      } else {
        console.error('❌ Erro ao carregar dados completos:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados completos do roteiro:', error);
    }
  };

  // Função para verificar status do roteiro e decidir se carrega dados ou ativa polling
  const verificarStatusECarregarDados = async () => {
    if (!planoMidiaGrupo_pk) {
      console.log('⚠️ planoMidiaGrupo_pk não disponível para verificar status');
      return;
    }
    
    try {
      console.log('🔍 Verificando status do roteiro:', planoMidiaGrupo_pk);
      const statusResponse = await axios.get(`/roteiro-status?pk=${planoMidiaGrupo_pk}`);
      
      if (statusResponse.data.success && statusResponse.data.data) {
        const { inProgress } = statusResponse.data.data;
        console.log('📊 Status do roteiro - inProgress:', inProgress);
        
        if (inProgress) {
          console.log('⏳ Roteiro ainda em processamento. Ativando polling...');
          setAguardandoProcessamento(true);
        } else {
          console.log('✅ Roteiro processado. Carregando dados...');
          await carregarDadosResultados(planoMidiaGrupo_pk);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status do roteiro:', error);
      // Em caso de erro, tentar carregar os dados mesmo assim
      console.log('⚠️ Tentando carregar dados mesmo com erro no status...');
      await carregarDadosResultados(planoMidiaGrupo_pk);
    }
  };

  // Função para carregar dados dos resultados
  const carregarDadosResultados = async (pkOverride?: number) => {
    const pkToUse = pkOverride || planoMidiaGrupo_pk;
    console.log('🔄 carregarDadosResultados chamada');
    console.log('📊 planoMidiaGrupo_pk atual:', planoMidiaGrupo_pk);
    console.log('📊 pkToUse:', pkToUse);
    
    if (!pkToUse) {
      console.log('⚠️ planoMidiaGrupo_pk não disponível para carregar resultados');
      return;
    }

    try {
      // ✅ ATIVAR LOADING UNIFICADO
      setCarregandoDadosGerais(true);
      
      console.log('🔄 Carregando TODOS os dados em paralelo...');
      console.log('📊 PK sendo usado:', pkToUse);

      // Carregar TUDO em paralelo usando Promise.allSettled (permite falhas individuais)
      // 404 é esperado para roteiros simulados (apenas Vias Públicas tem dados)
      const results = await Promise.allSettled([
        axios.post('/report-indicadores-vias-publicas', { report_pk: pkToUse }),
        axios.post('/report-indicadores-summary', { report_pk: pkToUse }),
        axios.post('/report-indicadores-target', { report_pk: pkToUse }),
        axios.post('/report-indicadores-target-summary', { report_pk: pkToUse }),
        axios.post('/report-indicadores-week', { report_pk: pkToUse }),
        axios.post('/report-indicadores-week-summary', { report_pk: pkToUse })
      ]);

      // Extrair respostas (ou null se falharam)
      const [
        responseGeral,
        summaryResponseGeral,
        responseTarget,
        summaryResponseTarget,
        responseSemanais,
        summaryResponseSemanais
      ] = results.map(result => result.status === 'fulfilled' ? result.value : null);

      console.log('📊 Todas as requisições concluídas!');

      // Processar dados gerais
      if (responseGeral?.data?.success) {
        setDadosResultados(responseGeral.data.data);
        console.log('✅ Dados gerais carregados:', responseGeral.data.data.length);
        
        if (summaryResponseGeral?.data?.success && summaryResponseGeral.data.data) {
          const summaryData = summaryResponseGeral.data.data;
          setTotaisResultados({
            impactosTotal_vl: summaryData.impactosTotal_vl || 0,
            coberturaPessoasTotal_vl: summaryData.coberturaPessoasTotal_vl || 0,
            coberturaProp_vl: summaryData.coberturaProp_vl || 0,
            frequencia_vl: summaryData.frequencia_vl || 0,
            grp_vl: summaryData.grp_vl || 0
          });
          console.log('✅ Totais gerais carregados');
        }
      } else {
        console.log('ℹ️ Dados gerais não disponíveis (normal para roteiros simulados)');
      }

      // Processar dados de target
      if (responseTarget?.data?.success) {
        setDadosTarget(responseTarget.data.data);
        console.log('✅ Dados de target carregados:', responseTarget.data.data.length);
        
        if (summaryResponseTarget?.data?.success && summaryResponseTarget.data.data) {
          const summaryData = summaryResponseTarget.data.data;
          setTotaisTarget({
            impactosTotal_vl: summaryData.impactosTotal_vl || 0,
            coberturaPessoasTotal_vl: summaryData.coberturaPessoasTotal_vl || 0,
            coberturaProp_vl: summaryData.coberturaProp_vl || 0,
            frequencia_vl: summaryData.frequencia_vl || 0,
            grp_vl: summaryData.grp_vl || 0
          });
          console.log('✅ Totais de target carregados');
        }
      } else {
        console.log('ℹ️ Dados de target não disponíveis (normal para roteiros simulados)');
      }

      // Processar dados semanais
      if (responseSemanais?.data?.success) {
        setDadosSemanais(responseSemanais.data.data);
        console.log('✅ Dados semanais carregados:', responseSemanais.data.data.length);
        
        if (summaryResponseSemanais?.data?.success) {
          setDadosSemanaisSummary(summaryResponseSemanais.data.data);
          console.log('✅ Resumo semanal carregado');
        }
      } else {
        console.log('ℹ️ Dados semanais não disponíveis (normal para roteiros simulados)');
      }

      // Carregar dados semanais de target (não bloqueia)
      carregarDadosSemanaisTarget(pkToUse);
      
      console.log('✅ Carregamento concluído! Dados disponíveis foram processados.');
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setAba6Habilitada(true);
    } finally {
      // ✅ DESATIVAR LOADING UNIFICADO
      setCarregandoDadosGerais(false);
    }
  };

  // Função para carregar dados semanais (visão por praça) - LEGADO, dados carregados na principal
  const carregarDadosSemanais = async (pkOverride?: number) => {
    // Esta função agora é um wrapper, os dados são carregados na carregarDadosResultados
    console.log('ℹ️ carregarDadosSemanais: dados já carregados na função principal');
  };

  // Função para carregar dados de target - LEGADO, dados carregados na principal
  const carregarDadosTarget = async (pkOverride?: number) => {
    // Esta função agora é um wrapper, os dados são carregados na carregarDadosResultados
    console.log('ℹ️ carregarDadosTarget: dados já carregados na função principal');
  };

  // Função para carregar dados semanais de target
  const carregarDadosSemanaisTarget = async (pkOverride?: number) => {
    const pkToUse = pkOverride || planoMidiaGrupo_pk;
    console.log('🎯 carregarDadosSemanaisTarget chamada');
    console.log('📊 pkToUse:', pkToUse);
    
    if (!pkToUse) {
      console.log('⚠️ planoMidiaGrupo_pk não disponível para carregar dados semanais de target');
      return;
    }

    try {
      setCarregandoSemanaisTarget(true);
      console.log('🔄 Carregando dados semanais de target em paralelo...');

      // Carregar dados e resumo EM PARALELO (permite falhas individuais)
      const results = await Promise.allSettled([
        axios.post('/report-indicadores-week-target', { report_pk: pkToUse }),
        axios.post('/report-indicadores-week-target-summary', { report_pk: pkToUse })
      ]);

      const [response, summaryResponse] = results.map(result => 
        result.status === 'fulfilled' ? result.value : null
      );

      console.log('📊 Resposta da API (semanais target):', response?.data);
      console.log('📊 Resposta da API (resumo semanal target):', summaryResponse?.data);

      if (response?.data?.success) {
        setDadosSemanaisTarget(response.data.data);
        console.log('✅ Dados semanais de target carregados:', response.data.data.length);
        
        if (summaryResponse?.data?.success) {
          setDadosSemanaisTargetSummary(summaryResponse.data.data);
          console.log('✅ Dados de resumo semanal de target carregados:', summaryResponse.data.data.length);
        } else {
          console.log('ℹ️ Resumo semanal de target não disponível (normal para roteiros simulados)');
          setDadosSemanaisTargetSummary([]);
        }
      } else {
        console.log('ℹ️ Dados semanais de target não disponíveis (normal para roteiros simulados)');
        setDadosSemanaisTarget([]);
        setDadosSemanaisTargetSummary([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados semanais de target:', error);
      setDadosSemanaisTarget([]);
    } finally {
      setCarregandoSemanaisTarget(false);
    }
  };

  // Função para baixar Excel do SharePoint
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  
  const baixarExcelSharePoint = async () => {
    console.log('🔵 FUNÇÃO CHAMADA: baixarExcelSharePoint');
    console.log('🔵 planoMidiaGrupo_pk atual:', planoMidiaGrupo_pk);
    
    try {
      // Validar se temos o planoMidiaGrupo_pk
      if (!planoMidiaGrupo_pk) {
        console.warn('⚠️ planoMidiaGrupo_pk não encontrado');
        alert('⚠️ Não foi possível identificar o plano de mídia. Por favor, salve o roteiro primeiro.');
        return;
      }

      setDownloadingExcel(true);
      console.log('📥 Iniciando download do SharePoint...');
      console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);
      console.log('🌐 URL da API:', '/sharepoint-download');

      // Chamar API do SharePoint
      console.log('📤 Enviando requisição para API...');
      const response = await axios.post('/sharepoint-download', {
        planoMidiaGrupo_pk: planoMidiaGrupo_pk
      }, {
        responseType: 'blob', // Importante para receber arquivo binário
        timeout: 60000 // 60 segundos
      });

      console.log('✅ Resposta recebida da API');
      console.log('📊 Status:', response.status);
      console.log('📦 Content-Type:', response.headers['content-type']);
      console.log('📏 Tamanho:', response.data.size, 'bytes');

      // Criar URL temporária para download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      console.log('🔗 Criando URL de download...');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo
      const nomeArquivo = `Roteiro_Completo_${planoMidiaGrupo_pk}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', nomeArquivo);
      
      // Fazer download
      console.log('💾 Iniciando download do arquivo:', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('🧹 Limpeza concluída');
      }, 100);

      console.log('✅ Download concluído com sucesso!');
      mostrarModal(`Arquivo salvo na pasta Downloads: ${nomeArquivo}`, 'success', '✅ Download Concluído!');

    } catch (error: any) {
      console.error('❌ ERRO DETALHADO:', error);
      console.error('❌ Error.response:', error.response);
      console.error('❌ Error.message:', error.message);
      console.error('❌ Error.code:', error.code);
      
      let mensagemErro = '❌ Erro ao baixar arquivo do SharePoint.\n\n';
      
      if (error.response?.status === 404) {
        mensagemErro += 'Arquivo não encontrado no SharePoint para este roteiro.\n\n';
        mensagemErro += `planoMidiaGrupo_pk: ${planoMidiaGrupo_pk}\n\n`;
        mensagemErro += 'Verifique se o arquivo foi carregado no SharePoint com esta PK.';
      } else if (error.response?.status === 500) {
        mensagemErro += 'Erro no servidor. Verifique as configurações do Azure.\n\n';
        // Tentar extrair mensagem do erro
        try {
          const errorText = await error.response.data.text();
          mensagemErro += errorText || 'Erro desconhecido';
        } catch {
          mensagemErro += error.response?.data?.message || 'Erro desconhecido';
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        mensagemErro += 'Tempo limite excedido. O arquivo pode ser muito grande ou o servidor não está respondendo.';
      } else if (error.message?.includes('Network Error')) {
        mensagemErro += 'Erro de rede. Verifique:\n';
        mensagemErro += '1. Se o servidor está rodando (vercel dev)\n';
        mensagemErro += '2. Se a API está acessível\n';
        mensagemErro += '3. Sua conexão com a internet';
      } else {
        mensagemErro += error.response?.data?.message || error.message || 'Erro desconhecido';
      }
      
      alert(mensagemErro);
    } finally {
      setDownloadingExcel(false);
      console.log('🔵 Estado downloadingExcel resetado');
    }
  };

  // 📊 Função para atualizar loading em tempo real
  const atualizarLoadingAba4 = (etapa: string, progresso: number, detalhes: string = '') => {
    setLoadingAba4(prev => ({
      ...prev,
      etapa,
      progresso,
      detalhes,
      ativo: true,
      tempoInicio: prev.tempoInicio || new Date()
    }));
    console.log(`📊 [${progresso}%] ${etapa} - ${detalhes}`);
  };

  // 🎯 CONTROLE GRANULAR DO BANCO DE ATIVOS
  const atualizarBancoAtivosStatus = (updates: Partial<typeof bancoAtivosStatus>) => {
    setBancoAtivosStatus(prev => {
      const novo = { ...prev, ...updates };
      if (updates.coordenadasProcessadas && updates.coordenadasTotal) {
        novo.taxaSucesso = (novo.sucessos / novo.coordenadasProcessadas) * 100;
      }
      return novo;
    });
  };

  const iniciarBancoAtivos = (totalCoordenadas: number, totalLotes: number) => {
    setBancoAtivosStatus({
      ativo: true,
      etapa: 'Iniciando processamento',
      coordenadasProcessadas: 0,
      coordenadasTotal: totalCoordenadas,
      lotesProcessados: 0,
      lotesTotal: totalLotes,
      sucessos: 0,
      falhas: 0,
      tempoInicio: new Date(),
      detalhes: `Processando ${totalCoordenadas} coordenadas em ${totalLotes} lotes`,
      modoProcessamento: 'VERCEL-OTIMIZADO',
      taxaSucesso: 0
    });
  };

  const finalizarBancoAtivos = (sucessos: number, falhas: number, tempoTotal: number) => {
    setBancoAtivosStatus(prev => ({
      ...prev,
      ativo: false,
      etapa: 'Concluído',
      sucessos,
      falhas,
      taxaSucesso: (sucessos / (sucessos + falhas)) * 100,
      detalhes: `Processamento concluído em ${tempoTotal.toFixed(1)}s`
    }));
  };

  // Função para salvar Aba 4 - Upload de roteiros
  const salvarAba4 = async () => {
    console.log('🚀 Iniciando Aba 4 - Upload e processamento do Excel...');
    
    // 🚀 INICIAR LOADING EM TEMPO REAL
    atualizarLoadingAba4('Iniciando', 0, 'Validando dados de entrada...');

    // ✅ NOVO FLUXO: Aba 4 vem ANTES da Aba 3
    if (!planoMidiaGrupo_pk) {
      setLoadingAba4(prev => ({ ...prev, ativo: false }));
      alert('É necessário salvar a Aba 1 primeiro');
      return;
    }

    if (!targetSalvoLocal?.salvo) {
      setLoadingAba4(prev => ({ ...prev, ativo: false }));
      alert('É necessário salvar a Aba 2 primeiro');
      return;
    }

    if (roteirosCarregados.length === 0) {
      setLoadingAba4(prev => ({ ...prev, ativo: false }));
      mostrarModal('Faça o upload do arquivo Excel com os roteiros.', 'warning', 'Arquivo não carregado');
      return;
    }

    if (!user) {
      setLoadingAba4(prev => ({ ...prev, ativo: false }));
      mostrarModal('Sua sessão expirou. Faça login novamente.', 'error', 'Sessão expirada');
      return;
    }

    setSalvandoAba4(true);
    setProcessandoFluxoCompleto(true);
    
    try {
      // 🔄 ETAPA 1: Salvando roteiros do Excel
      atualizarLoadingAba4('Salvando roteiros', 10, `Processando ${roteirosCarregados.length} roteiros do Excel...`);
      console.log('🔄 ETAPA 1: Salvando roteiros do Excel...');
      
      // 1. Salvar roteiros do Excel
      const roteirosComGrupo = roteirosCarregados.map(roteiro => ({
        ...roteiro,
        planoMidiaGrupo_pk: planoMidiaGrupo_pk
      }));

      const uploadResponse = await axios.post('/upload-roteiros', {
        roteiros: roteirosComGrupo
      });

      if (!uploadResponse.data || !uploadResponse.data.roteiros) {
        throw new Error('Erro no upload dos roteiros');
      }

      const uploadData = {
        pk: planoMidiaGrupo_pk,
        date_dh: uploadResponse.data.estatisticas?.dateLote || new Date().toISOString()
      };

      setDadosUpload(uploadData);
      setUploadCompleto(true);
      setAba4Preenchida(true); // Marcar Aba 4 como preenchida
      setUploadRoteiros_pks(uploadResponse.data.roteiros.map((r: any) => r.pk));
      setRoteirosSalvos([...roteirosCarregados]);

      console.log('✅ ETAPA 1 CONCLUÍDA - Roteiros salvos');
      
      // 🔄 ETAPA 2: Consultando view
      atualizarLoadingAba4('Consultando dados', 25, 'Preparando dados para processamento...');
      console.log('🔄 ETAPA 2: Consultando view uploadRoteirosPlanoMidia...');

      // 2. Consultar a view para obter dados processados
      const viewResponse = await axios.post('/upload-roteiros-plano-midia', {
        planoMidiaGrupo_pk: uploadData.pk,
        date_dh: uploadData.date_dh
      });

      if (!viewResponse.data || !viewResponse.data.data) {
        throw new Error('Erro ao consultar dados da view');
      }

      const dadosView = viewResponse.data.data;
      setDadosPlanoMidia(dadosView);

      console.log('✅ ETAPA 2 CONCLUÍDA - View consultada');
      
      // 🔄 ETAPA 3: Processando pontos únicos e inserindo no inventário (BANCO DE ATIVOS RESTAURADO)
      atualizarLoadingAba4('Banco de Ativos', 40, 'Consultando API e inserindo dados no inventário...');
      console.log('🔄 ETAPA 3: Processando pontos únicos...');

      // 3. Processar pontos únicos e inserir no inventário
      const pontosResponse = await axios.post('/upload-pontos-unicos', {
        planoMidiaGrupo_pk: uploadData.pk,
        date_dh: uploadData.date_dh
      });

      if (!pontosResponse.data || !pontosResponse.data.success) {
        throw new Error('Erro no processamento dos pontos únicos para inventário');
      }

      console.log('✅ ETAPA 3 CONCLUÍDA - Pontos únicos processados');
      console.log(`📍 Pontos únicos inseridos: ${pontosResponse.data.data?.pontosInseridos || 0}`);

        // 📊 MOSTRAR RELATÓRIO DETALHADO DE PASSANTES
        if (pontosResponse.data.data?.relatorioDetalhado) {
          const relatorio = pontosResponse.data.data.relatorioDetalhado;
          console.log('📊 RELATÓRIO BANCO DE ATIVOS:');
          console.log(`   ✅ Com dados reais: ${relatorio.comDados}`);
          console.log(`   🔴 Fluxo zero: ${relatorio.fluxoZero}`);
          console.log(`   📍 API sem cobertura: ${relatorio.apiSemDados}`);
          console.log(`   🔧 Valor padrão: ${relatorio.valorPadrao}`);
        }

      // 🔄 ETAPA 4: Criando planos de mídia
      atualizarLoadingAba4('Criando planos', 70, 'Processando cidades do Excel...');
      console.log('🔄 ETAPA 4: Criando planos de mídia com dados da Aba 3...');

      // 4. Executar lógica da Aba 3 automaticamente com dados enriquecidos
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      
      // Extrair cidades únicas dos dados do Excel processado com seus estados
      const cidadesEstadosMap: {[key: string]: string} = {};
      dadosView.forEach((d: any) => {
        if (d.praca_st && !cidadesEstadosMap[d.praca_st]) {
          cidadesEstadosMap[d.praca_st] = d.uf_st;
        }
      });
      
      const cidadesExcel = Object.keys(cidadesEstadosMap);
      
      console.log(`🏙️ Cidades encontradas no Excel: ${cidadesExcel.join(', ')}`);
      console.log(`📊 Total de cidades para processar: ${cidadesExcel.length}`);
      
      // Buscar códigos IBGE dinamicamente do banco de dados
      const ibgeCodesMap: {[key: string]: number} = {};
      for (const cidade of cidadesExcel) {
        const estado = cidadesEstadosMap[cidade];
        
        try {
          const ibgeResponse = await axios.post('/cidades-ibge', {
            cidade_st: cidade,
            estado_st: estado
          });
          
          if (ibgeResponse.data && ibgeResponse.data.ibgeCode) {
            ibgeCodesMap[cidade] = ibgeResponse.data.ibgeCode;
            console.log(`✅ ibgeCode encontrado para ${cidade}/${estado}: ${ibgeResponse.data.ibgeCode}`);
          } else {
            console.warn(`⚠️ ibgeCode não encontrado para ${cidade}/${estado}, usando 0`);
            ibgeCodesMap[cidade] = 0;
          }
        } catch (error: any) {
          console.error(`❌ Erro ao buscar ibgeCode para ${cidade}/${estado}:`, error.response?.data || error.message);
          ibgeCodesMap[cidade] = 0;
        }
      }
      
      // Criar plano mídia desc para cada cidade encontrada no Excel
      const recordsJson = cidadesExcel.map((cidade) => ({
        planoMidiaDesc_st: `${planoMidiaGrupo_st}_${(cidade || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
        usuarioId_st: user?.id || '',
        usuarioName_st: user?.name || '',
        gender_st: targetSalvoLocal.genero,
        class_st: targetSalvoLocal.classe,
        age_st: targetSalvoLocal.faixaEtaria,
        ibgeCode_vl: ibgeCodesMap[cidade] || 0
      }));

      const descResponse = await axios.post('/plano-midia-desc', {
        planoMidiaGrupo_pk: uploadData.pk,
        recordsJson
      });

      if (!descResponse.data || !Array.isArray(descResponse.data)) {
        throw new Error('Erro na criação do plano mídia desc');
      }

      const descPks = descResponse.data.map(item => item.new_pk);
      console.log('✅ ETAPA 4A CONCLUÍDA - Plano Mídia Desc criado para cada cidade');
      console.log(`📋 PKs criados: ${descPks.join(', ')}`);
      
      // Verificar se todas as cidades têm PKs
      if (descPks.length !== cidadesExcel.length) {
        console.warn(`⚠️ ATENÇÃO: ${cidadesExcel.length} cidades no Excel, mas apenas ${descPks.length} PKs criados!`);
        cidadesExcel.forEach((cidade, index) => {
          const pk = descPks[index];
          console.log(`   ${cidade}: ${pk ? `PK ${pk}` : '❌ SEM PK'}`);
        });
        } else {
        cidadesExcel.forEach((cidade, index) => {
          console.log(`   ✅ ${cidade}: PK ${descPks[index]}`);
        });
      }

      // ✅ SEM LIMPEZA: Não há mais registros temporários para deletar
      // Os registros são criados diretamente com dados reais

      // Criar períodos com base nos dados reais do Excel (cidade + semana)
      const periodsJson = dadosView.map((dadoView: any, index: number) => {
        // Mapear cidade para o PK correspondente
        const cidadeIndex = cidadesExcel.indexOf(dadoView.praca_st);
        const descPk = descPks[cidadeIndex];
        
        return {
          planoMidiaDesc_pk: descPk.toString(),
          semanaInicial_vl: dadoView.semanaInicial_vl.toString(),
          semanaFinal_vl: dadoView.semanaFinal_vl.toString(),
          versao_vl: "1"
        };
      });

      const spResponse = await axios.post('/sp-plano-midia-insert', {
        periodsJson: JSON.stringify(periodsJson)
      });

      if (!spResponse.data || !spResponse.data.data) {
        throw new Error('Erro na execução da stored procedure sp_planoMidiaInsert');
      }

      const spResults = spResponse.data.data;
      const midiaPks = spResults.map((item: any) => item.new_pk);

      console.log('✅ ETAPA 4B CONCLUÍDA - Stored procedure executada');

      console.log('🔄 ETAPA 5: Executando procedure uploadRoteirosInventarioToBaseCalculadoraInsert...');

      // 5. Executar procedure final para transferir dados para base calculadora
      // ✅ USAR A MESMA DATA QUE FOI USADA NO /upload-pontos-unicos
      const procedureResponse = await axios.post('/sp-upload-roteiros-inventario-insert', {
        planoMidiaGrupo_pk: uploadData.pk,
        date_dh: uploadData.date_dh // Esta data já foi corrigida no /upload-pontos-unicos
      });

      if (!procedureResponse.data || !procedureResponse.data.success) {
        throw new Error('Erro na execução da procedure uploadRoteirosInventarioToBaseCalculadoraInsert');
      }

      console.log('✅ ETAPA 5 CONCLUÍDA - Procedure uploadRoteirosInventarioToBaseCalculadoraInsert executada');

      // 🔄 ETAPA 6: Executando Databricks
      atualizarLoadingAba4('Databricks', 90, 'Executando processamento de dados avançado...');
      console.log('🔄 ETAPA 6: Executando job do Databricks para o grupo...');

      // 6. Executar job do Databricks para o grupo
      const databricksResponse = await axios.post('/databricks-run-job', {
        planoMidiaGrupo_pk: planoMidiaGrupo_pk,
        date_dh: uploadData.date_dh
      });

      if (!databricksResponse.data || !databricksResponse.data.success) {
        console.warn('⚠️ ETAPA 6 - Job do Databricks falhou, mas o processo continuará');
        console.warn('Resultado Databricks:', databricksResponse.data);
      } else {
        console.log('✅ ETAPA 6 CONCLUÍDA - Job do Databricks executado com sucesso');
      }

      // Atualizar estados finais
      setPlanoMidia_pks(midiaPks);

      // 7. Carregar dados das tabelas dinâmicas após salvar
      console.log('📊 Carregando dados das tabelas dinâmicas...');
      await carregarDadosMatrix();

      // 8. Habilitar Aba 6, navegar para ela e verificar status antes de carregar dados
      console.log('✅ Habilitando Aba 6, navegando para ela e verificando status do roteiro...');
      setAba6Habilitada(true);
      setAbaAtiva(6); // Navegar automaticamente para a Aba 6
      
      // Verificar se o roteiro está em processamento antes de tentar carregar dados
      try {
        const statusResponse = await axios.get(`/roteiro-status?pk=${planoMidiaGrupo_pk}`);
        if (statusResponse.data.success && statusResponse.data.data) {
          const { inProgress } = statusResponse.data.data;
          console.log('📊 Status do roteiro após publicação - inProgress:', inProgress);
          
          if (inProgress) {
            console.log('⏳ Roteiro publicado está em processamento. Ativando polling para aguardar...');
            setAguardandoProcessamento(true);
            // NÃO carregar dados ainda - o polling fará isso quando terminar
          } else {
            console.log('✅ Roteiro publicado já processado. Carregando dados...');
            await carregarDadosResultados();
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar status do roteiro após publicação:', error);
        // Em caso de erro, ativar polling por precaução
        console.log('⚠️ Ativando polling por precaução devido a erro na verificação...');
        setAguardandoProcessamento(true);
      }

      // 9. Mostrar resultado final completo COM RELATÓRIO DO BANCO DE ATIVOS
      const totalRoteiros = uploadResponse.data.roteiros.length;
      const totalCidadesSemanas = dadosView.length;
      const totalPontosUnicos = pontosResponse.data?.data?.pontosUnicos || 0;
      const totalPlanosMidia = midiaPks.length;

      // Informações sobre o Databricks
      const databricksInfo = databricksResponse.data?.summary || { successful: 0, failed: 0, total: 0 };
      
      // 📊 RELATÓRIO DETALHADO DO BANCO DE ATIVOS
      const relatorioBA = pontosResponse.data?.data?.relatorioDetalhado;
      
      // Mensagem resumida e amigável
      const cidadesTexto = cidadesExcel.join(', ');
      let mensagemSucesso = `Roteiro completo criado com sucesso! ${totalRoteiros} roteiros processados em ${cidadesExcel.length} ${cidadesExcel.length === 1 ? 'cidade' : 'cidades'}: ${cidadesTexto}.`;
      
      // Alerta se há pontos com observações
      if (relatorioBA && relatorioBA.valorPadrao > 0) {
        mensagemSucesso += ` ${relatorioBA.valorPadrao} ${relatorioBA.valorPadrao === 1 ? 'ponto utilizou' : 'pontos utilizaram'} dados simulados.`;
      }
      
      // 📎 FUNÇÃO PARA EXPORTAR PONTOS SEM COBERTURA
      const exportarPontosSemCobertura = () => {
        if (!relatorioBA || (relatorioBA.apiSemDados === 0 && relatorioBA.valorPadrao === 0)) {
          alert('Não há pontos com observações para exportar.');
          return;
        }

        // Preparar dados para exportação
        const dadosExport: any[] = [];
        
        // Pontos sem cobertura da API (Status 204)
        if (relatorioBA.detalhes.pontosApiSemDados) {
          relatorioBA.detalhes.pontosApiSemDados.forEach((ponto: string) => {
            const [localizacao, motivo] = ponto.split(': ');
            const [ambiente_midia, coords] = (localizacao || '').split(' (');
            const [ambiente, midia] = (ambiente_midia || '').split('-');
            const coordenadas = coords ? coords.replace(')', '') : '';
            // ✅ CORREÇÃO: Inverter ordem - coordenadas vêm como lng,lat (padrão GeoJSON)
            const [lng, lat] = coordenadas ? coordenadas.split(',') : ['', ''];
            
            dadosExport.push({
              'Ambiente': ambiente || '',
              'Tipo de Mídia': midia || '',
              'Latitude': lat || '',
              'Longitude': lng || '',
              'Status': 'Sem cobertura da API',
              'Motivo': motivo || 'Status 204 - Área sem dados',
              'Data de Análise': new Date().toLocaleDateString('pt-BR'),
              'Projeto': planoMidiaGrupo_st || 'N/A',
              'Observação': 'Coordenada fora da área de cobertura da API do banco de ativos'
            });
          });
        }
        
        // Pontos com valor padrão
        if (relatorioBA.detalhes.pontosValorPadrao) {
          relatorioBA.detalhes.pontosValorPadrao.forEach((ponto: string) => {
            const [localizacao, motivo] = ponto.split(': ');
            const [ambiente_midia, coords] = (localizacao || '').split(' (');
            const [ambiente, midia] = (ambiente_midia || '').split('-');
            const coordenadas = coords ? coords.replace(')', '') : '';
            // ✅ CORREÇÃO: Inverter ordem - coordenadas vêm como lng,lat (padrão GeoJSON)
            const [lng, lat] = coordenadas ? coordenadas.split(',') : ['', ''];
            
            dadosExport.push({
              'Ambiente': ambiente || '',
              'Tipo de Mídia': midia || '',
              'Latitude': lat || '',
              'Longitude': lng || '',
              'Status': 'Valor padrão aplicado',
              'Motivo': motivo || 'API falhou',
              'Data de Análise': new Date().toLocaleDateString('pt-BR'),
              'Projeto': planoMidiaGrupo_st || 'N/A',
              'Observação': 'Valor padrão aplicado devido à falha na API do banco de ativos'
            });
          });
        }

        // ✅ CORREÇÃO: Remover duplicadas baseado em Latitude + Longitude + Tipo de Mídia
        const dadosUnicos = dadosExport.filter((item, index, self) => {
          const chave = `${item.Latitude},${item.Longitude},${item['Tipo de Mídia']}`;
          return index === self.findIndex(i => 
            `${i.Latitude},${i.Longitude},${i['Tipo de Mídia']}` === chave
          );
        });

        console.log(`📊 Registros antes de remover duplicadas: ${dadosExport.length}`);
        console.log(`📊 Registros após remover duplicadas: ${dadosUnicos.length}`);

        // Converter para CSV (compatível com Excel)
        if (dadosUnicos.length === 0) {
          alert('Nenhum dado para exportar.');
          return;
        }

        const headers = Object.keys(dadosUnicos[0]);
        
        // Adicionar BOM para UTF-8 (compatibilidade com Excel)
        const BOM = '\\uFEFF';
        const csvContent = BOM + [
          headers.join(';'), // Usar ponto e vírgula para compatibilidade com Excel brasileiro
          ...dadosUnicos.map(row => 
            headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(';')
          )
        ].join('\\r\\n');

        // Criar e baixar arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const nomeArquivo = `pontos_sem_cobertura_${(planoMidiaGrupo_st || 'plano').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`📁 Arquivo exportado com sucesso!\\n\\nArquivo: ${nomeArquivo}\\nTotal de pontos: ${dadosExport.length}\\n\\nO arquivo foi salvo na pasta de Downloads e pode ser aberto no Excel.`);
      };

      // Mostrar mensagem de sucesso
      mostrarModal(mensagemSucesso, 'success', '🎉 Roteiro Completo Criado!');
      
      // ✅ FINALIZAR LOADING COM SUCESSO
      atualizarLoadingAba4('Concluído', 100, 'Processamento finalizado com sucesso!');
      
      // Aguardar 2 segundos para mostrar sucesso
      setTimeout(() => {
        setLoadingAba4(prev => ({ ...prev, ativo: false }));
      }, 2000);

    } catch (error) {
      console.error('💥 Erro no processamento Aba 4:', error);
      
      // ❌ FINALIZAR LOADING COM ERRO
      atualizarLoadingAba4('Erro', 0, `Falha: ${error}`);
      setTimeout(() => {
        setLoadingAba4(prev => ({ ...prev, ativo: false }));
      }, 3000);
      
      let mensagemErro = 'Erro no upload e processamento:\n\n';
      
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response) {
          mensagemErro += `Status: ${axiosError.response.status}\n`;
          mensagemErro += `Dados: ${JSON.stringify(axiosError.response.data, null, 2)}`;
        } else {
          mensagemErro += axiosError.message;
        }
      } else if (error instanceof Error) {
        mensagemErro += error.message;
      }
      
      alert(mensagemErro);
    } finally {
      setSalvandoAba4(false);
      setProcessandoFluxoCompleto(false);
    }
  };

  // Função para gerar o string do plano mídia grupo
  // Função para converter nome da agência em ID
  const getAgenciaIdByNome = (nomeAgencia: string): number | null => {
    const agenciaEncontrada = agencias.find(ag => ag.nome_agencia === nomeAgencia);
    return agenciaEncontrada ? agenciaEncontrada.id_agencia : null;
  };

  // Função para converter nome da marca em ID
  const getMarcaIdByNome = (nomeMarca: string): number | null => {
    const marcaEncontrada = marcas.find(m => m.nome_marca === nomeMarca);
    return marcaEncontrada ? marcaEncontrada.id_marca : null;
  };

  // Função para converter nome da categoria em ID
  const getCategoriaIdByNome = (nomeCategoria: string): number | null => {
    const categoriaEncontrada = categorias.find(c => c.nome_categoria === nomeCategoria);
    return categoriaEncontrada ? categoriaEncontrada.id_categoria : null;
  };

  // Função para converter valor formatado (R$ 10.000,00) em número
  const parseValorCampanha = (valorFormatado: string): number => {
    // Remove "R$", pontos e substitui vírgula por ponto
    const valorLimpo = valorFormatado
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    return parseFloat(valorLimpo);
  };

  const gerarPlanoMidiaGrupoString = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}${mes}${dia}`;
    
    // Remover caracteres especiais e espaços do nome do roteiro
    const nomeFormatado = (nomeRoteiro || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
    return `${dataFormatada}_${nomeFormatado}`;
  };

  // ✅ REMOVIDO: getIbgeCodeFromCidade() - Agora busca dinamicamente do banco via /api/cidades

  // Função para salvar Aba 1 - Criar Plano Mídia Grupo
  const salvarAba1 = async () => {
    // Validações
    if (!nomeRoteiro.trim()) {
      mostrarModal('Dê um nome para o seu roteiro antes de salvar.', 'warning', 'Nome obrigatório');
      return;
    }

    if (!agencia) {
      mostrarModal('Selecione uma agência antes de salvar.', 'warning', 'Agência obrigatória');
      return;
    }

    if (!marca) {
      mostrarModal('Selecione uma marca antes de salvar.', 'warning', 'Marca obrigatória');
      return;
    }

    if (!categoria) {
      mostrarModal('Selecione uma categoria antes de salvar.', 'warning', 'Categoria obrigatória');
      return;
    }

    if (!valorCampanha || valorCampanha.trim() === '' || valorCampanha === 'R$ 0,00') {
      mostrarModal('Informe o valor da campanha antes de salvar.', 'warning', 'Valor da campanha obrigatório');
      return;
    }

    setSalvandoAba1(true);
    try {
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      
      // Converter nomes em IDs
      const agencia_pk = getAgenciaIdByNome(agencia);
      const marca_pk = getMarcaIdByNome(marca);
      const categoria_pk = getCategoriaIdByNome(categoria);

      // Validar se os IDs foram encontrados
      if (!agencia_pk) {
        throw new Error('Agência selecionada não encontrada');
      }
      if (!marca_pk) {
        throw new Error('Marca selecionada não encontrada');
      }
      if (!categoria_pk) {
        throw new Error('Categoria selecionada não encontrada');
      }

      // Converter valor formatado para número
      const valorCampanha_vl = parseValorCampanha(valorCampanha);

      const response = await axios.post('/plano-midia-grupo', {
        planoMidiaGrupo_st,
        agencia_pk,
        marca_pk,
        categoria_pk,
        valorCampanha_vl
      });

      if (response.data && response.data[0]?.new_pk) {
        const newPk = response.data[0].new_pk;
        setPlanoMidiaGrupo_pk(newPk);
        setAba1Preenchida(true); // Marcar Aba 1 como preenchida
        mostrarModal('Seu roteiro foi criado! Agora configure o público-alvo.', 'success', '✅ Roteiro Salvo!');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao salvar Aba 1:', error);
      mostrarModal('Não foi possível salvar o roteiro. Tente novamente.', 'error', 'Erro ao salvar');
    } finally {
      setSalvandoAba1(false);
    }
  };

  // Função para salvar Aba 2 - Salvamento puramente local (sem tocar na base)
  const salvarAba2 = async () => {
    if (!planoMidiaGrupo_pk) {
      alert('É necessário salvar a Aba 1 primeiro');
      return;
    }

    if (!genero || !classe || !faixaEtaria) {
      mostrarModal('Defina todas as características do seu público-alvo.', 'warning', 'Dados incompletos');
      return;
    }

    setSalvandoAba2(true);
    try {
      console.log('💾 Salvando Aba 2 localmente - Configuração de target...');
      
      // ✅ SALVAMENTO PURAMENTE LOCAL: Não toca na base de dados
      // Os planoMidiaDesc_pk serão criados apenas na Aba 4 com dados reais
      
      // Salvar configuração de target no estado local
      setTargetSalvoLocal({
        genero,
        classe,
        faixaEtaria,
        salvo: true
      });
      
      setAba2Preenchida(true); // Marcar Aba 2 como preenchida
      
      mostrarModal(
        `Público-alvo configurado: ${genero}, ${classe}, ${faixaEtaria}. Agora selecione as cidades do seu roteiro.`,
        'success',
        '✅ Target Salvo!'
      );

    } catch (error) {
      console.error('💥 Erro ao salvar Aba 2:', error);
      mostrarModal('Não foi possível salvar a configuração. Tente novamente.', 'error', 'Erro ao salvar');
    } finally {
      setSalvandoAba2(false);
    }
  };

  // Função para salvar Aba 3 - Validar e preparar cidades (salvamento local)
  const salvarAba3 = async () => {
    if (!targetSalvoLocal?.salvo) {
      alert('É necessário salvar a Aba 2 primeiro');
      return;
    }

    if (cidadesSelecionadas.length === 0) {
      mostrarModal('Escolha pelo menos uma cidade para o seu roteiro.', 'warning', 'Nenhuma cidade selecionada');
      return;
    }

    setSalvandoAba3(true);
    try {
      console.log('💾 Salvando Aba 3 localmente - Configuração de cidades...');
      
      // ✅ SALVAMENTO LOCAL: Apenas validar e preparar dados
      // A criação real dos planos será feita na Aba 4 com dados reais
      
      // Salvar as cidades selecionadas para controle de estado
      setCidadesSalvas([...cidadesSelecionadas]);
      
      setAba3Preenchida(true); // Marcar Aba 3 como preenchida
      
      // Simular um plano mídia PK temporário para ativar a Aba 4
      setPlanoMidia_pks([999999]); // PK temporário, será substituído na Aba 4
      
      const totalCidades = cidadesSelecionadas.length;
      
      const cidadesNomes = cidadesSelecionadas.map(c => c.nome_cidade).join(', ');
      mostrarModal(
        `${totalCidades} ${totalCidades === 1 ? 'cidade selecionada' : 'cidades selecionadas'}: ${cidadesNomes}. Agora faça o upload do arquivo Excel com os roteiros.`,
        'success',
        '✅ Cidades Salvas!'
      );

    } catch (error) {
      console.error('💥 Erro ao salvar Aba 3:', error);
      mostrarModal('Não foi possível salvar as cidades. Tente novamente.', 'error', 'Erro ao salvar');
    } finally {
      setSalvandoAba3(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Esta função não será mais utilizada, cada aba tem seu próprio botão salvar
  };

  // Função para validar se o tipo de roteiro foi selecionado
  const validarTipoRoteiro = () => {
    if (!tipoRoteiro || (tipoRoteiro !== 'completo' && tipoRoteiro !== 'simulado')) {
      mostrarModal('Escolha se o seu roteiro será completo ou simulado.', 'info', 'Selecione o tipo');
      return false;
    }
    return true;
  };

  // Função para navegar entre abas com validação sequencial
  const navegarParaAba = (numeroAba: number) => {
    // Validação do tipo de roteiro (obrigatório para todas as abas exceto 1)
    if (numeroAba !== 1 && !validarTipoRoteiro()) {
      return; // Não permite navegação se não passou na validação
    }

    // Lógica sequencial das abas
    switch (numeroAba) {
      case 1:
        setAbaAtiva(1);
        break;
      case 2:
        if (aba1Preenchida) {
          setAbaAtiva(2);
        } else {
          mostrarModal('Complete os dados básicos antes de continuar.', 'info', 'Etapa 1 pendente');
        }
        break;
      case 3:
        if (aba2Preenchida) {
          setAbaAtiva(3);
        } else {
          mostrarModal('Configure o público-alvo antes de escolher as cidades.', 'info', 'Etapa 2 pendente');
        }
        break;
      case 4:
        if (aba3Preenchida) {
          setAbaAtiva(4);
        } else {
          mostrarModal('Selecione as cidades do seu roteiro antes de fazer o upload.', 'info', 'Etapa 3 pendente');
        }
        break;
      case 5:
        // Aba 5 sempre pode ser acessada (em desenvolvimento)
        setAbaAtiva(5);
        break;
      case 6:
        if (aba4Preenchida) {
          setAbaAtiva(6);
        } else {
          mostrarModal('Faça o upload dos roteiros antes de ver os resultados.', 'info', 'Etapa 4 pendente');
        }
        break;
      default:
        setAbaAtiva(numeroAba);
    }
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
                { label: modoVisualizacao ? "Visualizar resultados" : "Criar roteiro", path: "/criar-roteiro" },
                { label: modoVisualizacao ? "Resultados" : "Nomear roteiro" }
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
                {modoVisualizacao ? 'VISUALIZAR RESULTADOS' : 'CRIAR ROTEIRO'}
              </h1>
              
              <p className="text-base text-[#3a3a3a] tracking-[0.50px] leading-[19.2px] mb-16 max-w-[1135px]">
                {modoVisualizacao 
                  ? 'Visualize os resultados detalhados do seu plano de mídia na Aba 6.'
                  : 'Nesta seção, é possível criar novos roteiros na Colmeia. Complete as etapas a seguir para finalizar a configuração.'
                }
              </p>

              {/* Tipo de roteiro */}
              <div className="w-[500px] mb-8">
                <label className="block text-base text-[#3a3a3a] mb-2">
                  Tipo de roteiro <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={tipoRoteiro}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTipoRoteiro(v);
                      if (v === 'completo') setImportPlanoData(null);
                    }}
                    className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                  >
                    <option value="">Selecione qual tipo do roteiro irá criar</option>
                    <option value="completo">Roteiro Completo</option>
                    <option value="simulado">Roteiro Simulado</option>
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
                  onClick={() => navegarParaAba(1)}
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
                  onClick={() => navegarParaAba(2)}
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
                  onClick={() => navegarParaAba(3)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 3 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>03</span>
                  <span className={`font-medium ${abaAtiva === 3 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Configurar praça</span>
                  {abaAtiva === 3 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 4 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => navegarParaAba(4)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 4 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>04</span>
                  <span className={`font-medium ${abaAtiva === 4 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Definir vias públicas</span>
                  {abaAtiva === 4 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 5 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => navegarParaAba(5)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 5 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>05</span>
                  <span className={`font-medium ${abaAtiva === 5 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Definir indoor</span>
                  {abaAtiva === 5 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                {(aba6Habilitada || modoVisualizacao) && (
                  <div 
                    className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                      abaAtiva === 6 
                        ? 'bg-white border-2 border-blue-500 rounded-lg' 
                        : 'hover:bg-gray-50 rounded-lg'
                    }`}
                    onClick={() => navegarParaAba(6)}
                  >
                    <span className={`font-bold text-sm mr-2 ${abaAtiva === 6 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>06</span>
                    <span className={`font-medium ${abaAtiva === 6 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Resultados</span>
                    {abaAtiva === 6 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                  </div>
                )}
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="px-16 pb-20">
              {/* Aba 1 - Nomear roteiro */}
              {abaAtiva === 1 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      {modoVisualizacao ? 'Dados do roteiro' : 'Cadastre os dados do seu novo roteiro'}
                    </h3>
                  </div>

                  {/* Importar Plano OOH (apenas para Roteiro Simulado) - preenche praças e sugere nome/valor */}
                  {tipoRoteiro === 'simulado' && !modoVisualizacao && (
                    <ImportarPlanoAba1
                      existingData={importPlanoData}
                      onPracasDetectadas={handlePracasDetectadas}
                      onDataParsed={handleDataParsedImport}
                      onClear={() => {
                        setImportPlanoData(null);
                        setCidadesSelecionadas([]);
                        setCidadesSalvas([]);
                        setAba3Preenchida(false);
                      }}
                    />
                  )}
                  
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
                            disabled={modoVisualizacao}
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          />
                        </div>

                        {/* Agência */}
                        <div className="w-[500px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Agência
                          </label>
                          <div className="relative">
                            <select
                              value={agencia}
                              onChange={(e) => setAgencia(e.target.value)}
                              className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                              disabled={loadingAgencias || modoVisualizacao}
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
                        </div>

                        {/* Valor da campanha */}
                        <div className="w-[500px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Valor aprovado da campanha (R$)
                          </label>
                          <input
                            type="text"
                            value={valorCampanha}
                            onChange={(e) => {
                              if (modoVisualizacao) return;
                              const value = e.target.value;
                              // Remove tudo que não é número
                              const numbers = value.replace(/\D/g, '');
                              
                              if (numbers === '') {
                                setValorCampanha('');
                                return;
                              }
                              
                              // Converte para número e divide por 100 para ter centavos
                              const number = parseInt(numbers, 10);
                              const reais = Math.floor(number / 100);
                              const centavos = number % 100;
                              
                              // Formata no padrão brasileiro
                              const formatted = new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(reais + centavos / 100);
                              
                              setValorCampanha(formatted);
                            }}
                            placeholder="Ex.: R$ 10.000,00"
                            disabled={modoVisualizacao}
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                                className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                disabled={loadingMarcas || modoVisualizacao}
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
                              onClick={() => setModalMarcaAberto(true)}
                              disabled={modoVisualizacao}
                              className={`w-[50px] h-[50px] bg-[#ff4600] text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center transition-colors ${modoVisualizacao ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title="Adicionar nova marca"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Categoria */}
                        <div className="w-[500px]">
                          <label className="block text-base text-[#3a3a3a] mb-2">
                            Categoria
                          </label>
                          <div className="relative">
                            <select
                              value={categoria}
                              onChange={(e) => setCategoria(e.target.value)}
                              className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                              disabled={loadingCategorias || modoVisualizacao}
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
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    {!modoVisualizacao && (
                      <div className="mt-16 flex justify-start">
                        <button
                          type="button"
                          onClick={salvarAba1}
                          disabled={salvandoAba1 || !nomeRoteiro.trim() || !agencia || !marca || !categoria || !valorCampanha || valorCampanha === 'R$ 0,00'}
                          className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${
                            salvandoAba1 || !nomeRoteiro.trim() || !agencia || !marca || !categoria || !valorCampanha || valorCampanha === 'R$ 0,00'
                              ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                              : planoMidiaGrupo_pk
                              ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                              : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                          }`}
                        >
                          {salvandoAba1 ? 'Salvando...' : planoMidiaGrupo_pk ? '✓ Salvo' : 'Salvar'}
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* Aba 2 - Configurar target */}
              {abaAtiva === 2 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      {modoVisualizacao ? 'Target do roteiro' : 'Defina o target que fará parte do seu roteiro'}
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            disabled={loadingGeneros || modoVisualizacao}
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            disabled={loadingClasses || modoVisualizacao}
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
                              className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                              disabled={loadingFaixasEtarias || modoVisualizacao}
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
                    {!modoVisualizacao && (
                      <div className="mt-16 flex justify-start">
                        <button
                          type="button"
                          onClick={salvarAba2}
                          disabled={salvandoAba2 || !planoMidiaGrupo_pk || !genero || !classe || !faixaEtaria}
                          className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base ${
                            salvandoAba2 || !planoMidiaGrupo_pk || !genero || !classe || !faixaEtaria
                              ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                              : targetSalvoLocal?.salvo
                              ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                              : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                          }`}
                        >
                          {salvandoAba2 ? 'Salvando...' : targetSalvoLocal?.salvo ? '✓ Salvo' : 'Salvar'}
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* Aba 3 - Configurar praça */}
              {abaAtiva === 3 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      {modoVisualizacao ? 'Praças do roteiro' : 'Defina as praças (cidade / estado) que estarão no seu roteiro.'}
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
                            if (modoVisualizacao) return;
                            setSearchPraca(e.target.value);
                            setShowDropdownCidades(e.target.value.length > 0);
                          }}
                          onFocus={() => {
                            if (modoVisualizacao) return;
                            setShowDropdownCidades(searchPraca.length > 0);
                          }}
                          placeholder="Ex.: Sorocaba - SP"
                          disabled={loadingCidades || modoVisualizacao}
                          className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-50 cursor-not-allowed' : ''}`}
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
                              className="flex items-center bg-gray-50 text-[#3a3a3a] px-3 py-1 rounded-full text-sm"
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
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-t-lg border-b border-blue-200">
                                  <h5 className="text-sm font-bold text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    {cidade.nome_cidade}, {cidade.nome_estado}
                                </h5>
                                </div>
                                
                                <div className="bg-white border-l border-r border-t border-gray-300 rounded-b-lg overflow-hidden shadow-sm">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-600 text-white">
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Grupo</th>
                                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Descrição</th>
                                        <th className="px-4 py-3 text-right font-bold uppercase tracking-wide">Quantidade</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(() => {
                                        // Filtrar grupos que não começam com P
                                        const gruposFiltrados = Object.entries(inventario.grupos)
                                          .filter(([grupoKey]) => !grupoKey.toUpperCase().startsWith('P'));
                                        
                                        // Calcular total dos grupos filtrados
                                        const totalFiltrado = gruposFiltrados.reduce((sum, [_, grupoData]: [string, any]) => {
                                          return sum + (grupoData.total || 0);
                                        }, 0);
                                        
                                        return (
                                          <>
                                            {gruposFiltrados.map(([grupoKey, grupoData]: [string, any]) => 
                                        grupoData.subgrupos.map((subgrupo: any, index: number) => (
                                                <tr key={`${grupoKey}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                  <td className="px-4 py-3 font-medium text-[#3a3a3a]">
                                              {subgrupo.codigo}
                                            </td>
                                                  <td className="px-4 py-3 text-[#3a3a3a]">
                                              {subgrupo.descricao}
                                            </td>
                                                  <td className="px-4 py-3 text-right font-semibold text-[#3a3a3a]">
                                              {subgrupo.quantidade.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                      <tr className="bg-gray-500 text-white font-bold">
                                              <td className="px-4 py-3 uppercase tracking-wide">TOTAL</td>
                                              <td className="px-4 py-3"></td>
                                              <td className="px-4 py-3 text-right text-lg">
                                                {totalFiltrado.toLocaleString()}
                                        </td>
                                      </tr>
                                          </>
                                        );
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Botão Salvar */}
                    {!modoVisualizacao && (
                      <div className="mt-16 flex justify-start">
                        <button
                          type="button"
                          onClick={salvarAba3}
                          disabled={salvandoAba3 || !targetSalvoLocal?.salvo || cidadesSelecionadas.length === 0}
                          className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base font-medium ${
                            salvandoAba3 || !targetSalvoLocal?.salvo || cidadesSelecionadas.length === 0
                              ? 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed'
                              : planoMidia_pks.length > 0 && !cidadesMudaram()
                              ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                              : 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600'
                          }`}
                        >
                          {salvandoAba3 ? 'Salvando...' : planoMidia_pks.length > 0 && !cidadesMudaram() ? '✓ Salvo' : 'Salvar'}
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* Aba 4 - Definir vias públicas */}
              {abaAtiva === 4 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      {modoVisualizacao 
                        ? 'Vias públicas do roteiro' 
                        : tipoRoteiro === 'simulado' 
                          ? 'Adicione as mídias de via pública ao seu roteiro ou faça upload de seu plano pronto.'
                          : 'Faça o upload do seu plano.'
                      }
                    </h3>
                  </div>

                  {/* 📊 LOADING EM TEMPO REAL - ABA 4 */}
                  {loadingAba4.ativo && (
                    <div className="mb-8 p-8 bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl shadow-xl">
                      {/* Header com Progresso */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14">
                            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#ff4600] to-orange-400 rounded-full opacity-20"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#ff4600] border-t-transparent"></div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-[#3a3a3a]">{loadingAba4.etapa}</h4>
                            <p className="text-sm text-gray-600 mt-1">{loadingAba4.detalhes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold bg-gradient-to-r from-[#ff4600] to-orange-500 bg-clip-text text-transparent">
                            {loadingAba4.progresso}%
                          </div>
                          {loadingAba4.tempoInicio && (
                            <div className="text-xs text-gray-500 mt-1 font-medium">
                              ⏱️ {Math.floor((new Date().getTime() - loadingAba4.tempoInicio.getTime()) / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Barra de progresso moderna */}
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-6 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-[#ff4600] via-orange-400 to-amber-400 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
                          style={{ width: `${loadingAba4.progresso}%` }}
                        >
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Etapas do processo */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          loadingAba4.progresso >= 10 
                            ? 'bg-gradient-to-r from-[#ff4600] to-orange-400 text-white shadow-lg scale-105' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <div className="text-lg mb-1">📊</div>
                          <div className="text-xs font-semibold">Salvando roteiros</div>
                        </div>
                        <div className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          loadingAba4.progresso >= 25 
                            ? 'bg-gradient-to-r from-[#ff4600] to-orange-400 text-white shadow-lg scale-105' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <div className="text-lg mb-1">🔄</div>
                          <div className="text-xs font-semibold">Consultando dados</div>
                        </div>
                        <div className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          loadingAba4.progresso >= 40 
                            ? 'bg-gradient-to-r from-[#ff4600] to-orange-400 text-white shadow-lg scale-105' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <div className="text-lg mb-1">🏢</div>
                          <div className="text-xs font-semibold">Banco de Ativos</div>
                        </div>
                        <div className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          loadingAba4.progresso >= 70 
                            ? 'bg-gradient-to-r from-[#ff4600] to-orange-400 text-white shadow-lg scale-105' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <div className="text-lg mb-1">📋</div>
                          <div className="text-xs font-semibold">Criando planos</div>
                        </div>
                        <div className={`p-3 rounded-xl text-center transition-all duration-300 ${
                          loadingAba4.progresso >= 90 
                            ? 'bg-gradient-to-r from-[#ff4600] to-orange-400 text-white shadow-lg scale-105' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <div className="text-lg mb-1">🚀</div>
                          <div className="text-xs font-semibold">Databricks</div>
                        </div>
                      </div>
                      
                      {loadingAba4.etapa === 'Banco de Ativos' && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-md">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-sm font-bold">⚡</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-amber-900">
                                Processo crítico em execução
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Consultando API externa para dados de passantes. Este processo pode demorar alguns minutos.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🎯 CONTROLE GRANULAR DO BANCO DE ATIVOS */}
                  {bancoAtivosStatus.ativo && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="animate-pulse rounded-full h-6 w-6 bg-green-500 mr-3"></div>
                          <div>
                            <h4 className="text-lg font-bold text-green-800">Banco de Ativos - Controle Granular</h4>
                            <p className="text-sm text-green-600 mt-1">{bancoAtivosStatus.detalhes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-800">
                            {bancoAtivosStatus.coordenadasProcessadas}/{bancoAtivosStatus.coordenadasTotal}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {bancoAtivosStatus.taxaSucesso.toFixed(1)}% sucesso
                          </div>
                        </div>
                      </div>
                      
                      {/* Progresso das coordenadas */}
                      <div className="w-full bg-green-200 rounded-full h-3 mb-4">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${(bancoAtivosStatus.coordenadasProcessadas / bancoAtivosStatus.coordenadasTotal) * 100}%` }}
                        ></div>
                      </div>
                      
                      {/* Estatísticas detalhadas */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-green-100 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-green-800">{bancoAtivosStatus.sucessos}</div>
                          <div className="text-xs text-green-600">Sucessos</div>
                        </div>
                        <div className="bg-red-100 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-red-800">{bancoAtivosStatus.falhas}</div>
                          <div className="text-xs text-red-600">Falhas</div>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-blue-800">{bancoAtivosStatus.lotesProcessados}/{bancoAtivosStatus.lotesTotal}</div>
                          <div className="text-xs text-blue-600">Lotes</div>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-purple-800">{bancoAtivosStatus.modoProcessamento}</div>
                          <div className="text-xs text-purple-600">Modo</div>
                        </div>
                      </div>
                      
                      {/* Tempo decorrido */}
                      {bancoAtivosStatus.tempoInicio && (
                        <div className="mt-4 text-center text-sm text-green-600">
                          ⏱️ Tempo decorrido: {Math.floor((new Date().getTime() - bancoAtivosStatus.tempoInicio.getTime()) / 1000)}s
                        </div>
                      )}
                    </div>
                  )}

                  
                  <form onSubmit={handleSubmit}>
                    {/* Roteiro Completo - Upload de arquivo */}
                    {tipoRoteiro === 'completo' && (
                      <>
                    {/* Card de Upload */}
                    <div className="mb-8 bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-200 shadow-sm">
                      {/* Header com ícone */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-[#ff4600] rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">Upload do Arquivo Excel</h4>
                          <p className="text-sm text-gray-600">Carregue seu plano de mídia formatado</p>
                        </div>
                      </div>

                      {/* Botão de Download do Template */}
                      <div className="mb-4">
                        <a
                          href="/template_plano_midia.xlsx"
                          download="template_plano_midia.xlsx"
                          className="flex items-center gap-2 px-4 py-2 text-[#ff4600] hover:text-orange-600 font-medium border border-orange-300 rounded-lg hover:bg-white transition-colors inline-flex"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download template Excel
                        </a>
                    </div>

                      {/* Área de Upload */}
                      <div className="space-y-3">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && !processandoExcel && !uploadCompleto) {
                                processarArquivoExcel(file);
                              }
                            }}
                            className="hidden"
                            id="excel-upload"
                            disabled={processandoExcel || uploadCompleto}
                          />
                        
                        {/* Botão de Upload */}
                          <label
                            htmlFor="excel-upload"
                          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg transition-all duration-200 ${
                              processandoExcel
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                : uploadCompleto
                              ? 'bg-green-500 text-white cursor-not-allowed shadow-lg'
                              : 'bg-[#ff4600] text-white hover:bg-orange-600 cursor-pointer shadow-md hover:shadow-lg'
                          }`}
                        >
                          {processandoExcel ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                              <span className="font-medium">Processando...</span>
                            </>
                          ) : uploadCompleto ? (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">Upload Concluído</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              <span className="font-medium">Selecionar arquivo Excel</span>
                            </>
                          )}
                        </label>

                        {/* Nome do arquivo */}
                        {arquivoExcel && !processandoExcel && uploadCompleto && (
                          <div className="bg-white border-2 border-green-200 rounded-lg p-4 mt-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                          </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{arquivoExcel.name}</p>
                                <p className="text-xs text-gray-500">Arquivo processado com sucesso</p>
                              </div>
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Mensagem de status */}
                      {mensagemProcessamento && (
                        <div className={`mt-4 p-4 rounded-lg text-sm font-medium border-2 ${
                          mensagemProcessamento.includes('❌') 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : mensagemProcessamento.includes('✅')
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {mensagemProcessamento}
                        </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Roteiro Simulado */}
                    {tipoRoteiro === 'simulado' && (
                      <>
                        {/* Toggle: Manual | Importar Plano */}
                        {!modoVisualizacao && (
                          <div className="mb-8 flex gap-2 p-1 bg-[#f0f0f0] rounded-xl w-fit">
                            <button
                              type="button"
                              onClick={() => setModoSimulado('manual')}
                              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                modoSimulado === 'manual'
                                  ? 'bg-white text-[#ff4600] shadow-sm border border-orange-200'
                                  : 'text-[#666] hover:text-[#333]'
                              }`}
                            >
                              Configurar manualmente
                            </button>
                            <button
                              type="button"
                              onClick={() => setModoSimulado('importar')}
                              disabled={!planoMidiaGrupo_pk}
                              title={!planoMidiaGrupo_pk ? 'Salve a Aba 1 primeiro para habilitar a importação' : undefined}
                              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                modoSimulado === 'importar'
                                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200'
                                  : !planoMidiaGrupo_pk
                                  ? 'text-[#aaa] cursor-not-allowed'
                                  : 'text-[#666] hover:text-[#333]'
                              }`}
                            >
                              Importar Plano de Mídia OOH
                            </button>
                          </div>
                        )}

                        {/* Modo Importar */}
                        {modoSimulado === 'importar' && planoMidiaGrupo_pk && !modoVisualizacao && (
                          <ImportarPlanoMidia
                            planoMidiaGrupo_pk={planoMidiaGrupo_pk}
                            nomeRoteiro={nomeRoteiro}
                            initialData={importPlanoData}
                            onPracasDetectadas={handlePracasDetectadas}
                            onImportacaoCompleta={handleImportacaoCompleta}
                            onClear={() => setImportPlanoData(null)}
                          />
                        )}

                        {/* Modo Manual */}
                        {(modoSimulado === 'manual' || modoVisualizacao) && (
                        <>
                        {/* Praças da Aba 3 */}
                        <div className="mb-8">
                          <label className="block text-base font-bold text-[#3a3a3a] mb-4">
                            Praça(s) configurada(s) na Aba 3
                          </label>
                          <div className="relative">
                            {cidadesSalvas.length > 0 ? (
                              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <span className="font-bold text-blue-800 text-lg">
                                    {cidadesSalvas.length} praça{cidadesSalvas.length > 1 ? 's' : ''} configurada{cidadesSalvas.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {cidadesSalvas.map((cidade, index) => (
                                    <div key={cidade.id_cidade} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
                                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </span>
                                      <span className="text-blue-700 font-medium">
                                        {cidade.nome_cidade} - {cidade.nome_estado}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-bold text-yellow-800 text-lg">Configuração necessária</p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                      Vá para a Aba 3 e configure as praças antes de criar o roteiro simulado.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>


                        {/* Card de Configuração */}
                        {cidadesSalvas.length > 0 && (
                          <div className="mb-8 bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-200 shadow-sm">
                            <div className="space-y-4">
                              {/* Seleção de Semanas */}
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  Quantidade de Semanas
                                </label>
                                <select 
                                  value={quantidadeSemanas}
                                  onChange={(e) => {
                                    const novasSemanas = parseInt(e.target.value);
                                    setQuantidadeSemanas(novasSemanas);
                                    // Regenerar tabelas com novas semanas se já existem
                                    if (Object.keys(tabelaSimulado).length > 0) {
                                      gerarTabelaSimulado(novasSemanas);
                                    }
                                  }}
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                >
                                  {Array.from({length: 12}, (_, i) => i + 1).map(sem => (
                                    <option key={sem} value={sem}>
                                      {sem} {sem === 1 ? 'Semana' : 'Semanas'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* Botão para gerar tabela */}
                              <div>
                                <p className="text-sm text-gray-600 mb-3">
                                  Clique no botão abaixo para gerar automaticamente as tabelas de vias públicas para <span className="font-bold text-orange-600">{cidadesSalvas.length} {cidadesSalvas.length === 1 ? 'praça configurada' : 'praças configuradas'}</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={() => gerarTabelaSimulado(quantidadeSemanas)}
                                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#ff4600] text-white rounded-xl hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl font-bold text-lg"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Gerar Tabelas para Todas as Praças
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tabelas Simuladas - Uma por Praça */}
                        {Object.keys(tabelaSimulado).length > 0 && (
                          <div className="mb-8 space-y-8">
                            {cidadesSalvas.map((praca) => {
                              // Buscar tabela usando número como chave
                              const idPracaNumero = Number(praca.id_cidade);
                              const tabelaDaPraca = tabelaSimulado[idPracaNumero] || tabelaSimulado[praca.id_cidade as any];
                              if (!tabelaDaPraca || tabelaDaPraca.length === 0) return null;
                              
                              return (
                                <div key={praca.id_cidade} className="mb-8">
                                  {/* Header da Tabela */}
                                  <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl border-b-4 border-blue-800">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-xl font-bold text-white uppercase tracking-wide mb-2">
                                          Configure as vias públicas
                                        </h4>
                                        <p className="text-blue-100">
                                          📍 {praca.nome_cidade} - {praca.nome_estado}
                                        </p>
                                      </div>
                                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tabela */}
                                  <div className="overflow-x-auto border-2 border-gray-300 rounded-b-xl shadow-lg">
                                    <table className="w-full">
                                      <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                                        <tr>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide text-xs">Grupo</th>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide text-xs">Descrição</th>
                                          <th className="px-4 py-3 text-center font-bold uppercase tracking-wide text-xs">Visibilidade</th>
                                          <th className="px-4 py-3 text-center font-bold uppercase tracking-wide text-xs">Digital Inserções</th>
                                          <th className="px-4 py-3 text-center font-bold uppercase tracking-wide text-xs">Digital Máx. Inserções</th>
                                          <th className="px-4 py-3 text-center font-bold uppercase tracking-wide text-xs">Total de Ativos</th>
                                          {/* Colunas dinâmicas de semanas */}
                                          {tabelaDaPraca[0]?.semanas && tabelaDaPraca[0].semanas.map((semana: any, idx: number) => (
                                            <th key={idx} className="px-4 py-3 text-center font-bold uppercase tracking-wide text-xs">
                                              Semana {semana.semana}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tabelaDaPraca.map((linha, index) => (
                                          <tr key={index} className={`border-b border-gray-200 transition-colors ${index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}`}>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{linha.grupoSub_st}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{linha.grupoDesc_st}</td>
                                            <td className="px-4 py-3">
                                              {/* Visibilidade só aparece para Estático */}
                                              {linha.estaticoDigital_st === 'E' ? (
                                                <select 
                                                  value={linha.visibilidade}
                                                  onChange={(e) => {
                                                    const novasTabelas = { ...tabelaSimulado };
                                                    novasTabelas[idPracaNumero] = [...(novasTabelas[idPracaNumero] || [])];
                                                    novasTabelas[idPracaNumero][index].visibilidade = e.target.value;
                                                    setTabelaSimulado(novasTabelas);
                                                  }}
                                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                  <option value="25">Baixa</option>
                                                  <option value="50">Média</option>
                                                  <option value="75">Moderada</option>
                                                  <option value="100">Alta</option>
                                                </select>
                                              ) : (
                                                <div className="w-full px-3 py-2 text-sm text-center text-gray-400 italic">
                                                  N/A
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3">
                                              <input
                                                type="number"
                                                min="0"
                                                value={linha.seDigitalInsercoes_vl || 0}
                                                onChange={(e) => {
                                                  const novasTabelas = { ...tabelaSimulado };
                                                  novasTabelas[idPracaNumero] = [...(novasTabelas[idPracaNumero] || [])];
                                                  novasTabelas[idPracaNumero][index].seDigitalInsercoes_vl = parseInt(e.target.value) || 0;
                                                  setTabelaSimulado(novasTabelas);
                                                }}
                                                className="w-full px-3 py-2 text-sm text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                placeholder="0"
                                              />
                                            </td>
                                            <td className="px-4 py-3">
                                              <input
                                                type="number"
                                                min="0"
                                                value={linha.seDigitalMaximoInsercoes_vl || 0}
                                                onChange={(e) => {
                                                  const novasTabelas = { ...tabelaSimulado };
                                                  novasTabelas[idPracaNumero] = [...(novasTabelas[idPracaNumero] || [])];
                                                  novasTabelas[idPracaNumero][index].seDigitalMaximoInsercoes_vl = parseInt(e.target.value) || 0;
                                                  setTabelaSimulado(novasTabelas);
                                                }}
                                                className="w-full px-3 py-2 text-sm text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                placeholder="0"
                                              />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <div className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg">
                                                {linha.quantidade || 0}
                                              </div>
                                            </td>
                                            {/* Células dinâmicas de semanas */}
                                            {linha.semanas && linha.semanas.map((semana: any, semanaIdx: number) => (
                                              <td key={semanaIdx} className="px-2 py-3">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={semana.insercaoComprada || 0}
                                                  onChange={(e) => {
                                                    const novasTabelas = { ...tabelaSimulado };
                                                    novasTabelas[idPracaNumero] = [...(novasTabelas[idPracaNumero] || [])];
                                                    const valor = parseInt(e.target.value) || 0;
                                                    novasTabelas[idPracaNumero][index].semanas[semanaIdx].insercaoComprada = valor;
                                                    setTabelaSimulado(novasTabelas);
                                                  }}
                                                  className="w-full px-2 py-2 text-sm text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                                  placeholder="0"
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Botão Salvar para Roteiro Simulado */}
                        {Object.keys(tabelaSimulado).length > 0 && (
                          <div className="mb-8 flex justify-center">
                            <button
                              type="button"
                              onClick={salvarRoteiroSimulado}
                              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-200 font-bold text-lg shadow-lg ${
                                roteiroSimuladoSalvo 
                                  ? 'bg-green-500 text-white cursor-default shadow-green-300' 
                                  : salvandoAba4
                                  ? 'bg-gray-500 text-white cursor-not-allowed'
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-xl'
                              }`}
                              disabled={salvandoAba4 || roteiroSimuladoSalvo}
                            >
                              {salvandoAba4 ? (
                                <>
                                  <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></div>
                                  <span>Processando...</span>
                                </>
                              ) : roteiroSimuladoSalvo ? (
                                <>
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Roteiro Simulado Salvo!</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                  </svg>
                                  <span>Salvar Roteiro Simulado</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        </>
                        )}
                      </>
                    )}

                    {/* Continuação do conteúdo para roteiro completo */}
                    {tipoRoteiro === 'completo' && (
                      <>

                    {/* Validação de consistência de cidades */}
                    {roteirosCarregados.length > 0 && cidadesSelecionadas.length > 0 && (
                      <div className="mb-8">
                        {(() => {
                          const validacao = validarConsistenciaCidades();
                          
                          if (validacao.valido) {
                            return (
                              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-green-800 text-lg mb-1">✅ Consistência Validada!</h4>
                                    <p className="text-sm text-green-700">
                                      As {validacao.detalhes?.totalCidadesAba3} cidades da Aba 3 correspondem exatamente às {validacao.detalhes?.totalPracasExcel} praças do Excel.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (validacao.detalhes) {
                            return (
                              <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-red-800 text-lg mb-2">❌ Inconsistência Detectada!</h4>
                                    <p className="text-sm text-red-700 mb-4">
                                      As cidades da Aba 3 não correspondem às praças do Excel.
                                    </p>
                                    
                                    <div className="bg-white rounded-lg p-4 space-y-3">
                                    {validacao.detalhes.cidadesFaltandoNoExcel.length > 0 && (
                                        <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-yellow-50 rounded-r">
                                          <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Cidades da Aba 3 ausentes no Excel:</p>
                                          <p className="text-xs text-yellow-700">
                                          {validacao.detalhes.cidadesFaltandoNoExcel.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {validacao.detalhes.pracasSobrandoNoExcel.length > 0 && (
                                        <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-r">
                                          <p className="text-xs font-bold text-blue-800 mb-1">ℹ️ Praças do Excel não selecionadas na Aba 3:</p>
                                          <p className="text-xs text-blue-700">
                                          {validacao.detalhes.pracasSobrandoNoExcel.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    </div>
                                    
                                    <p className="text-xs text-red-700 font-medium mt-4">
                                      📊 Aba 3: {validacao.detalhes.totalCidadesAba3} cidades | Excel: {validacao.detalhes.totalPracasExcel} praças
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Mensagem informativa quando dados não foram salvos */}
                    {roteirosCarregados.length > 0 && uploadRoteiros_pks.length === 0 && (
                      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">ℹ️</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-blue-800">Tabelas Dinâmicas</h4>
                            <p className="text-blue-700 mt-1">
                              As tabelas dinâmicas para definir vias públicas aparecerão aqui após você salvar os dados carregados.
                            </p>
                            <p className="text-sm text-blue-600 mt-2">
                              Clique em "Salvar" na Aba 4 para processar os dados e carregar as tabelas.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tabelas dinâmicas por praça - apenas após salvar os dados */}
                    {roteirosCarregados.length > 0 && uploadRoteiros_pks.length > 0 && (
                      <div className="mb-8">
                        {carregandoDadosMatrix ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin h-6 w-6 border-2 border-[#ff4600] border-t-transparent rounded-full"></div>
                              <span className="text-[#3a3a3a] font-medium">Carregando dados das tabelas...</span>
                            </div>
                          </div>
                        ) : pracasUnicas.length > 0 ? (
                          <div className="space-y-8">
                            {pracasUnicas.map((praca, pracaIndex) => {
                              const semanasPraca = semanasUnicas;
                              
                              // Extrair grupos únicos que existem nos dados desta praça
                              // Normalizar nomes para comparação (maiúsculas, sem acentos)
                              const normalizarNome = (nome: string) => nome?.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
                              const pracaNormalizada = normalizarNome(praca.praca);
                              const ufNormalizada = praca.uf?.toUpperCase() || '';
                              
                              const gruposPracaMap = new Map();
                              const grupoComDados = new Map(); // Rastrear quais grupos têm dados
                              
                              dadosMatrixRow.forEach(d => {
                                const cidadeNormalizada = normalizarNome(d.cidade_st);
                                const estadoNormalizado = d.estado_st?.toUpperCase() || '';
                                
                                if (cidadeNormalizada === pracaNormalizada && estadoNormalizado === ufNormalizada && d.grupoSub_st) {
                                  // Acumular quantidade de registros por grupo
                                  const qtdAtual = grupoComDados.get(d.grupoSub_st) || 0;
                                  grupoComDados.set(d.grupoSub_st, qtdAtual + (d.qtd_registros || 0));
                                  
                                  if (!gruposPracaMap.has(d.grupoSub_st)) {
                                    // Buscar descrição real do grupo nos dados de subgrupos
                                    const subGrupoInfo = dadosSubGrupos.find(sg => sg.grupoSub_st === d.grupoSub_st);
                                    
                                    // Debug para primeira praça
                                    if (pracaIndex === 0 && gruposPracaMap.size === 0) {
                                      console.log('🔍 DEBUG - Buscando descrição:', {
                                        grupoSub_st: d.grupoSub_st,
                                        subGrupoInfo: subGrupoInfo,
                                        totalSubGrupos: dadosSubGrupos.length,
                                        exemploSubGrupo: dadosSubGrupos[0]
                                      });
                                    }
                                    
                                    gruposPracaMap.set(d.grupoSub_st, {
                                      grupoSub_st: d.grupoSub_st,
                                      grupo_st: d.grupoSub_st.substring(0, 2), // Ex: G1E -> G1
                                      grupoDesc_st: subGrupoInfo?.grupoDesc_st || d.grupoSub_st
                                    });
                                  }
                                }
                              });
                              
                              // Filtrar apenas grupos que têm dados (qtd_registros > 0)
                              const gruposPraca = Array.from(gruposPracaMap.values())
                                .filter(grupo => (grupoComDados.get(grupo.grupoSub_st) || 0) > 0);
                              
                              return (
                                <div key={pracaIndex} className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg">
                                  {/* Header da Praça */}
                                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 border-b-4 border-blue-800">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                          {String(pracaIndex + 1).padStart(2, '0')}
                                        </div>
                                      <div>
                                          <h4 className="text-xl font-bold text-white uppercase tracking-wide">
                                            Praça {String(pracaIndex + 1)}
                                        </h4>
                                          <p className="text-sm text-blue-100 mt-1">
                                            📍 {praca.praca} - {praca.uf} | {semanasPraca.length} semana{semanasPraca.length > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                        </div>
                                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tabela da Praça */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Grupo</th>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Descrição</th>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Visibilidade</th>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Inserção comprada</th>
                                          <th className="px-4 py-3 text-left font-bold uppercase tracking-wide">Inserção oferecida</th>
                                          {semanasPraca.map((semana, semanaIndex) => (
                                            <th key={semanaIndex} className="px-4 py-3 text-center font-bold uppercase tracking-wide">
                                              W{semanaIndex + 1}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {gruposPraca.map((grupo, grupoIndex) => {
                                          // Buscar dados específicos para este grupo e praça em dadosMatrix (que tem os campos corretos)
                                          const dadosGrupo = dadosMatrix.filter(d => {
                                            const cidadeNormalizada = normalizarNome(d.cidade_st);
                                            const estadoNormalizado = d.estado_st?.toUpperCase() || '';
                                            return d.grupoSub_st === grupo.grupoSub_st && 
                                                   cidadeNormalizada === pracaNormalizada && 
                                                   estadoNormalizado === ufNormalizada;
                                          });
                                          
                                          // Debug: Ver o que está sendo filtrado
                                          if (grupoIndex === 0 && pracaIndex === 0) {
                                            console.log('🔍 DEBUG - Primeira linha da primeira praça:');
                                            console.log('  grupo.grupoSub_st:', grupo.grupoSub_st);
                                            console.log('  praca.praca:', praca.praca);
                                            console.log('  praca.uf:', praca.uf);
                                            console.log('  dadosMatrix total:', dadosMatrix.length);
                                            console.log('  dadosGrupo filtrado:', dadosGrupo.length);
                                            if (dadosMatrix.length > 0) {
                                              console.log('  Exemplo dadosMatrix[0]:', dadosMatrix[0]);
                                            }
                                            if (dadosGrupo.length > 0) {
                                              console.log('  Exemplo dadosGrupo[0]:', dadosGrupo[0]);
                                            }
                                          }
                                          
                                          // Pegar o primeiro registro do grupo para obter os valores únicos (não somados)
                                          const primeiroRegistro = dadosGrupo.length > 0 ? dadosGrupo[0] : null;
                                          
                                          // Debug: verificar campos disponíveis
                                          if (primeiroRegistro) {
                                            console.log(`🔍 DEBUG - Grupo ${grupo.grupoSub_st} | Praça ${praca.praca}-${praca.uf}:`, {
                                              grupoSub_st: primeiroRegistro.grupoSub_st,
                                              seEstaticoVisibilidade_st: primeiroRegistro.seEstaticoVisibilidade_st,
                                              seDigitalInsercoes_vl: primeiroRegistro.seDigitalInsercoes_vl,
                                              seDigitalMaximoInsercoes_vl: primeiroRegistro.seDigitalMaximoInsercoes_vl,
                                              qtd_registros: primeiroRegistro.qtd_registros
                                            });
                                          }
                                          
                                          // Visibilidade vem de seEstaticoVisibilidade_st (string)
                                          const visibilidade = primeiroRegistro?.seEstaticoVisibilidade_st || 'Selecionar';
                                          
                                          // Inserção comprada vem de seDigitalInsercoes_vl
                                          const insercaoComprada = primeiroRegistro?.seDigitalInsercoes_vl ? Math.round(primeiroRegistro.seDigitalInsercoes_vl) : 0;
                                          
                                          // Inserção oferecida vem de seDigitalMaximoInsercoes_vl
                                          const insercaoOferecida = primeiroRegistro?.seDigitalMaximoInsercoes_vl ? Math.round(primeiroRegistro.seDigitalMaximoInsercoes_vl) : 0;
                                          
                                          return (
                                            <tr key={grupoIndex} className="border-b border-gray-200 hover:bg-gray-50">
                                              <td className="px-4 py-3 text-[#3a3a3a] font-medium">
                                                {grupo.grupoSub_st}
                                              </td>
                                              <td className="px-4 py-3 text-[#3a3a3a]">
                                                {grupo.grupoDesc_st}
                                              </td>
                                              <td className="px-4 py-3">
                                                <input 
                                                  type="text" 
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] bg-gray-50"
                                                  value={visibilidade}
                                                  readOnly={true}
                                                />
                                              </td>
                                              <td className="px-4 py-3">
                                                <input 
                                                  type="number" 
                                                  step="1"
                                                  min="0"
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right bg-gray-50"
                                                  value={insercaoComprada}
                                                  readOnly={true}
                                                />
                                              </td>
                                              <td className="px-4 py-3">
                                                <input 
                                                  type="number" 
                                                  step="1"
                                                  min="0"
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right bg-gray-50"
                                                  value={insercaoOferecida}
                                                  readOnly={true}
                                                />
                                              </td>
                                              {semanasPraca.map((semana, semanaIndex) => {
                                                // Buscar dados para esta semana específica
                                                const dadosSemana = dadosGrupo.find(d => d.semana_vl === semanaIndex + 1);
                                                const valorSemana = Math.round(dadosSemana ? dadosSemana.qtd_registros : 0);
                                                
                                                // Debug da primeira linha e primeira semana
                                                if (grupoIndex === 0 && pracaIndex === 0 && semanaIndex === 0) {
                                                  console.log('🔍 DEBUG - Semana:', {
                                                    semanaIndex,
                                                    semanaIndexMaisUm: semanaIndex + 1,
                                                    dadosGrupoComSemanas: dadosGrupo.map(d => ({ semana_vl: d.semana_vl, qtd_registros: d.qtd_registros })),
                                                    dadosSemanaEncontrado: dadosSemana,
                                                    valorSemana
                                                  });
                                                }
                                                
                                                return (
                                                  <td key={semanaIndex} className="px-4 py-3">
                                                    <input 
                                                      type="number" 
                                                      step="1"
                                                      min="0"
                                                      className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right bg-gray-50"
                                                      value={valorSemana}
                                                      readOnly={true}
                                                    />
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : pracasUnicas.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">Nenhuma praça encontrada nos dados carregados.</p>
                            <p className="text-sm text-gray-400 mt-2">Verifique se o arquivo Excel contém dados válidos.</p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">Carregando dados das tabelas...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aviso para arquivos grandes */}
                    {roteirosCarregados.length > 100 && (
                      <div className="mt-8 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
                        <div className="flex items-center">
                          <div className="mr-3">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-yellow-800">Arquivo grande detectado</h4>
                            <p className="text-sm text-yellow-700">
                              Seu arquivo contém {roteirosCarregados.length} roteiros. O processo de salvamento pode levar até 2 minutos. 
                              Por favor, aguarde sem fechar a aba.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botão Salvar */}
                    {!modoVisualizacao && (
                      <div className="mt-16 flex justify-start">
                        <button
                          type="button"
                          onClick={salvarAba4}
                          disabled={(() => {
                            const validacao = validarConsistenciaCidades();
                            return salvandoAba4 || 
                                   !planoMidiaGrupo_pk || 
                                   !targetSalvoLocal?.salvo || 
                                   planoMidia_pks.length === 0 || 
                                   roteirosCarregados.length === 0 ||
                                   !validacao.valido;
                          })()}
                          className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base font-medium ${
                            (() => {
                              const validacao = validarConsistenciaCidades();
                              const isDisabled = salvandoAba4 || 
                                               !planoMidiaGrupo_pk || 
                                               !targetSalvoLocal?.salvo || 
                                               planoMidia_pks.length === 0 || 
                                               roteirosCarregados.length === 0 ||
                                               !validacao.valido;
                              
                              if (isDisabled) {
                                return 'bg-[#d9d9d9] text-[#b3b3b3] border-[#b3b3b3] cursor-not-allowed';
                              } else if (uploadRoteiros_pks.length > 0 && !roteirosMudaram()) {
                                return 'bg-green-500 text-white border-green-500 hover:bg-green-600';
                              } else {
                                return 'bg-[#ff4600] text-white border-[#ff4600] hover:bg-orange-600';
                              }
                            })()
                          }`}
                        >
                          {salvandoAba4 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              Salvando {roteirosCarregados.length} roteiros...
                            </div>
                          ) : uploadRoteiros_pks.length > 0 && !roteirosMudaram() ? '✓ Salvo' : 'Salvar'}
                        </button>
                      </div>
                    )}
                      </>
                    )}
                  </form>
                </>
              )}

              {/* Aba 5 - Definir indoor */}
              {abaAtiva === 5 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Definir indoor
                    </h3>
                  </div>

                  {/* Mensagem de funcionalidade em desenvolvimento */}
                  <div className="flex items-center justify-center py-20">
                    <div className="max-w-2xl w-full bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-[#ff4600] rounded-2xl p-12 text-center shadow-lg">
                      <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#ff4600] to-[#e03700] rounded-full shadow-lg mb-4">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-wide">
                          Funcionalidade em Desenvolvimento
                        </h4>
                        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                          A funcionalidade de <span className="font-bold text-[#ff4600]">configuração de mídia indoor</span> está sendo desenvolvida 
                          e estará disponível em breve.
                        </p>
                        <div className="bg-white rounded-lg p-4 border border-gray-200 inline-block">
                          <p className="text-sm text-gray-600 mb-2 font-medium">
                            Esta aba permitirá:
                          </p>
                          <ul className="text-sm text-gray-700 text-left space-y-2">
                            <li className="flex items-center gap-2">
                              <span className="text-[#ff4600]">▸</span>
                              Configurar pontos de mídia indoor
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-[#ff4600]">▸</span>
                              Definir estratégias para shoppings e estabelecimentos
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-[#ff4600]">▸</span>
                              Upload e gerenciamento de planos indoor
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-gray-300">
                        <p className="text-sm text-gray-600 font-medium">
                          Continue seu roteiro configurando as <span className="font-bold">vias públicas na Aba 4</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Aba 6 - Resultados */}
              {abaAtiva === 6 && (aba6Habilitada || modoVisualizacao) && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Confira o resultado do seu plano
                    </h3>
                  </div>

                  {/* Informações do plano */}
                  <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-bold text-[#3a3a3a] mb-2">
                          PLANO {nomeRoteiro || 'NOME_DO_PLANO'}
                        </h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Gênero:</strong> {genero || 'Não definido'}</p>
                          <p><strong>Classe:</strong> {classe || 'Não definida'}</p>
                          <p><strong>Faixa etária:</strong> {faixaEtaria || 'Não definida'}</p>
                          <p><strong>Período total da campanha:</strong> {semanasUnicas.length} semanas</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>Cidades:</strong> {pracasUnicas.map(p => p.praca).join(', ')}</p>
                        <p><strong>Data de criação:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                        <p><strong>CPMView:</strong> {totaisResultados?.grp_vl?.toFixed(3) || '0.000'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Combo de visualização */}
                  <div className="mb-8">
                    <label className="block text-base text-[#3a3a3a] mb-2">
                      Visualizar resultados
                    </label>
                    <div className="relative w-64">
                      <select
                        value={tipoVisualizacao}
                        onChange={(e) => setTipoVisualizacao(e.target.value as 'geral' | 'praca')}
                        className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal"
                      >
                        <option value="geral">Visão geral</option>
                        <option value="praca">Visão por praça</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-[#3A3A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Tabelas de resultados */}
                  <style>{`
                    @keyframes apple-spin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                  
                  {/* HIERARQUIA DE LOADING CLARA */}
                  {aguardandoProcessamento && planoMidiaGrupo_pk ? (
                    /* NÍVEL 1: Processamento Databricks em andamento */
                    <ProcessingResultsLoader 
                      nomeRoteiro={nomeRoteiro || roteiroData?.planoMidiaGrupo_st || 'Roteiro'}
                      tempoDecorrido={tempoDecorrido}
                    />
                  ) : carregandoDadosGerais ? (
                    /* NÍVEL 2: Carregando dados já processados */
                    <div className="text-center py-16">
                      <div className="mx-auto mb-6" style={{ width: 64, height: 64 }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" 
                             style={{ animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                          <circle cx="12" cy="12" r="10" fill="none" 
                                  stroke="#ff4600" strokeWidth="2.5" 
                                  strokeLinecap="round" strokeDasharray="60 158" />
                        </svg>
                      </div>
                      <p className="text-gray-700 font-semibold text-lg mb-2">
                        Carregando dados dos resultados
                      </p>
                      <p className="text-sm text-gray-500">
                        Buscando métricas de performance...
                      </p>
                    </div>
                  ) : (
                  /* NÍVEL 3: Dados carregados - mostrar tabelas */
                  <div className="space-y-8">
                    {/* Visão Geral */}
                    {tipoVisualizacao === 'geral' && (
                      <div>
                        <h4 className="text-lg font-bold text-[#3a3a3a] mb-4">RESUMO TOTAL</h4>
                      {dadosResultados.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-[#3a3a3a]">Praça</th>
                                <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Impactos</th>
                                <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Cobertura (pessoas)</th>
                                <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Cobertura (%)</th>
                                <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">Frequência</th>
                                <th className="border border-gray-300 px-4 py-2 text-right font-medium text-[#3a3a3a]">GRP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dadosResultados.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">
                                    {item.cidade_st}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {Math.round(item.impactosTotal_vl || 0).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {Math.round(item.coberturaPessoasTotal_vl || 0).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(item.coberturaProp_vl || 0).toFixed(1)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(item.frequencia_vl || 0).toFixed(1)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(item.grp_vl || 0).toFixed(3)}
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
                                    {Math.round(totaisResultados.impactosTotal_vl || 0).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {Math.round(totaisResultados.coberturaPessoasTotal_vl || 0).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(totaisResultados.coberturaProp_vl || 0).toFixed(1)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(totaisResultados.frequencia_vl || 0).toFixed(1)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-right">
                                    {(totaisResultados.grp_vl || 0).toFixed(3)}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Nenhum dado disponível ainda.</p>
                          <p className="text-sm text-gray-400 mt-2">Os dados podem estar sendo processados ou não há informações para este plano.</p>
                        </div>
                      )}
                      </div>
                    )}

                    {/* Seção TARGET */}
                    {tipoVisualizacao === 'geral' && (
                      <div>
                        <h4 className="text-lg font-bold text-blue-600 mb-4">TARGET</h4>
                        {dadosTarget.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-blue-50">
                                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-blue-700">Praça</th>
                                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-blue-700">Impactos</th>
                                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-blue-700">Cobertura (pessoas)</th>
                                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-blue-700">Cobertura (%)</th>
                                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-blue-700">Frequência</th>
                                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-blue-700">GRP</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dadosTarget.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">
                                        {item.cidade_st}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right">
                                        {Math.round(item.impactosTotal_vl || 0).toLocaleString('pt-BR')}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right">
                                        {Math.round(item.coberturaPessoasTotal_vl || 0).toLocaleString('pt-BR')}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right">
                                        {(item.coberturaProp_vl || 0).toFixed(1)}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right">
                                        {(item.frequencia_vl || 0).toFixed(1)}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right">
                                        {(item.grp_vl || 0).toFixed(3)}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Linha de totais */}
                                  {totaisTarget && (
                                    <tr className="bg-blue-100 font-bold">
                                      <td className="border border-gray-300 px-4 py-2 text-blue-800">
                                        TOTAL
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right text-blue-800">
                                        {Math.round(totaisTarget.impactosTotal_vl || 0).toLocaleString('pt-BR')}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right text-blue-800">
                                        {Math.round(totaisTarget.coberturaPessoasTotal_vl || 0).toLocaleString('pt-BR')}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right text-blue-800">
                                        {(totaisTarget.coberturaProp_vl || 0).toFixed(1)}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right text-blue-800">
                                        {(totaisTarget.frequencia_vl || 0).toFixed(1)}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-2 text-right text-blue-800">
                                        {(totaisTarget.grp_vl || 0).toFixed(3)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">Nenhum dado de target disponível ainda.</p>
                            <p className="text-sm text-gray-400 mt-2">Os dados podem estar sendo processados ou não há informações para este plano.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visão por Praça */}
                    {tipoVisualizacao === 'praca' && (
                      <div>
                        <h4 className="text-lg font-bold text-[#3a3a3a] mb-4">VISÃO POR PRAÇA</h4>
                        {dadosSemanais.length > 0 ? (() => {
                            // Agrupar dados por cidade e organizar por semana
                            const dadosPorCidade = dadosSemanais.reduce((acc: any, item: any) => {
                              const cidade = item.cidade_st;
                              if (!acc[cidade]) {
                                acc[cidade] = {};
                              }
                              acc[cidade][item.week_vl] = item;
                              return acc;
                            }, {});

                            // Usar dados de resumo da stored procedure
                            const totaisPorCidade = dadosSemanaisSummary.reduce((acc: any, item: any) => {
                              acc[item.cidade_st] = {
                                impactos_vl: item.impactosTotal_vl || 0,
                                coberturaPessoas_vl: item.coberturaPessoasTotal_vl || 0,
                                coberturaProp_vl: item.coberturaProp_vl || 0,
                                frequencia_vl: item.frequencia_vl || 0,
                                grp_vl: item.grp_vl || 0
                              };
                              return acc;
                            }, {});

                            return (
                              <div className="space-y-8">
                                {Object.entries(dadosPorCidade).map(([cidade, dadosCidade]: [string, any]) => (
                                  <div key={cidade} className="border border-gray-300 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center">
                                        <span className="text-lg font-bold text-[#3a3a3a]">• {cidade}</span>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          console.log('🗺️ [DEBUG] Navegando para Mapa com cidade:', cidade);
                                          console.log('🗺️ [DEBUG] RoteiroData:', roteiroData);
                                          console.log('🗺️ [DEBUG] planoMidiaGrupo_pk:', roteiroData?.planoMidiaGrupo_pk);
                                          
                                          // Navegar com grupo na URL
                                          navigate(`/mapa?grupo=${roteiroData?.planoMidiaGrupo_pk}`, {
                                            state: {
                                              cidadePreSelecionada: cidade,
                                              semanaPreSelecionada: '1',
                                              roteiroData: roteiroData
                                            }
                                          });
                                        }}
                                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                                      >
                                        View mapa
                                      </button>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-4 py-2 text-left font-medium text-[#3a3a3a]">Itens</th>
                                            {Array.from({ length: 12 }, (_, i) => (
                                              <th key={i} className="border border-gray-300 px-4 py-2 text-center font-medium text-[#3a3a3a]">
                                                W{i + 1}
                                              </th>
                                            ))}
                                            <th className="border border-gray-300 px-4 py-2 text-center font-medium text-[#3a3a3a]">TOTAL</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {/* Impactos IPV */}
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">Impactos IPV</td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                              const semana = dadosCidade[i + 1];
                                              return (
                                                <td key={i} className="border border-gray-300 px-4 py-2 text-right">
                                                  {semana?.impactos_vl ? Math.round(semana.impactos_vl).toLocaleString('pt-BR') : '0'}
                                                </td>
                                              );
                                            })}
                                            <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                                              {totaisPorCidade[cidade]?.impactos_vl ? Math.round(totaisPorCidade[cidade].impactos_vl).toLocaleString('pt-BR') : '0'}
                                            </td>
                                          </tr>
                                          
                                          {/* Cobertura (N° pessoas) */}
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">Cobertura (N° pessoas)</td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                              const semana = dadosCidade[i + 1];
                                              return (
                                                <td key={i} className="border border-gray-300 px-4 py-2 text-right">
                                                  {semana?.coberturaPessoas_vl ? Math.round(semana.coberturaPessoas_vl).toLocaleString('pt-BR') : '0'}
                                                </td>
                                              );
                                            })}
                                            <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                                              {totaisPorCidade[cidade]?.coberturaPessoas_vl ? Math.round(totaisPorCidade[cidade].coberturaPessoas_vl).toLocaleString('pt-BR') : '0'}
                                            </td>
                                          </tr>
                                          
                                          {/* Cobertura (%) */}
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">Cobertura %</td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                              const semana = dadosCidade[i + 1];
                                              return (
                                                <td key={i} className="border border-gray-300 px-4 py-2 text-right">
                                                  {semana?.coberturaProp_vl ? semana.coberturaProp_vl.toFixed(1) + '%' : '0.0%'}
                                                </td>
                                              );
                                            })}
                                            <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                                              {totaisPorCidade[cidade]?.coberturaProp_vl ? totaisPorCidade[cidade].coberturaProp_vl.toFixed(1) + '%' : '0.0%'}
                                            </td>
                                          </tr>
                                          
                                          {/* Frequência */}
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">Frequência</td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                              const semana = dadosCidade[i + 1];
                                              return (
                                                <td key={i} className="border border-gray-300 px-4 py-2 text-right">
                                                  {semana?.frequencia_vl ? semana.frequencia_vl.toFixed(1) : '0.0'}
                                                </td>
                                              );
                                            })}
                                            <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                                              {totaisPorCidade[cidade]?.frequencia_vl ? totaisPorCidade[cidade].frequencia_vl.toFixed(1) : '0.0'}
                                            </td>
                                          </tr>
                                          
                                          {/* GRP */}
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-4 py-2 font-medium text-[#3a3a3a]">GRP</td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                              const semana = dadosCidade[i + 1];
                                              return (
                                                <td key={i} className="border border-gray-300 px-4 py-2 text-right">
                                                  {semana?.grp_vl ? semana.grp_vl.toFixed(3) : '0.000'}
                                                </td>
                                              );
                                            })}
                                            <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                                              {totaisPorCidade[cidade]?.grp_vl ? totaisPorCidade[cidade].grp_vl.toFixed(3) : '0.000'}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })() : (
                            <div className="text-center py-8">
                              <p className="text-gray-500">Nenhum dado semanal disponível ainda.</p>
                              <p className="text-sm text-gray-400 mt-2">Os dados podem estar sendo processados ou não há informações para este plano.</p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Botão Download Excel do SharePoint */}
                  {!aguardandoProcessamento && (
                  <div className="mt-8 flex justify-center">
                      <button
                        onClick={baixarExcelSharePoint}
                        disabled={downloadingExcel || !planoMidiaGrupo_pk}
                        className={`px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                          downloadingExcel || !planoMidiaGrupo_pk
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                        {downloadingExcel ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Baixando...</span>
                          </>
                        ) : (
                          <>
                            <span>📊</span>
                            <span>Download Excel</span>
                          </>
                        )}
                      </button>
                      {!planoMidiaGrupo_pk && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Salve o roteiro primeiro para habilitar o download
                        </p>
                      )}
                  </div>
                  )}

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
      
      {/* Apple-style Save Loader */}
      <AppleSaveLoader
        isOpen={showAppleLoader}
        steps={saveSteps}
        currentProgress={saveProgress}
        title="Salvando Roteiro Simulado"
      />
      
      {/* Modal de avisos */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
      
      {/* Modal para adicionar marca */}
      <ModalAdicionarMarca
        isOpen={modalMarcaAberto}
        onClose={() => setModalMarcaAberto(false)}
        onSuccess={handleMarcaAdicionada}
      />
    </>
  );
};
