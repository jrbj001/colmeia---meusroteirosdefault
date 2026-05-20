import React, { useCallback, useEffect, useState } from 'react';
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

type Aba = 'dados' | 'dominios' | 'usuarios' | 'legado' | 'midia-kit';

function normalizarDominio(s: string) {
  return s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

export const DrawerDetalheExibidor: React.FC<Props> = ({ exibidor_pk, onClose, onChanged }) => {
  const [data, setData] = useState<Detalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>('dados');
  const [novoDominio, setNovoDominio] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Mídia Kit
  const [midiaKitUrl, setMidiaKitUrl] = useState<string | null>(null);
  const [kitFile, setKitFile] = useState<File | null>(null);
  const [kitPreview, setKitPreview] = useState<string | null>(null);
  const [kitUploading, setKitUploading] = useState(false);
  const [kitErro, setKitErro] = useState<string | null>(null);
  const [kitDragging, setKitDragging] = useState(false);
  const kitInputRef = React.useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data: resp } = await api.get(
        `/referencia?action=exibidor-gestao&mode=detalhe&id=${exibidor_pk}`
      );
      setData(resp);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }, [exibidor_pk]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Busca URL do mídia kit ao abrir
  useEffect(() => {
    api
      .get(`/referencia?action=exibidor-midia-kit&exibidor_pk=${exibidor_pk}`)
      .then(({ data: r }) => { if (r.success) setMidiaKitUrl(r.midiaKit_url_st); })
      .catch(() => {});
  }, [exibidor_pk]);

  const selecionarKitFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setKitErro('Somente PDF'); return; }
    if (file.size > 20 * 1024 * 1024) { setKitErro('Máximo 20 MB'); return; }
    setKitErro(null);
    setKitFile(file);
    setKitPreview(URL.createObjectURL(file));
  };

  const uploadKit = async () => {
    if (!kitFile) return;
    setKitUploading(true);
    setKitErro(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(kitFile);
      });
      const { data: r } = await api.post('/referencia?action=exibidor-midia-kit', {
        op: 'upload', exibidor_pk, filename: kitFile.name, contentBase64: base64,
      });
      if (r.success) { setMidiaKitUrl(r.midiaKit_url_st); setKitFile(null); setKitPreview(null); }
      else setKitErro(r.error || 'Erro ao enviar');
    } catch { setKitErro('Erro ao enviar'); }
    finally { setKitUploading(false); }
  };

  const removerKit = async () => {
    if (!confirm('Remover o mídia kit deste exibidor?')) return;
    setKitUploading(true);
    try {
      await api.post('/referencia?action=exibidor-midia-kit', { op: 'delete', exibidor_pk });
      setMidiaKitUrl(null);
    } catch { setKitErro('Erro ao remover'); }
    finally { setKitUploading(false); }
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

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
        <div className="bg-white w-[700px] max-w-full h-full p-6">Carregando...</div>
      </div>
    );
  }

  const e = data.exibidor;

  return (
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
                <span className="px-2 py-0.5 rounded bg-[#eaf0fb] text-[#0a52e6] text-xs font-medium">
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
              { id: 'dados', label: 'Dados' },
              { id: 'dominios', label: `Domínios (${data.dominios.length})` },
              { id: 'usuarios', label: `Usuários (${data.usuarios.length})` },
              { id: 'legado', label: `Inventário legado (${data.totalAtivosLegado})` },
              { id: 'midia-kit', label: 'Mídia Kit', badge: !!midiaKitUrl },
            ] as Array<{ id: Aba; label: string; badge?: boolean }>
          ).map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                aba === id ? 'border-[#ff4600] text-[#ff4600]' : 'border-transparent text-[#666]'
              }`}
            >
              {label}
              {badge && <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {aba === 'dados' ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Linha label="ID" value={e.exibidor_pk} />
              <Linha label="Código" value={e.codigo_st} />
              <Linha label="CNPJ" value={e.cnpj_st} />
              <Linha label="E-mail" value={e.email_st} />
              <Linha label="Telefone" value={e.telefone_st} />
              <Linha label="Site" value={e.site_st} />
              <Linha label="CEP" value={e.cep_st} />
              <Linha label="Estado" value={e.estado_st} />
              <Linha label="Cidade" value={e.cidade_st} />
              <Linha label="Bairro" value={e.bairro_st} />
              <div className="col-span-2">
                <Linha label="Endereço" value={[e.logradouro_st, e.numero_st, e.complemento_st].filter(Boolean).join(', ')} />
              </div>
              <div className="col-span-2">
                <Linha label="Observação" value={e.observacao_st} />
              </div>
            </dl>
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
                  className="h-[42px] px-4 bg-[#0a52e6] hover:bg-[#0843b8] text-white rounded-lg font-medium text-sm disabled:opacity-50"
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
                          <span className="px-1.5 py-0.5 rounded bg-[#0a52e6] text-white text-[10px] font-bold uppercase">
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

          {aba === 'midia-kit' ? (
            <div className="space-y-5">
              <p className="text-sm text-[#666]">
                PDF enviado pelo exibidor com informações comerciais sobre o inventário.
              </p>

              {/* Kit salvo */}
              {midiaKitUrl && !kitFile && (
                <div className="rounded-2xl border border-[#e5e5e5] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f7f7f7]">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📄</span>
                      <span className="text-sm font-medium text-[#222]">Mídia Kit atual</span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={midiaKitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 border border-[#0a52e6] text-[#0a52e6] rounded-lg hover:bg-[#eaf0fb]"
                      >
                        Abrir PDF ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => kitInputRef.current?.click()}
                        className="text-xs px-3 py-1.5 border border-[#d9d9d9] rounded-lg hover:bg-white text-[#444]"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={removerKit}
                        disabled={kitUploading}
                        className="text-xs px-3 py-1.5 border border-[#f4caca] text-[#a8410d] rounded-lg hover:bg-[#fff5f5] disabled:opacity-50"
                      >
                        {kitUploading ? '…' : 'Remover'}
                      </button>
                    </div>
                  </div>
                  <iframe
                    src={midiaKitUrl}
                    title="Mídia Kit"
                    className="w-full h-[480px]"
                  />
                </div>
              )}

              {/* Arquivo selecionado aguardando envio */}
              {kitFile && (
                <div className="flex items-center justify-between bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-[#222]">{kitFile.name}</p>
                      <p className="text-xs text-[#666]">{(kitFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={uploadKit}
                      disabled={kitUploading}
                      className="text-xs px-4 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {kitUploading ? 'Enviando…' : 'Enviar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setKitFile(null); setKitPreview(null); setKitErro(null); }}
                      className="text-xs px-3 py-1.5 border border-[#d9d9d9] rounded-lg hover:bg-white text-[#666]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Preview antes de enviar */}
              {kitPreview && !midiaKitUrl && (
                <iframe src={kitPreview} title="Preview" className="w-full h-64 rounded-xl border border-[#e5e5e5]" />
              )}

              {/* Drop zone — só aparece sem kit salvo e sem arquivo selecionado */}
              {!midiaKitUrl && !kitFile && (
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                    kitDragging ? 'border-[#ff4600] bg-[#fff5f2]' : 'border-[#ddd] hover:border-[#bbb]'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setKitDragging(true); }}
                  onDragLeave={() => setKitDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setKitDragging(false); const f = e.dataTransfer.files[0]; if (f) selecionarKitFile(f); }}
                  onClick={() => kitInputRef.current?.click()}
                >
                  <div className="text-4xl mb-3">☁️</div>
                  <p className="text-sm font-medium text-[#444]">Arraste o PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-[#999] mt-1">PDF · máximo 20 MB</p>
                </div>
              )}

              <input
                ref={kitInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selecionarKitFile(f); e.target.value = ''; }}
              />

              {kitErro && (
                <p className="text-sm text-[#a8410d] bg-[#fff5f5] border border-[#f4caca] rounded-lg px-3 py-2">
                  {kitErro}
                </p>
              )}
            </div>
          ) : null}

          {erro ? (
            <div className="mt-4 p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
              {erro}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Linha: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div>
    <dt className="text-xs uppercase text-[#888] font-semibold tracking-wide">{label}</dt>
    <dd className="text-sm text-[#222] mt-0.5">{value || <span className="text-[#bbb]">—</span>}</dd>
  </div>
);
