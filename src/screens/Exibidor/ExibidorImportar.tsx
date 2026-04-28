import React, { useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { parseInventarioXLSXFile } from '../../utils/parseInventarioExibidorExcel';
import { ExibidorShell } from './components/ExibidorShell';
import { AvisoFluxoAtualizacao } from './components/AvisoFluxoAtualizacao';

interface Solicitacao {
  lote_pk: number;
  arquivo_st: string;
  status_st: string;
  totalRegistros_vl?: number;
  pendentes_vl?: number;
  rejeitados_vl?: number;
  dataCriacao_dh: string;
}

const STATUS: Record<string, { label: string; color: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#16a34a' },
  EM_ANALISE:    { label: 'Em análise',    color: '#d97706' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#dc2626' },
};

const STEPS = [
  {
    title: 'Envie sua base',
    description: 'Faça upload do arquivo Excel com todos os pontos do seu inventário.',
  },
  {
    title: 'Análise pela BE180',
    description: 'Nossa equipe valida os dados e cruza com o de-para de mídia.',
  },
  {
    title: 'Receba o feedback',
    description: 'Você recebe o resultado com pontos aprovados, pendentes e rejeitados.',
  },
  {
    title: 'Ajuste se necessário',
    description: 'Corrija pontos pendentes diretamente na tela e reenvie para revisão.',
  },
];

const SectionHeader: React.FC<{
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex items-end justify-between gap-6 pb-5 border-b border-gray-200">
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff4600] font-semibold mb-2">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const ExibidorImportar: React.FC = () => {
  const [fileName, setFileName] = useState('');
  const [sending, setSending]   = useState(false);
  const [errors, setErrors]     = useState<Array<{ line: number; message: string }>>([]);
  const [lastResult, setLastResult] = useState<{
    lote_pk: number;
    total: number;
    pendentes: number;
    rejeitados: number;
  } | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);

  const carregarSolicitacoes = async () => {
    const response = await api.get('/exibidor-inventario', { params: { mode: 'solicitacoes' } });
    setSolicitacoes(response.data?.data?.slice(0, 8) || []);
  };

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setLastResult(null);
    setSending(true);

    try {
      const parsed = await parseInventarioXLSXFile(file);
      setErrors(parsed.errors);
      if (parsed.records.length === 0) {
        return;
      }

      const response = await api.post('/exibidor-inventario', {
        op: 'upload',
        arquivo: file.name,
        registros: parsed.records,
      });

      const data = response.data || {};
      setLastResult({
        lote_pk:    Number(data.lote_pk    || 0),
        total:      Number(data.total      || 0),
        pendentes:  Number(data.pendentes  || 0),
        rejeitados: Number(data.rejeitados || 0),
      });
      await carregarSolicitacoes();
    } catch (error: any) {
      setErrors([
        {
          line: 0,
          message:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            'Falha ao processar upload.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const topErrors = useMemo(() => errors.slice(0, 8), [errors]);

  return (
    <ExibidorShell
      title="Importação de pontos de mídia"
      subtitle="Envie sua base em Excel para validação e integração com o de-para de mídia."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Base de inventário' },
        { label: 'Importar pontos' },
      ]}
      actions={
        <a
          href="#"
          className="text-sm text-gray-600 hover:text-[#ff4600] transition-colors font-medium"
          onClick={(e) => e.preventDefault()}
        >
          Baixar template Excel ↓
        </a>
      }
    >
      <div className="max-w-7xl mx-auto space-y-16">

        <AvisoFluxoAtualizacao descricao="Esta tela envia uma nova base de pontos do exibidor para validação da BE180." />

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 1 — Como funciona (etapas em cards)
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Processo"
            title="Como funciona o envio"
            description="Quatro etapas simples — do upload à aprovação final."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-8">
            {STEPS.map((step, idx) => (
              <div
                key={step.title}
                className="relative bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors"
              >
                {/* número grande de fundo */}
                <span className="absolute right-5 top-4 text-5xl font-bold text-gray-100 select-none leading-none">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-[#ff4600] mb-4" />
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 2 — Upload (área grande de drop)
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Upload"
            title="Envie sua planilha"
            description="Aceitamos arquivos .xlsx ou .xls. Após o envio, processamos automaticamente."
          />

          <div className="pt-8">
            <label
              className={`group relative block border-2 border-dashed rounded-xl px-8 py-14 text-center cursor-pointer transition-colors ${
                sending
                  ? 'border-gray-200 bg-gray-50 cursor-wait'
                  : 'border-gray-300 hover:border-[#ff4600] hover:bg-orange-50/30'
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
                disabled={sending}
              />

              {sending ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 font-medium">Processando {fileName}...</p>
                  <p className="text-xs text-gray-400">Validando linhas e aplicando de-para de mídia.</p>
                </div>
              ) : (
                <>
                  <p className="text-base text-gray-700 mb-2">
                    <span className="text-[#ff4600] font-semibold">Clique para selecionar</span>
                    <span className="text-gray-500"> ou arraste seu arquivo Excel aqui</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Formatos suportados: .xlsx, .xls — máximo 10MB
                  </p>
                  {fileName && !sending && (
                    <p className="text-xs text-gray-500 mt-4">
                      Último arquivo enviado: <span className="font-medium text-gray-700">{fileName}</span>
                    </p>
                  )}
                </>
              )}
            </label>
          </div>

          {/* ── Resultado ── */}
          {lastResult && (
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-white p-5 border-l-4 border-[#16a34a]">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Lote</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">#{lastResult.lote_pk}</p>
                <p className="text-[10px] text-gray-400 mt-1">processado com sucesso</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{lastResult.total}</p>
                <p className="text-[10px] text-gray-400 mt-1">linhas processadas</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Pendentes</p>
                <p className="text-2xl font-bold text-[#d97706] mt-2">{lastResult.pendentes}</p>
                <p className="text-[10px] text-gray-400 mt-1">aguardam de-para</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Rejeitadas</p>
                <p className="text-2xl font-bold text-[#dc2626] mt-2">{lastResult.rejeitados}</p>
                <p className="text-[10px] text-gray-400 mt-1">requerem correção</p>
              </div>
            </div>
          )}

          {/* ── Erros ── */}
          {topErrors.length > 0 && (
            <div className="mt-6 border border-red-100 bg-red-50/40 rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#dc2626] font-semibold mb-3">
                Validações encontradas
              </p>
              <ul className="space-y-1.5 text-sm text-[#7f1d1d]">
                {topErrors.map((err, idx) => (
                  <li key={`${err.line}-${idx}`} className="flex gap-2">
                    {err.line > 0 && (
                      <span className="text-xs font-mono text-red-400 mt-0.5">L{err.line}</span>
                    )}
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
              {errors.length > topErrors.length && (
                <p className="text-xs text-[#7f1d1d] mt-3 pt-3 border-t border-red-100">
                  + {errors.length - topErrors.length} validações adicionais.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 3 — Histórico
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Histórico"
            title="Suas bases importadas"
            description="Acompanhe o status de todos os seus envios recentes."
          />

          <div className="pt-8">
            {solicitacoes.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
                <p className="text-base text-gray-500">Nenhuma base importada até o momento.</p>
                <p className="text-xs text-gray-400 mt-2">
                  Faça seu primeiro upload acima para começar.
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Data</th>
                      <th className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Arquivo</th>
                      <th className="text-right px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Itens</th>
                      <th className="text-right px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {solicitacoes.map((sol) => {
                      const st = STATUS[sol.status_st] || { label: sol.status_st, color: '#999' };
                      return (
                        <tr key={sol.lote_pk} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(sol.dataCriacao_dh).toLocaleDateString('pt-BR')}
                            <span className="text-xs text-gray-400 ml-1">
                              {new Date(sol.dataCriacao_dh).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-medium truncate max-w-md">
                            {sol.arquivo_st}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700 font-medium">
                            {sol.totalRegistros_vl ? new Intl.NumberFormat('pt-BR').format(sol.totalRegistros_vl) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-semibold" style={{ color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="h-12" />
      </div>
    </ExibidorShell>
  );
};
