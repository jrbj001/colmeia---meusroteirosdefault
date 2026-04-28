import React, { useMemo, useState } from 'react';
import api from '../../config/axios';
import { parseInventarioXLSXFile } from '../../utils/parseInventarioExibidorExcel';
import { ExibidorShell } from './components/ExibidorShell';

interface Solicitacao {
  lote_pk: number;
  arquivo_st: string;
  status_st: string;
  dataCriacao_dh: string;
}

const steps = [
  'Envie sua base de dados',
  'Análise da base pela BE',
  'Receba feedback da validação',
  'Ajuste e reenvie, se necessário',
];

export const ExibidorImportar: React.FC = () => {
  const [fileName, setFileName] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Array<{ line: number; message: string }>>([]);
  const [lastResult, setLastResult] = useState<{
    lote_pk: number;
    total: number;
    pendentes: number;
    rejeitados: number;
  } | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);

  const carregarSolicitacoes = async () => {
    const response = await api.get('/exibidor-inventario', { params: { mode: 'solicitacoes' } });
    setSolicitacoes(response.data?.data?.slice(0, 5) || []);
  };

  React.useEffect(() => {
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
        lote_pk: Number(data.lote_pk || 0),
        total: Number(data.total || 0),
        pendentes: Number(data.pendentes || 0),
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
          className="text-sm text-[#3a3a3a] underline hover:text-[#ff4600]"
          onClick={(e) => e.preventDefault()}
        >
          Download template Excel
        </a>
      }
    >
      <div className="space-y-8">
        <section className="border border-[#ddd] rounded-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={step} className="p-4 border-b md:border-b-0 md:border-r border-[#eee]">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold mb-2">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <p className="text-xs font-semibold text-[#222]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center justify-center h-[44px] px-10 rounded-lg bg-[#ff4600] text-white font-medium cursor-pointer hover:bg-[#e33d00] transition-colors">
            {sending ? 'Processando...' : 'Importar'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={sending} />
          </label>
          {fileName ? <p className="text-sm text-[#666]">Arquivo selecionado: {fileName}</p> : null}
        </section>

        {lastResult ? (
          <section className="rounded-xl border border-[#d9f0dc] bg-[#f2fff5] p-4 text-sm text-[#245c2a]">
            Lote #{lastResult.lote_pk} processado: {lastResult.total} linhas, {lastResult.pendentes} pendentes de
            de-para e {lastResult.rejeitados} rejeitadas.
          </section>
        ) : null}

        {topErrors.length > 0 ? (
          <section className="rounded-xl border border-[#f4caca] bg-[#fff5f5] p-4">
            <h3 className="text-sm font-semibold text-[#7f1d1d] mb-2">Validações encontradas</h3>
            <ul className="space-y-2 text-sm text-[#7f1d1d]">
              {topErrors.map((err, idx) => (
                <li key={`${err.line}-${idx}`}>
                  {err.line > 0 ? `Linha ${err.line}: ` : ''}{err.message}
                </li>
              ))}
            </ul>
            {errors.length > topErrors.length ? (
              <p className="text-xs text-[#7f1d1d] mt-2">+ {errors.length - topErrors.length} validações adicionais.</p>
            ) : null}
          </section>
        ) : null}

        <section>
          <h3 className="text-lg font-bold text-[#3a3a3a] mb-3">Suas bases importadas</h3>
          <div className="border border-[#ccc] rounded-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f2f2f2]">
                <tr>
                  <th className="text-left px-3 py-2">Data de upload</th>
                  <th className="text-left px-3 py-2">Arquivo</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((sol) => (
                  <tr key={sol.lote_pk} className="border-t border-[#eee]">
                    <td className="px-3 py-2">{new Date(sol.dataCriacao_dh).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2">{sol.arquivo_st}</td>
                    <td className="px-3 py-2">{sol.status_st}</td>
                  </tr>
                ))}
                {solicitacoes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-[#666]" colSpan={3}>
                      Nenhuma base importada até o momento.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ExibidorShell>
  );
};
