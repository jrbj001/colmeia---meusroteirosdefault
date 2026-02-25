import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../config/axios';
import type { ParsedPlanoRow } from '../../utils/parsePlanoOohExcel';
import { parsePlanoOohExcel } from '../../utils/parsePlanoOohExcel';

interface ImportarPlanoMidiaProps {
  planoMidiaGrupo_pk: number;
  nomeRoteiro: string;
  /** Dados já parseados na Aba 1 (opcional) */
  initialData?: { records: ParsedPlanoRow[]; filename: string } | null;
  /** Recebe a lista de nomes de praça detectados no Excel p/ popular Aba 3 */
  onPracasDetectadas: (pracas: string[]) => void;
  /** Chamado após importação bem-sucedida */
  onImportacaoCompleta: (planoMidiaImportFile_pk: number | null) => void;
  /** Chamado quando o usuário limpa os dados (opcional) */
  onClear?: () => void;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export const ImportarPlanoMidia: React.FC<ImportarPlanoMidiaProps> = ({
  planoMidiaGrupo_pk,
  nomeRoteiro,
  initialData,
  onPracasDetectadas,
  onImportacaoCompleta,
  onClear,
}) => {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filename, setFilename] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedPlanoRow[]>([]);
  const [firstWeekStart, setFirstWeekStart] = useState('');

  // Sincroniza initialData (da Aba 1) quando disponível; limpa quando removido
  useEffect(() => {
    if (!initialData || !initialData.records?.length) {
      setParsedRows([]);
      setFilename('');
      setStatus('idle');
      setFirstWeekStart('');
      return;
    }
    setParsedRows(initialData.records);
    setFilename(initialData.filename);
    setStatus('ready');
    const dates = initialData.records.map((r) => r.inicio_dt as string).filter(Boolean).sort();
    if (dates[0]) setFirstWeekStart(dates[0]);
  }, [initialData]);

  const willInsertCount = useMemo(() => parsedRows.filter((r) => r._willInsert).length, [parsedRows]);
  const willSkipCount = useMemo(() => parsedRows.length - willInsertCount, [parsedRows, willInsertCount]);

  const pracasUnicas = useMemo(() => {
    const set = new Set<string>();
    parsedRows.forEach((r) => {
      const p = r.praca_st as string | undefined;
      if (p?.trim()) set.add(p.trim());
    });
    return [...set].sort();
  }, [parsedRows]);

  const previewRows = useMemo(() => parsedRows.slice(0, 5), [parsedRows]);

  const previewColumns = useMemo(
    () => ['praca_st', 'uf_st', 'exibidor_st', 'formato_st', 'grupo_st', 'campanha_st', 'inicio_dt', 'termino_dt', 'tabelaTotal_vl'],
    [],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setFilename('');
    setParsedRows([]);
    setFirstWeekStart('');
    onClear?.();
  }, [onClear]);

  const handleExportarIgnoradas = useCallback(() => {
    const ignoradas = parsedRows
      .filter((r) => !r._willInsert)
      .map(({ _index, _willInsert, ...rest }) => ({ linha_excel: _index, ...rest }));

    if (ignoradas.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(ignoradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Linhas Ignoradas');

    const baseName = filename.replace(/\.[^.]+$/, '');
    XLSX.writeFile(wb, `${baseName}_linhas_ignoradas.xlsx`);
  }, [parsedRows, filename]);

  // ── Parse do Excel ────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setStatus('parsing');
      setErrorMessage(null);
      setFilename(file.name);
      setParsedRows([]);

      try {
        const result = await parsePlanoOohExcel(file);
        setParsedRows(result.records);
        setFilename(result.filename);
        setStatus('ready');
        if (result.firstWeekStartSuggestion) setFirstWeekStart(result.firstWeekStartSuggestion);
        onPracasDetectadas(result.pracasUnicas);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar a planilha.';
        setStatus('error');
        setErrorMessage(msg);
      }
    },
    [onPracasDetectadas],
  );

  // ── Importar ─────────────────────────────────────────────────────────────
  const handleImportar = useCallback(async () => {
    if (status !== 'ready' || willInsertCount === 0) return;

    setStatus('importing');
    setErrorMessage(null);

    try {
      // Envia todas as linhas para a SP — ela mesma aplica o filtro definitivo.
      // Não filtramos por _willInsert aqui para não excluir linhas válidas.
      const records = parsedRows
        .map(({ _index, _willInsert, ...rest }) => rest);

      const payload: Record<string, unknown> = {
        recordsJson: records,
        filename_st: filename,
        source_st: nomeRoteiro || filename,
        planoMidiaGrupo_pk,
      };
      if (firstWeekStart) {
        payload.firstWeekStart_dt = firstWeekStart;
      }

      const response = await api.post('/sp-plano-midia-ooh-insert', payload);
      const data = response.data;

      if (!data?.success && data?.status !== 'OK') {
        throw new Error(data?.message || 'Resposta inesperada da API.');
      }

      setStatus('done');
      onImportacaoCompleta(data?.planoMidiaImportFile_pk ?? null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Erro ao importar.');
      setStatus('error');
      setErrorMessage(msg);
    }
  }, [filename, firstWeekStart, nomeRoteiro, onImportacaoCompleta, parsedRows, planoMidiaGrupo_pk, status, willInsertCount]);

  // ── Render ────────────────────────────────────────────────────────────────
  const isParsing = status === 'parsing';
  const isImporting = status === 'importing';
  const isBusy = isParsing || isImporting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#222]">Importar Plano de Mídia OOH</h3>
            <p className="text-sm text-[#555] mt-1">
              Faça upload do Template Plano de Mídia (.xlsx). As colunas B–EL da aba <strong>OOH</strong> serão importadas para o banco via stored procedure <code className="text-xs bg-white border border-indigo-200 px-1 rounded">sp_planoMidiaOohInsert</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Erro */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Erro</p>
            <p>{errorMessage}</p>
            <button onClick={reset} className="mt-2 text-xs underline text-red-600">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {status === 'done' && (
        <div className="p-6 bg-green-50 border-2 border-green-300 rounded-2xl text-green-800">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-bold">Importação concluída!</span>
          </div>
          <p className="text-sm">
            <strong>{willInsertCount}</strong> linha(s) importadas com sucesso para o grupo <strong>#{planoMidiaGrupo_pk}</strong>. Você será redirecionado para os resultados.
          </p>
        </div>
      )}

      {/* Upload */}
      {status !== 'done' && (
        <>
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-2">Arquivo Excel (Template Plano de Mídia)</label>
            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isBusy ? 'border-gray-200 bg-gray-50' : 'border-indigo-300 hover:border-indigo-500 bg-indigo-50 cursor-pointer'}`}>
              <input
                id="upload-plano-midia-ooh"
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleFileChange}
                disabled={isBusy}
              />
              {isParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-indigo-700 font-medium">Processando planilha…</p>
                </div>
              ) : filename && status !== 'idle' ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-semibold text-[#333]">{filename}</p>
                  <p className="text-xs text-[#666]">Clique para trocar o arquivo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-indigo-700">Clique ou arraste o arquivo aqui</p>
                  <p className="text-xs text-[#888]">Formatos aceitos: .xlsx, .xls — Aba <strong>OOH</strong></p>
                </div>
              )}
            </div>
          </div>

          {/* Resumo do parse */}
          {status === 'ready' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs uppercase font-semibold text-indigo-700 mb-1">Total de linhas</p>
                  <p className="text-3xl font-bold text-[#222]">{parsedRows.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs uppercase font-semibold text-green-700 mb-1">Serão inseridas</p>
                  <p className="text-3xl font-bold text-green-800">{willInsertCount}</p>
                  <p className="text-xs text-green-600 mt-1">Passam nos 3 critérios da SP</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs uppercase font-semibold text-amber-700 mb-1">Serão ignoradas</p>
                  <p className="text-3xl font-bold text-amber-800">{willSkipCount}</p>
                  <p className="text-xs text-amber-600 mt-1">Campos obrigatórios ausentes</p>
                </div>
              </div>

              {/* Praças detectadas */}
              {pracasUnicas.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    {pracasUnicas.length} praça(s) detectada(s) no Excel — Aba 3 será atualizada automaticamente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pracasUnicas.map((p) => (
                      <span key={p} className="bg-white border border-blue-300 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data de início da semana */}
              <div>
                <label className="block text-sm font-semibold text-[#333] mb-1">
                  Data de início da semana 1 <span className="text-[#888] font-normal">(opcional)</span>
                </label>
                <p className="text-xs text-[#666] mb-2">
                  Quando informado, a SP gera automaticamente as 52 semanas da dimensão <code className="text-xs">planoMidiaImportWeek_dm</code>.
                </p>
                <input
                  type="date"
                  value={firstWeekStart}
                  onChange={(e) => setFirstWeekStart(e.target.value)}
                  className="w-full md:w-64 border border-[#d0d0d0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-[#333]"
                />
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#333] mb-2">Amostra das primeiras linhas (colunas-chave)</p>
                  <div className="overflow-x-auto border border-[#e0e0e0] rounded-xl">
                    <table className="min-w-full text-xs text-left text-[#333]">
                      <thead className="bg-indigo-600 text-white">
                        <tr>
                          <th className="px-3 py-2">Linha</th>
                          {previewColumns.map((col) => (
                            <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                          ))}
                          <th className="px-3 py-2">Inserir?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50'}>
                            <td className="px-3 py-2 font-mono text-[#888]">{row._index}</td>
                            {previewColumns.map((col) => (
                              <td key={col} className="px-3 py-2 max-w-[160px] truncate">{String(row[col] ?? '')}</td>
                            ))}
                            <td className="px-3 py-2 text-center">
                              {row._willInsert ? (
                                <span className="text-green-600 font-bold">✓</span>
                              ) : (
                                <span className="text-amber-500 font-bold">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleImportar}
                  disabled={isImporting || willInsertCount === 0}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-md ${
                    isImporting || willInsertCount === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
                  }`}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Importando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Importar {willInsertCount} linha(s)
                    </>
                  )}
                </button>

                <button
                  onClick={reset}
                  disabled={isImporting}
                  className="px-4 py-3 text-sm text-[#666] border border-[#d0d0d0] rounded-xl hover:bg-[#f5f5f5] transition-colors disabled:cursor-not-allowed"
                >
                  Limpar
                </button>

                {willSkipCount > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                      {willSkipCount} linha(s) sem os campos mínimos serão ignoradas pela SP.
                    </p>
                    <button
                      onClick={handleExportarIgnoradas}
                      disabled={isImporting}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar {willSkipCount} ignorada(s)
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
