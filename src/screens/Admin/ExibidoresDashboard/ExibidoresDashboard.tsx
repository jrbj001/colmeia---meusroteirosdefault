import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../config/axios';
import { Sidebar } from '../../../components/Sidebar/Sidebar';
import { Topbar } from '../../../components/Topbar/Topbar';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Overview {
  total_usuarios: number;
  acessaram: number;
  nunca_acessaram: number;
  exibidores_com_lote: number;
  total_lotes: number;
  total_registros: number;
}

interface UsuarioAcesso {
  pk: number;
  email: string;
  nome: string;
  exibidor: string;
  exibidor_fk: number;
  primeiroAcesso_dh: string;
  ultimoAcesso_dh: string;
  lotes_do_exibidor: number;
}

interface ExibidorInventario {
  exibidor_pk: number;
  exibidor: string;
  lotes: number;
  total_registros: number;
  processados: number;
  rejeitados: number;
  primeiro_envio: string;
  ultimo_envio: string;
}

interface StatusLote {
  status: string;
  qtd: number;
  registros: number;
}

interface UsuarioAguardando {
  pk: number;
  email: string;
  nome: string;
  exibidor: string;
  exibidor_fk: number;
  data_cadastro: string;
}

interface DashData {
  geradoEm: string;
  overview: Overview;
  acessaram: UsuarioAcesso[];
  inventario: ExibidorInventario[];
  statusLotes: StatusLote[];
  aguardando: UsuarioAguardando[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n?: number | null) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('pt-BR').format(n);

const dataFmt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const dataHoraFmt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_CONFIG: Record<string, { label: string; cor: string; fundo: string }> = {
  APROVADO:      { label: 'Aprovado',      cor: '#16a34a', fundo: '#dcfce7' },
  EM_ANALISE:    { label: 'Em análise',    cor: '#2563eb', fundo: '#dbeafe' },
  PARA_CORRIGIR: { label: 'Para corrigir', cor: '#d97706', fundo: '#fef3c7' },
  REJEITADO:     { label: 'Rejeitado',     cor: '#dc2626', fundo: '#fee2e2' },
};

type Aba = 'acessaram' | 'inventario' | 'aguardando';

// ── Componentes ──────────────────────────────────────────────────────────────

function StatCard({ valor, label, cor }: { valor: string | number; label: string; cor?: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 flex flex-col gap-1">
      <span className="text-2xl font-bold" style={{ color: cor || '#111827' }}>{valor}</span>
      <span className="text-xs text-[#6b7280] leading-snug">{label}</span>
    </div>
  );
}

function MiniBar({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
      <span className="text-xs text-[#6b7280] w-10 text-right">{pct}%</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cor: '#374151', fundo: '#f3f4f6' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: cfg.cor, backgroundColor: cfg.fundo }}
    >
      {cfg.label}
    </span>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export const ExibidoresDashboard: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('acessaram');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get('/exibidores-dashboard');
      setData(resp.data);
    } catch (e: any) {
      setErro(e?.response?.data?.error || 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Filtra por busca de texto na aba ativa
  const filtrar = <T extends { email?: string; exibidor?: string; nome?: string }>(list: T[]): T[] => {
    if (!busca.trim()) return list;
    const q = busca.toLowerCase();
    return list.filter(
      (r) =>
        r.email?.toLowerCase().includes(q) ||
        r.exibidor?.toLowerCase().includes(q) ||
        r.nome?.toLowerCase().includes(q),
    );
  };

  const ov = data?.overview;
  const totalLotes = data?.statusLotes.reduce((s, l) => s + l.qtd, 0) || 1;
  const maxRegistros = Math.max(...(data?.inventario.map((e) => e.total_registros) || [1]), 1);

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />

      {/* linha vertical divisória */}
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />

      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
        <Topbar menuReduzido={menuReduzido} />

        {/* linha horizontal abaixo da topbar */}
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="flex-1 pt-24 pb-32 overflow-auto">
        <main className="w-full px-10 xl:px-14 2xl:px-20">
          {/* cabeçalho */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">Dashboard de Exibidores</h1>
              <p className="text-sm text-[#6b7280] mt-0.5">
                Acompanhamento em tempo real · exibidores reais (sandbox excluído)
                {data?.geradoEm && (
                  <span className="ml-2 text-xs">
                    · atualizado {dataHoraFmt(data.geradoEm)}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={carregar}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-sm text-[#374151] hover:bg-[#ededed] disabled:opacity-50 transition-colors"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>

          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {erro}
            </div>
          )}

          {loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                <span className="text-sm text-[#6b7280]">Carregando dados…</span>
              </div>
            </div>
          ) : ov && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <StatCard valor={fmt(ov.total_usuarios)} label="Usuários ativos" />
                <StatCard valor={fmt(ov.acessaram)}      label="Já acessaram"   cor="#16a34a" />
                <StatCard valor={fmt(ov.nunca_acessaram)} label="Nunca acessaram" cor="#d97706" />
                <StatCard valor={fmt(ov.exibidores_com_lote)} label="Com inventário" />
                <StatCard valor={fmt(ov.total_lotes)}    label="Lotes recebidos" />
                <StatCard valor={fmt(ov.total_registros)} label="Registros totais" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Acesso × Inatividade */}
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-5">
                  <h2 className="text-sm font-semibold text-[#111827] mb-4">Acesso × Inatividade</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Acessaram',        valor: ov.acessaram,       cor: '#16a34a' },
                      { label: 'Nunca acessaram',  valor: ov.nunca_acessaram,  cor: '#f59e0b' },
                    ].map(({ label, valor, cor }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#374151]">{label}</span>
                          <span className="font-medium" style={{ color: cor }}>{fmt(valor)}</span>
                        </div>
                        <MiniBar valor={valor} max={ov.total_usuarios} cor={cor} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status dos lotes */}
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-5">
                  <h2 className="text-sm font-semibold text-[#111827] mb-4">Status dos Lotes</h2>
                  <div className="space-y-3">
                    {(data?.statusLotes || []).map((s) => {
                      const cfg = STATUS_CONFIG[s.status] || { label: s.status, cor: '#374151', fundo: '#f3f4f6' };
                      return (
                        <div key={s.status}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#374151]">{cfg.label}</span>
                            <span className="font-medium" style={{ color: cfg.cor }}>{s.qtd} lote{s.qtd !== 1 ? 's' : ''}</span>
                          </div>
                          <MiniBar valor={s.qtd} max={totalLotes} cor={cfg.cor} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 5 por registros */}
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-5">
                  <h2 className="text-sm font-semibold text-[#111827] mb-4">Top 5 — Registros enviados</h2>
                  <div className="space-y-3">
                    {(data?.inventario.filter((e) => e.total_registros > 0).slice(0, 5) || []).map((e) => (
                      <div key={e.exibidor_pk}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#374151] truncate max-w-[140px]" title={e.exibidor}>{e.exibidor}</span>
                          <span className="font-medium text-[#2563eb]">{fmt(e.total_registros)}</span>
                        </div>
                        <MiniBar valor={e.total_registros} max={maxRegistros} cor="#2563eb" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Abas + busca */}
              <div className="bg-white border border-[#e5e7eb] rounded-lg">
                <div className="flex items-center justify-between px-5 pt-5 pb-0 border-b border-[#f3f4f6]">
                  <div className="flex gap-0">
                    {([
                      { id: 'acessaram',  label: `Acessaram (${data?.acessaram.length ?? 0})` },
                      { id: 'inventario', label: `Inventário (${data?.inventario.length ?? 0})` },
                      { id: 'aguardando', label: `Aguardando acesso (${data?.aguardando.length ?? 0})` },
                    ] as { id: Aba; label: string }[]).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setAba(a.id); setBusca(''); }}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          aba === a.id
                            ? 'border-[#ff4600] text-[#ff4600]'
                            : 'border-transparent text-[#6b7280] hover:text-[#374151]'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar…"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="mb-2 px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff4600] w-52"
                  />
                </div>

                <div className="overflow-x-auto">
                  {/* Aba: Acessaram */}
                  {aba === 'acessaram' && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#f3f4f6]">
                          {['Exibidor', 'Usuário', 'E-mail', 'Primeiro acesso', 'Último acesso', 'Lotes'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrar(data?.acessaram ?? []).map((u, i) => (
                          <tr key={u.pk} className={`border-b border-[#f9fafb] hover:bg-[#f9fafb] ${i % 2 === 0 ? '' : 'bg-[#fafafa]'}`}>
                            <td className="px-4 py-3 font-medium text-[#111827] whitespace-nowrap">{u.exibidor}</td>
                            <td className="px-4 py-3 text-[#374151]">{u.nome || '—'}</td>
                            <td className="px-4 py-3 text-[#6b7280] text-xs">{u.email}</td>
                            <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{dataFmt(u.primeiroAcesso_dh)}</td>
                            <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{dataHoraFmt(u.ultimoAcesso_dh)}</td>
                            <td className="px-4 py-3 text-center">
                              {u.lotes_do_exibidor > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#dcfce7] text-[#16a34a]">
                                  {u.lotes_do_exibidor}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#fef3c7] text-[#d97706]">
                                  0
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filtrar(data?.acessaram ?? []).length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af] text-sm">Nenhum resultado</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Aba: Inventário */}
                  {aba === 'inventario' && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#f3f4f6]">
                          {['Exibidor', 'Lotes', 'Registros', 'Processados', 'Rejeitados', 'Primeiro envio', 'Último envio'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrar(data?.inventario ?? []).map((e, i) => (
                          <tr key={e.exibidor_pk} className={`border-b border-[#f9fafb] hover:bg-[#f9fafb] ${i % 2 === 0 ? '' : 'bg-[#fafafa]'}`}>
                            <td className="px-4 py-3 font-medium text-[#111827] whitespace-nowrap">{e.exibidor}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#dbeafe] text-[#2563eb]">{e.lotes}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-[#111827]">
                              {e.total_registros > 0 ? fmt(e.total_registros) : (
                                <span className="text-[#d97706]">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-[#16a34a]">{fmt(e.processados)}</td>
                            <td className="px-4 py-3 text-right text-[#dc2626]">{fmt(e.rejeitados)}</td>
                            <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{dataFmt(e.primeiro_envio)}</td>
                            <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{dataFmt(e.ultimo_envio)}</td>
                          </tr>
                        ))}
                        {filtrar(data?.inventario ?? []).length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-[#9ca3af] text-sm">Nenhum resultado</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Aba: Aguardando */}
                  {aba === 'aguardando' && (
                    <>
                      <div className="px-5 py-3 bg-[#fffbeb] border-b border-[#fef3c7]">
                        <p className="text-xs text-[#92400e]">
                          Esses exibidores têm usuário ativo no sistema mas nunca fizeram login.
                          {(data?.aguardando.length ?? 0) > 0 && ' Considere entrar em contato ou reenviar o e-mail de acesso.'}
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#f3f4f6]">
                            {['Exibidor', 'Usuário', 'E-mail', 'Cadastrado em'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtrar(data?.aguardando ?? []).map((u, i) => (
                            <tr key={u.pk} className={`border-b border-[#f9fafb] hover:bg-[#f9fafb] ${i % 2 === 0 ? '' : 'bg-[#fafafa]'}`}>
                              <td className="px-4 py-3 font-medium text-[#111827] whitespace-nowrap">{u.exibidor}</td>
                              <td className="px-4 py-3 text-[#374151]">{u.nome || '—'}</td>
                              <td className="px-4 py-3 text-[#6b7280] text-xs">{u.email}</td>
                              <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{dataFmt(u.data_cadastro)}</td>
                            </tr>
                          ))}
                          {filtrar(data?.aguardando ?? []).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-[#9ca3af] text-sm">Nenhum resultado</td></tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
        </div>
      </div>
    </div>
  );
};
