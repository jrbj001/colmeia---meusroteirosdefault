import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../config/axios";
import * as XLSX from 'xlsx';

interface RelatorioData {
  praca_nome: string;
  cidade: string;
  exibidor_nome: string;
  exibidor_code: string;
  indoor: string | null;
  vias_publicas: string | null;
  pontos_indoor: number;
  pontos_vias_publicas: number;
  total: number;
  tipos_midia_unicos: number;
  fluxo_medio_passantes: number;
  total_impacto_ipv: number;
  classe_social_predominante: string;
  percentual_total?: number; // Calculado no frontend
  ranking?: number; // Calculado no frontend
}

interface Exibidor {
  id_exibidor: string;
  nome_exibidor: string;
  codigo_exibidor: string;
}

export const RelatorioPorExibidor: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [exibidorSelecionado, setExibidorSelecionado] = useState<string>("");
  const [exibidores, setExibidores] = useState<Exibidor[]>([]);
  const [exibidoresFiltrados, setExibidoresFiltrados] = useState<Exibidor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dados, setDados] = useState<RelatorioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExibidores, setLoadingExibidores] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [totalGeral, setTotalGeral] = useState<number>(0);
  const [exibidorNome, setExibidorNome] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<keyof RelatorioData>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loadingExcel, setLoadingExcel] = useState(false);

  useEffect(() => {
    carregarExibidores();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.exibidor-dropdown-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const carregarExibidores = async () => {
    try {
      setLoadingExibidores(true);
      const response = await api.get('/exibidores-praca');
      setExibidores(response.data);
      setExibidoresFiltrados(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar exibidores:', err);
    } finally {
      setLoadingExibidores(false);
    }
  };

  const filtrarExibidores = (termo: string) => {
    if (!termo.trim()) {
      setExibidoresFiltrados(exibidores);
      return;
    }

    const termoLower = termo.toLowerCase();
    const filtrados = exibidores.filter(
      (exibidor) =>
        exibidor.nome_exibidor.toLowerCase().includes(termoLower) ||
        exibidor.codigo_exibidor.toLowerCase().includes(termoLower)
    );
    setExibidoresFiltrados(filtrados);
  };

  const handleSelecionarExibidor = (exibidor: Exibidor) => {
    setExibidorSelecionado(exibidor.nome_exibidor || exibidor.codigo_exibidor);
    setShowDropdown(false);
  };

  const pesquisar = async () => {
    if (!exibidorSelecionado) {
      alert('Por favor, selecione um exibidor');
      return;
    }

    try {
      setLoading(true);
      setErro(null);
      
      const response = await api.post('/banco-ativos-relatorio-exibidor', {
        exibidor: exibidorSelecionado
      });

      if (response.data && response.data.success) {
        const dadosBrutos = response.data.data;
        const totalGeralCalculado = response.data.totalGeral || 0;
        const nomeExibidor = response.data.exibidor || exibidorSelecionado;
        
        // Calcular percentual e ranking para cada praça/cidade
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
        setExibidorNome(nomeExibidor);
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
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const dadosOrdenados = useMemo(() => {
    const sorted = [...dados];
    
    sorted.sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue || '';
        bValue = bValue || '';
        const comparison = aValue.localeCompare(bValue, 'pt-BR');
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
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

  const downloadExcel = async () => {
    if (dados.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    try {
      setLoadingExcel(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const getValue = (value: any, defaultValue: any = '') => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number' && isNaN(value)) return defaultValue;
        return value;
      };

      const dadosExcel = dadosOrdenados.map(item => {
        const percentual = typeof item.percentual_total === 'number' && !isNaN(item.percentual_total)
          ? Number(item.percentual_total.toFixed(2))
          : 0;

        return {
          'Ranking': getValue(item.ranking, 0),
          'Praça/Cidade': getValue(item.praca_nome || item.cidade, ''),
          'Pts Indoor': getValue(item.pontos_indoor, 0),
          'Pts Vias Púb.': getValue(item.pontos_vias_publicas, 0),
          'Total': getValue(item.total, 0),
          '% Total': percentual,
          'Tipos Mídia': getValue(item.tipos_midia_unicos, 0),
          'Fluxo Médio': getValue(item.fluxo_medio_passantes, 0),
          'Impacto IPV': getValue(item.total_impacto_ipv, 0),
          'Classe Social': getValue(item.classe_social_predominante, ''),
          'Código Exibidor': getValue(item.exibidor_code, ''),
          'Tipos Indoor': getValue(item.indoor, ''),
          'Tipos Vias Públicas': getValue(item.vias_publicas, '')
        };
      });

      const totalPontosIndoor = dados.reduce((sum, item) => sum + (Number(item.pontos_indoor) || 0), 0);
      const totalPontosViasPublicas = dados.reduce((sum, item) => sum + (Number(item.pontos_vias_publicas) || 0), 0);
      const totalImpactoIPV = dados.reduce((sum, item) => sum + (Number(item.total_impacto_ipv) || 0), 0);
      const somaFluxoPassantes = dados.reduce((sum, item) => sum + (Number(item.fluxo_medio_passantes) || 0), 0);
      const mediaFluxoPassantes = dados.length > 0 ? Math.round(somaFluxoPassantes / dados.length) : 0;

      dadosExcel.push({
        'Ranking': '',
        'Praça/Cidade': 'TOTAL',
        'Pts Indoor': totalPontosIndoor,
        'Pts Vias Púb.': totalPontosViasPublicas,
        'Total': totalGeral || 0,
        '% Total': 100,
        'Tipos Mídia': '',
        'Fluxo Médio': mediaFluxoPassantes,
        'Impacto IPV': totalImpactoIPV,
        'Classe Social': '',
        'Código Exibidor': '',
        'Tipos Indoor': '',
        'Tipos Vias Públicas': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
      
      if (worksheet['!cols'] === undefined) {
        worksheet['!cols'] = [];
      }
      worksheet['!cols'] = [
        { wch: 10 }, // Ranking
        { wch: 30 }, // Praça/Cidade
        { wch: 15 }, // Pts Indoor
        { wch: 20 }, // Pts Vias Púb.
        { wch: 12 }, // Total
        { wch: 12 }, // % Total
        { wch: 15 }, // Tipos Mídia
        { wch: 18 }, // Fluxo Médio
        { wch: 18 }, // Impacto IPV
        { wch: 20 }, // Classe Social
        { wch: 20 }, // Código Exibidor
        { wch: 30 }, // Tipos Indoor
        { wch: 30 }  // Tipos Vias Públicas
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório por Exibidor");

      const nomeExibidor = exibidorSelecionado ? exibidorSelecionado.replace(/[^a-zA-Z0-9]/g, '_') : 'Exibidor';
      const dataAtual = new Date().toISOString().split('T')[0];
      const filename = `Relatorio_Por_Exibidor_${nomeExibidor}_${dataAtual}.xlsx`;

      XLSX.writeFile(workbook, filename);
      
      console.log('✅ Arquivo Excel exportado com sucesso:', filename);
    } catch (error: any) {
      console.error('❌ Erro ao exportar Excel:', error);
      alert(`Erro ao exportar arquivo Excel: ${error?.message || 'Erro desconhecido'}. Verifique o console para mais detalhes.`);
    } finally {
      setLoadingExcel(false);
    }
  };

  const getSortColumnLabel = () => {
    const labels: Record<string, string> = {
      'total': 'Total',
      'praca_nome': 'Praça/Cidade',
      'pontos_indoor': 'Pontos Indoor',
      'pontos_vias_publicas': 'Pontos Vias Públicas',
      'percentual_total': '% do Total',
      'fluxo_medio_passantes': 'Fluxo Médio',
      'total_impacto_ipv': 'Impacto IPV',
      'tipos_midia_unicos': 'Tipos de Mídia',
      'ranking': 'Ranking',
      'classe_social_predominante': 'Classe Social'
    };
    return labels[sortColumn] || sortColumn;
  };

  return (
    <>
      <style>{`
        @keyframes apple-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
              { label: "Relatório por exibidor" }
            ]
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        
        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Título */}
            <h1 className="text-3xl font-bold text-[#ff4600] mb-4 uppercase tracking-wide">
              Relatório por exibidor
            </h1>
            
            {/* Descrição */}
            <p className="text-[#3a3a3a] mb-6 text-base">
              Consulte dados detalhados de praças e cidades por exibidor. Analise pontos de mídia, fluxo de passantes, impacto IPV e muito mais para tomar decisões estratégicas.
            </p>

            {/* Exibidor selecionado (se houver dados) */}
            {exibidorNome && (
              <div className="mb-4 p-3 bg-[#f7f7f7] border border-[#c1c1c1] rounded-lg">
                <span className="text-sm text-[#666]">Exibidor: </span>
                <span className="text-base font-semibold text-[#3a3a3a]">{exibidorNome}</span>
              </div>
            )}

            {/* Formulário de busca */}
            <div className="mb-8">
              <label className="block text-[#3a3a3a] mb-2 font-semibold text-sm">
                Selecione o exibidor
              </label>
              <div className="flex gap-4">
                <div className="flex-1 relative exibidor-dropdown-container">
                  <input
                    type="text"
                    value={exibidorSelecionado}
                    onChange={(e) => {
                      setExibidorSelecionado(e.target.value);
                      filtrarExibidores(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Ex.: Código ou nome do exibidor"
                    className="w-full h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent text-[#3a3a3a] leading-normal"
                  />
                  
                  {/* Dropdown de exibidores */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#d9d9d9] rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 mt-1">
                      {loadingExibidores ? (
                        <div className="p-4 text-center text-[#b3b3b3]">
                          Carregando exibidores...
                        </div>
                      ) : exibidoresFiltrados.length > 0 ? (
                        exibidoresFiltrados.slice(0, 10).map((exibidor) => (
                          <div
                            key={exibidor.id_exibidor}
                            onClick={() => handleSelecionarExibidor(exibidor)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-[#3a3a3a]">
                              {exibidor.nome_exibidor} {exibidor.codigo_exibidor !== exibidor.nome_exibidor ? `(${exibidor.codigo_exibidor})` : ''}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-[#b3b3b3]">
                          Nenhum exibidor encontrado
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
                  {dados.length} praça{dados.length !== 1 ? 's' : ''} encontrada{dados.length !== 1 ? 's' : ''} • Ordenado por: <span className="font-semibold text-[#ff4600]">{getSortColumnLabel()}</span> ({sortDirection === 'desc' ? 'Maior → Menor' : 'Menor → Maior'})
                </div>
                
                {/* Grid com altura fixa e scroll */}
                <div className="shadow-sm rounded-lg border border-[#c1c1c1] bg-white overflow-hidden flex flex-col" style={{ height: '600px' }}>
                  <div className="flex-1 overflow-y-auto overflow-x-auto" id="table-scroll-container">
                    {/* Cabeçalho */}
                    <div className="bg-[#f7f7f7] border-b-2 border-[#c1c1c1] sticky top-0 z-10">
                      <table className="border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
                        <thead>
                          <tr>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '150px' }} onClick={() => handleSort('ranking')}>
                              <div className="flex items-center">
                                Ranking
                                {getSortIcon('ranking')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '250px' }} onClick={() => handleSort('praca_nome')}>
                              <div className="flex items-center">
                                Praça/Cidade
                                {getSortIcon('praca_nome')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '150px' }} onClick={() => handleSort('pontos_indoor')}>
                              <div className="flex items-center justify-end">
                                Pts Indoor
                                {getSortIcon('pontos_indoor')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '180px' }} onClick={() => handleSort('pontos_vias_publicas')}>
                              <div className="flex items-center justify-end">
                                Pts Vias Púb.
                                {getSortIcon('pontos_vias_publicas')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '150px' }} onClick={() => handleSort('total')}>
                              <div className="flex items-center justify-end">
                                Total
                                {getSortIcon('total')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '150px' }} onClick={() => handleSort('percentual_total')}>
                              <div className="flex items-center justify-end">
                                % Total
                                {getSortIcon('percentual_total')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '150px' }} onClick={() => handleSort('tipos_midia_unicos')}>
                              <div className="flex items-center justify-end">
                                Tipos Mídia
                                {getSortIcon('tipos_midia_unicos')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '180px' }} onClick={() => handleSort('fluxo_medio_passantes')}>
                              <div className="flex items-center justify-end">
                                Fluxo Médio
                                {getSortIcon('fluxo_medio_passantes')}
                              </div>
                            </th>
                            <th className="border-r border-[#c1c1c1] px-4 py-3 text-right font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '180px' }} onClick={() => handleSort('total_impacto_ipv')}>
                              <div className="flex items-center justify-end">
                                Impacto IPV
                                {getSortIcon('total_impacto_ipv')}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-[#3a3a3a] cursor-pointer hover:bg-[#ededed] transition-colors select-none whitespace-nowrap bg-[#f7f7f7]" style={{ width: '180px' }} onClick={() => handleSort('classe_social_predominante')}>
                              <div className="flex items-center">
                                Classe Social
                                {getSortIcon('classe_social_predominante')}
                              </div>
                            </th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    
                    {/* Corpo da tabela */}
                    <table className="border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
                      <tbody>
                        {dadosOrdenados.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 border-b border-[#e5e5e5] transition-colors">
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-center text-[#3a3a3a] font-bold" style={{ width: '150px' }}>
                              #{item.ranking || index + 1}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-[#3a3a3a] font-medium" style={{ width: '250px' }}>
                              {item.praca_nome || item.cidade || '-'}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '150px' }}>
                              {formatarNumero(item.pontos_indoor || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '180px' }}>
                              {formatarNumero(item.pontos_vias_publicas || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] font-semibold" style={{ width: '150px' }}>
                              {formatarNumero(item.total)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] font-medium" style={{ width: '150px' }}>
                              {formatarPercentual(item.percentual_total || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '150px' }}>
                              {formatarNumero(item.tipos_midia_unicos || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '180px' }}>
                              {formatarNumeroGrande(item.fluxo_medio_passantes || 0)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a]" style={{ width: '180px' }}>
                              {formatarNumeroGrande(item.total_impacto_ipv || 0)}
                            </td>
                            <td className="px-4 py-3 text-left text-[#3a3a3a]" style={{ width: '180px' }}>
                              {item.classe_social_predominante || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Rodapé com total */}
                    <div className="bg-[#f7f7f7] border-t-2 border-[#c1c1c1] sticky bottom-0 z-10">
                      <table className="border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
                        <tbody>
                          <tr className="font-bold">
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-center text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '150px' }}>
                              TOTAL
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '250px' }}>
                              -
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '150px' }}>
                              {formatarNumero(dados.reduce((sum, item) => sum + (item.pontos_indoor || 0), 0))}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '180px' }}>
                              {formatarNumero(dados.reduce((sum, item) => sum + (item.pontos_vias_publicas || 0), 0))}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] text-lg bg-[#f7f7f7]" style={{ width: '150px' }}>
                              {formatarNumero(totalGeral)}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '150px' }}>
                              100.00%
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '150px' }}>
                              -
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '180px' }}>
                              {formatarNumeroGrande(Math.round(dados.reduce((sum, item) => sum + (item.fluxo_medio_passantes || 0), 0) / dados.length))}
                            </td>
                            <td className="border-r border-[#c1c1c1] px-4 py-3 text-right text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '180px' }}>
                              {formatarNumeroGrande(dados.reduce((sum, item) => sum + (item.total_impacto_ipv || 0), 0))}
                            </td>
                            <td className="px-4 py-3 text-left text-[#3a3a3a] bg-[#f7f7f7]" style={{ width: '180px' }}>
                              -
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Botão Download Excel */}
                <div className="mt-6">
                  <button
                    onClick={downloadExcel}
                    disabled={loadingExcel || dados.length === 0}
                    className="px-6 py-3 bg-[#ff4600] text-white rounded-lg font-medium hover:bg-[#e03700] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingExcel ? (
                      <>
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          className="animate-spin"
                          style={{ animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="60 158"
                            opacity="0.8"
                          />
                        </svg>
                        <span>Gerando Excel...</span>
                      </>
                    ) : (
                      <span>Download Excel</span>
                    )}
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
    </>
  );
};


