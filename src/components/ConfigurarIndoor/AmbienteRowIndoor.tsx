import { useEffect, useMemo, useRef, useState } from 'react';

export interface IndoorAmbienteDim {
  nome: string;
  hasEspecificos: boolean;
  tamanhoOverride: string;
}

export interface VenueEspecifico {
  local: string;
  cidade: string;
  estado: string;
  passantes: number;
  area: number;
}

export interface IndoorDims {
  ambientes: IndoorAmbienteDim[];
  tamanhos: string[];
  visualizacoes: string[];
  /** Venues agrupados por ambiente: Record<ambiente, VenueEspecifico[]> */
  especificos: Record<string, VenueEspecifico[]>;
  cidades: string[];
  deflatorDigital: { min: number; mult: number }[];
}

export interface IndoorLinha {
  ambiente: string;
  venueNome: string;
  tamanho: string;
  circulacao: string;
  tipo: string;
  passantes: string;
  insercoesPorSlot: string;
  slots: string;
  totalInsOverride: string;
  locs: string[];
  faces: string[];
}

export const emptyIndoorLinha = (): IndoorLinha => ({
  ambiente: '',
  venueNome: '',
  tamanho: '',
  circulacao: '',
  tipo: '',
  passantes: '',
  insercoesPorSlot: '',
  slots: '',
  totalInsOverride: '',
  locs:  Array.from({ length: 12 }, () => ''),
  faces: Array.from({ length: 12 }, () => '1'),
});

/* ─── VenueCombobox ─────────────────────────────────────────────── */

interface VenueComboboxProps {
  id: string;
  venues: VenueEspecifico[];
  value: string;
  label: string;
  placeholder: string;
  onChange: (nome: string) => void;
}

function VenueCombobox({ id, venues, value, label, placeholder, onChange }: VenueComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues.slice(0, 150);
    return venues
      .filter((v) => v.local.toLowerCase().includes(q) || v.cidade.toLowerCase().includes(q))
      .slice(0, 120);
  }, [query, venues]);

  const fmt = (n: number) =>
    n > 0 ? `${Math.round(n / 1000)}k` : null;

  const handleSelect = (v: VenueEspecifico) => {
    setQuery(v.local);
    setOpen(false);
    onChange(v.local);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  };

  const lbl = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5';

  return (
    <div ref={wrapRef} className="relative col-span-2 sm:col-span-1">
      <label htmlFor={id} className={lbl}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={handleInputChange}
        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#3a3a3a] focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 w-full"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full min-w-[320px] rounded-lg border border-gray-100 bg-white shadow-xl overflow-hidden">
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 py-0.5">
            {filtered.map((v) => {
              const pass = fmt(v.passantes);
              return (
                <li
                  key={v.local}
                  onMouseDown={() => handleSelect(v)}
                  className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 group"
                >
                  <span className="text-sm text-[#3a3a3a] truncate group-hover:text-[#ff4600] transition-colors">
                    {v.local}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                    {v.cidade}/{v.estado}
                    {pass && <> · <span className="text-gray-500 font-medium">{pass}</span></>}
                  </span>
                </li>
              );
            })}
          </ul>
          {venues.length > 120 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-50 bg-gray-50/50">
              {venues.length} venues — digite para filtrar
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Estilos compartilhados ────────────────────────────────────── */

const sel =
  'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#3a3a3a] focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 disabled:bg-gray-50 disabled:text-gray-400 w-full';
const num =
  'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-[#3a3a3a] tabular-nums focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 w-full';
const lbl = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5';

/* ─── AmbienteRowIndoor ─────────────────────────────────────────── */

interface Props {
  idx: number;
  dims: IndoorDims;
  linha: IndoorLinha;
  semanas: number;
  praca: string;
  onChange: (l: IndoorLinha) => void;
  onRemove: () => void;
}

export default function AmbienteRowIndoor({ idx, dims, linha, semanas, praca, onChange, onRemove }: Props) {
  const [padrao, setPadrao]           = useState('');
  const [padraoFaces, setPadraoFaces] = useState('1');

  const amb = dims.ambientes.find((a) => a.nome === linha.ambiente);
  const hasEspecificos = !!amb?.hasEspecificos;
  const tamanhoFixed = amb?.tamanhoOverride || '';
  const isDigital = linha.tipo === 'Digital';

  // Venues filtrados pela praça, com fallback para todos
  const venuesDoAmbiente: VenueEspecifico[] = useMemo(() => {
    if (!linha.ambiente || !hasEspecificos) return [];
    const todos = dims.especificos[linha.ambiente] ?? [];
    if (!praca) return todos;
    const filtrados = todos.filter((v) =>
      v.cidade.toLowerCase().includes(praca.toLowerCase()) ||
      praca.toLowerCase().includes(v.cidade.toLowerCase())
    );
    return filtrados.length > 0 ? filtrados : todos;
  }, [linha.ambiente, hasEspecificos, dims.especificos, praca]);

  // Venue selecionado (para exibir info)
  const venueSelecionado: VenueEspecifico | undefined = useMemo(() => {
    if (!linha.venueNome || !hasEspecificos) return undefined;
    return venuesDoAmbiente.find((v) => v.local === linha.venueNome)
      ?? (dims.especificos[linha.ambiente] ?? []).find((v) => v.local === linha.venueNome);
  }, [linha.venueNome, linha.ambiente, hasEspecificos, venuesDoAmbiente, dims.especificos]);

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
  const setFace = (w: number, v: string) => {
    const arr = [...linha.faces];
    arr[w] = v;
    onChange({ ...linha, faces: arr });
  };
  const aplicarPadraoFaces = () => {
    const arr = [...linha.faces];
    for (let i = 0; i < semanas; i++) arr[i] = padraoFaces;
    onChange({ ...linha, faces: arr });
  };

  const handleVenueChange = (nomeVenue: string) => {
    const venue = (dims.especificos[linha.ambiente] ?? []).find((v) => v.local === nomeVenue);
    const passantesDoVenue = venue ? String(Math.round(venue.passantes)) : '';
    onChange({ ...linha, venueNome: nomeVenue, passantes: passantesDoVenue });
  };

  return (
    <div className="border border-gray-100 rounded-lg bg-white overflow-hidden">
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
                  onChange({ ...linha, ambiente: nome, tamanho: def?.tamanhoOverride ?? '', venueNome: '', passantes: '' });
                }}
              >
                <option value="">Selecione…</option>
                {dims.ambientes.map((a) => (
                  <option key={a.nome} value={a.nome}>{a.nome}</option>
                ))}
              </select>
            </div>

            {/* Venue específico ou Passantes manual */}
            {hasEspecificos ? (
              <VenueCombobox
                id={`venue-${idx}`}
                venues={venuesDoAmbiente}
                value={linha.venueNome}
                label={linha.ambiente || 'Venue'}
                placeholder={`Buscar ${linha.ambiente?.toLowerCase() || 'venue'}…`}
                onChange={handleVenueChange}
              />
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

          {/* Info do venue selecionado */}
          {venueSelecionado && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
              <span>{venueSelecionado.cidade}/{venueSelecionado.estado}</span>
              {venueSelecionado.passantes > 0 && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="font-medium text-gray-500">
                    {Math.round(venueSelecionado.passantes).toLocaleString('pt-BR')} pass/sem
                  </span>
                </>
              )}
              {venueSelecionado.area > 0 && (
                <>
                  <span className="text-gray-200">·</span>
                  <span>{Math.round(venueSelecionado.area).toLocaleString('pt-BR')} m²</span>
                </>
              )}
            </div>
          )}

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
              <span className={lbl + ' mb-0'}>Localidades/semana · W1–W{semanas}</span>
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

          {/* Faces por semana */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <span className={lbl + ' mb-0'}>Faces/semana · W1–W{semanas}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={padraoFaces}
                  onChange={(e) => setPadraoFaces(e.target.value)}
                  placeholder="1"
                  className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-center tabular-nums focus:border-[#ff4600] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={aplicarPadraoFaces}
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
                    value={linha.faces[w] ?? '1'}
                    onChange={(e) => setFace(w, e.target.value)}
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
