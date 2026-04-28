import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import api from '../../config/axios';

const UFS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const inputClass =
  'w-full min-h-[50px] px-4 py-3 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent text-[#3a3a3a]';

const labelClass = 'block text-[#3a3a3a] mb-2 font-semibold text-sm';

function onlyDigits(s: string) {
  return s.replace(/\D/g, '');
}

const emptyForm = () => ({
  nome_st: '',
  nome_fantasia_st: '',
  codigo_st: '',
  cnpj_st: '',
  site_st: '',
  email_st: '',
  dominio_st: '',
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

export const CadastrarExibidor: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const setField = useCallback((k: keyof ReturnType<typeof emptyForm>, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErro(null);
    setSucesso(null);
  }, []);

  const buscarCep = async () => {
    const cep = onlyDigits(form.cep_st);
    if (cep.length !== 8) {
      setErro('Informe um CEP com 8 dígitos para buscar o endereço.');
      return;
    }
    setBuscandoCep(true);
    setErro(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (!r.ok || j.erro) {
        setErro('CEP não encontrado.');
        return;
      }
      setForm((f) => ({
        ...f,
        logradouro_st: j.logradouro || f.logradouro_st,
        bairro_st: j.bairro || f.bairro_st,
        cidade_st: j.localidade || f.cidade_st,
        estado_st: (j.uf || f.estado_st).toString().slice(0, 2).toUpperCase(),
        complemento_st: j.complemento && String(j.complemento).trim() ? j.complemento : f.complemento_st,
      }));
    } catch {
      setErro('Não foi possível consultar o CEP. Tente novamente.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!form.nome_st.trim()) {
      setErro('Nome (razão social) é obrigatório.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        nome_st: form.nome_st.trim(),
        estado_st: form.estado_st.trim().toUpperCase().slice(0, 2) || null,
      };
      const { data } = await api.post('/exibidor-cadastro', payload);
      if (data?.success) {
        setSucesso(
          data?.message ||
            `Exibidor cadastrado (ID ${data?.exibidor?.exibidor_pk ?? ''}).`
        );
        setForm(emptyForm());
      } else {
        setErro(data?.error || 'Não foi possível salvar.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao cadastrar exibidor.';
      setErro(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div
        className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`}
      />
      <div
        className={`flex-1 transition-all duration-300 min-h-screen w-full ${
          menuReduzido ? 'ml-20' : 'ml-64'
        } flex flex-col`}
      >
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{
            items: [
              { label: 'Home', path: '/' },
              { label: 'Banco de ativos', path: '/banco-de-ativos' },
              { label: 'Cadastrar exibidor' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        />

        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-[#ff4600] mb-2 uppercase tracking-wide">
              Cadastrar exibidor
            </h1>
            <p className="text-[#3a3a3a] mb-4 text-base leading-relaxed">
              Registre um novo exibidor no cadastro mestre (SQL Server). Os campos seguem o fluxo do
              formulário de referência: dados da empresa, endereço, contato e observações — com o
              layout padrão Colmeia.
            </p>
            <p className="mb-8 text-sm">
              <Link
                to="/banco-de-ativos/exibidores"
                className="text-[#ff4600] font-semibold underline hover:text-[#e03700]"
              >
                Ver exibidores cadastrados e lista do inventário
              </Link>
            </p>

            <div className="mb-6 p-4 bg-[#f7f7f7] border border-[#c1c1c1] rounded-lg text-sm text-[#666]">
              <strong className="text-[#3a3a3a]">Importante:</strong> é necessário criar a tabela{' '}
              <code className="text-xs bg-white px-1 py-0.5 rounded border border-[#d9d9d9]">
                serv_product_be180.exibidor_dm
              </code>{' '}
              no banco (script em <code className="text-xs">ongoing/07_CREATE_exibidor_dm.sql</code>
              ). Até o deploy do script, a API retornará instruções de erro claras.
            </div>

            {erro && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {erro}
              </div>
            )}
            {sucesso && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
                {sucesso}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              <section>
                <h2 className="text-sm font-bold text-[#3a3a3a] uppercase tracking-wide mb-4 border-b border-[#c1c1c1] pb-2">
                  Dados do exibidor
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className={labelClass}>Nome (razão social) *</label>
                    <input
                      type="text"
                      value={form.nome_st}
                      onChange={(e) => setField('nome_st', e.target.value)}
                      className={inputClass}
                      placeholder="Ex.: Nome legal da empresa exibidora"
                      autoComplete="organization"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Nome fantasia</label>
                      <input
                        type="text"
                        value={form.nome_fantasia_st}
                        onChange={(e) => setField('nome_fantasia_st', e.target.value)}
                        className={inputClass}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Código interno</label>
                      <input
                        type="text"
                        value={form.codigo_st}
                        onChange={(e) => setField('codigo_st', e.target.value)}
                        className={inputClass}
                        placeholder="Opcional — identificador interno"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#3a3a3a] uppercase tracking-wide mb-4 border-b border-[#c1c1c1] pb-2">
                  Fiscal e presença online
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>CNPJ</label>
                    <input
                      type="text"
                      value={form.cnpj_st}
                      onChange={(e) => setField('cnpj_st', e.target.value)}
                      className={inputClass}
                      placeholder="Somente números ou com máscara"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Site</label>
                    <input
                      type="url"
                      value={form.site_st}
                      onChange={(e) => setField('site_st', e.target.value)}
                      className={inputClass}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#3a3a3a] uppercase tracking-wide mb-4 border-b border-[#c1c1c1] pb-2">
                  Endereço
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                  <div className="md:col-span-4">
                    <label className={labelClass}>CEP</label>
                    <input
                      type="text"
                      value={form.cep_st}
                      onChange={(e) => setField('cep_st', e.target.value)}
                      className={inputClass}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-8 flex gap-3 pb-1">
                    <button
                      type="button"
                      onClick={buscarCep}
                      disabled={buscandoCep}
                      className="h-[50px] px-6 rounded-lg border border-[#3a3a3a] text-[#3a3a3a] font-medium hover:bg-[#f0f0f0] transition-colors disabled:opacity-50"
                    >
                      {buscandoCep ? 'Buscando…' : 'Buscar CEP'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                  <div className="md:col-span-8">
                    <label className={labelClass}>Logradouro</label>
                    <input
                      type="text"
                      value={form.logradouro_st}
                      onChange={(e) => setField('logradouro_st', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className={labelClass}>Número</label>
                    <input
                      type="text"
                      value={form.numero_st}
                      onChange={(e) => setField('numero_st', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className={labelClass}>Complemento</label>
                    <input
                      type="text"
                      value={form.complemento_st}
                      onChange={(e) => setField('complemento_st', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className={labelClass}>Bairro</label>
                    <input
                      type="text"
                      value={form.bairro_st}
                      onChange={(e) => setField('bairro_st', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-8">
                    <label className={labelClass}>Cidade</label>
                    <input
                      type="text"
                      value={form.cidade_st}
                      onChange={(e) => setField('cidade_st', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className={labelClass}>UF</label>
                    <select
                      value={form.estado_st}
                      onChange={(e) => setField('estado_st', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Selecionar</option>
                      {UFS_BR.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#3a3a3a] uppercase tracking-wide mb-4 border-b border-[#c1c1c1] pb-2">
                  Contato
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      value={form.email_st}
                      onChange={(e) => setField('email_st', e.target.value)}
                      className={inputClass}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Domínio de acesso</label>
                    <input
                      type="text"
                      placeholder="ex: pixelpulselab.dev"
                      value={form.dominio_st}
                      onChange={(e) => setField('dominio_st', e.target.value)}
                      className={inputClass}
                    />
                    <p className="text-xs text-[#888] mt-1">
                      Usuários com e-mail neste domínio terão acesso automático como Exibidor
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input
                      type="tel"
                      value={form.telefone_st}
                      onChange={(e) => setField('telefone_st', e.target.value)}
                      className={inputClass}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#3a3a3a] uppercase tracking-wide mb-4 border-b border-[#c1c1c1] pb-2">
                  Observações
                </h2>
                <textarea
                  value={form.observacao_st}
                  onChange={(e) => setField('observacao_st', e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-y min-h-[120px]`}
                  placeholder="Notas internas sobre o exibidor (opcional)"
                />
              </section>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[50px] px-10 bg-[#ff4600] text-white rounded-lg font-medium hover:bg-[#e03700] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Salvando…' : 'Salvar exibidor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm());
                    setErro(null);
                    setSucesso(null);
                  }}
                  className="h-[50px] px-8 rounded-lg border border-[#c1c1c1] text-[#3a3a3a] font-medium hover:bg-[#f7f7f7] transition-colors"
                >
                  Limpar formulário
                </button>
              </div>
            </form>
          </div>
        </div>

        <div
          className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        >
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
