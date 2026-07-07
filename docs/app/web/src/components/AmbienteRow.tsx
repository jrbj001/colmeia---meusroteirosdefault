import { useState } from "react";
import type { Dims, Linha } from "../types";

const lbl = "block text-[11px] font-semibold uppercase tracking-wide text-sub mb-1";
const inp = "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100 disabled:text-gray-500";

export default function AmbienteRow({
  idx, dims, linha, semanas, onChange, onRemove,
}: {
  idx: number;
  dims: Dims;
  linha: Linha;
  semanas: number;
  onChange: (l: Linha) => void;
  onRemove: () => void;
}) {
  const amb = dims.ambientes.find((a) => a.nome === linha.ambiente);
  const isShop = !!amb?.ehShopping;
  const override = amb?.tamanhoOverride || "";
  const isDigital = linha.tipo === "Digital";
  const totalIns = (Number(linha.insps) || 0) * (Number(linha.slots) || 0);
  const totalEfetivo = linha.totalInsOverride !== "" ? (Number(linha.totalInsOverride) || 0) : totalIns;
  const defDig = (() => {                      // espelha fn_indoorDeflatorDigital_tvf (usa total efetivo)
    const elig = dims.deflatorDigital.filter((f) => f.min <= totalEfetivo);
    return elig.length ? elig[elig.length - 1].mult : (dims.deflatorDigital[0]?.mult ?? 1);
  })();
  const set = (k: keyof Linha, v: string) => onChange({ ...linha, [k]: v });
  const [padrao, setPadrao] = useState("");
  const setLoc = (w: number, v: string) => {
    const arr = [...linha.locs];
    arr[w] = v;
    onChange({ ...linha, locs: arr });
  };
  const aplicarPadrao = () => {
    const arr = [...linha.locs];
    for (let i = 0; i < semanas; i++) arr[i] = padrao;
    onChange({ ...linha, locs: arr });
  };

  return (
    <div className="relative rounded-lg border border-gray-200 bg-gray-50/60 p-3 pr-9">
      <span className="absolute -top-2 left-3 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded">
        Ambiente {idx + 1}
      </span>
      <button onClick={onRemove} title="remover ambiente"
        className="absolute top-2 right-2 h-6 w-6 rounded text-gray-400 hover:bg-red-50 hover:text-red-600">✕</button>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-1">
        <div className="col-span-2">
          <label className={lbl}>Ambiente</label>
          <select className={inp} value={linha.ambiente} onChange={(e) => set("ambiente", e.target.value)}>
            <option value=""></option>
            {dims.ambientes.map((a) => (
              <option key={a.nome} value={a.nome}>{a.nome}{a.ehShopping ? " · shopping" : ""}</option>
            ))}
          </select>
        </div>

        {isShop ? (
          <div className="col-span-2">
            <label className={lbl}>Shopping</label>
            <input className={inp} list="shoppings" value={linha.shopping}
              onChange={(e) => set("shopping", e.target.value)} placeholder="nome do shopping" />
          </div>
        ) : (
          <div>
            <label className={lbl}>Passantes/sem</label>
            <input className={inp} type="number" value={linha.passantes}
              onChange={(e) => set("passantes", e.target.value)} placeholder="ex 15000" />
          </div>
        )}

        <div>
          <label className={lbl}>Tamanho{override ? " (fixo)" : ""}</label>
          <select className={inp} disabled={!!override} value={override || linha.tamanho}
            onChange={(e) => set("tamanho", e.target.value)}>
            <option value=""></option>
            {dims.tamanhos.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Circulação</label>
          <select className={inp} value={linha.circulacao} onChange={(e) => set("circulacao", e.target.value)}>
            <option value=""></option>
            {dims.visualizacoes.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Tipo de mídia</label>
          <select className={inp} value={linha.tipo}
            onChange={(e) => {
              const v = e.target.value;
              // ao escolher Digital, já sugere Slots=1 (como na planilha)
              onChange({ ...linha, tipo: v, slots: v === "Digital" && !linha.slots ? "1" : linha.slots });
            }}>
            <option value=""></option>
            <option>Digital</option>
            <option>Estático</option>
          </select>
        </div>

        {isDigital && (
          <>
            <div>
              <label className={lbl}>Inserções/slot {!linha.insps && <span className="text-red-500">*</span>}</label>
              <input className={inp + (!linha.insps ? " border-red-300 bg-red-50" : "")} type="number" value={linha.insps}
                onChange={(e) => set("insps", e.target.value)} placeholder="ex 1080" />
              {!linha.insps && <span className="text-[10px] text-red-500">vazio = 0 inserções → deflator 0,4</span>}
            </div>
            <div>
              <label className={lbl}>Slots</label>
              <input className={inp} type="number" value={linha.slots}
                onChange={(e) => set("slots", e.target.value)} placeholder="ex 1" />
            </div>
            <div>
              <label className={lbl}>Total inserções {linha.totalInsOverride !== "" ? "(manual)" : "(auto)"}</label>
              <div className="flex gap-1">
                <input className={inp + (linha.totalInsOverride !== "" ? " border-brand/50 bg-orange-50" : "")} type="number"
                  value={linha.totalInsOverride !== "" ? linha.totalInsOverride : String(totalIns)}
                  onChange={(e) => set("totalInsOverride", e.target.value)} />
                {linha.totalInsOverride !== "" && (
                  <button type="button" onClick={() => set("totalInsOverride", "")} title="voltar ao automático (inserções × slots)"
                    className="shrink-0 rounded-md border border-gray-300 px-2 text-sub hover:bg-gray-50">↺</button>
                )}
              </div>
            </div>
            <div>
              <label className={lbl}>Deflator digital</label>
              <div className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm tabular-nums font-semibold text-ink">
                {(defDig * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Localidades por semana (espelha H12:H23 — número de faces por semana do plano) */}
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex items-end justify-between gap-3 mb-2 flex-wrap">
          <label className={lbl + " mb-0"}>Localidades por semana (faces) · W1–W{semanas}</label>
          <div className="flex items-end gap-2">
            <div>
              <span className="block text-[10px] text-sub">Faces (padrão)</span>
              <input type="number" value={padrao} onChange={(e) => setPadrao(e.target.value)} placeholder="ex 50"
                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-brand focus:outline-none" />
            </div>
            <button onClick={aplicarPadrao} type="button"
              className="rounded-md border border-brand text-brand px-3 py-1.5 text-xs font-semibold hover:bg-orange-50">
              aplicar a todas
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: semanas }, (_, w) => (
            <div key={w} className="w-[52px]">
              <div className="text-[10px] text-sub text-center">W{w + 1}</div>
              <input type="number" value={linha.locs[w] ?? ""} onChange={(e) => setLoc(w, e.target.value)}
                className="w-full rounded border border-gray-300 px-1 py-1 text-sm text-center tabular-nums focus:border-brand focus:outline-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
