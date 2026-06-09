import { useState } from 'react';

export interface IndoorAmbienteDim {
  nome: string;
  ehShopping: boolean;
  tamanhoOverride: string;
}

export interface IndoorDims {
  ambientes: IndoorAmbienteDim[];
  tamanhos: string[];
  visualizacoes: string[];
  shoppings: string[];
  cidades: string[];
  deflatorDigital: { min: number; mult: number }[];
}

export interface IndoorLinha {
  ambiente: string;
  shopping: string;
  tamanho: string;
  circulacao: string;
  tipo: string;
  passantes: string;
  insercoesPorSlot: string;
  slots: string;
  totalInsOverride: string;
  locs: string[];
}

export const emptyIndoorLinha = (): IndoorLinha => ({
  ambiente: '',
  shopping: '',
  tamanho: '',
  circulacao: '',
  tipo: '',
  passantes: '',
  insercoesPorSlot: '',
  slots: '',
  totalInsOverride: '',
  locs: Array.from({ length: 12 }, () => ''),
});

const sel =
  'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#3a3a3a] focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 disabled:bg-gray-50 disabled:text-gray-400 w-full';
const num =
  'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#3a3a3a] tabular-nums focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 w-full';
const lbl = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5';

interface Props {
  idx: number;
  dims: IndoorDims;
  linha: IndoorLinha;
  semanas: number;
  onChange: (l: IndoorLinha) => void;
  onRemove: () => void;
}

export default function AmbienteRowIndoor({ idx, dims, linha, semanas, onChange, onRemove }: Props) {
  const [padrao, setPadrao] = useState('');

  const amb = dims.ambientes.find((a) => a.nome === linha.ambiente);
  const isShop = !!amb?.ehShopping;
  const tamanhoFixed = amb?.tamanhoOverride || '';
  const isDigital = linha.tipo === 'Digital';

  const totalIns = (Number(linha.insercoesPorSlot) || 0) * (Number(linha.slots) || 0);
  const totalEfetivo = linha.totalInsOverride !== '' ? Number(linha.totalInsOverride) || 0 : totalIns;
  const deflator = (() => {
    const elig = dims.deflatorDigital.filter((f) => f.min <= totalEfetivo);
    return elig.length ? elig[elig.length - 1].mult : (dims.deflatorDigital[0]?.mult ?? 1);
  })();

  const set = (k: keyof IndoorLinha, v: string) => onChange({ ...linha, [k]: v });
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
    <div className="border border-gray-100 rounded-lg bg-white overflow-hidden">
      {/* ── Linha principal de campos ── */}
      <div className="flex items-start gap-0">
        {/* Número do ambiente */}
        <div className="flex items-center justify-center w-9 shrink-0 pt-3 pb-2 bg-gray-50 border-r border-gray-100 self-stretch">
          <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
        </div>

        <div className="flex-1 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Ambiente */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
              <label className={lbl}>Ambiente</label>
              <select
                className={sel}
                value={linha.ambiente}
                onChange={(e) => {
                  const nome = e.target.value;
                  const def = dims.ambientes.find((a) => a.nome === nome);
                  onChange({ ...linha, ambiente: nome, tamanho: def?.tamanhoOverride ?? '', shopping: '' });
                }}
              >
                <option value="">Selecione…</option>
                {dims.ambientes.map((a) => (
                  <option key={a.nome} value={a.nome}>
                    {a.nome}{a.ehShopping ? ' · shopping' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Shopping ou Passantes */}
            {isShop ? (
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Shopping</label>
                <input
                  className={num}
                  list={`shoppings-${idx}`}
                  value={linha.shopping}
                  onChange={(e) => set('shopping', e.target.value)}
                  placeholder="Nome do shopping"
                />
                <datalist id={`shoppings-${idx}`}>
                  {dims.shoppings.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            ) : (
              <div>
                <label className={lbl}>Passantes/sem</label>
                <input
                  className={num}
                  type="number"
                  value={linha.passantes}
                  onChange={(e) => set('passantes', e.target.value)}
                  placeholder="15000"
                />
              </div>
            )}

            {/* Tamanho */}
            <div>
              <label className={lbl}>{tamanhoFixed ? 'Tamanho (fixo)' : 'Tamanho'}</label>
              <select
                className={sel}
                disabled={!!tamanhoFixed}
                value={tamanhoFixed || linha.tamanho}
                onChange={(e) => set('tamanho', e.target.value)}
              >
                <option value="">—</option>
                {dims.tamanhos.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Circulação */}
            <div>
              <label className={lbl}>Circulação</label>
              <select className={sel} value={linha.circulacao} onChange={(e) => set('circulacao', e.target.value)}>
                <option value="">—</option>
                {dims.visualizacoes.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className={lbl}>Tipo</label>
              <select
                className={sel}
                value={linha.tipo}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ ...linha, tipo: v, slots: v === 'Digital' && !linha.slots ? '1' : linha.slots });
                }}
              >
                <option value="">—</option>
                <option>Digital</option>
                <option>Estático</option>
              </select>
            </div>
          </div>

          {/* Campos exclusivos de Digital */}
          {isDigital && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
              <div>
                <label className={lbl}>
                  Ins./slot{!linha.insercoesPorSlot && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input
                  className={num + (!linha.insercoesPorSlot ? ' border-red-200 bg-red-50/40' : '')}
                  type="number"
                  value={linha.insercoesPorSlot}
                  onChange={(e) => set('insercoesPorSlot', e.target.value)}
                  placeholder="1080"
                />
              </div>
              <div>
                <label className={lbl}>Slots</label>
                <input
                  className={num}
                  type="number"
                  value={linha.slots}
                  onChange={(e) => set('slots', e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <label className={lbl}>
                  Total ins.{' '}
                  <span className="text-gray-300 font-normal normal-case">
                    {linha.totalInsOverride !== '' ? 'manual' : 'auto'}
                  </span>
                </label>
                <div className="flex gap-1">
                  <input
                    className={num + (linha.totalInsOverride !== '' ? ' border-[#ff4600]/30 bg-orange-50/50' : '')}
                    type="number"
                    value={linha.totalInsOverride !== '' ? linha.totalInsOverride : String(totalIns)}
                    onChange={(e) => set('totalInsOverride', e.target.value)}
                  />
                  {linha.totalInsOverride !== '' && (
                    <button
                      type="button"
                      onClick={() => set('totalInsOverride', '')}
                      title="Voltar ao automático"
                      className="shrink-0 rounded border border-gray-200 px-1.5 text-gray-400 hover:bg-gray-50 text-xs"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={lbl}>Deflator</label>
                <div className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5 text-sm font-semibold text-gray-600 tabular-nums">
                  {(deflator * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </div>
              </div>
            </div>
          )}

          {/* Localidades por semana */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <span className={lbl + ' mb-0'}>Localidades/semana (faces) · W1–W{semanas}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={padrao}
                  onChange={(e) => setPadrao(e.target.value)}
                  placeholder="padrão"
                  className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-center tabular-nums focus:border-[#ff4600] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={aplicarPadrao}
                  className="rounded border border-gray-200 text-gray-500 px-2 py-1 text-xs hover:border-[#ff4600] hover:text-[#ff4600]"
                >
                  Aplicar
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: semanas }, (_, w) => (
                <div key={w} className="w-[46px]">
                  <div className="text-[9px] text-gray-400 text-center mb-0.5">W{w + 1}</div>
                  <input
                    type="number"
                    value={linha.locs[w] ?? ''}
                    onChange={(e) => setLoc(w, e.target.value)}
                    className="w-full rounded border border-gray-200 px-0.5 py-1 text-xs text-center tabular-nums focus:border-[#ff4600] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botão remover */}
        <button
          type="button"
          onClick={onRemove}
          title="Remover ambiente"
          className="w-8 shrink-0 pt-3 pb-2 self-start text-gray-300 hover:text-red-400 flex items-center justify-center text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
