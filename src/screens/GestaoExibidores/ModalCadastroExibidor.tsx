import React, { useEffect, useState } from 'react';
import api from '../../config/axios';

const UFS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const inputClass =
  'w-full h-[42px] px-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent text-[#3a3a3a]';
const labelClass = 'block text-[#3a3a3a] mb-1 font-semibold text-xs uppercase tracking-wide';

function onlyDigits(s: string) {
  return s.replace(/\D/g, '');
}
function formatCNPJ(s: string) {
  const d = onlyDigits(s).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}
function normalizarDominio(s: string) {
  return s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

interface Props {
  mode:
    | { tipo: 'novo' }
    | { tipo: 'do-legado'; nome_legado: string; qtd_ativos: number }
    | { tipo: 'editar'; exibidor_pk: number };
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = (nomePreSet?: string) => ({
  nome_st: nomePreSet || '',
  nome_fantasia_st: '',
  codigo_st: '',
  cnpj_st: '',
  site_st: '',
  email_st: '',
  telefone_st: '',
  cep_st: '',
  logradouro_st: '',
  numero_st: '',
  complemento_st: '',
  bairro_st: '',
  cidade_st: '',
  estado_st: '',
  observacao_st: '',
});

export const ModalCadastroExibidor: React.FC<Props> = ({ mode, onClose, onSuccess }) => {
  const nomePreSet = mode.tipo === 'do-legado' ? mode.nome_legado : '';
  const [form, setForm] = useState(emptyForm(nomePreSet));
  const [dominioInput, setDominioInput] = useState('');
  const [dominios, setDominios] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [step, setStep] = useState<'dados' | 'dominios'>('dados');
  const [carregandoLegado, setCarregandoLegado] = useState(false);
  const [semDadosEmpresa, setSemDadosEmpresa] = useState(false);

  // Ao abrir em modo do-legado, busca dados derivados dos pontos e pré-preenche
  useEffect(() => {
    if (mode.tipo !== 'do-legado') return;
    setCarregandoLegado(true);
    api
      .get(`/referencia?action=exibidor-gestao&mode=detalhe-pendente&nome_legado=${encodeURIComponent(mode.nome_legado)}`)
      .then(({ data }) => {
        if (!data.success) return;
        const temDados = !!(data.cnpj_st || data.contatoEmail_st || data.cep_st || data.cidadePrincipal_st);
        setSemDadosEmpresa(!temDados);
        setForm((f) => ({
          ...f,
          nome_fantasia_st: data.empresa_st         || f.nome_fantasia_st,
          cnpj_st:          data.cnpj_st            || f.cnpj_st,
          email_st:         data.contatoEmail_st    || f.email_st,
          telefone_st:      data.contatoTelefone_st || f.telefone_st,
          cep_st:           data.cep_st             || f.cep_st,
          logradouro_st:    data.endereco_st        || f.logradouro_st,
          complemento_st:   data.complemento_st     || f.complemento_st,
          bairro_st:        data.bairro_st          || f.bairro_st,
          cidade_st:        data.cidadePrincipal_st || f.cidade_st,
          estado_st:        data.estadoPrincipal_st || f.estado_st,
        }));
      })
      .catch(() => setSemDadosEmpresa(true))
      .finally(() => setCarregandoLegado(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k: keyof ReturnType<typeof emptyForm>, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErro(null);
  };

  const adicionarDominio = () => {
    const d = normalizarDominio(dominioInput);
    if (!d) return;
    if (!d.includes('.')) {
      setErro('Domínio inválido (ex: empresa.com.br)');
      return;
    }
    if (dominios.includes(d)) {
      setErro('Este domínio já foi adicionado');
      return;
    }
    setDominios([...dominios, d]);
    setDominioInput('');
    setErro(null);
  };

  const removerDominio = (d: string) => {
    setDominios(dominios.filter((x) => x !== d));
  };

  const buscarCep = async () => {
    const cep = onlyDigits(form.cep_st);
    if (cep.length !== 8) {
      setErro('CEP precisa ter 8 dígitos');
      return;
    }
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) {
        setErro('CEP não encontrado');
        return;
      }
      setForm((f) => ({
        ...f,
        logradouro_st: j.logradouro || f.logradouro_st,
        bairro_st: j.bairro || f.bairro_st,
        cidade_st: j.localidade || f.cidade_st,
        estado_st: (j.uf || f.estado_st || '').toString().slice(0, 2).toUpperCase(),
      }));
    } catch {
      setErro('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome_st.trim()) {
      setErro('Nome é obrigatório');
      setStep('dados');
      return;
    }
    setSubmitting(true);
    setErro(null);
    try {
      const op = mode.tipo === 'do-legado' ? 'cadastrar-do-legado' : 'cadastrar-novo';
      const payload: any = {
        op,
        ...form,
        nome_st: form.nome_st.trim(),
        cnpj_st: form.cnpj_st ? onlyDigits(form.cnpj_st) : null,
        estado_st: form.estado_st.trim().toUpperCase().slice(0, 2) || null,
        dominios: dominios.map((d) => ({ dominio_st: d, primario_bl: dominios[0] === d })),
      };
      if (mode.tipo === 'do-legado') payload.nome_legado = mode.nome_legado;

      const { data } = await api.post('/referencia?action=exibidor-gestao', payload);
      if (data?.success) {
        onSuccess();
      } else {
        setErro(data?.error || 'Erro ao cadastrar');
      }
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro ao cadastrar');
    } finally {
      setSubmitting(false);
    }
  };

  const titulo =
    mode.tipo === 'do-legado'
      ? `Cadastrar exibidor do legado: ${mode.nome_legado}`
      : 'Adicionar novo exibidor';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#eee]">
          <div>
            <h2 className="text-xl font-bold text-[#222]">{titulo}</h2>
            {mode.tipo === 'do-legado' ? (
              <p className="text-xs text-[#666] mt-1">
                {mode.qtd_ativos.toLocaleString('pt-BR')} ativos no banco legado serão automaticamente vinculados.
              </p>
            ) : (
              <p className="text-xs text-[#666] mt-1">
                Se o nome bater com algum exibidor do legado, os ativos serão vinculados automaticamente.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-2xl text-[#666] hover:text-[#222] leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#eee] px-6">
          {(['dados', 'dominios'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                step === s ? 'border-[#ff4600] text-[#ff4600]' : 'border-transparent text-[#666] hover:text-[#222]'
              }`}
            >
              {s === 'dados' ? '1. Dados da empresa' : `2. Domínios (${dominios.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading overlay — estilo Apple: spinner + texto discreto */}
          {carregandoLegado && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
              <svg
                className="animate-spin"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="14" cy="14" r="11" stroke="#e5e5e7" strokeWidth="2.5" />
                <path
                  d="M14 3 A11 11 0 0 1 25 14"
                  stroke="#3a3a3c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-[13px] text-[#6e6e73] font-medium tracking-tight">
                Buscando dados do banco de ativos…
              </p>
            </div>
          )}

          {step === 'dados' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Razão social *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.nome_st}
                  onChange={(e) => setField('nome_st', e.target.value)}
                  disabled={mode.tipo === 'do-legado'}
                />
                {mode.tipo === 'do-legado' ? (
                  <p className="text-xs text-[#666] mt-1">
                    Vindo do legado. Para alterar, edite após o cadastro.
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClass}>Nome fantasia</label>
                <input type="text" className={inputClass} value={form.nome_fantasia_st} onChange={(e) => setField('nome_fantasia_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Código interno</label>
                <input type="text" className={inputClass} value={form.codigo_st} onChange={(e) => setField('codigo_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CNPJ</label>
                <input
                  type="text"
                  className={inputClass}
                  value={formatCNPJ(form.cnpj_st)}
                  onChange={(e) => setField('cnpj_st', onlyDigits(e.target.value))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className={labelClass}>Site</label>
                <input type="text" className={inputClass} value={form.site_st} onChange={(e) => setField('site_st', e.target.value)} placeholder="https://" />
              </div>
              <div>
                <label className={labelClass}>E-mail de contato</label>
                <input type="email" className={inputClass} value={form.email_st} onChange={(e) => setField('email_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input type="text" className={inputClass} value={form.telefone_st} onChange={(e) => setField('telefone_st', e.target.value)} />
              </div>

              <div className="md:col-span-2 border-t border-[#eee] pt-4 mt-2">
                <p className="text-xs uppercase font-bold text-[#888] mb-1">
                  Endereço (opcional)
                </p>
                {!carregandoLegado && semDadosEmpresa && mode.tipo === 'do-legado' && (
                  <p className="text-xs text-[#999] mb-3">
                    Não encontramos cadastro de empresa para este exibidor no banco de ativos. Preencha manualmente.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelClass}>CEP</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.cep_st}
                    onChange={(e) => setField('cep_st', e.target.value)}
                    onBlur={() => form.cep_st && buscarCep()}
                    placeholder="00000-000"
                  />
                </div>
                <button
                  type="button"
                  onClick={buscarCep}
                  disabled={buscandoCep}
                  className="self-end h-[42px] px-3 border border-[#d9d9d9] rounded-lg text-xs hover:bg-[#f8f8f8]"
                >
                  {buscandoCep ? '...' : 'Buscar'}
                </button>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select className={inputClass} value={form.estado_st} onChange={(e) => setField('estado_st', e.target.value)}>
                  <option value="">—</option>
                  {UFS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
                <input type="text" className={inputClass} value={form.logradouro_st} onChange={(e) => setField('logradouro_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input type="text" className={inputClass} value={form.numero_st} onChange={(e) => setField('numero_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Complemento</label>
                <input type="text" className={inputClass} value={form.complemento_st} onChange={(e) => setField('complemento_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Bairro</label>
                <input type="text" className={inputClass} value={form.bairro_st} onChange={(e) => setField('bairro_st', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Cidade</label>
                <input type="text" className={inputClass} value={form.cidade_st} onChange={(e) => setField('cidade_st', e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#666] mb-4">
                Domínios autorizados a acessar a plataforma como este exibidor. Usuários com email{' '}
                <code className="bg-[#f0f0f0] px-1 rounded text-xs">@&lt;dominio&gt;</code> serão
                automaticamente reconhecidos no primeiro login.
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="ex: empresa.com.br"
                  className={inputClass}
                  value={dominioInput}
                  onChange={(e) => setDominioInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarDominio();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={adicionarDominio}
                  className="h-[42px] px-4 bg-[#0a52e6] hover:bg-[#0843b8] text-white rounded-lg font-medium text-sm whitespace-nowrap"
                >
                  + Adicionar
                </button>
              </div>

              {dominios.length === 0 ? (
                <div className="border-2 border-dashed border-[#ddd] rounded-lg p-8 text-center text-[#888] text-sm">
                  Nenhum domínio adicionado.<br />
                  <span className="text-xs">
                    Sem domínio, o exibidor é cadastrado mas usuários não conseguem entrar automaticamente.
                  </span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {dominios.map((d, idx) => (
                    <li
                      key={d}
                      className="flex items-center justify-between bg-[#f7f7f7] border border-[#eee] rounded-lg px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{d}</span>
                        {idx === 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#0a52e6] text-white text-[10px] font-bold uppercase">
                            primário
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerDominio(d)}
                        className="text-[#666] hover:text-[#a8410d] text-sm"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {erro ? (
            <div className="mt-4 p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
              {erro}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-[#eee]">
          <div className="text-xs text-[#888]">
            {mode.tipo === 'do-legado'
              ? `${mode.qtd_ativos.toLocaleString('pt-BR')} ativos serão linkados automaticamente`
              : ' '}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="h-[42px] px-5 border border-[#d9d9d9] rounded-lg hover:bg-[#f8f8f8] text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.nome_st.trim()}
              className="h-[42px] px-6 bg-[#ff4600] hover:bg-[#e33d00] text-white rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Cadastrar exibidor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
