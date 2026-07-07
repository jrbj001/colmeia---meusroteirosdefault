import { useEffect, useState } from "react";
import type { Dims, Linha, Resultado } from "./types";
import { emptyLinha } from "./types";
import * as api from "./api";
import AmbienteRow from "./components/AmbienteRow";
import Resultados from "./components/Resultados";
import { exportarXlsx } from "./export";

export default function App() {
  const [dims, setDims] = useState<Dims | null>(null);
  const [praca, setPraca] = useState("Rio de Janeiro");
  const [semanas, setSemanas] = useState(7);
  const [linhas, setLinhas] = useState<Linha[]>([emptyLinha()]);
  const [rep, setRep] = useState<number | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getDims().then(setDims).catch((e) => setErr(String(e.message || e)));
  }, []);

  const run = async () => {
    setBusy(true); setErr("");
    try {
      // total manual: envia como inserções=total, slots=1 (view computa insps×slots = total)
      const linhasEnv = linhas.map((l) =>
        l.totalInsOverride !== "" ? { ...l, insps: l.totalInsOverride, slots: "1" } : l
      );
      const { report_pk } = await api.simular(praca, semanas, linhasEnv);
      setRep(report_pk);
      setRes(await api.getResultado(report_pk));
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  const limpar = async () => { await api.reset(); setRep(null); setRes(null); };

  return (
    <div className="min-h-full flex">
      {/* Sidebar (evoca a Colmeia) */}
      <aside className="w-16 shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-6">
        <div className="h-9 w-9 rounded-lg bg-brand text-white grid place-items-center font-black">C</div>
        <nav className="flex flex-col gap-5 text-gray-400 text-xl">
          <span title="Home">🏠</span>
          <span title="Criar Roteiro" className="text-brand">🧮</span>
          <span title="Mapa">🗺️</span>
          <span title="Banco de Ativos">📊</span>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar com breadcrumb */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
          <div className="text-sm text-sub">
            Home <span className="mx-1 text-gray-300">/</span>
            Criar Roteiro <span className="mx-1 text-gray-300">/</span>
            <span className="text-ink font-semibold">Calculadora Indoor (DOR)</span>
          </div>
          <div className="text-xs text-sub">simulação · escreve em <code className="text-brand">report_pk ≥ 900000</code></div>
        </header>

        <main className="flex-1 overflow-auto p-6 max-w-[1200px] w-full mx-auto">
          {err && !dims && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">Erro ao carregar: {err}</div>}
          {!dims && !err && <div className="rounded-lg border border-gray-200 bg-white p-6 text-sub">carregando dimensões…</div>}

          {dims && (
            <>
              <datalist id="shoppings">{dims.shoppings.map((s) => <option key={s} value={s} />)}</datalist>
              <datalist id="cidades">{dims.cidades.map((c) => <option key={c} value={c} />)}</datalist>

              <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-ink">Configurar mídia Indoor</h2>
                  <span className="text-xs text-sub">espelha “Configurar indoor” da planilha</span>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[220px] max-w-xs">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-sub mb-1">Praça (uma por plano)</label>
                    <input list="cidades" value={praca} onChange={(e) => setPraca(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
                  </div>
                  <div className="w-40">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-sub mb-1">Nº de semanas (W1..N)</label>
                    <select value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "semana" : "semanas"}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-sub">semanas além de N ficam zeradas</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {linhas.map((l, i) => (
                    <AmbienteRow key={i} idx={i} dims={dims} linha={l} semanas={semanas}
                      onChange={(nl) => setLinhas((ls) => ls.map((x, j) => (j === i ? nl : x)))}
                      onRemove={() => setLinhas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))} />
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button onClick={() => setLinhas((ls) => [...ls, emptyLinha()])}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-ink hover:bg-gray-50">+ ambiente</button>
                  <button onClick={run} disabled={busy}
                    className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60">
                    {busy ? "rodando…" : "▶ Calcular"}
                  </button>
                  <button onClick={limpar} className="ml-auto text-sm text-sub hover:text-brand underline">limpar simulações</button>
                </div>
                {err && dims && <div className="mt-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}
              </div>

              {res && rep && (
                <>
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-2 mb-4 text-xs text-sub flex items-center justify-between gap-3">
                    <span>Simulação <b className="text-ink">#{rep}</b> · fluxo: input → <code className="text-brand">sp_indoorResultadoInsert</code> → resultados</span>
                    <button onClick={() => exportarXlsx(praca, semanas, rep, res)}
                      className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95">⬇ Exportar XLSX</button>
                  </div>
                  <Resultados data={res} />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
