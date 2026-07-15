import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth0 } from '@auth0/auth0-react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import api from '../../config/axios';
import { createAuthenticatedApi } from '../../config/axiosWithAuth';
import { usePermissions } from '../../hooks';

// ── Types ──────────────────────────────────────────────────────────────────

interface PontoMidia {
  codigo_ponto: number;
  code: string;
  latitude: number;
  longitude: number;
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
  passantes: number;
  impactos_ipv: number;
  rating: string;
}

interface Cidade {
  id_cidade: number;
  nome_cidade: string;
  nome_estado: string;
}

interface OpcaoNome {
  id?: number;
  name: string;
}

interface Filtros {
  praca: string;
  exibidor: string;
  bairro: string;
  rating: string;
  ambiente: string;
  grupo_midia: string;
  tipo_ambiente_indoor: string;
  tipo_midia_vias_publicas: string;
  formato: string;
}

const FILTROS_VAZIOS: Filtros = {
  praca: '',
  exibidor: '',
  bairro: '',
  rating: '',
  ambiente: '',
  grupo_midia: '',
  tipo_ambiente_indoor: '',
  tipo_midia_vias_publicas: '',
  formato: '',
};

const RATING_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'A', label: 'Classe A' },
  { value: 'B', label: 'Classe B' },
  { value: 'C', label: 'Classe C' },
  { value: 'D', label: 'Classe D' },
];

const AMBIENTE_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'Indoor', label: 'Indoor' },
  { value: 'Vias Públicas', label: 'Vias Públicas' },
];

const FORMATO_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'Estático', label: 'Estático' },
  { value: 'Digital', label: 'Digital' },
];

const INPUT_CLASS =
  'w-full h-10 px-3 text-sm text-[#3a3a3a] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff4600] focus:ring-1 focus:ring-[#ff4600] transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const LABEL_CLASS = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

// ── Helpers ────────────────────────────────────────────────────────────────

function temFiltroPreenchido(f: Filtros): boolean {
  return Object.values(f).some((v) => v.trim() !== '');
}

function formatarNumero(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

// ── Tela principal ─────────────────────────────────────────────────────────

export const ConsultarPontosMidia: React.FC = () => {
  const { isAdmin } = usePermissions();
  const { getAccessTokenSilently } = useAuth0();

  const [menuReduzido, setMenuReduzido] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [pontos, setPontos] = useState<PontoMidia[]>([]);
  const [consultado, setConsultado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Opções de dropdown
  const [gruposMidia, setGruposMidia] = useState<OpcaoNome[]>([]);
  const [tiposIndoor, setTiposIndoor] = useState<OpcaoNome[]>([]);
  const [tiposViasPublicas, setTiposViasPublicas] = useState<OpcaoNome[]>([]);

  // Autocomplete praça
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [sugestoesPraca, setSugestoesPraca] = useState<Cidade[]>([]);
  const [showPraca, setShowPraca] = useState(false);

  // Autocomplete exibidor / bairro
  const [sugestoesExibidor, setSugestoesExibidor] = useState<string[]>([]);
  const [sugestoesBairro, setSugestoesBairro] = useState<string[]>([]);
  const [showExibidor, setShowExibidor] = useState(false);
  const [showBairro, setShowBairro] = useState(false);

  const podeConsultar = temFiltroPreenchido(filtros);

  const indoorAtivo = filtros.ambiente === 'Indoor';
  const viasPublicasAtivo = filtros.ambiente === 'Vias Públicas';

  // Carregar opções estáticas
  useEffect(() => {
    api.get('/grupos-midia').then((r) => setGruposMidia(r.data || [])).catch(() => {});
    api.get('/tipos-midia-indoor').then((r) => setTiposIndoor(r.data || [])).catch(() => {});
    api.get('/tipos-midia-vias-publicas').then((r) => setTiposViasPublicas(r.data || [])).catch(() => {});
    api.get('/cidades-praca').then((r) => setCidades(r.data || [])).catch(() => {});
  }, []);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-autocomplete]')) {
        setShowPraca(false);
        setShowExibidor(false);
        setShowBairro(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const atualizarFiltro = useCallback((campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'ambiente') {
        if (valor === 'Indoor') next.tipo_midia_vias_publicas = '';
        if (valor === 'Vias Públicas') next.tipo_ambiente_indoor = '';
      }
      if (campo === 'praca') {
        next.exibidor = '';
        next.bairro = '';
      }
      return next;
    });
  }, []);

  const filtrarPracas = (termo: string) => {
    if (!termo.trim()) {
      setSugestoesPraca(cidades.slice(0, 15));
      return;
    }
    const t = termo.toLowerCase();
    setSugestoesPraca(
      cidades
        .filter(
          (c) =>
            c.nome_cidade.toLowerCase().includes(t) ||
            c.nome_estado.toLowerCase().includes(t)
        )
        .slice(0, 15)
    );
  };

  const buscarExibidores = (termo: string) => {
    const praca = filtros.praca.trim();
    api
      .get('/exibidores-praca', { params: { search: termo, praca: praca || undefined } })
      .then((r) => setSugestoesExibidor((r.data || []).map((e: { nome_exibidor: string }) => e.nome_exibidor)))
      .catch(() => setSugestoesExibidor([]));
  };

  const buscarBairros = (termo: string) => {
    const praca = filtros.praca.trim();
    api
      .get('/bairros', { params: { search: termo, praca: praca || undefined } })
      .then((r) => setSugestoesBairro((r.data || []).map((b: { name: string }) => b.name)))
      .catch(() => setSugestoesBairro([]));
  };

  const consultar = async () => {
    if (!podeConsultar) return;
    setLoading(true);
    setErro(null);
    setSelected([]);
    try {
      const params: Record<string, string> = {};
      Object.entries(filtros).forEach(([k, v]) => {
        if (v.trim()) params[k] = v.trim();
      });
      params.limite = '50000';

      const response = await api.get('/busca-pontos-midia', { params });
      if (response.data?.success) {
        setPontos(response.data.data || []);
        setConsultado(true);
      } else {
        setErro('Formato de resposta inválido da API');
        setPontos([]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao consultar pontos. Tente novamente.';
      setErro(msg);
      setPontos([]);
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => {
    setFiltros(FILTROS_VAZIOS);
    setPontos([]);
    setSelected([]);
    setConsultado(false);
    setErro(null);
  };

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.length === pontos.length ? [] : pontos.map((p) => p.codigo_ponto)
    );
  };

  const allSelected = pontos.length > 0 && selected.length === pontos.length;
  const someSelected = selected.length > 0 && selected.length < pontos.length;

  const exportarExcel = async () => {
    if (pontos.length === 0) return;
    setExportando(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      const dados = pontos.map((p) => ({
        Código: p.codigo_ponto,
        'Cód. ativo': p.code,
        Latitude: p.latitude,
        Longitude: p.longitude,
        Exibidor: p.exibidor,
        'Categoria exibidor': p.categoria_exibidor,
        Ambiente: p.ambiente,
        Formato: p.formato,
        Grupo: p.grupo_midia,
        'Tipo mídia': p.tipo_midia,
        Cidade: p.cidade,
        UF: p.estado,
        Bairro: p.bairro,
        Endereço: p.endereco,
        CEP: p.cep,
        Passantes: p.passantes,
        'Impactos IPV': p.impactos_ipv,
        Rating: p.rating,
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pontos de mídia');
      const data = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Pontos_Midia_${data}.xlsx`);
    } catch {
      alert('Erro ao exportar Excel.');
    } finally {
      setExportando(false);
    }
  };

  const executarExclusao = async () => {
    setExcluindo(true);
    try {
      const token = await getAccessTokenSilently();
      const authApi = createAuthenticatedApi(token);
      await authApi.post('/banco-ativos-delete-pontos', { ids: selected });
      setModalOpen(false);
      setSelected([]);
      await consultar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao excluir pontos. Tente novamente.';
      alert(msg);
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = useMemo(
    () => [
      { key: 'codigo_ponto', label: 'Código', className: 'font-mono' },
      { key: 'latitude', label: 'Latitude' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'exibidor', label: 'Exibidor' },
      { key: 'categoria_exibidor', label: 'Cat. exibidor' },
      { key: 'ambiente', label: 'Amb.' },
      { key: 'formato', label: 'Form.' },
      { key: 'grupo_midia', label: 'Grupo' },
      { key: 'tipo_midia', label: 'Tipo mídia' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'UF' },
      { key: 'rating', label: 'Rating' },
      { key: 'passantes', label: 'Passantes', numeric: true },
      { key: 'impactos_ipv', label: 'Impactos IPV', numeric: true },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div
        className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`}
      />
      <div
        className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}
      >
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{
            items: [
              { label: 'Home', path: '/' },
              { label: 'Banco de ativos', path: '/banco-de-ativos' },
              { label: 'Consultar & Exportar' },
              { label: 'Pontos de mídia' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}
        />

        <div className="flex-1 pt-24 pb-32 overflow-auto">
          <div className="w-full px-10 xl:px-14 2xl:px-20 max-w-[1400px]">
            {/* Cabeçalho */}
            <header className="mb-8">
              <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-2">
                CONSULTAR & EXPORTAR
              </p>
              <h1 className="text-4xl font-light text-[#1a1a1a] tracking-tight">
                Pontos de mídia
              </h1>
              <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-3xl leading-relaxed">
                Selecione os filtros, veja os pontos de mídia em tempo real e exporte seus dados com um clique.
              </p>
            </header>

            {/* Filtros */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Praça */}
                <FilterField label="Praça">
                  <div className="relative" data-autocomplete>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="Ex.: São Paulo"
                      value={filtros.praca}
                      onChange={(e) => {
                        atualizarFiltro('praca', e.target.value);
                        filtrarPracas(e.target.value);
                        setShowPraca(true);
                      }}
                      onFocus={() => {
                        filtrarPracas(filtros.praca);
                        setShowPraca(true);
                      }}
                    />
                    {showPraca && sugestoesPraca.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {sugestoesPraca.map((c) => (
                          <button
                            key={c.id_cidade}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-[#3a3a3a] hover:bg-[#f7f7f7] border-b border-gray-50 last:border-0"
                            onClick={() => {
                              atualizarFiltro('praca', c.nome_cidade);
                              setShowPraca(false);
                            }}
                          >
                            {c.nome_cidade} — {c.nome_estado}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterField>

                {/* Exibidor */}
                <FilterField label="Exibidor">
                  <div className="relative" data-autocomplete>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="Ex.: ADOOH"
                      value={filtros.exibidor}
                      onChange={(e) => {
                        atualizarFiltro('exibidor', e.target.value);
                        buscarExibidores(e.target.value);
                        setShowExibidor(true);
                      }}
                      onFocus={() => {
                        buscarExibidores(filtros.exibidor);
                        setShowExibidor(true);
                      }}
                    />
                    {showExibidor && sugestoesExibidor.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {sugestoesExibidor.map((nome) => (
                          <button
                            key={nome}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-[#3a3a3a] hover:bg-[#f7f7f7] border-b border-gray-50 last:border-0"
                            onClick={() => {
                              atualizarFiltro('exibidor', nome);
                              setShowExibidor(false);
                            }}
                          >
                            {nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterField>

                {/* Bairro */}
                <FilterField label="Bairro">
                  <div className="relative" data-autocomplete>
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="Ex.: Moema"
                      value={filtros.bairro}
                      onChange={(e) => {
                        atualizarFiltro('bairro', e.target.value);
                        buscarBairros(e.target.value);
                        setShowBairro(true);
                      }}
                      onFocus={() => {
                        buscarBairros(filtros.bairro);
                        setShowBairro(true);
                      }}
                    />
                    {showBairro && sugestoesBairro.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {sugestoesBairro.map((nome) => (
                          <button
                            key={nome}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-[#3a3a3a] hover:bg-[#f7f7f7] border-b border-gray-50 last:border-0"
                            onClick={() => {
                              atualizarFiltro('bairro', nome);
                              setShowBairro(false);
                            }}
                          >
                            {nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterField>

                {/* Rating */}
                <FilterField label="Rating">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.rating}
                    onChange={(e) => atualizarFiltro('rating', e.target.value)}
                  >
                    {RATING_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FilterField>

                {/* Ambiente */}
                <FilterField label="Ambiente">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.ambiente}
                    onChange={(e) => atualizarFiltro('ambiente', e.target.value)}
                  >
                    {AMBIENTE_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FilterField>

                {/* Grupos de mídia */}
                <FilterField label="Grupos de mídia">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.grupo_midia}
                    onChange={(e) => atualizarFiltro('grupo_midia', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {gruposMidia.map((g) => (
                      <option key={g.id ?? g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                {/* Tipo ambiente indoor */}
                <FilterField label="Tipo de ambiente (Indoor)">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.tipo_ambiente_indoor}
                    onChange={(e) => atualizarFiltro('tipo_ambiente_indoor', e.target.value)}
                    disabled={viasPublicasAtivo}
                  >
                    <option value="">Todos</option>
                    {tiposIndoor.map((t) => (
                      <option key={t.id ?? t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                {/* Tipo mídia vias públicas */}
                <FilterField label="Tipo de mídia (Vias públicas)">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.tipo_midia_vias_publicas}
                    onChange={(e) => atualizarFiltro('tipo_midia_vias_publicas', e.target.value)}
                    disabled={indoorAtivo}
                  >
                    <option value="">Todos</option>
                    {tiposViasPublicas.map((t) => (
                      <option key={t.id ?? t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                {/* Formato */}
                <FilterField label="Formato">
                  <select
                    className={INPUT_CLASS}
                    value={filtros.formato}
                    onChange={(e) => atualizarFiltro('formato', e.target.value)}
                  >
                    {FORMATO_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
              </div>

              {/* Ações dos filtros */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  type="button"
                  onClick={consultar}
                  disabled={!podeConsultar || loading}
                  className="px-6 py-2.5 bg-[#ff4600] text-white rounded-lg font-medium text-sm hover:bg-[#e03e00] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Consultando...' : 'Consultar'}
                </button>
                <button
                  type="button"
                  onClick={limpar}
                  className="px-6 py-2.5 bg-white text-[#3a3a3a] border border-[#d9d9d9] rounded-lg font-medium text-sm hover:bg-[#f7f7f7] transition-colors duration-200"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {erro}
              </div>
            )}

            {/* Resultados */}
            {consultado && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Barra de ações */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs text-gray-500">
                    {loading ? (
                      'Carregando...'
                    ) : (
                      <>
                        <span className="font-semibold text-gray-700">{pontos.length}</span>{' '}
                        ponto(s) encontrado(s)
                        {selected.length > 0 && (
                          <span className="ml-2 text-[#ff4600] font-semibold">
                            · {selected.length} selecionado(s)
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={selected.length === 0}
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Deletar{selected.length > 0 ? ` (${selected.length})` : ''}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={exportarExcel}
                      disabled={pontos.length === 0 || exportando}
                      className="h-9 px-5 rounded-lg bg-[#ff4600] hover:bg-[#e03e00] disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      {exportando ? 'Exportando...' : 'Download Excel'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        {isAdmin && (
                          <th className="w-10 pl-5 pr-2 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[#ff4600] focus:ring-[#ff4600]"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={toggleAll}
                              disabled={pontos.length === 0}
                            />
                          </th>
                        )}
                        {colunas.map((col) => (
                          <th
                            key={col.key}
                            className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold whitespace-nowrap"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={colunas.length + (isAdmin ? 1 : 0)} className="py-16 text-center">
                            <LoadingSpinner />
                          </td>
                        </tr>
                      ) : pontos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={colunas.length + (isAdmin ? 1 : 0)}
                            className="py-16 text-center"
                          >
                            <p className="text-sm text-gray-500">Nenhum ponto encontrado.</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Ajuste os filtros e tente novamente.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        pontos.map((ponto, idx) => (
                          <tr
                            key={ponto.codigo_ponto}
                            className={`hover:bg-[#f7f7f7] transition-colors ${idx % 2 === 1 ? 'bg-[#fafafa]' : ''} ${selected.includes(ponto.codigo_ponto) ? 'bg-orange-50/50' : ''}`}
                          >
                            {isAdmin && (
                              <td className="pl-5 pr-2 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-[#ff4600] focus:ring-[#ff4600]"
                                  checked={selected.includes(ponto.codigo_ponto)}
                                  onChange={() => toggle(ponto.codigo_ponto)}
                                />
                              </td>
                            )}
                            {colunas.map((col) => {
                              const val = ponto[col.key as keyof PontoMidia];
                              return (
                                <td
                                  key={col.key}
                                  className={`px-3 py-3 text-[13px] text-[#3a3a3a] whitespace-nowrap ${col.className || ''}`}
                                >
                                  {col.numeric
                                    ? formatarNumero(Number(val) || 0)
                                    : String(val ?? '—')}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmação — admin only */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1a1a1a] uppercase tracking-wide">
              Confirma a exclusão do ponto de mídia?
            </h3>
            <p className="text-sm text-[#6a6a6a] mt-3 leading-relaxed">
              Todos os dados serão apagados e será necessário fazer um novo cadastro desse ponto de mídia.
              {selected.length > 1 && (
                <span className="block mt-1 font-medium text-[#3a3a3a]">
                  {selected.length} pontos selecionados.
                </span>
              )}
            </p>
            <div className="flex gap-3 mt-8 justify-center">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={excluindo}
                className="h-10 px-6 rounded-lg border border-[#d9d9d9] text-sm text-[#3a3a3a] hover:bg-[#f7f7f7] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusao}
                disabled={excluindo}
                className="h-10 px-6 rounded-lg bg-[#ff4600] hover:bg-[#e03e00] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
