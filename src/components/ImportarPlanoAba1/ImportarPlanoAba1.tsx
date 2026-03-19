import React, { useCallback, useState } from 'react';
import { parsePlanoOohExcel, type ParsePlanoOohResult } from '../../utils/parsePlanoOohExcel';

export interface ImportarPlanoAba1Props {
  /** Dados já carregados anteriormente (restaura estado ao remontar) */
  existingData?: { records: ParsePlanoOohResult['records']; filename: string } | null;
  /** Recebe praças detectadas para popular Aba 3 */
  onPracasDetectadas: (pracas: string[]) => void;
  /** Recebe dados parseados para uso na Aba 4 + sugestões para Aba 1 */
  onDataParsed: (data: {
    records: ParsePlanoOohResult['records'];
    filename: string;
    campanhaSuggestion: string;
    valorTotalSuggestion: number;
  }) => void;
  /** Chamado quando o usuário limpa o arquivo (opcional) */
  onClear?: () => void;
}

export const ImportarPlanoAba1: React.FC<ImportarPlanoAba1Props> = ({
  existingData,
  onPracasDetectadas,
  onDataParsed,
  onClear,
}) => {
  // Inicializa o estado a partir de existingData se disponível (restaura ao remontar)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'error'>(
    existingData?.records?.length ? 'ready' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filename, setFilename] = useState(existingData?.filename ?? '');
  const [summary, setSummary] = useState<{ total: number; willInsert: number; pracas: number } | null>(
    existingData?.records?.length
      ? {
          total: existingData.records.length,
          willInsert: existingData.records.filter((r) => r._willInsert).length,
          pracas: new Set(existingData.records.map((r) => r.praca_st as string).filter(Boolean)).size,
        }
      : null
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setStatus('parsing');
      setErrorMessage(null);
      setFilename('');
      setSummary(null);

      try {
        const result = await parsePlanoOohExcel(file);
        setFilename(result.filename);
        setSummary({
          total: result.records.length,
          willInsert: result.willInsertCount,
          pracas: result.pracasUnicas.length,
        });
        setStatus('ready');
        onPracasDetectadas(result.pracasUnicas);
        onDataParsed({
          records: result.records,
          filename: result.filename,
          campanhaSuggestion: result.campanhaSuggestion,
          valorTotalSuggestion: result.valorTotalSuggestion,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar a planilha.';
        setStatus('error');
        setErrorMessage(msg);
      }
    },
    [onPracasDetectadas, onDataParsed],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setFilename('');
    setSummary(null);
    onClear?.();
  }, [onClear]);

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-indigo-200 rounded-2xl shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h4 className="text-base font-bold text-[#222]">Importar Plano de Mídia OOH (opcional)</h4>
          <p className="text-sm text-[#555] mt-1">
            Faça upload do Excel para preencher automaticamente as praças (Aba 3) e sugerir nome/valor. Os dados serão usados na Aba 4 para importar ao banco.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={reset} className="text-xs underline font-medium">Limpar</button>
        </div>
      )}

      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        status === 'parsing' ? 'border-gray-200 bg-gray-50' : 'border-indigo-300 hover:border-indigo-500 bg-white cursor-pointer'
      }`}>
        <input
          id="upload-plano-aba1"
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={handleFileChange}
          disabled={status === 'parsing'}
        />
        <label htmlFor="upload-plano-aba1" className={`cursor-pointer block ${status === 'parsing' ? 'cursor-wait' : ''}`}>
          {status === 'parsing' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <p className="text-sm text-indigo-700 font-medium">Processando planilha…</p>
            </div>
          ) : status === 'ready' && filename ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-[#333]">{filename}</p>
              {summary && (
                <p className="text-xs text-[#666]">
                  {summary.total} linhas • {summary.willInsert} serão importadas • {summary.pracas} praça(s) detectada(s)
                </p>
              )}
              <p className="text-xs text-indigo-600">Clique para trocar o arquivo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-indigo-700">Clique para selecionar o arquivo Excel</p>
              <p className="text-xs text-[#888]">Aba OOH • Template Plano de Mídia</p>
            </div>
          )}
        </label>
      </div>

      {status === 'ready' && (
        <button
          onClick={reset}
          className="mt-3 text-sm text-[#666] hover:text-[#333] underline"
        >
          Remover arquivo e limpar dados
        </button>
      )}
    </div>
  );
};
