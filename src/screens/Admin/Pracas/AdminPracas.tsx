import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../config/axios';
import { Sidebar } from '../../../components/Sidebar/Sidebar';
import { Topbar } from '../../../components/Topbar/Topbar';

interface PracaPendente {
  praca_st: string;
  uf_st: string;
  qtd_itens: number;
  qtd_lotes: number;
  exibidor_nome: string;
}

interface PracaCustom {
  praca_pk: number;
  nome_st: string;
  uf_st: string;
  dataCriacao_dh: string;
  criadoPor_st: string;
}

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

const inputCls = 'w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors bg-white';
const labelCls = 'block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1';

export const AdminPracas: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [aba, setAba] = useState<'pendentes' | 'cadastradas'>('pendentes');

  // ── Pendentes ────────────────────────────────────────────────────────────
  const [pendentes, setPendentes]         = useState<PracaPendente[]>([]);
  const [loadingPend, setLoadingPend]     = useState(false);
  const [searchPend, setSearchPend]       = useState('');

  // ── Cadastradas ──────────────────────────────────────────────────────────
  const [cadastradas, setCadastradas]     = useState<PracaCustom[]>([]);
  const [loadingCad, setLoadingCad]       = useState(false);
  const [searchCad, setSearchCad]         = useState('');

  // ── Formulário novo cadastro ─────────────────────────────────────────────
  const [novoNome, setNovoNome]           = useState('');
  const [novoUf, setNovoUf]               = useState('');
  const [salvando, setSalvando]           = useState(false);
  const [msgSucesso, setMsgSucesso]       = useState('');
  const [msgErro, setMsgErro]             = useState('');

  // ── Remoção ──────────────────────────────────────────────────────────────
  const [removendo, setRemovendo]         = useState<number | null>(null);

  const carregarPendentes = useCallback(async (search = '') => {
    setLoadingPend(true);
    try {
      const r = await api.get('/pracas-admin', { params: { mode: 'pendentes', search: search || undefined } });
      setPendentes(r.data.data || []);
    } finally {
      setLoadingPend(false);
    }
  }, []);

  const carregarCadastradas = useCallback(async (search = '') => {
    setLoadingCad(true);
    try {
      const r = await api.get('/pracas-admin', { params: { mode: 'list', search: search || undefined } });
      setCadastradas(r.data.data || []);
    } finally {
      setLoadingCad(false);
    }
  }, []);

  useEffect(() => { carregarPendentes(); carregarCadastradas(); }, [carregarPendentes, carregarCadastradas]);

  const salvar = async (nome?: string, uf?: string) => {
    const n = (nome ?? novoNome).trim().toUpperCase();
    const u = (uf  ?? novoUf).trim().toUpperCase();
    if (!n) { setMsgErro('Informe o nome da praça.'); return; }

    setSalvando(true);
    setMsgErro('');
    setMsgSucesso('');
    try {
      await api.post('/pracas-admin', { op: 'criar', nome_st: n, uf_st: u || undefined });
      setMsgSucesso(`Praça "${n}"${u ? ` (${u})` : ''} cadastrada com sucesso!`);
      setNovoNome('');
      setNovoUf('');
      await Promise.all([carregarPendentes(searchPend), carregarCadastradas(searchCad)]);
      setTimeout(() => setMsgSucesso(''), 4000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMsgErro(err?.response?.data?.error || 'Erro ao salvar praça.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (pk: number) => {
    setRemovendo(pk);
    try {
      await api.delete('/pracas-admin', { params: { pk } });
      await carregarCadastradas(searchCad);
    } finally {
      setRemovendo(null);
    }
  };

  const adicionarDaPendente = (p: PracaPendente) => {
    salvar(p.praca_st, p.uf_st);
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
        <Topbar menuReduzido={menuReduzido} breadcrumb={{ items: [
          { label: 'Admin' },
          { label: 'Praças canônicas' },
        ]}} />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Cabeçalho */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff4600] font-semibold mb-2">Admin</p>
              <h1 className="text-3xl font-bold text-[#ff4600] uppercase tracking-wide">Praças Canônicas</h1>
              <p className="text-gray-500 text-sm mt-1 max-w-2xl">
                Gerencie a lista de praças disponíveis no dropdown de correção de inventário dos exibidores.
                O sistema já inclui os 5.570 municípios do IBGE — aqui você cadastra praças customizadas
                (ex: sub-regiões, bairros-praça) e visualiza praças pendentes enviadas por exibidores.
              </p>
            </div>

            {/* Formulário de cadastro rápido */}
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/40">
              <p className="text-sm font-semibold text-gray-800 mb-4">Cadastrar nova praça customizada</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Nome da praça</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Ex: BARRA DA TIJUCA/RECREIO"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && salvar()}
                  />
                </div>
                <div className="w-28">
                  <label className={labelCls}>UF</label>
                  <select
                    className={inputCls}
                    value={novoUf}
                    onChange={(e) => setNovoUf(e.target.value)}
                  >
                    <option value="">—</option>
                    {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => salvar()}
                    disabled={salvando || !novoNome.trim()}
                    className="h-9 px-5 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] disabled:opacity-40 text-white text-sm font-semibold transition-all"
                  >
                    {salvando ? 'Salvando...' : 'Cadastrar'}
                  </button>
                </div>
              </div>
              {msgSucesso && <p className="mt-3 text-sm text-green-700 font-medium">{msgSucesso}</p>}
              {msgErro    && <p className="mt-3 text-sm text-red-600">{msgErro}</p>}
            </div>

            {/* Abas */}
            <div className="border-b border-gray-200">
              <nav className="flex gap-6">
                {([['pendentes', `Praças pendentes (${pendentes.length})`], ['cadastradas', `Cadastradas (${cadastradas.length})`]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAba(id)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                      aba === id
                        ? 'border-[#ff4600] text-[#ff4600]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* ── ABA: PENDENTES ─────────────────────────────────────────────── */}
            {aba === 'pendentes' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Praças enviadas por exibidores que <strong>não existem</strong> nos 5.570 municípios do IBGE
                  nem no banco de ativos legado. Cadastre-as para que apareçam no dropdown de correção.
                </p>

                {/* Busca */}
                <div className="flex gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <input
                      type="text"
                      className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Filtrar por nome ou UF..."
                      value={searchPend}
                      onChange={(e) => setSearchPend(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && carregarPendentes(searchPend)}
                    />
                  </div>
                  <button onClick={() => carregarPendentes(searchPend)}
                    className="h-9 px-4 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
                    Buscar
                  </button>
                </div>

                {loadingPend ? (
                  <div className="flex items-center gap-3 py-12 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : pendentes.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-400 text-sm">Nenhuma praça pendente encontrada.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Praça</th>
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">UF</th>
                          <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Itens</th>
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Exibidor</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendentes.map((p) => (
                          <tr key={`${p.praca_st}_${p.uf_st}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-gray-800">{p.praca_st}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{p.uf_st || '—'}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">{p.qtd_itens}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{p.exibidor_nome}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => adicionarDaPendente(p)}
                                disabled={salvando}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-[#ff4600] hover:bg-[#e33d00] disabled:opacity-40 text-white text-[11px] font-semibold transition-all"
                              >
                                + Cadastrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: CADASTRADAS ───────────────────────────────────────────── */}
            {aba === 'cadastradas' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Praças customizadas cadastradas manualmente. Estas aparecem no dropdown junto com os municípios do IBGE.
                </p>

                <div className="flex gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <input
                      type="text"
                      className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Buscar praça..."
                      value={searchCad}
                      onChange={(e) => setSearchCad(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && carregarCadastradas(searchCad)}
                    />
                  </div>
                  <button onClick={() => carregarCadastradas(searchCad)}
                    className="h-9 px-4 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
                    Buscar
                  </button>
                </div>

                {loadingCad ? (
                  <div className="flex items-center gap-3 py-12 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : cadastradas.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-400 text-sm">Nenhuma praça customizada cadastrada ainda.</p>
                    <p className="text-gray-300 text-xs mt-1">Use o formulário acima ou a aba "Pendentes" para adicionar.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Praça</th>
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">UF</th>
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Cadastrado por</th>
                          <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Data</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cadastradas.map((c) => (
                          <tr key={c.praca_pk} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-gray-800">{c.nome_st}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{c.uf_st || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{c.criadoPor_st || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {c.dataCriacao_dh ? new Date(c.dataCriacao_dh).toLocaleDateString('pt-BR') : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => remover(c.praca_pk)}
                                disabled={removendo === c.praca_pk}
                                className="h-7 px-3 rounded-md border border-red-200 hover:bg-red-50 text-red-500 text-[11px] font-medium transition-colors disabled:opacity-40"
                              >
                                {removendo === c.praca_pk ? 'Removendo...' : 'Remover'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
