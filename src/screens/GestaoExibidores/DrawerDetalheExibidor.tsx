import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../config/axios';

interface Props {
  exibidor_pk: number;
  onClose: () => void;
  onChanged: () => void;
}

interface Detalhe {
  exibidor: any;
  dominios: Array<{
    dominio_pk: number;
    dominio_st: string;
    primario_bl: number;
    active_bl: number;
    dataCriacao_dh: string;
  }>;
  usuarios: Array<{
    usuario_pk: number;
    nome_st: string;
    email_st: string;
    ativo_bl: number;
    perfil_nome: string;
  }>;
  ativosLegado: any[];
  totalAtivosLegado: number;
}

type Aba = 'dados' | 'dominios' | 'usuarios' | 'legado';

interface PreviewMerge {
  origem_nome: string;
  destino_nome: string;
  qtd_ativos_legado: number;
  qtd_usuarios: number;
  qtd_lotes: number;
  qtd_itens_inventario: number;
}

interface ExibidorOpcao {
  exibidor_pk: number;
  nome_st: string;
  nome_fantasia_st: string | null;
}

/** Campos editáveis no formulário Dados (mesma lista que o backend aceita em op:'editar'). */
const CAMPOS_EDITAVEIS = [
  'nome_st',
  'nome_fantasia_st',
  'codigo_st',
  'cnpj_st',
  'site_st',
  'email_st',
  'telefone_st',
  'cep_st',
  'logradouro_st',
  'numero_st',
  'complemento_st',
  'bairro_st',
  'cidade_st',
  'estado_st',
  'observacao_st',
  'active_bl',
] as const;

type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number];

type FormDados = Partial<Record<CampoEditavel, string | number | boolean | null>>;

function normalizarDominio(s: string) {
  return s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

function formatarCnpj(s: string): string {
  const digits = String(s || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export const DrawerDetalheExibidor: React.FC<Props> = ({ exibidor_pk, onClose, onChanged }) => {
  const [data, setData] = useState<Detalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>('dados');
  const [novoDominio, setNovoDominio] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<FormDados>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // ── Zona de Perigo ────────────────────────────────────────────────────────
  // Exclusão
  const [modalExcluir, setModalExcluir]     = useState(false);
  const [confirmNome, setConfirmNome]       = useState('');
  const [excluindo, setExcluindo]           = useState(false);
  const [erroExcluir, setErroExcluir]       = useState<string | null>(null);

  // Merge / Incorporar
  const [modalMerge, setModalMerge]         = useState(false);
  const [mergeStep, setMergeStep]           = useState<'busca' | 'preview' | 'confirm'>('busca');
  const [mergeBusca, setMergeBusca]         = useState('');
  const [mergeOpcoes, setMergeOpcoes]       = useState<ExibidorOpcao[]>([]);
  const [mergeDestino, setMergeDestino]     = useState<ExibidorOpcao | null>(null);
  const [mergePreview, setMergePreview]     = useState<PreviewMerge | null>(null);
  const [mergeConfirmNome, setMergeConfirmNome] = useState('');
  const [mergeLoading, setMergeLoading]     = useState(false);
  const [erroMerge, setErroMerge]           = useState<string | null>(null);
  const mergeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data: resp } = await api.get(
        `/referencia?action=exibidor-gestao&mode=detalhe&id=${exibidor_pk}`
      );
      setData(resp);
      const e = resp?.exibidor || {};
      const baseline: FormDados = {};
      CAMPOS_EDITAVEIS.forEach((k) => {
        baseline[k] = e[k] ?? (k === 'active_bl' ? 1 : '');
      });
      setForm(baseline);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }, [exibidor_pk]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const baselineExibidor = data?.exibidor;

  const dirty = useMemo(() => {
    if (!baselineExibidor) return false;
    return CAMPOS_EDITAVEIS.some((k) => {
      const orig = baselineExibidor[k] ?? (k === 'active_bl' ? 1 : '');
      const atual = form[k] ?? (k === 'active_bl' ? 1 : '');
      if (k === 'active_bl') return Boolean(Number(orig)) !== Boolean(Number(atual));
      return String(orig ?? '') !== String(atual ?? '');
    });
  }, [form, baselineExibidor]);

  const atualizarCampo = (k: CampoEditavel, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v as any }));
    setSucesso(null);
  };

  const salvarDados = async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const payload: Record<string, unknown> = { op: 'editar', exibidor_pk };
      CAMPOS_EDITAVEIS.forEach((k) => {
        let v = form[k];
        if (k === 'cnpj_st' && typeof v === 'string') v = v.replace(/\D/g, '');
        if (k === 'estado_st' && typeof v === 'string') v = v.toUpperCase().slice(0, 2);
        if (k === 'active_bl') v = v ? 1 : 0;
        payload[k] = v === '' ? null : v;
      });
      const { data: r } = await api.post('/referencia?action=exibidor-gestao', payload);
      if (r?.success) {
        setSucesso('Dados salvos com sucesso.');
        await carregar();
        onChanged();
      } else {
        setErro(r?.error || 'Erro ao salvar');
      }
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro');
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    if (!baselineExibidor) return;
    const baseline: FormDados = {};
    CAMPOS_EDITAVEIS.forEach((k) => {
      baseline[k] = baselineExibidor[k] ?? (k === 'active_bl' ? 1 : '');
    });
    setForm(baseline);
    setErro(null);
    setSucesso(null);
  };

  const adicionarDominio = async () => {
    const d = normalizarDominio(novoDominio);
    if (!d) return;
    setAdicionando(true);
    setErro(null);
    try {
      const { data: r } = await api.post('/referencia?action=exibidor-gestao', {
        op: 'add-dominio',
        exibidor_pk,
        dominio_st: d,
      });
      if (r?.success) {
        setNovoDominio('');
        await carregar();
        onChanged();
      } else {
        setErro(r?.error || 'Erro ao adicionar');
      }
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro');
    } finally {
      setAdicionando(false);
    }
  };

  const removerDominio = async (dominio_pk: number) => {
    if (!confirm('Remover este domínio? Usuários do domínio perderão acesso automático.')) return;
    try {
      await api.post('/referencia?action=exibidor-gestao', {
        op: 'remove-dominio',
        dominio_pk,
      });
      await carregar();
      onChanged();
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro');
    }
  };

  // ── Handlers Zona de Perigo ───────────────────────────────────────────────
  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExcluir(null);
    try {
      await api.delete(`/referencia?action=exibidor-gestao&id=${exibidor_pk}`);
      setModalExcluir(false);
      onChanged();
      onClose();
    } catch (err: any) {
      setErroExcluir(err?.response?.data?.error || err?.message || 'Erro ao excluir');
    } finally {
      setExcluindo(false);
    }
  };

  const buscarExibidores = (q: string) => {
    if (mergeTimer.current) clearTimeout(mergeTimer.current);
    if (!q.trim()) { setMergeOpcoes([]); return; }
    mergeTimer.current = setTimeout(async () => {
      try {
        const { data: r } = await api.get(`/referencia?action=exibidor-gestao&search=${encodeURIComponent(q)}`);
        setMergeOpcoes(
          (r?.exibidores || r || [])
            .filter((x: any) => x.exibidor_pk !== exibidor_pk)
            .slice(0, 8)
        );
      } catch { /* silencioso */ }
    }, 350);
  };

  const selecionarDestino = async (opcao: ExibidorOpcao) => {
    setMergeDestino(opcao);
    setMergeStep('preview');
    setMergeLoading(true);
    setErroMerge(null);
    try {
      const { data: r } = await api.get(
        `/referencia?action=exibidor-gestao&mode=preview-merge&origem=${exibidor_pk}&destino=${opcao.exibidor_pk}`
      );
      setMergePreview(r?.preview || null);
    } catch (err: any) {
      setErroMerge(err?.response?.data?.error || err?.message || 'Erro ao carregar preview');
    } finally {
      setMergeLoading(false);
    }
  };

  const confirmarMerge = async () => {
    if (!mergeDestino) return;
    setMergeLoading(true);
    setErroMerge(null);
    try {
      const { data: r } = await api.post('/referencia?action=exibidor-gestao', {
        op: 'merge',
        origem_pk: exibidor_pk,
        destino_pk: mergeDestino.exibidor_pk,
      });
      if (r?.success) {
        setModalMerge(false);
        onChanged();
        onClose();
      } else {
        setErroMerge(r?.error || 'Erro ao incorporar');
      }
    } catch (err: any) {
      setErroMerge(err?.response?.data?.error || err?.message || 'Erro ao incorporar');
    } finally {
      setMergeLoading(false);
    }
  };

  const abrirModalMerge = () => {
    setModalMerge(true);
    setMergeStep('busca');
    setMergeBusca('');
    setMergeOpcoes([]);
    setMergeDestino(null);
    setMergePreview(null);
    setMergeConfirmNome('');
    setErroMerge(null);
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
        <div className="bg-white w-[700px] max-w-full h-full p-6">Carregando...</div>
      </div>
    );
  }

  const e = data.exibidor;

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-white w-[760px] max-w-full h-full flex flex-col shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#eee]">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#222]">{e.nome_st}</h2>
            {e.nome_fantasia_st && e.nome_fantasia_st !== e.nome_st ? (
              <p className="text-sm text-[#666]">{e.nome_fantasia_st}</p>
            ) : null}
            <div className="flex items-center gap-2 mt-2">
              {e.sandbox_bl ? (
                <span className="px-2 py-0.5 rounded bg-[#fff5d4] text-[#7a5b00] text-xs font-medium">
                  sandbox
                </span>
              ) : null}
              {e.active_bl ? (
                <span className="px-2 py-0.5 rounded bg-[#e7f3ea] text-[#1f6b2c] text-xs font-medium">
                  ativo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-[#fce6e6] text-[#7f1d1d] text-xs font-medium">
                  inativo
                </span>
              )}
              {data.totalAtivosLegado > 0 ? (
                <span className="px-2 py-0.5 rounded bg-[#f3f4f6] text-[#374151] text-xs font-medium">
                  {data.totalAtivosLegado.toLocaleString('pt-BR')} ativos no legado
                </span>
              ) : null}
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-[#666] hover:text-[#222] leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#eee] px-6">
          {(
            [
              ['dados', 'Dados'],
              ['dominios', `Domínios (${data.dominios.length})`],
              ['usuarios', `Usuários (${data.usuarios.length})`],
              ['legado', `Inventário legado (${data.totalAtivosLegado})`],
            ] as Array<[Aba, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                aba === id ? 'border-[#ff4600] text-[#ff4600]' : 'border-transparent text-[#666]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {aba === 'dados' ? (
            <div className="space-y-4">
              <div className="text-xs text-[#6b7280]">
                ID interno: <span className="font-mono text-[#222]">{e.exibidor_pk}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nome" required>
                  <input
                    type="text"
                    value={String(form.nome_st ?? '')}
                    onChange={(ev) => atualizarCampo('nome_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Nome fantasia">
                  <input
                    type="text"
                    value={String(form.nome_fantasia_st ?? '')}
                    onChange={(ev) => atualizarCampo('nome_fantasia_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Código">
                  <input
                    type="text"
                    value={String(form.codigo_st ?? '')}
                    onChange={(ev) => atualizarCampo('codigo_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="CNPJ">
                  <input
                    type="text"
                    value={formatarCnpj(String(form.cnpj_st ?? ''))}
                    onChange={(ev) => atualizarCampo('cnpj_st', ev.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={inputCls}
                  />
                </Campo>
                <Campo label="E-mail">
                  <input
                    type="email"
                    value={String(form.email_st ?? '')}
                    onChange={(ev) => atualizarCampo('email_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Telefone">
                  <input
                    type="text"
                    value={String(form.telefone_st ?? '')}
                    onChange={(ev) => atualizarCampo('telefone_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Site" full>
                  <input
                    type="text"
                    value={String(form.site_st ?? '')}
                    onChange={(ev) => atualizarCampo('site_st', ev.target.value)}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </Campo>
                <Campo label="CEP">
                  <input
                    type="text"
                    value={String(form.cep_st ?? '')}
                    onChange={(ev) => atualizarCampo('cep_st', ev.target.value)}
                    placeholder="00000-000"
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Estado (UF)">
                  <input
                    type="text"
                    value={String(form.estado_st ?? '')}
                    onChange={(ev) => atualizarCampo('estado_st', ev.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="SP"
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Cidade" full>
                  <input
                    type="text"
                    value={String(form.cidade_st ?? '')}
                    onChange={(ev) => atualizarCampo('cidade_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Bairro">
                  <input
                    type="text"
                    value={String(form.bairro_st ?? '')}
                    onChange={(ev) => atualizarCampo('bairro_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Logradouro">
                  <input
                    type="text"
                    value={String(form.logradouro_st ?? '')}
                    onChange={(ev) => atualizarCampo('logradouro_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Número">
                  <input
                    type="text"
                    value={String(form.numero_st ?? '')}
                    onChange={(ev) => atualizarCampo('numero_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Complemento">
                  <input
                    type="text"
                    value={String(form.complemento_st ?? '')}
                    onChange={(ev) => atualizarCampo('complemento_st', ev.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Observação" full>
                  <textarea
                    value={String(form.observacao_st ?? '')}
                    onChange={(ev) => atualizarCampo('observacao_st', ev.target.value)}
                    rows={3}
                    className={`${inputCls} resize-y`}
                  />
                </Campo>
                <Campo label="Status" full>
                  <label className="inline-flex items-center gap-2 text-sm text-[#222]">
                    <input
                      type="checkbox"
                      checked={Boolean(Number(form.active_bl ?? 1))}
                      onChange={(ev) => atualizarCampo('active_bl', ev.target.checked)}
                      className="w-4 h-4 accent-[#ff4600]"
                    />
                    Exibidor ativo
                  </label>
                </Campo>
              </div>

              {sucesso ? (
                <div className="p-3 rounded-lg bg-[#e7f3ea] border border-[#bce0c5] text-sm text-[#1f6b2c]">
                  {sucesso}
                </div>
              ) : null}

              {/* Zona de Perigo */}
              <div className="mt-8 border border-[#fca5a5] rounded-xl p-4 bg-[#fff5f5]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#b91c1c] mb-1">
                  Zona de perigo
                </p>
                <p className="text-xs text-[#6b7280] mb-4">
                  Ações irreversíveis. Tenha certeza antes de prosseguir.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={abrirModalMerge}
                    className="flex-1 h-[38px] rounded-lg border border-[#f87171] bg-white text-[#b91c1c] text-sm font-medium hover:bg-[#fef2f2] transition-colors"
                  >
                    Incorporar em outro exibidor
                  </button>
                  <button
                    onClick={() => { setModalExcluir(true); setConfirmNome(''); setErroExcluir(null); }}
                    className="flex-1 h-[38px] rounded-lg bg-[#b91c1c] text-white text-sm font-medium hover:bg-[#991b1b] transition-colors"
                  >
                    Excluir exibidor
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {aba === 'dominios' ? (
            <div>
              <p className="text-sm text-[#666] mb-4">
                Usuários com e-mail destes domínios entram automaticamente como exibidor "{e.nome_st}".
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="novo-dominio.com.br"
                  className="flex-1 h-[42px] px-3 border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4600]"
                  value={novoDominio}
                  onChange={(ev) => setNovoDominio(ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && adicionarDominio()}
                />
                <button
                  onClick={adicionarDominio}
                  disabled={adicionando}
                  className="h-[42px] px-4 bg-[#111827] hover:bg-[#000] text-white rounded-lg font-medium text-sm disabled:opacity-50"
                >
                  {adicionando ? '...' : '+ Adicionar'}
                </button>
              </div>

              {data.dominios.length === 0 ? (
                <div className="border-2 border-dashed border-[#ddd] rounded-lg p-6 text-center text-[#888] text-sm">
                  Nenhum domínio cadastrado.
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.dominios.map((d) => (
                    <li
                      key={d.dominio_pk}
                      className="flex items-center justify-between bg-[#f7f7f7] border border-[#eee] rounded-lg px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{d.dominio_st}</span>
                        {d.primario_bl ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#111827] text-white text-[10px] font-bold uppercase">
                            primário
                          </span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => removerDominio(d.dominio_pk)}
                        className="text-[#7f1d1d] hover:text-[#a8410d] text-sm"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {aba === 'usuarios' ? (
            <div>
              {data.usuarios.length === 0 ? (
                <div className="border-2 border-dashed border-[#ddd] rounded-lg p-6 text-center text-[#888] text-sm">
                  Nenhum usuário vinculado. Adicione domínios para liberar acesso automático.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f7f7f7]">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Nome</th>
                      <th className="text-left px-3 py-2 font-semibold">Email</th>
                      <th className="text-left px-3 py-2 font-semibold">Perfil</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usuarios.map((u) => (
                      <tr key={u.usuario_pk} className="border-t border-[#eee]">
                        <td className="px-3 py-2">{u.nome_st || '-'}</td>
                        <td className="px-3 py-2">{u.email_st || '-'}</td>
                        <td className="px-3 py-2">{u.perfil_nome || '-'}</td>
                        <td className="px-3 py-2">
                          {u.ativo_bl ? (
                            <span className="text-[#1f6b2c]">ativo</span>
                          ) : (
                            <span className="text-[#7f1d1d]">inativo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {aba === 'legado' ? (
            <div>
              {data.totalAtivosLegado === 0 ? (
                <div className="border-2 border-dashed border-[#ddd] rounded-lg p-6 text-center text-[#888] text-sm">
                  Sem ativos linkados ao banco legado.
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#666] mb-2">
                    Mostrando 50 de {data.totalAtivosLegado.toLocaleString('pt-BR')} ativos linkados.
                  </p>
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#f7f7f7]">
                      <tr>
                        <th className="text-left px-2 py-2 font-semibold">Code</th>
                        <th className="text-left px-2 py-2 font-semibold">Cidade/UF</th>
                        <th className="text-left px-2 py-2 font-semibold">Tipo</th>
                        <th className="text-left px-2 py-2 font-semibold">Formato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ativosLegado.map((a) => (
                        <tr key={a.pk} className="border-t border-[#eee]">
                          <td className="px-2 py-1.5 font-mono">{a.code}</td>
                          <td className="px-2 py-1.5">
                            {a.cidade_st || '-'}{a.estado_st ? `/${a.estado_st}` : ''}
                          </td>
                          <td className="px-2 py-1.5">{a.tipoMidia_st || '-'}</td>
                          <td className="px-2 py-1.5">{a.media_format_st || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          ) : null}

          {erro ? (
            <div className="mt-4 p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
              {erro}
            </div>
          ) : null}
        </div>

        {/* Footer com ação de salvar (somente aba Dados) */}
        {aba === 'dados' ? (
          <div className="flex items-center justify-end gap-2 border-t border-[#eee] px-6 py-3 bg-[#fafafa]">
            <button
              onClick={cancelarEdicao}
              disabled={!dirty || salvando}
              className="h-[36px] px-4 text-sm rounded-lg border border-[#d9d9d9] bg-white text-[#3a3a3a] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={salvarDados}
              disabled={!dirty || salvando}
              className="h-[36px] px-4 text-sm font-medium rounded-lg bg-[#ff4600] hover:bg-[#e33d00] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        ) : null}
      </div>
    </div>

    {/* ── Modal: Excluir exibidor ─────────────────────────────────────────── */}
    {modalExcluir ? (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#b91c1c]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#111]">Excluir exibidor</h3>
              <p className="text-xs text-[#6b7280]">Esta ação é irreversível.</p>
            </div>
          </div>

          <p className="text-sm text-[#374151] mb-4">
            O exibidor será marcado como excluído e seus domínios serão desativados.
            Os ativos do banco legado serão desvinculados.
          </p>

          <p className="text-xs text-[#6b7280] mb-1">
            Para confirmar, digite o nome do exibidor:
            <span className="font-semibold text-[#111] ml-1">{e.nome_st}</span>
          </p>
          <input
            type="text"
            value={confirmNome}
            onChange={(ev) => setConfirmNome(ev.target.value)}
            placeholder="Nome do exibidor"
            className="w-full h-[38px] px-3 text-sm border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b91c1c] mb-4"
          />

          {erroExcluir ? (
            <div className="p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d] mb-4">
              {erroExcluir}
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setModalExcluir(false)}
              disabled={excluindo}
              className="h-[38px] px-4 text-sm rounded-lg border border-[#d9d9d9] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarExclusao}
              disabled={confirmNome.trim() !== e.nome_st?.trim() || excluindo}
              className="h-[38px] px-4 text-sm font-medium rounded-lg bg-[#b91c1c] text-white hover:bg-[#991b1b] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {excluindo ? 'Excluindo…' : 'Excluir definitivamente'}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {/* ── Modal: Incorporar em outro exibidor ─────────────────────────────── */}
    {modalMerge ? (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#fff7ed] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#111]">Incorporar em outro exibidor</h3>
              <p className="text-xs text-[#6b7280]">Todos os dados serão migrados para o exibidor de destino.</p>
            </div>
          </div>

          {/* Passo 1: busca */}
          {mergeStep === 'busca' ? (
            <>
              <p className="text-sm text-[#374151] mb-3">
                Busque o exibidor que irá <strong>receber</strong> os dados de{' '}
                <span className="font-semibold">{e.nome_st}</span>:
              </p>
              <input
                type="text"
                value={mergeBusca}
                onChange={(ev) => { setMergeBusca(ev.target.value); buscarExibidores(ev.target.value); }}
                placeholder="Buscar por nome…"
                className="w-full h-[38px] px-3 text-sm border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4600] mb-3"
                autoFocus
              />
              {mergeOpcoes.length > 0 ? (
                <ul className="border border-[#e5e7eb] rounded-lg divide-y divide-[#f3f4f6] max-h-52 overflow-y-auto">
                  {mergeOpcoes.map((op) => (
                    <li key={op.exibidor_pk}>
                      <button
                        onClick={() => selecionarDestino(op)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#f9fafb] transition-colors"
                      >
                        <p className="text-sm font-medium text-[#111]">{op.nome_st}</p>
                        {op.nome_fantasia_st && op.nome_fantasia_st !== op.nome_st ? (
                          <p className="text-xs text-[#6b7280]">{op.nome_fantasia_st}</p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : mergeBusca.trim() ? (
                <p className="text-xs text-[#9ca3af] text-center py-4">Nenhum exibidor encontrado.</p>
              ) : null}
            </>
          ) : null}

          {/* Passo 2: preview */}
          {mergeStep === 'preview' ? (
            <>
              {mergeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#f3f4f6] border-t-[#ff4600] rounded-full animate-spin" />
                </div>
              ) : mergePreview ? (
                <>
                  <p className="text-sm text-[#374151] mb-4">
                    Os itens abaixo serão migrados de{' '}
                    <span className="font-semibold">{mergePreview.origem_nome}</span> para{' '}
                    <span className="font-semibold">{mergePreview.destino_nome}</span>:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Ativos no legado', valor: mergePreview.qtd_ativos_legado },
                      { label: 'Usuários', valor: mergePreview.qtd_usuarios },
                      { label: 'Lotes de inventário', valor: mergePreview.qtd_lotes },
                      { label: 'Itens de inventário', valor: mergePreview.qtd_itens_inventario },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-4 py-3">
                        <p className="text-2xl font-bold text-[#111]">{item.valor.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setMergeStep('busca')}
                      className="h-[38px] px-4 text-sm rounded-lg border border-[#d9d9d9] bg-white text-[#374151] hover:bg-[#f3f4f6]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => { setMergeStep('confirm'); setMergeConfirmNome(''); }}
                      className="h-[38px] px-4 text-sm font-medium rounded-lg bg-[#b45309] text-white hover:bg-[#92400e]"
                    >
                      Prosseguir
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {/* Passo 3: confirmação final */}
          {mergeStep === 'confirm' ? (
            <>
              <p className="text-sm text-[#374151] mb-4">
                Esta ação é <strong>irreversível</strong>. O exibidor{' '}
                <span className="font-semibold">{e.nome_st}</span> será excluído após a migração.
              </p>
              <p className="text-xs text-[#6b7280] mb-1">
                Para confirmar, digite o nome do exibidor de origem:
                <span className="font-semibold text-[#111] ml-1">{e.nome_st}</span>
              </p>
              <input
                type="text"
                value={mergeConfirmNome}
                onChange={(ev) => setMergeConfirmNome(ev.target.value)}
                placeholder="Nome do exibidor"
                className="w-full h-[38px] px-3 text-sm border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b45309] mb-4"
                autoFocus
              />

              {erroMerge ? (
                <div className="p-3 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-sm text-[#92400e] mb-4">
                  {erroMerge}
                </div>
              ) : null}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMergeStep('preview')}
                  disabled={mergeLoading}
                  className="h-[38px] px-4 text-sm rounded-lg border border-[#d9d9d9] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarMerge}
                  disabled={mergeConfirmNome.trim() !== e.nome_st?.trim() || mergeLoading}
                  className="h-[38px] px-4 text-sm font-medium rounded-lg bg-[#b45309] text-white hover:bg-[#92400e] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {mergeLoading ? 'Incorporando…' : 'Confirmar incorporação'}
                </button>
              </div>
            </>
          ) : null}

          {/* Botão fechar (canto) */}
          {!mergeLoading ? (
            <button
              onClick={() => setModalMerge(false)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#374151] text-xl leading-none"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    ) : null}
    </>
  );
};

const inputCls =
  'w-full h-[38px] px-3 text-sm border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent';

const Campo: React.FC<{ label: string; required?: boolean; full?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  full,
  children,
}) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-[11px] uppercase text-[#888] font-semibold tracking-wide mb-1">
      {label}
      {required ? <span className="text-[#ff4600] ml-0.5">*</span> : null}
    </label>
    {children}
  </div>
);
