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

const lbl = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1';
const inp =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600] disabled:bg-gray-100 disabled:text-gray-400';

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
  const tamanhoOverride = amb?.tamanhoOverride || '';
  const isDigital = linha.tipo === 'Digital';

  const totalIns = (Number(linha.insercoesPorSlot) || 0) * (Number(linha.slots) || 0);
  const totalEfetivo =
    linha.totalInsOverride !== '' ? Number(linha.totalInsOverride) || 0 : totalIns;

  const deflatorDigital = (() => {
    const elig = dims.deflatorDigital.filter((f) => f.min <= totalEfetivo);
    return elig.length
      ? elig[elig.length - 1].mult
      : (dims.deflatorDigital[0]?.mult ?? 1);
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
    <div className="relative rounded-lg border border-gray-200 bg-gray-50/60 p-4 pr-10">
      <span className="absolute -top-2.5 left-3 bg-[#ff4600] text-white text-[10px] font-bold px-2.5 py-0.5 rounded">
        Ambiente {idx + 1}
      </span>
      <button
        type="button"
        onClick={onRemove}
        title="Remover ambiente"
        className="absolute top-2.5 right-2.5 h-6 w-6 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-sm"
      >
        ✕
      </button>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
        {/* Ambiente */}
        <div className="col-span-2">
          <label className={lbl}>Ambiente</label>
          <select
            className={inp}
            value={linha.ambiente}
            onChange={(e) => {
              const nome = e.target.value;
              const def = dims.ambientes.find((a) => a.nome === nome);
              onChange({
                ...linha,
                ambiente: nome,
                tamanho: def?.tamanhoOverride ? def.tamanhoOverride : '',
                shopping: '',
              });
            }}
          >
            <option value="">Selecione...</option>
            {dims.ambientes.map((a) => (
              <option key={a.nome} value={a.nome}>
                {a.nome}
                {a.ehShopping ? ' · shopping' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Shopping ou Passantes */}
        {isShop ? (
          <div className="col-span-2">
            <label className={lbl}>Shopping</label>
            <input
              className={inp}
              list={`shoppings-indoor-${idx}`}
              value={linha.shopping}
              onChange={(e) => set('shopping', e.target.value)}
              placeholder="Nome do shopping"
            />
            <datalist id={`shoppings-indoor-${idx}`}>
              {dims.shoppings.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        ) : (
          <div>
            <label className={lbl}>Passantes/sem</label>
            <input
              className={inp}
              type="number"
              value={linha.passantes}
              onChange={(e) => set('passantes', e.target.value)}
              placeholder="ex: 15000"
            />
          </div>
        )}

        {/* Tamanho */}
        <div>
          <label className={lbl}>
            Tamanho{tamanhoOverride ? ' (fixo)' : ''}
          </label>
          <select
            className={inp}
            disabled={!!tamanhoOverride}
            value={tamanhoOverride || linha.tamanho}
            onChange={(e) => set('tamanho', e.target.value)}
          >
            <option value="">Selecione...</option>
            {dims.tamanhos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Circulação */}
        <div>
          <label className={lbl}>Circulação</label>
          <select
            className={inp}
            value={linha.circulacao}
            onChange={(e) => set('circulacao', e.target.value)}
          >
            <option value="">Selecione...</option>
            {dims.visualizacoes.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Tipo de mídia */}
        <div>
          <label className={lbl}>Tipo de mídia</label>
          <select
            className={inp}
            value={linha.tipo}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...linha,
                tipo: v,
                slots: v === 'Digital' && !linha.slots ? '1' : linha.slots,
              });
            }}
          >
            <option value="">Selecione...</option>
            <option>Digital</option>
            <option>Estático</option>
          </select>
        </div>

        {/* Campos exclusivos de Digital */}
        {isDigital && (
          <>
            <div>
              <label className={lbl}>
                Inserções/slot{!linha.insercoesPorSlot && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                className={inp + (!linha.insercoesPorSlot ? ' border-red-300 bg-red-50' : '')}
                type="number"
                value={linha.insercoesPorSlot}
                onChange={(e) => set('insercoesPorSlot', e.target.value)}
                placeholder="ex: 1080"
              />
            </div>
            <div>
              <label className={lbl}>Slots</label>
              <input
                className={inp}
                type="number"
                value={linha.slots}
                onChange={(e) => set('slots', e.target.value)}
                placeholder="ex: 1"
              />
            </div>
            <div>
              <label className={lbl}>
                Total inserções{' '}
                <span className="text-gray-400 font-normal normal-case">
                  {linha.totalInsOverride !== '' ? '(manual)' : '(auto)'}
                </span>
              </label>
              <div className="flex gap-1">
                <input
                  className={
                    inp +
                    (linha.totalInsOverride !== ''
                      ? ' border-[#ff4600]/50 bg-orange-50'
                      : '')
                  }
                  type="number"
                  value={
                    linha.totalInsOverride !== ''
                      ? linha.totalInsOverride
                      : String(totalIns)
                  }
                  onChange={(e) => set('totalInsOverride', e.target.value)}
                />
                {linha.totalInsOverride !== '' && (
                  <button
                    type="button"
                    onClick={() => set('totalInsOverride', '')}
                    title="Voltar ao automático"
                    className="shrink-0 rounded-md border border-gray-300 px-2 text-gray-500 hover:bg-gray-50"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={lbl}>Deflator digital</label>
              <div className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm font-semibold text-gray-700 tabular-nums">
                {(deflatorDigital * 100).toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </div>
            </div>
          </>
        )}
      </div>

      {/* Localidades por semana */}
      <div className="mt-4 border-t border-gray-200 pt-3">
        <div className="flex items-end justify-between gap-3 mb-2 flex-wrap">
          <label className={lbl + ' mb-0'}>
            Localidades por semana (faces) · W1–W{semanas}
          </label>
          <div className="flex items-end gap-2">
            <div>
              <span className="block text-[10px] text-gray-500">Faces (padrão)</span>
              <input
                type="number"
                value={padrao}
                onChange={(e) => setPadrao(e.target.value)}
                placeholder="ex: 50"
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#ff4600] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={aplicarPadrao}
              className="rounded-md border border-[#ff4600] text-[#ff4600] px-3 py-1.5 text-xs font-semibold hover:bg-orange-50"
            >
              Aplicar a todas
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: semanas }, (_, w) => (
            <div key={w} className="w-[52px]">
              <div className="text-[10px] text-gray-500 text-center">W{w + 1}</div>
              <input
                type="number"
                value={linha.locs[w] ?? ''}
                onChange={(e) => setLoc(w, e.target.value)}
                className="w-full rounded border border-gray-300 px-1 py-1 text-sm text-center tabular-nums focus:border-[#ff4600] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
