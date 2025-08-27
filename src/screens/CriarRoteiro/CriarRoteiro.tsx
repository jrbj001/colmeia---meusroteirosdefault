import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { useAuth } from "../../contexts/AuthContext";
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
  const [salvandoAba4, setSalvandoAba4] = useState(false);
  const [cidadesSalvas, setCidadesSalvas] = useState<Cidade[]>([]);
  
  // Estados para Aba 4 - Definir vias públicas
  const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
  const [roteirosCarregados, setRoteirosCarregados] = useState<any[]>([]);
  const [roteirosSalvos, setRoteirosSalvos] = useState<any[]>([]);
  const [uploadRoteiros_pks, setUploadRoteiros_pks] = useState<number[]>([]);
  const [processandoExcel, setProcessandoExcel] = useState(false);
  const [mensagemProcessamento, setMensagemProcessamento] = useState<string>('');

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
      cidade.nome_cidade?.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    ).sort();

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
            semana_st: templateIndices.semana >= 0 ? (row[templateIndices.semana]?.toString().trim() || '1-12') : '1-12',
            // Dados enriquecidos
            param_descricao: paramData.descricao,
            param_deflator_visibilidade: paramData.deflator_visibilidade,
            ipv_valor: ipvData.ipv
          };
          
          roteirosProcessados.push(roteiro);
        }
        
        console.log(`Excel processado: ${roteirosProcessados.length} roteiros encontrados`);
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
          
          alert(`Excel processado com sucesso!\n\nTotal de roteiros encontrados: ${roteirosProcessados.length}\n\nAbas processadas:\n✅ Template: ${templateData.length - templateHeaderRow - 1} linhas\n✅ Param: ${paramData.length - paramHeaderRow - 1} linhas\n✅ IPV_vias públicas: ${ipvData.length - ipvHeaderRow - 1} linhas\n\nJoins realizados:\n✅ Template × Param: ${paramLookup.size} matches\n✅ Template × IPV: ${ipvLookup.size} matches`);
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

  // Função para salvar Aba 4 - Upload de roteiros
  const salvarAba4 = async () => {
    console.log('🚀 Iniciando salvamento Aba 4...');
    console.log('📊 Estados atuais:', {
      planoMidiaGrupo_pk,
      planoMidiaDesc_pks,
      planoMidia_pks,
      roteirosCarregados: roteirosCarregados.length,
      user: user ? { id: user.id, name: user.name } : null
    });

    if (!planoMidiaGrupo_pk) {
      console.log('❌ Erro: planoMidiaGrupo_pk não está definido');
      alert('É necessário salvar a Aba 1 primeiro');
      return;
    }

    if (planoMidiaDesc_pks.length === 0) {
      console.log('❌ Erro: planoMidiaDesc_pks está vazio');
      alert('É necessário salvar a Aba 2 primeiro');
      return;
    }

    if (planoMidia_pks.length === 0) {
      console.log('❌ Erro: planoMidia_pks está vazio');
      alert('É necessário salvar a Aba 3 primeiro');
      return;
    }

    if (roteirosCarregados.length === 0) {
      console.log('❌ Erro: roteirosCarregados está vazio');
      alert('É necessário carregar um arquivo Excel com roteiros');
      return;
    }

    if (!user) {
      console.log('❌ Erro: usuário não está logado');
      alert('Usuário não está logado');
      return;
    }

    // 🎯 VALIDAÇÃO DE CONSISTÊNCIA ENTRE ABAS 3 E 4
    console.log('🔍 Validando consistência entre cidades...');
    const validacao = validarConsistenciaCidades();
    
    if (!validacao.valido && validacao.detalhes) {
      console.log('❌ Inconsistência detectada:', validacao.detalhes);
      
      let mensagemErro = '🚨 INCONSISTÊNCIA DETECTADA ENTRE ABAS 3 E 4\n\n';
      
      if (validacao.detalhes.cidadesFaltandoNoExcel.length > 0) {
        mensagemErro += `❌ Cidades selecionadas na Aba 3 que NÃO estão no Excel:\n`;
        mensagemErro += validacao.detalhes.cidadesFaltandoNoExcel.map(c => `• ${c}`).join('\n');
        mensagemErro += '\n\n';
      }
      
      if (validacao.detalhes.pracasSobrandoNoExcel.length > 0) {
        mensagemErro += `❌ Praças no Excel que NÃO foram selecionadas na Aba 3:\n`;
        mensagemErro += validacao.detalhes.pracasSobrandoNoExcel.map(p => `• ${p}`).join('\n');
        mensagemErro += '\n\n';
      }
      
      mensagemErro += `📊 RESUMO:\n`;
      mensagemErro += `• Cidades na Aba 3: ${validacao.detalhes.totalCidadesAba3}\n`;
      mensagemErro += `• Praças no Excel: ${validacao.detalhes.totalPracasExcel}\n\n`;
      mensagemErro += `🔧 SOLUÇÃO:\n`;
      mensagemErro += `1. Volte para a Aba 3 e ajuste as cidades selecionadas\n`;
      mensagemErro += `2. OU corrija o arquivo Excel para incluir apenas as praças selecionadas\n`;
      mensagemErro += `3. As praças devem ser EXATAMENTE as mesmas entre as abas`;
      
      alert(mensagemErro);
      return;
    }
    
    console.log('✅ Consistência validada - prosseguindo com salvamento...');

    setSalvandoAba4(true);
    try {
      console.log('🔄 Preparando dados para envio...');
      
      // Associar os roteiros ao plano mídia grupo
      const roteirosComPk2 = roteirosCarregados.map(roteiro => ({
        ...roteiro,
        pk2: planoMidiaGrupo_pk
      }));

      console.log('📤 Dados a serem enviados:', {
        totalRoteiros: roteirosComPk2.length,
        primeiroRoteiro: roteirosComPk2[0],
        ultimoRoteiro: roteirosComPk2[roteirosComPk2.length - 1]
      });

      console.log('🌐 Fazendo chamada para /upload-roteiros...');
      const response = await axios.post('/upload-roteiros', {
        roteiros: roteirosComPk2
      });

      console.log('📥 Resposta recebida:', response.data);

      if (response.data && response.data.roteiros) {
        const pks = response.data.roteiros.map((r: any) => r.pk);
        setUploadRoteiros_pks(pks);
        setRoteirosSalvos([...roteirosCarregados]);
        
        console.log('✅ Salvamento concluído com sucesso!', {
          totalRoteiros: roteirosCarregados.length,
          pks
        });
        
        alert(`Roteiros salvos com sucesso!\n\nTotal de roteiros: ${roteirosCarregados.length}\nPKs: ${pks.join(', ')}`);
      } else {
        console.log('❌ Resposta inválida do servidor:', response.data);
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('💥 Erro detalhado ao salvar Aba 4:', error);
      console.error('📊 Dados do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        response: error instanceof Error && 'response' in error ? (error as any).response?.data : null,
        status: error instanceof Error && 'response' in error ? (error as any).response?.status : null
      });
      alert(`Erro ao salvar roteiros.\n\nDetalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente.`);
    } finally {
      setSalvandoAba4(false);
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
    const nomeFormatado = nomeRoteiro.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
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
      // Criar um registro temporário de target (sem cidade ainda)
      const planoMidiaGrupo_st = gerarPlanoMidiaGrupoString();
      
      const recordsJson = [{
        planoMidiaDesc_st: `${planoMidiaGrupo_st}_TARGET_TEMP`,
        usuarioId_st: user.id,
        usuarioName_st: user.name,
        gender_st: genero,
        class_st: classe,
        age_st: faixaEtaria,
        ibgeCode_vl: "0000000" // Código temporário
      }];

      const response = await axios.post('/plano-midia-desc', {
        planoMidiaGrupo_pk,
        recordsJson
      });

      if (response.data && Array.isArray(response.data)) {
        const descPks = response.data.map(item => item.new_pk);
        setPlanoMidiaDesc_pks(descPks);
        alert(`Target configurado com sucesso!\nGênero: ${genero}\nClasse: ${classe}\nFaixa Etária: ${faixaEtaria}\nPKs: ${descPks.join(', ')}`);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
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
        ibgeCode_vl: cidade.codigo_ibge || getIbgeCodeFromCidade(cidade)
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
                            onChange={(e) => {
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

              {/* Aba 4 - Definir vias públicas */}
              {abaAtiva === 4 && (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-[#3a3a3a] tracking-[0] leading-[22.4px]">
                      Faça o upload do seu plano.
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
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

                    {/* Preview dos roteiros carregados */}
                    {roteirosCarregados.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-sm font-medium text-[#3a3a3a] mb-4">
                          Roteiros carregados ({roteirosCarregados.length}):
                        </h4>
                        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-600 text-white">
                                <th className="px-4 py-2 text-left font-bold">Praça</th>
                                <th className="px-4 py-2 text-left font-bold">UF</th>
                                <th className="px-4 py-2 text-left font-bold">Ambiente</th>
                                <th className="px-4 py-2 text-left font-bold">Formato</th>
                                <th className="px-4 py-2 text-left font-bold">Tipo</th>
                                <th className="px-4 py-2 text-left font-bold">Semana</th>
                                <th className="px-4 py-2 text-left font-bold">IPV</th>
                                <th className="px-4 py-2 text-left font-bold">Descrição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roteirosCarregados.map((roteiro, index) => (
                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.praca_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.uf_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.ambiente_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.formato_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.tipoMidia_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.semana_st}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.ipv_valor ? roteiro.ipv_valor.toFixed(2) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-[#3a3a3a]">
                                    {roteiro.param_descricao || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
                    <div className="mt-16 flex justify-start">
                      <button
                        type="button"
                        onClick={salvarAba4}
                        disabled={(() => {
                          const validacao = validarConsistenciaCidades();
                          return salvandoAba4 || 
                                 !planoMidiaGrupo_pk || 
                                 planoMidiaDesc_pks.length === 0 || 
                                 planoMidia_pks.length === 0 || 
                                 roteirosCarregados.length === 0 ||
                                 !validacao.valido;
                        })()}
                        className={`w-[200px] h-[50px] rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 text-base font-medium ${
                          (() => {
                            const validacao = validarConsistenciaCidades();
                            const isDisabled = salvandoAba4 || 
                                             !planoMidiaGrupo_pk || 
                                             planoMidiaDesc_pks.length === 0 || 
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
