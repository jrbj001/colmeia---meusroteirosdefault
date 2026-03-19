import React, { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import api from "../../config/axios";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { LoadingSpinner } from "../../components/LoadingSpinner";

interface ParsedRow {
  id: number;
  original: Record<string, any>;
  latitude: number | null;
  longitude: number | null;
}

interface GeocodeResult {
  id: number;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  source?: string;
}

interface ForwardResult {
  id: number;
  addressInput: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  source?: string;
}

type TabType = "coordenadas-para-endereco" | "endereco-para-coordenadas";

const LATITUDE_KEYS = ["latitude", "lat", "latitude_vl", "lat_vl", "latd"];
const LONGITUDE_KEYS = ["longitude", "lon", "lng", "longitude_vl", "long", "lon_vl"];

const ADDRESS_KEYS: Record<string, string[]> = {
  rua: ["rua", "logradouro", "endereco", "street", "address", "end", "rua_st"],
  numero: ["numero", "number", "num", "nro", "numero_vl"],
  bairro: ["bairro", "neighborhood", "bairro_st"],
  cidade: ["cidade", "city", "municipio", "cidade_st", "praca"],
  estado: ["estado", "state", "uf", "estado_st"],
  cep: ["cep", "postalcode", "zip", "cep_st", "codigo_postal"],
};

const normalizeHeader = (header: string) =>
  header?.toString().trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

const parseCoordinate = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = value.toString().trim();
  if (!raw) return null;
  const sanitized = raw.replace(",", ".");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const ConsultaEndereco: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("coordenadas-para-endereco");

  // === Aba 1: Coordenadas → Endereço ===
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "ready">("idle");
  const [enrichStatus, setEnrichStatus] = useState<"idle" | "loading" | "done">("idle");
  const [fileInfo, setFileInfo] = useState({ name: "", sheet: "", totalRows: 0, validRows: 0, invalidRows: 0 });
  const [headers, setHeaders] = useState<string[]>([]);
  const [latColumn, setLatColumn] = useState("");
  const [lngColumn, setLngColumn] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ index: number; latitude: any; longitude: any }[]>([]);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [apiInvalidRows, setApiInvalidRows] = useState<any[]>([]);
  const [apiErrors, setApiErrors] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // === Aba 2: Endereço → Coordenadas ===
  const [fwdUploadStatus, setFwdUploadStatus] = useState<"idle" | "processing" | "ready">("idle");
  const [fwdEnrichStatus, setFwdEnrichStatus] = useState<"idle" | "loading" | "done">("idle");
  const [fwdFileInfo, setFwdFileInfo] = useState({ name: "", sheet: "", totalRows: 0, validRows: 0, invalidRows: 0 });
  const [fwdHeaders, setFwdHeaders] = useState<string[]>([]);
  const [fwdColumns, setFwdColumns] = useState<Record<string, string>>({ rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" });
  const [fwdParsedRows, setFwdParsedRows] = useState<{ id: number; original: Record<string, any> }[]>([]);
  const [fwdResults, setFwdResults] = useState<ForwardResult[]>([]);
  const [fwdApiInvalidRows, setFwdApiInvalidRows] = useState<any[]>([]);
  const [fwdApiErrors, setFwdApiErrors] = useState<any[]>([]);
  const [fwdErrorMessage, setFwdErrorMessage] = useState<string | null>(null);
  const [fwdLogs, setFwdLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString("pt-BR")} - ${message}`, ...prev.slice(0, 49)]);
  }, []);

  const addFwdLog = useCallback((message: string) => {
    setFwdLogs((prev) => [`${new Date().toLocaleTimeString("pt-BR")} - ${message}`, ...prev.slice(0, 49)]);
  }, []);

  const detectColumn = useCallback((availableHeaders: string[], candidates: string[]) => {
    return availableHeaders.find((header) => candidates.includes(normalizeHeader(header))) || "";
  }, []);

  // === Aba 1: Reset ===
  const resetState = useCallback(() => {
    setUploadStatus("idle");
    setEnrichStatus("idle");
    setFileInfo({ name: "", sheet: "", totalRows: 0, validRows: 0, invalidRows: 0 });
    setHeaders([]);
    setLatColumn("");
    setLngColumn("");
    setParsedRows([]);
    setInvalidRows([]);
    setGeocodeResults([]);
    setApiInvalidRows([]);
    setApiErrors([]);
    setErrorMessage(null);
    setLogs([]);
  }, []);

  // === Aba 2: Reset ===
  const resetFwdState = useCallback(() => {
    setFwdUploadStatus("idle");
    setFwdEnrichStatus("idle");
    setFwdFileInfo({ name: "", sheet: "", totalRows: 0, validRows: 0, invalidRows: 0 });
    setFwdHeaders([]);
    setFwdColumns({ rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" });
    setFwdParsedRows([]);
    setFwdResults([]);
    setFwdApiInvalidRows([]);
    setFwdApiErrors([]);
    setFwdErrorMessage(null);
    setFwdLogs([]);
  }, []);

  // === Aba 1: Upload ===
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setErrorMessage(null);
      setApiInvalidRows([]);
      setApiErrors([]);
      setLogs([]);
      setUploadStatus("processing");
      addLog(`Iniciando leitura do arquivo ${file.name}`);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          if (!workbook.SheetNames.length) throw new Error("Arquivo Excel não contém abas para leitura.");
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
          if (!json.length) throw new Error("Não encontramos linhas de dados na planilha.");
          const detectedHeaders = Object.keys(json[0] || {});
          const detectedLat = detectColumn(detectedHeaders, LATITUDE_KEYS);
          const detectedLng = detectColumn(detectedHeaders, LONGITUDE_KEYS);
          const parsed: ParsedRow[] = json.map((row, index) => ({
            id: index,
            original: row,
            latitude: detectedLat ? parseCoordinate(row[detectedLat]) : null,
            longitude: detectedLng ? parseCoordinate(row[detectedLng]) : null,
          }));
          const invalid = parsed
            .filter((row) => row.latitude === null || row.longitude === null)
            .map((row) => ({ index: row.id + 2, latitude: row.original[detectedLat], longitude: row.original[detectedLng] }));
          setParsedRows(parsed);
          setHeaders(detectedHeaders);
          setLatColumn(detectedLat);
          setLngColumn(detectedLng);
          setInvalidRows(invalid);
          setFileInfo({ name: file.name, sheet: firstSheetName, totalRows: parsed.length, validRows: parsed.length - invalid.length, invalidRows: invalid.length });
          setUploadStatus("ready");
          setEnrichStatus("idle");
          setGeocodeResults([]);
          addLog(`Planilha '${firstSheetName}' carregada com ${parsed.length} linhas.`);
          if (!detectedLat || !detectedLng) addLog("Não foi possível identificar automaticamente as colunas de latitude/longitude.");
        } catch (error: any) {
          setErrorMessage(error.message || "Erro ao ler o arquivo Excel.");
          setUploadStatus("idle");
          addLog("Falha ao processar a planilha.");
        }
      };
      reader.onerror = () => { setErrorMessage("Erro ao ler o arquivo."); setUploadStatus("idle"); };
      reader.readAsArrayBuffer(file);
    },
    [addLog, detectColumn]
  );

  // === Aba 2: Upload ===
  const handleFwdFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setFwdErrorMessage(null);
      setFwdApiInvalidRows([]);
      setFwdApiErrors([]);
      setFwdLogs([]);
      setFwdUploadStatus("processing");
      addFwdLog(`Iniciando leitura do arquivo ${file.name}`);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          if (!workbook.SheetNames.length) throw new Error("Arquivo Excel não contém abas para leitura.");
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
          if (!json.length) throw new Error("Não encontramos linhas de dados na planilha.");
          const detectedHeaders = Object.keys(json[0] || {});
          const parsed = json.map((row, index) => ({ id: index, original: row }));

          const detected: Record<string, string> = {};
          for (const [field, candidates] of Object.entries(ADDRESS_KEYS)) {
            detected[field] = detectColumn(detectedHeaders, candidates);
          }

          const hasAddress = detected.rua || detected.cidade || detected.cep;
          const validCount = hasAddress ? parsed.filter((r) => {
            const parts = [detected.rua ? r.original[detected.rua] : "", detected.cidade ? r.original[detected.cidade] : ""].filter(Boolean);
            return parts.some((p) => p.toString().trim().length > 0);
          }).length : 0;

          setFwdParsedRows(parsed);
          setFwdHeaders(detectedHeaders);
          setFwdColumns(detected);
          setFwdFileInfo({ name: file.name, sheet: firstSheetName, totalRows: parsed.length, validRows: validCount, invalidRows: parsed.length - validCount });
          setFwdUploadStatus("ready");
          setFwdEnrichStatus("idle");
          setFwdResults([]);
          addFwdLog(`Planilha '${firstSheetName}' carregada com ${parsed.length} linhas.`);
          if (!hasAddress) addFwdLog("Não foi possível identificar colunas de endereço automaticamente.");
        } catch (error: any) {
          setFwdErrorMessage(error.message || "Erro ao ler o arquivo Excel.");
          setFwdUploadStatus("idle");
          addFwdLog("Falha ao processar a planilha.");
        }
      };
      reader.onerror = () => { setFwdErrorMessage("Erro ao ler o arquivo."); setFwdUploadStatus("idle"); };
      reader.readAsArrayBuffer(file);
    },
    [addFwdLog, detectColumn]
  );

  // === Aba 1: Enriquecer ===
  const canEnrich = useMemo(() => {
    if (uploadStatus !== "ready" || !latColumn || !lngColumn) return false;
    return parsedRows.some((row) => row.latitude !== null && row.longitude !== null);
  }, [uploadStatus, latColumn, lngColumn, parsedRows]);

  const executarConsulta = useCallback(async () => {
    if (!canEnrich) return;
    setEnrichStatus("loading");
    setErrorMessage(null);
    setGeocodeResults([]);
    setApiInvalidRows([]);
    setApiErrors([]);
    addLog("Enviando coordenadas para enriquecimento de endereços...");
    const validPayload = parsedRows
      .filter((row) => row.latitude !== null && row.longitude !== null)
      .map((row) => ({ id: row.id, latitude: row.latitude, longitude: row.longitude }));
    try {
      const response = await api.post("/consulta-endereco", { rows: validPayload });
      const data = response.data;
      if (!data?.results) throw new Error("Resposta da API não contém resultados.");
      setGeocodeResults(data.results);
      setApiInvalidRows(data.invalidRows || []);
      setApiErrors(data.errors || []);
      setEnrichStatus("done");
      addLog(`Enriquecimento concluído: ${data.results.length} linhas processadas (${data.provider}).`);
      if (data.meta?.invalidRows) addLog(`Coordenadas inválidas: ${data.meta.invalidRows}.`);
      if (data.errors?.length) addLog(`Falhas no provedor: ${data.errors.length}.`);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || "Falha ao consultar o serviço de endereço.");
      setEnrichStatus("idle");
      addLog("Falha ao consultar o serviço.");
    }
  }, [addLog, canEnrich, parsedRows]);

  // === Aba 2: Buscar Coordenadas ===
  const canFwdEnrich = useMemo(() => {
    if (fwdUploadStatus !== "ready") return false;
    return fwdColumns.rua || fwdColumns.cidade || fwdColumns.cep;
  }, [fwdUploadStatus, fwdColumns]);

  const executarBuscaCoordenada = useCallback(async () => {
    if (!canFwdEnrich) return;
    setFwdEnrichStatus("loading");
    setFwdErrorMessage(null);
    setFwdResults([]);
    setFwdApiInvalidRows([]);
    setFwdApiErrors([]);
    addFwdLog("Enviando endereços para busca de coordenadas...");

    const payload = fwdParsedRows.map((row) => {
      const mapped: Record<string, any> = { id: row.id };
      for (const [field, col] of Object.entries(fwdColumns)) {
        if (col) mapped[field] = row.original[col] ?? "";
      }
      return mapped;
    });

    try {
      const response = await api.post("/busca-coordenada", { rows: payload });
      const data = response.data;
      if (!data?.results) throw new Error("Resposta da API não contém resultados.");
      setFwdResults(data.results);
      setFwdApiInvalidRows(data.invalidRows || []);
      setFwdApiErrors(data.errors || []);
      setFwdEnrichStatus("done");
      addFwdLog(`Busca concluída: ${data.results.length} endereços geocodificados (${data.provider}).`);
      if (data.meta?.invalidRows) addFwdLog(`Endereços inválidos: ${data.meta.invalidRows}.`);
      if (data.errors?.length) addFwdLog(`Falhas no provedor: ${data.errors.length}.`);
    } catch (error: any) {
      setFwdErrorMessage(error.response?.data?.message || error.message || "Falha ao buscar coordenadas.");
      setFwdEnrichStatus("idle");
      addFwdLog("Falha ao consultar o serviço.");
    }
  }, [addFwdLog, canFwdEnrich, fwdColumns, fwdParsedRows]);

  // === Aba 1: Download ===
  const downloadExcel = useCallback(() => {
    if (enrichStatus !== "done" || !geocodeResults.length) return;
    const resultMap = new Map<number, GeocodeResult>();
    geocodeResults.forEach((r) => resultMap.set(r.id, r));
    const enrichedRows = parsedRows.map((row) => {
      const result = resultMap.get(row.id);
      return {
        ...row.original,
        latitude_encontrada: result?.latitude ?? row.latitude ?? "",
        longitude_encontrada: result?.longitude ?? row.longitude ?? "",
        endereco_completo: result?.formattedAddress ?? "",
        logradouro: result?.street ?? "",
        numero: result?.number ?? "",
        bairro: result?.neighborhood ?? "",
        cidade: result?.city ?? "",
        estado: result?.state ?? "",
        cep: result?.postalCode ?? "",
        pais: result?.country ?? "",
        fonte_endereco: result?.source ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(enrichedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enderecos");
    const filename = fileInfo.name ? fileInfo.name.replace(/(\.xlsx?|\.csv)$/i, "") + "-enderecos.xlsx" : `enderecos-enriquecidos-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
    addLog("Arquivo Excel enriquecido gerado para download.");
  }, [addLog, enrichStatus, fileInfo.name, geocodeResults, parsedRows]);

  // === Aba 2: Download ===
  const downloadFwdExcel = useCallback(() => {
    if (fwdEnrichStatus !== "done" || !fwdResults.length) return;
    const resultMap = new Map<number, ForwardResult>();
    fwdResults.forEach((r) => resultMap.set(r.id, r));
    const enrichedRows = fwdParsedRows.map((row) => {
      const result = resultMap.get(row.id);
      return {
        ...row.original,
        latitude_encontrada: result?.latitude ?? "",
        longitude_encontrada: result?.longitude ?? "",
        endereco_formatado: result?.formattedAddress ?? "",
        bairro_encontrado: result?.neighborhood ?? "",
        cidade_encontrada: result?.city ?? "",
        estado_encontrado: result?.state ?? "",
        cep_encontrado: result?.postalCode ?? "",
        fonte: result?.source ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(enrichedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coordenadas");
    const filename = fwdFileInfo.name ? fwdFileInfo.name.replace(/(\.xlsx?|\.csv)$/i, "") + "-coordenadas.xlsx" : `coordenadas-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
    addFwdLog("Arquivo Excel com coordenadas gerado para download.");
  }, [addFwdLog, fwdEnrichStatus, fwdFileInfo.name, fwdResults, fwdParsedRows]);

  const selectableHeaders = useMemo(() => headers.filter((h) => h?.trim()), [headers]);
  const fwdSelectableHeaders = useMemo(() => fwdHeaders.filter((h) => h?.trim()), [fwdHeaders]);

  const resumo = useMemo(() => parsedRows.slice(0, 5).map((row) => ({ ...row.original, latitude_detectada: row.latitude, longitude_detectada: row.longitude })), [parsedRows]);
  const fwdResumo = useMemo(() => fwdParsedRows.slice(0, 5).map((row) => row.original), [fwdParsedRows]);

  const isProcessingUpload = uploadStatus === "processing";
  const isEnriching = enrichStatus === "loading";
  const isFwdProcessing = fwdUploadStatus === "processing";
  const isFwdEnriching = fwdEnrichStatus === "loading";
  const isBusy = isProcessingUpload || isEnriching || isFwdProcessing || isFwdEnriching;
  const busyMessage = isProcessingUpload || isFwdProcessing ? "Processando planilha..." : isEnriching ? "Consultando endereços..." : isFwdEnriching ? "Buscando coordenadas..." : "";

  const COLUMN_LABELS: Record<string, string> = {
    rua: "Rua / Logradouro",
    numero: "Número",
    bairro: "Bairro",
    cidade: "Cidade",
    estado: "Estado / UF",
    cep: "CEP",
  };

  // === Render helpers ===
  const renderPreviewTable = (data: Record<string, any>[]) => {
    if (!data.length) return null;
    return (
      <div className="overflow-x-auto border border-[#ececec] rounded-lg">
        <table className="min-w-full text-xs text-left text-[#333]">
          <thead className="bg-[#393939] text-white">
            <tr>
              {Object.keys(data[0]).map((header) => (
                <th key={header} className="px-4 py-2 uppercase tracking-wide">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={`preview-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"}>
                {Object.keys(data[0]).map((header) => (
                  <td key={`${header}-${rowIndex}`} className="px-4 py-2 border-t border-[#f0f0f0]">{row[header] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummaryCards = (success: number, invalid: number, errors: number) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-xs uppercase text-green-700 font-semibold">Processados com sucesso</p>
        <p className="text-2xl font-bold text-green-900">{success}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs uppercase text-amber-700 font-semibold">Inválidos</p>
        <p className="text-2xl font-bold text-amber-900">{invalid}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-xs uppercase text-red-700 font-semibold">Falhas do serviço</p>
        <p className="text-2xl font-bold text-red-900">{errors}</p>
      </div>
    </div>
  );

  const renderLogs = (logList: string[]) => {
    if (!logList.length) return null;
    return (
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#333] mb-3">Histórico do processamento</h3>
        <ul className="space-y-2 text-xs text-[#555] max-h-52 overflow-y-auto">
          {logList.map((log, index) => (
            <li key={`log-${index}`} className="bg-[#f8f8f8] border border-[#ebebeb] rounded-lg px-3 py-2">{log}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex font-sans relative">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar menuReduzido={menuReduzido} breadcrumb={{ items: [{ label: "Home", path: "/" }, { label: "Consulta endereço", path: "/consulta-endereco" }] }} />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />

        <div className="w-full overflow-x-hidden pt-20 flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 pb-16">

            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b border-[#e0e0e0]">
              <button
                onClick={() => setActiveTab("coordenadas-para-endereco")}
                className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
                  activeTab === "coordenadas-para-endereco"
                    ? "bg-[#ff4600] text-white"
                    : "bg-[#f5f5f5] text-[#555] hover:bg-[#eee]"
                }`}
              >
                Coordenadas → Endereço
              </button>
              <button
                onClick={() => setActiveTab("endereco-para-coordenadas")}
                className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
                  activeTab === "endereco-para-coordenadas"
                    ? "bg-[#ff4600] text-white"
                    : "bg-[#f5f5f5] text-[#555] hover:bg-[#eee]"
                }`}
              >
                Endereço → Coordenadas
              </button>
            </div>

            {/* ====== ABA 1: Coordenadas → Endereço ====== */}
            {activeTab === "coordenadas-para-endereco" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-[#222] tracking-wide mb-2">Consulta de endereços por coordenadas</h1>
                    <p className="text-sm text-[#555] max-w-2xl">Faça upload de uma planilha com colunas de latitude e longitude, consulte um serviço de geocodificação e faça o download do Excel enriquecido com o endereço completo.</p>
                  </div>
                  <button onClick={resetState} className="text-sm text-[#757575] border border-[#d0d0d0] px-4 py-2 rounded-lg hover:bg-[#f2f2f2] transition-colors duration-200">Limpar</button>
                </div>

                {errorMessage && <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">{errorMessage}</div>}

                <div className="mb-8 bg-gradient-to-br from-orange-50 to-amber-100 p-6 rounded-xl border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-[#ff4600] rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#222]">Upload da planilha</h2>
                      <p className="text-sm text-[#555]">Aceitamos arquivos Excel (.xlsx ou .xls) com colunas de latitude e longitude.</p>
                    </div>
                  </div>
                  <input id="upload-planilha" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                  <label htmlFor="upload-planilha" className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg transition-all duration-200 ${uploadStatus === "processing" ? "bg-gray-300 text-gray-600 cursor-wait" : "bg-[#ff4600] text-white hover:bg-orange-600 cursor-pointer shadow-md hover:shadow-lg"}`}>
                    {uploadStatus === "processing" ? (<><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div><span className="font-medium">Processando planilha...</span></>) : (<span className="font-medium">Selecionar arquivo Excel</span>)}
                  </label>
                  {uploadStatus === "ready" && (
                    <div className="mt-6 bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#444]">
                        <div><p className="font-semibold text-[#222]">Arquivo</p><p>{fileInfo.name}</p></div>
                        <div><p className="font-semibold text-[#222]">Aba</p><p>{fileInfo.sheet}</p></div>
                        <div><p className="font-semibold text-[#222]">Linhas totais</p><p>{fileInfo.totalRows}</p></div>
                        <div><p className="font-semibold text-[#222]">Coordenadas válidas</p><p>{fileInfo.validRows} <span className="text-xs text-[#757575]">({fileInfo.invalidRows} inválidas)</span></p></div>
                      </div>
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-[#333] block mb-2">Coluna de latitude</label>
                          <select value={latColumn} onChange={(e) => setLatColumn(e.target.value)} className="w-full border border-[#d0d0d0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff4600] bg-white text-sm text-[#333]">
                            <option value="">Selecione uma coluna</option>
                            {selectableHeaders.map((h) => <option key={`lat-${h}`} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-[#333] block mb-2">Coluna de longitude</label>
                          <select value={lngColumn} onChange={(e) => setLngColumn(e.target.value)} className="w-full border border-[#d0d0d0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff4600] bg-white text-sm text-[#333]">
                            <option value="">Selecione uma coluna</option>
                            {selectableHeaders.map((h) => <option key={`lng-${h}`} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      {invalidRows.length > 0 && <div className="mt-4 text-sm text-[#b85c00] bg-amber-50 border border-amber-200 rounded-lg p-3">{invalidRows.length} linha(s) não possuem coordenadas válidas e serão ignoradas.</div>}
                    </div>
                  )}
                </div>

                {uploadStatus === "ready" && (
                  <div className="mb-8 bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <button onClick={executarConsulta} disabled={!canEnrich || enrichStatus === "loading"} className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${enrichStatus === "loading" ? "bg-gray-300 text-gray-600 cursor-not-allowed" : canEnrich ? "bg-[#ff4600] text-white hover:bg-orange-600 shadow-md" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                        {enrichStatus === "loading" ? "Consultando endereços..." : "Consultar endereços"}
                      </button>
                      <button onClick={downloadExcel} disabled={enrichStatus !== "done" || !geocodeResults.length} className={`px-6 py-3 rounded-lg font-semibold border transition-colors duration-200 ${enrichStatus === "done" && geocodeResults.length ? "border-[#ff4600] text-[#ff4600] hover:bg-orange-50" : "border-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        Baixar Excel enriquecido
                      </button>
                      {geocodeResults.length > 0 && <div className="text-sm text-[#1B5E20] bg-green-50 border border-green-200 px-3 py-2 rounded-lg">Endereços enriquecidos com sucesso! ({geocodeResults.length} linhas)</div>}
                    </div>
                    {resumo.length > 0 && (<div><h3 className="text-sm font-semibold text-[#333] mb-3">Amostra das primeiras linhas</h3>{renderPreviewTable(resumo)}</div>)}
                    {geocodeResults.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold text-[#333] mb-2">Resumo do enriquecimento</h3>{renderSummaryCards(geocodeResults.length, apiInvalidRows.length + invalidRows.length, apiErrors.length)}</div>}
                  </div>
                )}

                {renderLogs(logs)}
              </>
            )}

            {/* ====== ABA 2: Endereço → Coordenadas ====== */}
            {activeTab === "endereco-para-coordenadas" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-[#222] tracking-wide mb-2">Busca de coordenadas por endereço</h1>
                    <p className="text-sm text-[#555] max-w-2xl">Faça upload de uma planilha com colunas de endereço (rua, cidade, CEP...), busque as coordenadas via geocodificação e faça o download do Excel enriquecido com latitude e longitude.</p>
                  </div>
                  <button onClick={resetFwdState} className="text-sm text-[#757575] border border-[#d0d0d0] px-4 py-2 rounded-lg hover:bg-[#f2f2f2] transition-colors duration-200">Limpar</button>
                </div>

                {fwdErrorMessage && <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">{fwdErrorMessage}</div>}

                <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#222]">Upload da planilha</h2>
                      <p className="text-sm text-[#555]">Aceitamos arquivos Excel (.xlsx ou .xls) com colunas de endereço (rua, cidade, CEP, etc.).</p>
                    </div>
                  </div>
                  <input id="upload-planilha-fwd" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFwdFileChange} />
                  <label htmlFor="upload-planilha-fwd" className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg transition-all duration-200 ${fwdUploadStatus === "processing" ? "bg-gray-300 text-gray-600 cursor-wait" : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-md hover:shadow-lg"}`}>
                    {fwdUploadStatus === "processing" ? (<><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div><span className="font-medium">Processando planilha...</span></>) : (<span className="font-medium">Selecionar arquivo Excel</span>)}
                  </label>

                  {fwdUploadStatus === "ready" && (
                    <div className="mt-6 bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#444]">
                        <div><p className="font-semibold text-[#222]">Arquivo</p><p>{fwdFileInfo.name}</p></div>
                        <div><p className="font-semibold text-[#222]">Aba</p><p>{fwdFileInfo.sheet}</p></div>
                        <div><p className="font-semibold text-[#222]">Linhas totais</p><p>{fwdFileInfo.totalRows}</p></div>
                        <div><p className="font-semibold text-[#222]">Endereços válidos</p><p>{fwdFileInfo.validRows} <span className="text-xs text-[#757575]">({fwdFileInfo.invalidRows} sem endereço)</span></p></div>
                      </div>
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-[#333] mb-3">Mapeamento de colunas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(COLUMN_LABELS).map(([field, label]) => (
                            <div key={field}>
                              <label className="text-sm font-semibold text-[#333] block mb-1">{label}</label>
                              <select
                                value={fwdColumns[field] || ""}
                                onChange={(e) => setFwdColumns((prev) => ({ ...prev, [field]: e.target.value }))}
                                className="w-full border border-[#d0d0d0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm text-[#333]"
                              >
                                <option value="">— não mapeada —</option>
                                {fwdSelectableHeaders.map((h) => <option key={`fwd-${field}-${h}`} value={h}>{h}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {fwdUploadStatus === "ready" && (
                  <div className="mb-8 bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <button onClick={executarBuscaCoordenada} disabled={!canFwdEnrich || fwdEnrichStatus === "loading"} className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${fwdEnrichStatus === "loading" ? "bg-gray-300 text-gray-600 cursor-not-allowed" : canFwdEnrich ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                        {fwdEnrichStatus === "loading" ? "Buscando coordenadas..." : "Buscar coordenadas"}
                      </button>
                      <button onClick={downloadFwdExcel} disabled={fwdEnrichStatus !== "done" || !fwdResults.length} className={`px-6 py-3 rounded-lg font-semibold border transition-colors duration-200 ${fwdEnrichStatus === "done" && fwdResults.length ? "border-indigo-600 text-indigo-600 hover:bg-indigo-50" : "border-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        Baixar Excel com coordenadas
                      </button>
                      {fwdResults.length > 0 && <div className="text-sm text-[#1B5E20] bg-green-50 border border-green-200 px-3 py-2 rounded-lg">Coordenadas encontradas com sucesso! ({fwdResults.length} linhas)</div>}
                    </div>
                    {fwdResumo.length > 0 && (<div><h3 className="text-sm font-semibold text-[#333] mb-3">Amostra das primeiras linhas</h3>{renderPreviewTable(fwdResumo)}</div>)}
                    {fwdResults.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold text-[#333] mb-2">Resumo da busca</h3>{renderSummaryCards(fwdResults.length, fwdApiInvalidRows.length, fwdApiErrors.length)}</div>}
                  </div>
                )}

                {renderLogs(fwdLogs)}
              </>
            )}

          </div>
        </div>
      </div>

      {isBusy && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 text-[#333]">
            <LoadingSpinner size="xl" color={activeTab === "coordenadas-para-endereco" ? "#ff4600" : "#4f46e5"} />
            <p className="text-sm font-semibold">{busyMessage}</p>
            <p className="text-xs text-[#666] text-center max-w-xs">Esse processo pode levar alguns segundos enquanto consultamos o serviço de geocodificação.</p>
          </div>
        </div>
      )}
    </div>
  );
};
