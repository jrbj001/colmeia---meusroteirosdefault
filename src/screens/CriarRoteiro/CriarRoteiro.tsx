import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "react-router-dom";
import axios from "../../config/axios";
import * as XLSX from 'xlsx';

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
  
  // Estados para aba 6 - Resultados
  const [dadosResultados, setDadosResultados] = useState<any[]>([]);
  const [totaisResultados, setTotaisResultados] = useState<any>(null);
  const [carregandoResultados, setCarregandoResultados] = useState(false);
  const [aba6Habilitada, setAba6Habilitada] = useState(false);
  
  // Estados para visão semanal
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'geral' | 'praca'>('geral');
  const [dadosSemanais, setDadosSemanais] = useState<any[]>([]);
  const [dadosSemanaisSummary, setDadosSemanaisSummary] = useState<any[]>([]);
  const [carregandoSemanais, setCarregandoSemanais] = useState(false);
  
  // Estados para dados de target
  const [dadosTarget, setDadosTarget] = useState<any[]>([]);
  const [totaisTarget, setTotaisTarget] = useState<any>(null);
  const [carregandoTarget, setCarregandoTarget] = useState(false);
  const [dadosSemanaisTarget, setDadosSemanaisTarget] = useState<any[]>([]);
  const [dadosSemanaisTargetSummary, setDadosSemanaisTargetSummary] = useState<any[]>([]);
  const [carregandoSemanaisTarget, setCarregandoSemanaisTarget] = useState(false);

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
          
          // Carregar dados imediatamente
          console.log('🔄 Chamando carregarDadosResultados imediatamente...');
          carregarDadosResultados(roteiro.planoMidiaGrupo_pk);
        } else {
          console.log('⚠️ planoMidiaGrupo_pk não encontrado no roteiro');
        }
      }
    }
  }, [location.state]);

  
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
  
  // 📊 LOADING EM TEMPO REAL - Aba 4
  const [loadingAba4, setLoadingAba4] = useState({
    etapa: '',
    progresso: 0,
    detalhes: '',
    tempoInicio: null as Date | null,
    ativo: false
  });
  const [cidadesSalvas, setCidadesSalvas] = useState<Cidade[]>([]);
  
  // Estados para Aba 4 - Definir vias públicas
  const [tipoRoteiroAba4, setTipoRoteiroAba4] = useState<'completo' | 'simulado'>('completo');
  const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
  const [roteirosCarregados, setRoteirosCarregados] = useState<any[]>([]);
  const [roteirosSalvos, setRoteirosSalvos] = useState<any[]>([]);
  const [uploadRoteiros_pks, setUploadRoteiros_pks] = useState<number[]>([]);
  const [processandoExcel, setProcessandoExcel] = useState(false);
  const [mensagemProcessamento, setMensagemProcessamento] = useState<string>('');
  
  // Estados para Roteiro Simulado
  const [pracaSelecionadaSimulado, setPracaSelecionadaSimulado] = useState<any | null>(null);
  const [quantidadeSemanas, setQuantidadeSemanas] = useState<number>(12);
  const [tabelaSimulado, setTabelaSimulado] = useState<any[]>([]);
  
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


  // Função para gerar estrutura da tabela simulada
  const gerarTabelaSimulado = async (semanas: number) => {
    try {
      console.log('🏗️ Gerando tabela simulada...', { cidadesSalvas, semanas });
      
      // Buscar grupos/subgrupos disponíveis
      const gruposResponse = await axios.get('/grupo-sub-distinct');
      
      if (gruposResponse.data.success) {
        const grupos = gruposResponse.data.data;
        
        // Gerar estrutura da tabela baseada nos grupos
        const estruturaTabela = grupos.map((grupo: any) => ({
          grupo_st: grupo.grupo_st,
          grupoSub_st: grupo.grupoSub_st,
          grupoDesc_st: grupo.grupoDesc_st,
          visibilidade: 'Selecionável', // Valor padrão
          // Criar colunas para cada semana
          semanas: Array.from({ length: semanas }, (_, index) => ({
            semana: `W${index + 1}`,
            insercaoComprada: 0,
            insercaoOferecida: 0
          }))
        }));
        
        setTabelaSimulado(estruturaTabela);
        console.log('✅ Tabela simulada gerada:', estruturaTabela.length, 'grupos');
      }
    } catch (error) {
      console.error('❌ Erro ao gerar tabela simulada:', error);
      alert('Erro ao gerar estrutura da tabela. Tente novamente.');
    }
  };

  // Função para salvar roteiro simulado
  const salvarRoteiroSimulado = async () => {
    try {
      setSalvandoAba4(true);
      
      console.log('🚀 Iniciando salvamento do roteiro simulado...');
      
      // Validações básicas
      if (!planoMidiaGrupo_pk) {
        alert('É necessário salvar a Aba 1 primeiro');
        return;
      }

      if (!targetSalvoLocal?.salvo) {
        alert('É necessário salvar a Aba 2 primeiro');
        return;
      }

      if (cidadesSalvas.length === 0) {
        alert('É necessário configurar as praças na Aba 3 primeiro');
        return;
      }

      if (!pracaSelecionadaSimulado) {
        alert('Selecione uma praça para configurar');
        return;
      }

      if (tabelaSimulado.length === 0) {
        alert('Configure a tabela de vias públicas primeiro');
        return;
      }

      // Coletar dados da tabela (incluindo inputs dos usuários)
      const dadosTabela = tabelaSimulado.map((linha, index) => {
        // Buscar valores dos inputs na DOM
        const linhaDOM = document.querySelectorAll('tbody tr')[index];
        const inputsSemanas = linhaDOM?.querySelectorAll('input[type="number"]');
        
        const semanasData = [];
        if (inputsSemanas) {
          // Os primeiros 2 inputs são inserção comprada/oferecida, depois vêm as semanas
          for (let i = 2; i < inputsSemanas.length; i++) {
            semanasData.push({
              insercaoComprada: parseInt((inputsSemanas[i] as HTMLInputElement).value) || 0,
              insercaoOferecida: 0 // Por enquanto só inserção comprada
            });
          }
        }

        return {
          ...linha,
          semanas: semanasData
        };
      });

      console.log('📊 Dados da tabela coletados:', dadosTabela);

      console.log('🔄 ETAPA 1: Criando planoMidiaDesc_pk específico para a praça...');
      
      // Criar planoMidiaDesc_pk específico para a praça selecionada
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      const cidadeFormatada = (pracaSelecionadaSimulado.nome_cidade || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      
      const recordsJson = [{
        planoMidiaDesc_st: `${planoMidiaGrupo_st}_${cidadeFormatada}`,
        usuarioId_st: user?.id || '',
        usuarioName_st: user?.name || '',
        gender_st: targetSalvoLocal.genero,
        class_st: targetSalvoLocal.classe,
        age_st: targetSalvoLocal.faixaEtaria,
        ibgeCode_vl: getIbgeCodeFromCidade(pracaSelecionadaSimulado)
      }];

      console.log('📋 Criando planoMidiaDesc para:', recordsJson[0]);

      const descResponse = await axios.post('/plano-midia-desc', {
        planoMidiaGrupo_pk,
        recordsJson
      });

      if (!descResponse.data || !Array.isArray(descResponse.data) || descResponse.data.length === 0) {
        throw new Error('Erro ao criar planoMidiaDesc específico para a praça');
      }

      const planoMidiaDesc_pk = descResponse.data[0].new_pk;
      console.log('✅ ETAPA 1 CONCLUÍDA - planoMidiaDesc_pk criado:', planoMidiaDesc_pk);

      console.log('🔄 ETAPA 2: Salvando roteiro simulado...');

      // Chamar API
      const response = await axios.post('/roteiro-simulado', {
        planoMidiaDesc_pk,
        dadosTabela,
        pracasSelecionadas: [pracaSelecionadaSimulado], // Apenas a praça selecionada
        quantidadeSemanas
      });

      if (response.data.success) {
        const resultado = response.data.data;
        
        console.log('✅ ETAPA 2 CONCLUÍDA - Roteiro simulado salvo');
        console.log('🔄 ETAPA 3: Executando processamento Databricks para roteiro simulado...');

        // Executar Databricks específico para roteiro simulado
        try {
          const databricksResponse = await axios.post('/databricks-roteiro-simulado', {
            planoMidiaDesc_pk: planoMidiaGrupo_pk, // Usar planoMidiaGrupo_pk para o Databricks
            date_dh: resultado.data?.date_dh || new Date().toISOString().slice(0, 19).replace('T', ' '),
            date_dt: resultado.data?.date_dt || new Date().toISOString().slice(0, 10)
          });

          console.log('✅ ETAPA 3 CONCLUÍDA - Databricks executado');

          let mensagemSucesso = `🎉 ROTEIRO SIMULADO PROCESSADO COM SUCESSO!\n\n`;
          mensagemSucesso += `📊 RESUMO:\n`;
          mensagemSucesso += `• ${resultado.registrosProcessados} registros processados\n`;
          mensagemSucesso += `• ${resultado.semanasConfiguradas} semanas configuradas\n`;
          mensagemSucesso += `• ${resultado.gruposConfigurados} grupos com mídia\n`;
          mensagemSucesso += `• ${resultado.detalhes.totalInsecoesCompradas} inserções compradas no total\n\n`;
          
          mensagemSucesso += `🏙️ PRAÇA CONFIGURADA: ${pracaSelecionadaSimulado.nome_cidade} - ${pracaSelecionadaSimulado.nome_estado}\n`;
          mensagemSucesso += `📋 PLANO MÍDIA DESC PK: ${planoMidiaDesc_pk}\n`;
          mensagemSucesso += `📺 GRUPOS ATIVOS: ${resultado.detalhes.gruposAtivos.join(', ')}\n\n`;
          
          mensagemSucesso += `✅ PLANO MÍDIA DESC CRIADO PARA A PRAÇA!\n`;
          mensagemSucesso += `✅ DADOS SALVOS NA BASE CALCULADORA!\n`;
          mensagemSucesso += `✅ PROCESSAMENTO DATABRICKS EXECUTADO!\n`;
          mensagemSucesso += `🎯 ROTEIRO SIMULADO PRONTO PARA VISUALIZAÇÃO!`;

          alert(mensagemSucesso);
          
          // Ativar Aba 6 para visualizar resultados
          setAba6Habilitada(true);

        } catch (databricksError) {
          console.error('❌ Erro no processamento Databricks:', databricksError);
          
          let mensagemErro = `⚠️ ROTEIRO SIMULADO SALVO, MAS ERRO NO PROCESSAMENTO!\n\n`;
          mensagemErro += `✅ Dados salvos na base calculadora\n`;
          mensagemErro += `❌ Erro no processamento Databricks\n\n`;
          mensagemErro += `📋 PLANO MÍDIA DESC PK: ${planoMidiaDesc_pk}\n`;
          mensagemErro += `🏙️ PRAÇA: ${pracaSelecionadaSimulado.nome_cidade}\n\n`;
          mensagemErro += `💡 Contate o suporte para verificar o processamento.`;
          
          alert(mensagemErro);
        }
        
      } else {
        throw new Error(response.data.message || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar roteiro simulado:', error);
      
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
            seEstaticoVisibilidade_vl: templateIndices.visibilidade_estatico >= 0 ? 
              (row[templateIndices.visibilidade_estatico] ? parseFloat(row[templateIndices.visibilidade_estatico]) : 100) : 100,
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
          alert('Nenhum roteiro válido encontrado no arquivo Excel. Verifique se as colunas estão preenchidas corretamente.');
        } else {
          setRoteirosCarregados(roteirosProcessados);
          setArquivoExcel(file);
          setMensagemProcessamento(`✅ Excel processado com sucesso! ${roteirosProcessados.length} roteiros carregados`);
          setProcessandoExcel(false);
          setTimeout(() => setMensagemProcessamento(''), 5000);
          
          // O carregamento das tabelas será feito automaticamente pelo useEffect
          
          alert(`Excel processado com sucesso!\n\nTotal de roteiros encontrados: ${roteirosProcessados.length}\nSemanas detectadas: ${semanasUnicas.join(', ')}\n\nAbas processadas:\n✅ Template: ${templateData.length - templateHeaderRow - 1} linhas\n✅ Param: ${paramData.length - paramHeaderRow - 1} linhas\n✅ IPV_vias públicas: ${ipvData.length - ipvHeaderRow - 1} linhas\n\nJoins realizados:\n✅ Template × Param: ${paramLookup.size} matches\n✅ Template × IPV: ${ipvLookup.size} matches`);
        }
        
      } catch (error) {
        console.error('Erro ao processar arquivo Excel:', error);
        setMensagemProcessamento(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setProcessandoExcel(false);
        setTimeout(() => setMensagemProcessamento(''), 8000);
        alert(`Erro ao processar arquivo Excel:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nVerifique o formato e tente novamente.`);
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
        setDadosMatrix(matrixResponse.data.data);
        console.log(`✅ Dados matrix carregados: ${matrixResponse.data.data.length} registros`);
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
      setCarregandoResultados(true);
      console.log('🔄 Carregando dados dos resultados...');
      console.log('📊 PK sendo usado:', pkToUse);

      // Buscar dados por cidade
      const response = await axios.post('/report-indicadores-vias-publicas', {
        report_pk: pkToUse
      });

      console.log('📊 Resposta da API (cidades):', response.data);

      if (response.data.success) {
        setDadosResultados(response.data.data);
        console.log('✅ Dados por cidade carregados:', response.data.data.length);
        
        // Buscar dados de resumo da stored procedure
        console.log('🔄 Buscando dados de resumo da stored procedure...');
        const summaryResponse = await axios.post('/report-indicadores-summary', {
          report_pk: pkToUse
        });

        console.log('📊 Resposta da API (resumo):', summaryResponse.data);

        let totais;
        if (summaryResponse.data.success && summaryResponse.data.data) {
          // Usar dados da stored procedure para os totais
          const summaryData = summaryResponse.data.data;
          totais = {
            impactosTotal_vl: summaryData.impactosTotal_vl || 0,
            coberturaPessoasTotal_vl: summaryData.coberturaPessoasTotal_vl || 0,
            coberturaProp_vl: summaryData.coberturaProp_vl || 0,
            frequencia_vl: summaryData.frequencia_vl || 0,
            grp_vl: summaryData.grp_vl || 0
          };
          
          console.log('✅ Totais da stored procedure carregados:', totais);
          setTotaisResultados(totais);
        } else {
          console.log('⚠️ Nenhum dado de resumo encontrado, usando totais da API original');
          // Fallback: usar totais da API original
          totais = response.data.totais;
          setTotaisResultados(totais);
        }
        
        console.log('🎯 Estados atualizados - dadosResultados:', response.data.data.length, 'totaisResultados:', totais);
        
        // Carregar dados semanais e target também
        await carregarDadosSemanais(pkToUse);
        await carregarDadosTarget(pkToUse);
      } else {
        console.error('❌ Erro na resposta da API de resultados:', response.data.message);
        // Mesmo com erro, habilitar a aba para mostrar estado vazio
        setAba6Habilitada(true);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados dos resultados:', error);
      // Mesmo com erro, habilitar a aba para mostrar estado vazio
      setAba6Habilitada(true);
    } finally {
      setCarregandoResultados(false);
    }
  };

  // Função para carregar dados semanais (visão por praça)
  const carregarDadosSemanais = async (pkOverride?: number) => {
    const pkToUse = pkOverride || planoMidiaGrupo_pk;
    console.log('🔄 carregarDadosSemanais chamada');
    console.log('📊 pkToUse:', pkToUse);
    
    if (!pkToUse) {
      console.log('⚠️ planoMidiaGrupo_pk não disponível para carregar dados semanais');
      return;
    }

    try {
      setCarregandoSemanais(true);
      console.log('🔄 Carregando dados semanais...');

      const response = await axios.post('/report-indicadores-week', {
        report_pk: pkToUse
      });

      console.log('📊 Resposta da API (semanais):', response.data);

      if (response.data.success) {
        setDadosSemanais(response.data.data);
        console.log('✅ Dados semanais carregados:', response.data.data.length);
        
        // Buscar dados de resumo semanal
        console.log('🔄 Buscando dados de resumo semanal...');
        const summaryResponse = await axios.post('/report-indicadores-week-summary', {
          report_pk: pkToUse
        });

        console.log('📊 Resposta da API (resumo semanal):', summaryResponse.data);

        if (summaryResponse.data.success) {
          setDadosSemanaisSummary(summaryResponse.data.data);
          console.log('✅ Dados de resumo semanal carregados:', summaryResponse.data.data.length);
        } else {
          console.error('❌ Erro na resposta da API de resumo semanal:', summaryResponse.data.message);
          setDadosSemanaisSummary([]);
        }
        
        // Carregar dados semanais de target também
        await carregarDadosSemanaisTarget(pkToUse);
      } else {
        console.error('❌ Erro na resposta da API de dados semanais:', response.data.message);
        setDadosSemanais([]);
        setDadosSemanaisSummary([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados semanais:', error);
      setDadosSemanais([]);
    } finally {
      setCarregandoSemanais(false);
    }
  };

  // Função para carregar dados de target
  const carregarDadosTarget = async (pkOverride?: number) => {
    const pkToUse = pkOverride || planoMidiaGrupo_pk;
    console.log('🎯 carregarDadosTarget chamada');
    console.log('📊 pkToUse:', pkToUse);
    
    if (!pkToUse) {
      console.log('⚠️ planoMidiaGrupo_pk não disponível para carregar dados de target');
      return;
    }

    try {
      setCarregandoTarget(true);
      console.log('🔄 Carregando dados de target...');

      const response = await axios.post('/report-indicadores-target', {
        report_pk: pkToUse
      });

      console.log('📊 Resposta da API (target):', response.data);

      if (response.data.success) {
        setDadosTarget(response.data.data);
        console.log('✅ Dados de target carregados:', response.data.data.length);
        
        // Buscar dados de resumo de target
        console.log('🔄 Buscando dados de resumo de target...');
        const summaryResponse = await axios.post('/report-indicadores-target-summary', {
          report_pk: pkToUse
        });

        console.log('📊 Resposta da API (resumo target):', summaryResponse.data);

        if (summaryResponse.data.success && summaryResponse.data.data) {
          const summaryData = summaryResponse.data.data;
          const totais = {
            impactosTotal_vl: summaryData.impactosTotal_vl || 0,
            coberturaPessoasTotal_vl: summaryData.coberturaPessoasTotal_vl || 0,
            coberturaProp_vl: summaryData.coberturaProp_vl || 0,
            frequencia_vl: summaryData.frequencia_vl || 0,
            grp_vl: summaryData.grp_vl || 0
          };
          
          console.log('✅ Totais de target carregados:', totais);
          setTotaisTarget(totais);
        } else {
          console.error('❌ Erro na resposta da API de resumo de target:', summaryResponse.data.message);
          setTotaisTarget(null);
        }
      } else {
        console.error('❌ Erro na resposta da API de target:', response.data.message);
        setDadosTarget([]);
        setTotaisTarget(null);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de target:', error);
      setDadosTarget([]);
      setTotaisTarget(null);
    } finally {
      setCarregandoTarget(false);
    }
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
      console.log('🔄 Carregando dados semanais de target...');

      const response = await axios.post('/report-indicadores-week-target', {
        report_pk: pkToUse
      });

      console.log('📊 Resposta da API (semanais target):', response.data);

      if (response.data.success) {
        setDadosSemanaisTarget(response.data.data);
        console.log('✅ Dados semanais de target carregados:', response.data.data.length);
        
        // Buscar dados de resumo semanal de target
        console.log('🔄 Buscando dados de resumo semanal de target...');
        const summaryResponse = await axios.post('/report-indicadores-week-target-summary', {
          report_pk: pkToUse
        });

        console.log('📊 Resposta da API (resumo semanal target):', summaryResponse.data);

        if (summaryResponse.data.success) {
          setDadosSemanaisTargetSummary(summaryResponse.data.data);
          console.log('✅ Dados de resumo semanal de target carregados:', summaryResponse.data.data.length);
        } else {
          console.error('❌ Erro na resposta da API de resumo semanal de target:', summaryResponse.data.message);
          setDadosSemanaisTargetSummary([]);
        }
      } else {
        console.error('❌ Erro na resposta da API de dados semanais de target:', response.data.message);
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

  // Função para exportar dados para Excel
  const exportarParaExcel = () => {
    try {
      console.log('📊 Iniciando exportação para Excel...');
      
      // Criar workbook
      const workbook = XLSX.utils.book_new();
      
      // 1. Aba: Visão Geral
      if (dadosResultados.length > 0) {
        const dadosVisaoGeral = [
          // Cabeçalho com informações do plano
          ['PLANO DE MÍDIA - RELATÓRIO DE RESULTADOS'],
          [''],
          ['Informações do Plano:'],
          ['Nome do Plano:', nomeRoteiro || 'N/A'],
          ['Gênero:', genero || 'Não definido'],
          ['Classe:', classe || 'Não definida'],
          ['Faixa Etária:', faixaEtaria || 'Não definida'],
          ['Período Total:', `${semanasUnicas.length} semanas`],
          ['Cidades:', pracasUnicas.map(p => p.praca).join(', ')],
          ['Data de Criação:', new Date().toLocaleDateString('pt-BR')],
          ['CPMView:', totaisResultados?.grp_vl?.toFixed(3) || '0.000'],
          [''],
          // Dados da tabela
          ['VISÃO GERAL - RESUMO TOTAL'],
          [''],
          ['Praça', 'Impactos', 'Cobertura (pessoas)', 'Cobertura (%)', 'Frequência', 'GRP'],
          ...dadosResultados.map(item => [
            item.cidade_st,
            Math.round(item.impactosTotal_vl || 0),
            Math.round(item.coberturaPessoasTotal_vl || 0),
            (item.coberturaProp_vl || 0).toFixed(1),
            (item.frequencia_vl || 0).toFixed(1),
            (item.grp_vl || 0).toFixed(3)
          ]),
          // Linha de totais
          ['TOTAL', 
           Math.round(totaisResultados?.impactosTotal_vl || 0),
           Math.round(totaisResultados?.coberturaPessoasTotal_vl || 0),
           (totaisResultados?.coberturaProp_vl || 0).toFixed(1),
           (totaisResultados?.frequencia_vl || 0).toFixed(1),
           (totaisResultados?.grp_vl || 0).toFixed(3)
          ]
        ];
        
        const worksheetGeral = XLSX.utils.aoa_to_sheet(dadosVisaoGeral);
        XLSX.utils.book_append_sheet(workbook, worksheetGeral, 'Visão Geral');
      }
      
      // 1.1. Aba: Target (se houver dados)
      if (dadosTarget.length > 0) {
        const dadosTargetExcel = [
          // Cabeçalho com informações do plano
          ['PLANO DE MÍDIA - RELATÓRIO DE TARGET'],
          [''],
          ['Informações do Plano:'],
          ['Nome do Plano:', nomeRoteiro || 'N/A'],
          ['Gênero:', genero || 'Não definido'],
          ['Classe:', classe || 'Não definida'],
          ['Faixa Etária:', faixaEtaria || 'Não definida'],
          ['Período Total:', `${semanasUnicas.length} semanas`],
          ['Cidades:', pracasUnicas.map(p => p.praca).join(', ')],
          ['Data de Criação:', new Date().toLocaleDateString('pt-BR')],
          ['CPMView:', totaisTarget?.grp_vl?.toFixed(3) || '0.000'],
          [''],
          // Dados da tabela
          ['TARGET - RESUMO TOTAL'],
          [''],
          ['Praça', 'Impactos', 'Cobertura (pessoas)', 'Cobertura (%)', 'Frequência', 'GRP'],
          ...dadosTarget.map(item => [
            item.cidade_st,
            Math.round(item.impactosTotal_vl || 0),
            Math.round(item.coberturaPessoasTotal_vl || 0),
            (item.coberturaProp_vl || 0).toFixed(1),
            (item.frequencia_vl || 0).toFixed(1),
            (item.grp_vl || 0).toFixed(3)
          ]),
          // Linha de totais
          ['TOTAL', 
           Math.round(totaisTarget?.impactosTotal_vl || 0),
           Math.round(totaisTarget?.coberturaPessoasTotal_vl || 0),
           (totaisTarget?.coberturaProp_vl || 0).toFixed(1),
           (totaisTarget?.frequencia_vl || 0).toFixed(1),
           (totaisTarget?.grp_vl || 0).toFixed(3)
          ]
        ];
        
        const worksheetTarget = XLSX.utils.aoa_to_sheet(dadosTargetExcel);
        XLSX.utils.book_append_sheet(workbook, worksheetTarget, 'Target');
      }
      
      // 2. Aba: Visão por Praça
      if (dadosSemanais.length > 0) {
        // Agrupar dados por cidade
        const dadosPorCidade = dadosSemanais.reduce((acc: any, item: any) => {
          const cidade = item.cidade_st;
          if (!acc[cidade]) {
            acc[cidade] = {};
          }
          acc[cidade][item.week_vl] = item;
          return acc;
        }, {});

        // Criar dados para cada cidade
        Object.entries(dadosPorCidade).forEach(([cidade, dadosCidade]: [string, any]) => {
          const dadosCidadeExcel = [
            // Cabeçalho da cidade
            [`VISÃO POR PRAÇA - ${cidade}`],
            [''],
            ['Itens', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'TOTAL'],
            // Impactos IPV
            ['Impactos IPV', ...Array.from({ length: 12 }, (_, i) => {
              const semana = dadosCidade[i + 1];
              return semana?.impactos_vl ? Math.round(semana.impactos_vl) : 0;
            }), dadosSemanaisSummary.find(s => s.cidade_st === cidade)?.impactosTotal_vl || 0],
            // Cobertura (N° pessoas)
            ['Cobertura (N° pessoas)', ...Array.from({ length: 12 }, (_, i) => {
              const semana = dadosCidade[i + 1];
              return semana?.coberturaPessoas_vl ? Math.round(semana.coberturaPessoas_vl) : 0;
            }), dadosSemanaisSummary.find(s => s.cidade_st === cidade)?.coberturaPessoasTotal_vl || 0],
            // Cobertura
            ['Cobertura %', ...Array.from({ length: 12 }, (_, i) => {
              const semana = dadosCidade[i + 1];
              return semana?.coberturaProp_vl ? semana.coberturaProp_vl.toFixed(1) + '%' : '0.0%';
            }), dadosSemanaisSummary.find(s => s.cidade_st === cidade) ? 
              (dadosSemanaisSummary.find(s => s.cidade_st === cidade).coberturaProp_vl || 0).toFixed(1) + '%' : '0.0%'],
            // Frequência
            ['Frequência', ...Array.from({ length: 12 }, (_, i) => {
              const semana = dadosCidade[i + 1];
              return semana?.frequencia_vl ? semana.frequencia_vl.toFixed(1) : '0.0';
            }), dadosSemanaisSummary.find(s => s.cidade_st === cidade)?.frequencia_vl?.toFixed(1) || '0.0'],
            // GRP
            ['GRP', ...Array.from({ length: 12 }, (_, i) => {
              const semana = dadosCidade[i + 1];
              return semana?.grp_vl ? semana.grp_vl.toFixed(3) : '0.000';
            }), dadosSemanaisSummary.find(s => s.cidade_st === cidade)?.grp_vl?.toFixed(3) || '0.000']
          ];
          
          const worksheetCidade = XLSX.utils.aoa_to_sheet(dadosCidadeExcel);
          XLSX.utils.book_append_sheet(workbook, worksheetCidade, cidade.substring(0, 31)); // Limitar nome da aba
        });
      }
      
      // 3. Gerar e baixar arquivo
      const nomeArquivo = `Resultados_${nomeRoteiro || 'Plano'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      
      console.log('✅ Arquivo Excel gerado com sucesso:', nomeArquivo);
      
    } catch (error) {
      console.error('❌ Erro ao exportar para Excel:', error);
      alert('Erro ao gerar arquivo Excel. Tente novamente.');
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
      alert('É necessário carregar um arquivo Excel com roteiros');
      return;
    }

    if (!user) {
      setLoadingAba4(prev => ({ ...prev, ativo: false }));
      alert('Usuário não está logado');
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
      
      // 🔄 ETAPA 3: Processando pontos únicos - CRÍTICA!
      const pontosUnicos = [...new Set(dadosView.map((d: any) => `${d.latitude_vl},${d.longitude_vl}`))] as string[];
      atualizarLoadingAba4('Banco de Ativos', 40, `Consultando ${pontosUnicos.length} coordenadas na API (processo longo)...`);
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
      
      // Extrair cidades únicas dos dados do Excel processado
      const cidadesExcel = [...new Set(dadosView.map((d: any) => d.praca_st))] as string[];
      
      console.log(`🏙️ Cidades encontradas no Excel: ${cidadesExcel.join(', ')}`);
      console.log(`📊 Total de cidades para processar: ${cidadesExcel.length}`);
      
      // Criar plano mídia desc para cada cidade encontrada no Excel
      const recordsJson = cidadesExcel.map((cidade) => ({
        planoMidiaDesc_st: `${planoMidiaGrupo_st}_${(cidade || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
        usuarioId_st: user?.id || '',
        usuarioName_st: user?.name || '',
        gender_st: targetSalvoLocal.genero,
        class_st: targetSalvoLocal.classe,
        age_st: targetSalvoLocal.faixaEtaria,
        ibgeCode_vl: getIbgeCodeFromCidade({nome_cidade: cidade, id_cidade: 0} as Cidade)
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
      const procedureResponse = await axios.post('/sp-upload-roteiros-inventario-insert', {
        planoMidiaGrupo_pk: uploadData.pk,
        date_dh: uploadData.date_dh
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

      // 8. Habilitar Aba 6 e carregar dados dos resultados imediatamente
      console.log('✅ Habilitando Aba 6 e carregando dados dos resultados...');
      setAba6Habilitada(true);
      await carregarDadosResultados();

      // 9. Mostrar resultado final completo COM RELATÓRIO DO BANCO DE ATIVOS
      const totalRoteiros = uploadResponse.data.roteiros.length;
      const totalCidadesSemanas = dadosView.length;
      const totalPontosUnicos = pontosResponse.data?.data?.pontosUnicos || 0;
      const totalPlanosMidia = midiaPks.length;

      // Informações sobre o Databricks
      const databricksInfo = databricksResponse.data?.summary || { successful: 0, failed: 0, total: 0 };
      
      // 📊 RELATÓRIO DETALHADO DO BANCO DE ATIVOS
      const relatorioBA = pontosResponse.data?.data?.relatorioDetalhado;
      
      let mensagemSucesso = `🎯 FLUXO COMPLETO FINALIZADO COM SUCESSO!\n\n`;
      mensagemSucesso += `📊 RESUMO COMPLETO:\n`;
      mensagemSucesso += `• ${totalRoteiros} roteiros salvos do Excel\n`;
      mensagemSucesso += `• ${totalCidadesSemanas} combinações cidade+semana detectadas\n`;
      mensagemSucesso += `• ${totalPontosUnicos} pontos únicos processados\n`;
      mensagemSucesso += `• ${cidadesExcel.length} planos mídia desc criados\n`;
      mensagemSucesso += `• ${totalPlanosMidia} planos mídia finalizados\n`;
      mensagemSucesso += `• Dados transferidos para base calculadora\n`;
      mensagemSucesso += `• ${databricksInfo.successful}/${databricksInfo.total} jobs Databricks executados\n`;
      mensagemSucesso += `• Tabelas dinâmicas carregadas e prontas para uso\n\n`;
      
      // 🏦 RELATÓRIO DO BANCO DE ATIVOS
      if (relatorioBA) {
        mensagemSucesso += `🏦 DADOS DO BANCO DE ATIVOS:\n`;
        mensagemSucesso += `• ${relatorioBA.comDados} pontos com dados reais de fluxo\n`;
        if (relatorioBA.fluxoZero > 0) {
          mensagemSucesso += `• ${relatorioBA.fluxoZero} pontos com fluxo zero (baixo movimento)\n`;
        }
        if (relatorioBA.apiSemDados > 0) {
          mensagemSucesso += `• ${relatorioBA.apiSemDados} pontos sem cobertura da API (fluxo zero)\n`;
        }
        if (relatorioBA.valorPadrao > 0) {
          mensagemSucesso += `• ${relatorioBA.valorPadrao} pontos com valor padrão (API falhou)\n`;
        }
        mensagemSucesso += `• Total: ${relatorioBA.total} pontos processados com sucesso\n\n`;
        
        // Se há pontos sem cobertura da API, mostrar detalhes
        if (relatorioBA.apiSemDados > 0) {
          mensagemSucesso += `⚠️ PONTOS SEM COBERTURA DA API:\n`;
          relatorioBA.detalhes.pontosApiSemDados?.slice(0, 3).forEach((ponto: string) => {
            mensagemSucesso += `• ${ponto}\n`;
          });
          if ((relatorioBA.detalhes.pontosApiSemDados?.length || 0) > 3) {
            mensagemSucesso += `• ... e mais ${(relatorioBA.detalhes.pontosApiSemDados?.length || 0) - 3} pontos\n`;
          }
          mensagemSucesso += `\n`;
        }
        
        // Se há pontos com valor padrão, mostrar detalhes
        if (relatorioBA.valorPadrao > 0) {
          mensagemSucesso += `🔧 PONTOS COM VALOR PADRÃO:\n`;
          relatorioBA.detalhes.pontosValorPadrao?.slice(0, 3).forEach((ponto: string) => {
            mensagemSucesso += `• ${ponto}\n`;
          });
          if ((relatorioBA.detalhes.pontosValorPadrao?.length || 0) > 3) {
            mensagemSucesso += `• ... e mais ${(relatorioBA.detalhes.pontosValorPadrao?.length || 0) - 3} pontos\n`;
          }
          mensagemSucesso += `\n`;
        }
      }
      
      mensagemSucesso += `🏙️ CIDADES: ${cidadesExcel.join(', ')}\n`;
      mensagemSucesso += `📅 Data/hora: ${uploadData.date_dh}\n\n`;
      mensagemSucesso += `✅ PROJETO CRIADO E PROCESSAMENTO DATABRICKS INICIADO!\n✅ TABELAS DINÂMICAS CARREGADAS!`;
      
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
            const [lat, lng] = coordenadas ? coordenadas.split(',') : ['', ''];
            
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
            const [lat, lng] = coordenadas ? coordenadas.split(',') : ['', ''];
            
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

        // Converter para CSV (compatível com Excel)
        if (dadosExport.length === 0) {
          alert('Nenhum dado para exportar.');
          return;
        }

        const headers = Object.keys(dadosExport[0]);
        
        // Adicionar BOM para UTF-8 (compatibilidade com Excel)
        const BOM = '\\uFEFF';
        const csvContent = BOM + [
          headers.join(';'), // Usar ponto e vírgula para compatibilidade com Excel brasileiro
          ...dadosExport.map(row => 
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

      // Mostrar alert customizado com botão de exportação
      if (relatorioBA && (relatorioBA.apiSemDados > 0 || relatorioBA.valorPadrao > 0)) {
        // Alert com opção de exportação
        const exportarAgora = confirm(
          mensagemSucesso + 
          `\\n\\n📎 EXPORTAÇÃO DISPONÍVEL:\\n` +
          `Foram encontrados ${(relatorioBA.apiSemDados || 0) + (relatorioBA.valorPadrao || 0)} pontos com observações.\\n\\n` +
          `Deseja exportar a lista completa destes pontos para arquivo CSV?`
        );
        
        if (exportarAgora) {
          exportarPontosSemCobertura();
        }
      } else {
        // Alert normal sem opção de exportação
      alert(mensagemSucesso);
      }
      
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

  // Função para mapear IDs de cidades para códigos IBGE corretos
  const getIbgeCodeFromCidade = (cidade: Cidade) => {
    const cidadeNome = cidade.nome_cidade?.toUpperCase().trim();
    
    // Mapeamento manual dos principais municípios para códigos IBGE corretos
    const ibgeMap: {[key: string]: string} = {
      'SÃO PAULO': '3550308',
      'SAO PAULO': '3550308',
      'RIO DE JANEIRO': '3304557',
      'BELO HORIZONTE': '3106200',
      'SOROCABA': '3552205',
      'CAMPINAS': '3509502',
      'SANTOS': '3548500',
      'RIBEIRÃO PRETO': '3543402',
      'RIBEIRAO PRETO': '3543402'
    };
    
    return ibgeMap[cidadeNome] || cidade.id_cidade.toString();
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

  // Função para salvar Aba 2 - Salvamento puramente local (sem tocar na base)
  const salvarAba2 = async () => {
    if (!planoMidiaGrupo_pk) {
      alert('É necessário salvar a Aba 1 primeiro');
      return;
    }

    if (!genero || !classe || !faixaEtaria) {
      alert('Todos os campos de target são obrigatórios');
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
      
      let mensagemSucesso = `💾 TARGET CONFIGURADO LOCALMENTE!\n\n`;
      mensagemSucesso += `📊 CONFIGURAÇÃO:\n`;
      mensagemSucesso += `• Gênero: ${genero}\n`;
      mensagemSucesso += `• Classe: ${classe}\n`;
      mensagemSucesso += `• Faixa Etária: ${faixaEtaria}\n\n`;
      mensagemSucesso += `⏭️ PRÓXIMO PASSO: Vá para a Aba 3 e selecione as cidades\n`;
      mensagemSucesso += `🎯 Os registros de mídia serão criados apenas na Aba 4`;
      
      alert(mensagemSucesso);

    } catch (error) {
      console.error('💥 Erro ao salvar Aba 2:', error);
      alert('Erro ao salvar configuração de target. Tente novamente.');
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
      alert('É necessário selecionar pelo menos uma cidade');
      return;
    }

    setSalvandoAba3(true);
    try {
      console.log('💾 Salvando Aba 3 localmente - Configuração de cidades...');
      
      // ✅ SALVAMENTO LOCAL: Apenas validar e preparar dados
      // A criação real dos planos será feita na Aba 4 com dados reais
      
      // Salvar as cidades selecionadas para controle de estado
      setCidadesSalvas([...cidadesSelecionadas]);
      
      // Simular um plano mídia PK temporário para ativar a Aba 4
      setPlanoMidia_pks([999999]); // PK temporário, será substituído na Aba 4
      
      const totalCidades = cidadesSelecionadas.length;
      
      let mensagemSucesso = `💾 CONFIGURAÇÃO SALVA LOCALMENTE!\n\n`;
      mensagemSucesso += `📊 RESUMO:\n`;
      mensagemSucesso += `• ${totalCidades} cidades selecionadas\n`;
      mensagemSucesso += `• Target: ${targetSalvoLocal.genero} | ${targetSalvoLocal.classe} | ${targetSalvoLocal.faixaEtaria}\n`;
      mensagemSucesso += `🏙️ CIDADES: ${cidadesSelecionadas.map(c => c.nome_cidade).join(', ')}\n\n`;
      mensagemSucesso += `⏭️ PRÓXIMO PASSO: Vá para a Aba 4 e faça o upload do Excel\n`;
      mensagemSucesso += `🎯 Os registros de mídia serão criados automaticamente na Aba 4`;
      
      alert(mensagemSucesso);

    } catch (error) {
      console.error('💥 Erro ao salvar Aba 3:', error);
      alert('Erro ao salvar configuração de cidades. Tente novamente.');
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
                
                <div 
                  className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                    abaAtiva === 4 
                      ? 'bg-white border-2 border-blue-500 rounded-lg' 
                      : 'hover:bg-gray-50 rounded-lg'
                  }`}
                  onClick={() => setAbaAtiva(4)}
                >
                  <span className={`font-bold text-sm mr-2 ${abaAtiva === 4 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>04</span>
                  <span className={`font-medium ${abaAtiva === 4 ? 'text-blue-500' : 'text-[#3a3a3a]'}`}>Definir vias públicas</span>
                  {abaAtiva === 4 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
                </div>
                
                <div className="flex items-center text-[#3a3a3a] mr-8">
                  <span className="font-bold text-sm mr-2">05</span>
                  <span>Definir indoor</span>
                </div>
                
                {(aba6Habilitada || modoVisualizacao) && (
                  <div 
                    className={`flex items-center px-4 py-2 mr-8 relative cursor-pointer ${
                      abaAtiva === 6 
                        ? 'bg-white border-2 border-blue-500 rounded-lg' 
                        : 'hover:bg-gray-50 rounded-lg'
                    }`}
                    onClick={() => setAbaAtiva(6)}
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                                className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                                className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                                className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    {!modoVisualizacao && (
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                            className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                              className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                          className={`w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-[#b3b3b3] text-[#3a3a3a] leading-normal ${modoVisualizacao ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                        : tipoRoteiroAba4 === 'simulado' 
                          ? 'Adicione as mídias de via pública ao seu roteiro ou faça upload de seu plano pronto.'
                          : 'Faça o upload do seu plano.'
                      }
                    </h3>
                  </div>

                  {/* 📊 LOADING EM TEMPO REAL - ABA 4 */}
                  {loadingAba4.ativo && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                          <div>
                            <h4 className="text-lg font-bold text-blue-800">{loadingAba4.etapa}</h4>
                            <p className="text-sm text-blue-600 mt-1">{loadingAba4.detalhes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-800">{loadingAba4.progresso}%</div>
                          {loadingAba4.tempoInicio && (
                            <div className="text-xs text-blue-600 mt-1">
                              {Math.floor((new Date().getTime() - loadingAba4.tempoInicio.getTime()) / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Barra de progresso */}
                      <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${loadingAba4.progresso}%` }}
                        ></div>
                      </div>
                      
                      {/* Etapas do processo */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className={`p-2 rounded text-center ${loadingAba4.progresso >= 10 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          📊 Salvando roteiros
                        </div>
                        <div className={`p-2 rounded text-center ${loadingAba4.progresso >= 25 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          🔄 Consultando dados
                        </div>
                        <div className={`p-2 rounded text-center ${loadingAba4.progresso >= 40 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          🏢 Banco de Ativos
                        </div>
                        <div className={`p-2 rounded text-center ${loadingAba4.progresso >= 70 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          📋 Criando planos
                        </div>
                        <div className={`p-2 rounded text-center ${loadingAba4.progresso >= 90 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                          🚀 Databricks
                        </div>
                      </div>
                      
                      {loadingAba4.etapa === 'Banco de Ativos' && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                              <span className="text-white text-xs font-bold">⚡</span>
                            </div>
                            <span className="text-yellow-800 text-sm">
                              <strong>Processo crítico:</strong> Consultando API externa para dados de passantes. Este processo pode demorar alguns minutos dependendo do tamanho do arquivo.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seletor de tipo de roteiro */}
                  {!modoVisualizacao && (
                    <div className="mb-8">
                      <label className="block text-base text-[#3a3a3a] mb-3">
                        Tipo de roteiro
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="tipoRoteiro"
                            value="completo"
                            checked={tipoRoteiroAba4 === 'completo'}
                            onChange={(e) => setTipoRoteiroAba4(e.target.value as 'completo' | 'simulado')}
                            className="mr-2"
                          />
                          <span>Roteiro completo</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="tipoRoteiro"
                            value="simulado"
                            checked={tipoRoteiroAba4 === 'simulado'}
                            onChange={(e) => setTipoRoteiroAba4(e.target.value as 'completo' | 'simulado')}
                            className="mr-2"
                          />
                          <span>Roteiro simulado</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit}>
                    {/* Roteiro Completo - Upload de arquivo */}
                    {tipoRoteiroAba4 === 'completo' && (
                      <>
                    {/* Download do template */}
                    <div className="mb-8">
                      <div className="flex items-center gap-4">
                        <a
                          href="#"
                          className="text-[#ff4600] hover:text-orange-600 underline font-medium"
                          onClick={(e) => {
                            e.preventDefault();
                            // Aqui você pode implementar o download do template Excel
                            alert('Download do template Excel iniciado');
                          }}
                        >
                          Download template Excel
                        </a>
                      </div>
                    </div>

                    {/* Upload do arquivo */}
                    <div className="mb-8">
                      <label className="block text-base text-[#3a3a3a] mb-2">
                        Upload do arquivo Excel
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && !processandoExcel) {
                              processarArquivoExcel(file);
                            }
                          }}
                          className="hidden"
                          id="excel-upload"
                          disabled={processandoExcel}
                        />
                        <label
                          htmlFor="excel-upload"
                          className={`px-6 py-3 rounded-lg transition-colors ${
                            processandoExcel 
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                              : 'bg-[#ff4600] text-white hover:bg-orange-600 cursor-pointer'
                          }`}
                        >
                          {processandoExcel ? 'Processando...' : 'Upload Excel'}
                        </label>
                        {arquivoExcel && !processandoExcel && (
                          <span className="text-sm text-green-600">
                            ✓ {arquivoExcel.name}
                          </span>
                        )}
                        {processandoExcel && (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-[#ff4600] border-t-transparent rounded-full"></div>
                            <span className="text-sm text-[#ff4600] font-medium">Processando arquivo...</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Mensagem de status */}
                      {mensagemProcessamento && (
                        <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                          mensagemProcessamento.includes('❌') 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : mensagemProcessamento.includes('✅')
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {mensagemProcessamento}
                        </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Roteiro Simulado - Seleção manual */}
                    {tipoRoteiroAba4 === 'simulado' && (
                      <>
                        {/* Praças da Aba 3 */}
                        <div className="mb-8">
                          <label className="block text-base text-[#3a3a3a] mb-3">
                            Praça(s) configurada(s) na Aba 3
                          </label>
                          <div className="relative">
                            {cidadesSalvas.length > 0 ? (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center mb-2">
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-white text-sm font-bold">✓</span>
                                  </div>
                                  <span className="font-medium text-blue-800">
                                    {cidadesSalvas.length} praça(s) configurada(s):
                                  </span>
                                </div>
                                <div className="ml-9">
                                  {cidadesSalvas.map((cidade, index) => (
                                    <div key={cidade.id_cidade} className="text-blue-700">
                                      {index + 1}. {cidade.nome_cidade} - {cidade.nome_estado}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center">
                                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-white text-sm font-bold">!</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-yellow-800">Configuração necessária</p>
                                    <p className="text-sm text-yellow-700">
                                      Vá para a Aba 3 e configure as praças antes de criar o roteiro simulado.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Seleção da Praça Específica */}
                        {cidadesSalvas.length > 0 && (
                          <div className="mb-8">
                            <label className="block text-base text-[#3a3a3a] mb-3">
                              Selecione a praça para configurar
                            </label>
                            <select 
                              value={pracaSelecionadaSimulado?.id_cidade || ''}
                              onChange={(e) => {
                                const cidadeId = parseInt(e.target.value);
                                const cidade = cidadesSalvas.find(c => c.id_cidade === cidadeId);
                                setPracaSelecionadaSimulado(cidade || null);
                                // Limpar tabela quando mudar de praça
                                setTabelaSimulado([]);
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Escolha uma praça...</option>
                              {cidadesSalvas.map((cidade) => (
                                <option key={cidade.id_cidade} value={cidade.id_cidade}>
                                  {cidade.nome_cidade} - {cidade.nome_estado}
                                </option>
                              ))}
                            </select>
                            {pracaSelecionadaSimulado && (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center">
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-white text-xs font-bold">🎯</span>
                    </div>
                                  <span className="text-green-800 font-medium">
                                    Configurando: {pracaSelecionadaSimulado.nome_cidade} - {pracaSelecionadaSimulado.nome_estado}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quantidade de Semanas */}
                        <div className="mb-8">
                          <label className="block text-base text-[#3a3a3a] mb-3">
                            Quantidade de semanas
                          </label>
                          <select 
                            value={quantidadeSemanas}
                            onChange={(e) => setQuantidadeSemanas(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 52 }, (_, i) => i + 1).map(semana => (
                              <option key={semana} value={semana}>
                                {semana} semana{semana > 1 ? 's' : ''}
                              </option>
                            ))}
                          </select>
                    </div>

                        {/* Botão para gerar tabela */}
                        <div className="mb-8">
                          <button
                            type="button"
                            onClick={() => {
                              if (cidadesSalvas.length === 0) {
                                alert('Configure as praças na Aba 3 primeiro');
                                return;
                              }
                              if (!pracaSelecionadaSimulado) {
                                alert('Selecione uma praça para configurar');
                                return;
                              }
                              gerarTabelaSimulado(quantidadeSemanas);
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                            disabled={cidadesSalvas.length === 0 || !pracaSelecionadaSimulado}
                          >
                            {pracaSelecionadaSimulado 
                              ? `Configurar vias públicas para ${pracaSelecionadaSimulado.nome_cidade}` 
                              : 'Selecione uma praça para configurar'
                            }
                          </button>
                        </div>

                        {/* Tabela Simulada */}
                        {tabelaSimulado.length > 0 && (
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold text-[#3a3a3a] mb-4">
                              Configure as vias públicas de {pracaSelecionadaSimulado?.nome_cidade || 'praça'}
                            </h4>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                              <table className="w-full">
                                <thead className="bg-blue-600 text-white">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-sm">Grupo</th>
                                    <th className="px-3 py-2 text-left font-medium text-sm">Descrição</th>
                                    <th className="px-3 py-2 text-left font-medium text-sm">Visibilidade</th>
                                    <th className="px-3 py-2 text-center font-medium text-sm">Inserção comprada</th>
                                    <th className="px-3 py-2 text-center font-medium text-sm">Inserção oferecida</th>
                                    {Array.from({ length: quantidadeSemanas }, (_, i) => (
                                      <th key={i} className="px-3 py-2 text-center font-medium text-sm">
                                        W{i + 1}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tabelaSimulado.map((linha, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                      <td className="px-3 py-2 text-sm font-medium">{linha.grupo_st}</td>
                                      <td className="px-3 py-2 text-sm">{linha.grupoDesc_st}</td>
                                      <td className="px-3 py-2">
                                        <select 
                                          value={linha.visibilidade}
                                          onChange={(e) => {
                                            const novaTabela = [...tabelaSimulado];
                                            novaTabela[index].visibilidade = e.target.value;
                                            setTabelaSimulado(novaTabela);
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        >
                                          <option value="Selecionável">Selecionável</option>
                                          <option value="Não">Não</option>
                                        </select>
                                      </td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue="0"
                                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue="0"
                                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded"
                                        />
                                      </td>
                                      {Array.from({ length: quantidadeSemanas }, (_, semanaIndex) => (
                                        <td key={semanaIndex} className="px-3 py-2">
                                          <input
                                            type="number"
                                            min="0"
                                            defaultValue="0"
                                            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded"
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Botão Salvar para Roteiro Simulado */}
                        {tabelaSimulado.length > 0 && (
                          <div className="mb-8">
                            <button
                              type="button"
                              onClick={salvarRoteiroSimulado}
                              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                              disabled={salvandoAba4}
                            >
                              {salvandoAba4 ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                  Salvando roteiro simulado...
                                </div>
                              ) : 'Salvar Roteiro Simulado'}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Continuação do conteúdo para roteiro completo */}
                    {tipoRoteiroAba4 === 'completo' && (
                      <>

                    {/* Validação de consistência de cidades */}
                    {roteirosCarregados.length > 0 && cidadesSelecionadas.length > 0 && (
                      <div className="mb-8">
                        {(() => {
                          const validacao = validarConsistenciaCidades();
                          
                          if (validacao.valido) {
                            return (
                              <div className="p-4 bg-green-100 border border-green-400 rounded-lg">
                                <div className="flex items-center">
                                  <div className="mr-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-green-800">✅ Consistência validada!</h4>
                                    <p className="text-sm text-green-700">
                                      As {validacao.detalhes?.totalCidadesAba3} cidades da Aba 3 correspondem exatamente às {validacao.detalhes?.totalPracasExcel} praças do Excel.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (validacao.detalhes) {
                            return (
                              <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
                                <div className="flex items-start">
                                  <div className="mr-3">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-red-800">❌ Inconsistência detectada!</h4>
                                    <p className="text-sm text-red-700 mb-3">
                                      As cidades da Aba 3 não correspondem às praças do Excel.
                                    </p>
                                    
                                    {validacao.detalhes.cidadesFaltandoNoExcel.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-xs font-medium text-red-800">Cidades da Aba 3 ausentes no Excel:</p>
                                        <p className="text-xs text-red-700">
                                          {validacao.detalhes.cidadesFaltandoNoExcel.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {validacao.detalhes.pracasSobrandoNoExcel.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-xs font-medium text-red-800">Praças do Excel não selecionadas na Aba 3:</p>
                                        <p className="text-xs text-red-700">
                                          {validacao.detalhes.pracasSobrandoNoExcel.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <p className="text-xs text-red-700 font-medium">
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
                              const gruposPraca = dadosSubGrupos || [];
                              
                              return (
                                <div key={pracaIndex} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                                  {/* Header da Praça */}
                                  <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-lg font-bold text-[#3a3a3a]">
                                          PRAÇA {String(pracaIndex + 1).padStart(2, '0')}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          Praça: {praca.praca} - {praca.uf} | Quantidade de semanas: {semanasPraca.length} semanas
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                          style={{ backgroundColor: '#ff4600' }}
                                        >
                                          G
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tabela da Praça */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-blue-600 text-white">
                                          <th className="px-4 py-3 text-left font-bold">Grupo</th>
                                          <th className="px-4 py-3 text-left font-bold">Descrição</th>
                                          <th className="px-4 py-3 text-left font-bold">Visibilidade</th>
                                          <th className="px-4 py-3 text-left font-bold">Inserção comprada</th>
                                          <th className="px-4 py-3 text-left font-bold">Inserção oferecida</th>
                                          {semanasPraca.map((semana, semanaIndex) => (
                                            <th key={semanaIndex} className="px-4 py-3 text-left font-bold">
                                              W{semanaIndex + 1}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {gruposPraca.map((grupo, grupoIndex) => {
                                          // Buscar dados específicos para este grupo e praça
                                          const dadosGrupo = dadosMatrixRow.filter(d => 
                                            d.grupoSub_st === grupo.grupoSub_st && 
                                            d.cidade_st === praca.praca && 
                                            d.estado_st === praca.uf
                                          );
                                          
                                          return (
                                            <tr key={grupoIndex} className="border-b border-gray-200 hover:bg-gray-50">
                                              <td className="px-4 py-3 text-[#3a3a3a] font-medium">
                                                {grupo.grupo_st}{grupo.grupoSub_st}
                                              </td>
                                              <td className="px-4 py-3 text-[#3a3a3a]">
                                                {grupo.grupoDesc_st}
                                              </td>
                                              <td className="px-4 py-3">
                                                <select 
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] bg-white"
                                                  defaultValue="Selecionar"
                                                >
                                                  <option value="Selecionar">Selecionar</option>
                                                  <option value="Alta">Alta</option>
                                                  <option value="Média">Média</option>
                                                  <option value="Baixa">Baixa</option>
                                                  <option value="N/A">N/A</option>
                                                </select>
                                              </td>
                                              <td className="px-4 py-3">
                                                <input 
                                                  type="number" 
                                                  step="0.001"
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right"
                                                  defaultValue="0.000"
                                                />
                                              </td>
                                              <td className="px-4 py-3">
                                                <input 
                                                  type="number" 
                                                  step="0.001"
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right"
                                                  defaultValue="0.000"
                                                />
                                              </td>
                                              {semanasPraca.map((semana, semanaIndex) => {
                                                // Buscar dados para esta semana específica
                                                const dadosSemana = dadosGrupo.find(d => d.semana_vl === semanaIndex + 1);
                                                const valorSemana = dadosSemana ? dadosSemana.qtd_registros : 0;
                                                
                                                return (
                                                  <td key={semanaIndex} className="px-4 py-3">
                                                    <input 
                                                      type="number" 
                                                      step="1"
                                                      className="w-full px-2 py-1 border border-gray-300 rounded text-[#3a3a3a] text-right"
                                                      defaultValue={Math.round(valorSemana)}
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
                  <div className="space-y-8">
                    {/* Visão Geral */}
                    {tipoVisualizacao === 'geral' && (
                      <div>
                        <h4 className="text-lg font-bold text-[#3a3a3a] mb-4">RESUMO TOTAL</h4>
                      {(() => {
                        console.log('🎯 Renderizando Aba 6 - carregandoResultados:', carregandoResultados, 'dadosResultados.length:', dadosResultados.length);
                        return carregandoResultados ? (
                          <div className="text-center py-8">
                            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500">Carregando dados dos resultados...</p>
                            <p className="text-sm text-gray-400 mt-2">Aguarde alguns segundos</p>
                          </div>
                        ) : dadosResultados.length > 0 ? (
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
                      );
                      })()}
                      </div>
                    )}

                    {/* Seção TARGET */}
                    {tipoVisualizacao === 'geral' && (
                      <div>
                        <h4 className="text-lg font-bold text-blue-600 mb-4">TARGET</h4>
                        {(() => {
                          console.log('🎯 Renderizando TARGET - carregandoTarget:', carregandoTarget, 'dadosTarget.length:', dadosTarget.length);
                          return carregandoTarget ? (
                            <div className="text-center py-8">
                              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-gray-500">Carregando dados de target...</p>
                              <p className="text-sm text-gray-400 mt-2">Aguarde alguns segundos</p>
                            </div>
                          ) : dadosTarget.length > 0 ? (
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
                          );
                        })()}
                      </div>
                    )}

                    {/* Visão por Praça */}
                    {tipoVisualizacao === 'praca' && (
                      <div>
                        <h4 className="text-lg font-bold text-[#3a3a3a] mb-4">VISÃO POR PRAÇA</h4>
                        {(() => {
                          if (carregandoSemanais) {
                            return (
                              <div className="text-center py-8">
                                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-500">Carregando dados semanais...</p>
                                <p className="text-sm text-gray-400 mt-2">Aguarde alguns segundos</p>
                              </div>
                            );
                          }

                          if (dadosSemanais.length > 0) {
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
                                      <button className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                                        View mapa
                                      </button>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                          <tr className="bg-gray-100">
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
                          }

                          return (
                            <div className="text-center py-8">
                              <p className="text-gray-500">Nenhum dado semanal disponível ainda.</p>
                              <p className="text-sm text-gray-400 mt-2">Os dados podem estar sendo processados ou não há informações para este plano.</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Botão Download Excel */}
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={exportarParaExcel}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                      >
                        📊 Download Excel
                      </button>
                    </div>

                  </div>
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
