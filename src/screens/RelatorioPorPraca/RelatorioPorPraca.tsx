import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../config/axios";
import * as XLSX from 'xlsx';

interface RelatorioData {
  exibidor_nome: string;
  exibidor_code: string;
  indoor: string | null;
  vias_publicas: string | null;
  pontos_indoor: number;
  pontos_vias_publicas: number;
  total: number;
  quantidade_pracas: number;
  tipos_midia_unicos: number;
  fluxo_medio_passantes: number;
  total_impacto_ipv: number;
  classe_social_predominante: string;
  percentual_total?: number; // Calculado no frontend
  ranking?: number; // Calculado no frontend
}

interface Cidade {
  id_cidade: number;
  nome_cidade: string;
  nome_estado: string;
}

export const RelatorioPorPraca: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string>("");
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [cidadesFiltradas, setCidadesFiltradas] = useState<Cidade[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dados, setDados] = useState<RelatorioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [totalGeral, setTotalGeral] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<keyof RelatorioData>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [colunasVisiveis, setColunasVisiveis] = useState<Set<string>>(new Set([
    'exibidor_nome', 'pontos_indoor', 'pontos_vias_publicas', 'total', 
    'quantidade_pracas', 'percentual_total', 'fluxo_medio_passantes'
  ]));

  useEffect(() => {
    carregarCidades();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.cidade-dropdown-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const carregarCidades = async () => {
    try {
      setLoadingCidades(true);
      const response = await api.get('/cidades-praca');
      setCidades(response.data);
      setCidadesFiltradas(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar cidades:', err);
    } finally {
      setLoadingCidades(false);
    }
  };

  const filtrarCidades = (termo: string) => {
    if (!termo.trim()) {
      setCidadesFiltradas(cidades);
      return;
    }

    const termoLower = termo.toLowerCase();
    const filtradas = cidades.filter(
      (cidade) =>
        cidade.nome_cidade.toLowerCase().includes(termoLower) ||
        cidade.nome_estado.toLowerCase().includes(termoLower)
    );
    setCidadesFiltradas(filtradas);
  };

  const handleSelecionarCidade = (cidade: Cidade) => {
    setCidadeSelecionada(`${cidade.nome_cidade} - ${cidade.nome_estado}`);
    setShowDropdown(false);
  };

  const pesquisar = async () => {
    if (!cidadeSelecionada) {
      alert('Por favor, selecione uma cidade');
      return;
    }

    try {
      setLoading(true);
      setErro(null);
      
      // Extrair apenas o nome da cidade (antes do hífen)
      const nomeCidade = cidadeSelecionada.split(' - ')[0];
      
      const response = await api.post('/banco-ativos-relatorio-praca', {
        cidade: nomeCidade
      });

      if (response.data && response.data.success) {
        const dadosBrutos = response.data.data;
        const totalGeralCalculado = response.data.totalGeral || 0;
        
        // Calcular percentual e ranking para cada exibidor
        const dadosComCalculos = dadosBrutos.map((item: any, index: number) => ({
          ...item,
          percentual_total: totalGeralCalculado > 0 ? (item.total / totalGeralCalculado) * 100 : 0,
          ranking: index + 1
        }));
        
        // Ordenar por total (maior para menor) por padrão
        const dadosOrdenados = [...dadosComCalculos].sort((a, b) => b.total - a.total);
        
        // Recalcular ranking após ordenação
        dadosOrdenados.forEach((item, index) => {
          item.ranking = index + 1;
        });
        
        setDados(dadosOrdenados);
        setTotalGeral(totalGeralCalculado);
        // Resetar ordenação para padrão
        setSortColumn('total');
        setSortDirection('desc');
      } else {
        setErro('Formato de resposta inválido da API');
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar relatório:', err);
      setErro(err.response?.data?.message || 'Erro ao buscar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatarNumero = (numero: number): string => {
    return new Intl.NumberFormat('pt-BR').format(numero);
  };

  const formatarPercentual = (numero: number): string => {
    return `${numero.toFixed(2)}%`;
  };

  const formatarNumeroGrande = (numero: number): string => {
    if (numero >= 1000000) {
      return `${(numero / 1000000).toFixed(1)}M`;
    } else if (numero >= 1000) {
      return `${(numero / 1000).toFixed(1)}K`;
    }
    return formatarNumero(numero);
  };

  const handleSort = (column: keyof RelatorioData) => {
    if (sortColumn === column) {
      // Se já está ordenando por esta coluna, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna, começa com descendente
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const dadosOrdenados = useMemo(() => {
    const sorted = [...dados];
    
    sorted.sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
      // Para strings, fazer comparação alfabética
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue || '';
        bValue = bValue || '';
        const comparison = aValue.localeCompare(bValue, 'pt-BR');
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Para números
      const aNum = Number(aValue) || 0;
      const bNum = Number(bValue) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    
    return sorted;
  }, [dados, sortColumn, sortDirection]);

  const getSortIcon = (column: keyof RelatorioData) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-2 text-gray-400 text-xs">↕</span>
      );
    }
    return sortDirection === 'asc' ? (
      <span className="ml-2 text-[#ff4600] text-xs">↑</span>
    ) : (
      <span className="ml-2 text-[#ff4600] text-xs">↓</span>
    );
  };

  const downloadExcel = () => {
    if (dados.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Preparar dados para Excel (usar dados ordenados)
    const dadosExcel = dadosOrdenados.map(item => ({
      'Ranking': item.ranking || 0,
      'Exibidor': item.exibidor_nome || item.exibidor_code || '',
      'Código': item.exibidor_code || '',
      'Pontos Indoor': item.pontos_indoor || 0,
      'Pontos Vias Públicas': item.pontos_vias_publicas || 0,
      'Total': item.total || 0,
      '% do Total': item.percentual_total || 0,
      'Quantidade de Praças': item.quantidade_pracas || 0,
      'Tipos de Mídia Únicos': item.tipos_midia_unicos || 0,
      'Fluxo Médio Passantes': item.fluxo_medio_passantes || 0,
      'Total Impacto IPV': item.total_impacto_ipv || 0,
      'Classe Social Predominante': item.classe_social_predominante || '',
      'Tipos Indoor': item.indoor || '',
      'Tipos Vias Públicas': item.vias_publicas || ''
    }));

    // Adicionar linha de total
    dadosExcel.push({
      'Ranking': '',
      'Exibidor': 'TOTAL',
      'Código': '',
      'Pontos Indoor': dados.reduce((sum, item) => sum + (item.pontos_indoor || 0), 0),
      'Pontos Vias Públicas': dados.reduce((sum, item) => sum + (item.pontos_vias_publicas || 0), 0),
      'Total': totalGeral,
      '% do Total': 100,
      'Quantidade de Praças': dados.reduce((sum, item) => sum + (item.quantidade_pracas || 0), 0),
      'Tipos de Mídia Únicos': '',
      'Fluxo Médio Passantes': Math.round(dados.reduce((sum, item) => sum + (item.fluxo_medio_passantes || 0), 0) / dados.length),
      'Total Impacto IPV': dados.reduce((sum, item) => sum + (item.total_impacto_ipv || 0), 0),
      'Classe Social Predominante': '',
      'Tipos Indoor': '',
      'Tipos Vias Públicas': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório por Praça");

    const nomeCidade = cidadeSelecionada.split(' - ')[0];
    const filename = `Relatorio_Por_Praca_${nomeCidade}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

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
              { label: "Banco de ativos", path: "/banco-de-ativos" },
              { label: "Relatório por praça" }
            ]
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        
        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Título */}
            <h1 className="text-3xl font-bold text-[#ff4600] mb-4 uppercase tracking-wide">
              Relatório por praça
            </h1>
            
            {/* Descrição */}
            <p className="text-[#3a3a3a] mb-6 text-base">
              Consulte dados detalhados de exibidores por cidade. Analise pontos de mídia, fluxo de passantes, impacto IPV e muito mais para tomar decisões estratégicas.
            </p>

            {/* Formulário de busca */}
            <div className="mb-8">
              <label className="block text-[#3a3a3a] mb-2 font-semibold text-sm">
                Selecione a cidade
              </label>
              <div className="flex gap-4">
                <div className="flex-1 relative cidade-dropdown-container">
                  <input
                    type="text"
                    value={cidadeSelecionada}
                    onChange={(e) => {
                      setCidadeSelecionada(e.target.value);
                      filtrarCidades(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Ex.: São Paulo"
                    className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent text-[#3a3a3a] leading-normal"
                  />
                  
                  {/* Dropdown de cidades */}
                  {showDropdown && (
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
                
                <button
                  onClick={pesquisar}
                  disabled={loading}
                  className="h-[50px] px-8 bg-[#ff4600] text-white rounded-lg font-medium hover:bg-[#e03700] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Pesquisando...' : 'Pesquisar'}
                </button>
              </div>
            </div>

            {/* Tabela de resultados */}
            {erro && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {erro}
              </div>
            )}

            {dados.length > 0 && (
              <div className="mb-6">
                <div className="mb-4 text-sm text-[#666]">
                  {dados.length} exibidor{dados.length !== 1 ? 'es' : ''} encontrado{dados.length !== 1 ? 's' : ''} • Ordenado por: <span className="font-semibold text-[#ff4600]">{sortColumn === 'total' ? 'Total' : sortColumn === 'exibidor_nome' ? 'Exibidor' : sortColumn === 'pontos_indoor' ? 'Pontos Indoor' : sortColumn === 'pontos_vias_publicas' ? 'Pontos Vias Públicas' : sortColumn === 'quantidade_pracas' ? 'Quantidade de Praças' : sortColumn === 'percentual_total' ? '% do Total' : sortColumn === 'fluxo_medio_passantes' ? 'Fluxo Médio' : sortColumn === 'total_impacto_ipv' ? 'Impacto IPV' : sortColumn === 'tipos_midia_unicos' ? 'Tipos de Mídia' : sortColumn === 'ranking' ? 'Ranking' : 'Classe Social'}</span> ({sortDirection === 'desc' ? 'Maior → Menor' : 'Menor → Maior'})
                </div>
                
                {/* Grid com altura fixa e scroll */}
                <div className="shadow-sm rounded-lg border border-[#c1c1c1] bg-white overflow-hidden flex flex-col" style={{ height: '600px' }}>
                  {/* Cabeçalho fixo com scroll horizontal */}
                  <div className="bg-[#f7f7f7] border-b-2 border-[#c1c1c1] flex-shrink-0 overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '1600px' }}>
                      <thead>
                        <tr>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '150px' }} onClick={() => handleSort('ranking')}>
                            <div className="flex items-center">
                              Ranking
                              {getSortIcon('ranking')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '200px' }} onClick={() => handleSort('exibidor_nome')}>
                            <div className="flex items-center">
                              Exibidor
                              {getSortIcon('exibidor_nome')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '100px' }} onClick={() => handleSort('pontos_indoor')}>
                            <div className="flex items-center justify-end">
                              Pts Indoor
                              {getSortIcon('pontos_indoor')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '120px' }} onClick={() => handleSort('pontos_vias_publicas')}>
                            <div className="flex items-center justify-end">
                              Pts Vias Púb.
                              {getSortIcon('pontos_vias_publicas')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '100px' }} onClick={() => handleSort('total')}>
                            <div className="flex items-center justify-end">
                              Total
                              {getSortIcon('total')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '100px' }} onClick={() => handleSort('percentual_total')}>
                            <div className="flex items-center justify-end">
                              % Total
                              {getSortIcon('percentual_total')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '100px' }} onClick={() => handleSort('quantidade_pracas')}>
                            <div className="flex items-center justify-end">
                              Praças
                              {getSortIcon('quantidade_pracas')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '100px' }} onClick={() => handleSort('tipos_midia_unicos')}>
                            <div className="flex items-center justify-end">
                              Tipos Mídia
                              {getSortIcon('tipos_midia_unicos')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '120px' }} onClick={() => handleSort('fluxo_medio_passantes')}>
                            <div className="flex items-center justify-end">
                              Fluxo Médio
                              {getSortIcon('fluxo_medio_passantes')}
                            </div>
                          </th>
                          <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '120px' }} onClick={() => handleSort('total_impacto_ipv')}>
                            <div className="flex items-center justify-end">
                              Impacto IPV
                              {getSortIcon('total_impacto_ipv')}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap" style={{ width: '120px' }} onClick={() => handleSort('classe_social_predominante')}>
                            <div className="flex items-center">
                              Classe Social
                              {getSortIcon('classe_social_predominante')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  
                  {/* Corpo da tabela com scroll */}
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '1600px' }}>
                      <tbody>
                        {dadosOrdenados.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 border-b border-[#e5e5e5] transition-colors">
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-center text-[#3a3a3a] font-bold" style={{ width: '150px' }}>
                              #{item.ranking || index + 1}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-[#3a3a3a] font-medium" style={{ width: '200px' }}>
                              {item.exibidor_nome || item.exibidor_code || '-'}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                              {formatarNumero(item.pontos_indoor || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                              {formatarNumero(item.pontos_vias_publicas || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] font-semibold" style={{ width: '100px' }}>
                              {formatarNumero(item.total)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] font-medium" style={{ width: '100px' }}>
                              {formatarPercentual(item.percentual_total || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                              {formatarNumero(item.quantidade_pracas || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                              {formatarNumero(item.tipos_midia_unicos || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                              {formatarNumeroGrande(item.fluxo_medio_passantes || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                              {formatarNumeroGrande(item.total_impacto_ipv || 0)}
                            </td>
                            <td className="px-4 py-3 text-left text-[#3a3a3a]" style={{ width: '120px' }}>
                              {item.classe_social_predominante || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Rodapé fixo com total */}
                  <div className="bg-[#f7f7f7] border-t-2 border-[#c1c1c1] flex-shrink-0 overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '1600px' }}>
                      <tbody>
                        <tr className="font-bold">
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-center text-[#3a3a3a]" style={{ width: '150px' }}>
                            TOTAL
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-[#3a3a3a]" style={{ width: '200px' }}>
                            -
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                            {formatarNumero(dados.reduce((sum, item) => sum + (item.pontos_indoor || 0), 0))}
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                            {formatarNumero(dados.reduce((sum, item) => sum + (item.pontos_vias_publicas || 0), 0))}
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] text-lg" style={{ width: '100px' }}>
                            {formatarNumero(totalGeral)}
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                            100.00%
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                            {formatarNumero(dados.reduce((sum, item) => sum + (item.quantidade_pracas || 0), 0))}
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '100px' }}>
                            -
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                            {formatarNumeroGrande(Math.round(dados.reduce((sum, item) => sum + (item.fluxo_medio_passantes || 0), 0) / dados.length))}
                          </td>
                          <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '120px' }}>
                            {formatarNumeroGrande(dados.reduce((sum, item) => sum + (item.total_impacto_ipv || 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-left text-[#3a3a3a]" style={{ width: '120px' }}>
                            -
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botão Download Excel */}
                <div className="mt-6">
                  <button
                    onClick={downloadExcel}
                    className="px-6 py-3 bg-[#ff4600] text-white rounded-lg font-medium hover:bg-[#e03700] transition-colors duration-200"
                  >
                    Download Excel
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            )}
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
    </div>
  );
};

