import { useEffect, useState } from 'react';
import axios from 'axios';
import { AppleSaveLoader } from '../AppleSaveLoader/AppleSaveLoader';
import AmbienteRowIndoor, {
  IndoorDims,
  IndoorLinha,
  emptyIndoorLinha,
} from './AmbienteRowIndoor';

interface Cidade {
  id_cidade: number | string;
  nome_cidade: string;
  nome_estado: string;
}

interface Props {
  planoMidiaGrupo_pk: number | null;
  cidadesSalvas: Cidade[];
  quantidadeSemanas: number;
  onVoltarAba4: () => void;
}

interface PracaSalva {
  praca: string;
  linhasCount: number;
}

type StepStatus = 'pending' | 'processing' | 'completed' | 'error';
interface Step { id: string; label: string; status: StepStatus; detail?: string }

const mkSteps = (praca: string, count: number): Step[] => [
  { id: 'validar', label: 'Validando configuração',      status: 'pending', detail: `${count} ambiente(s) · ${praca}` },
  { id: 'gravar',  label: 'Gravando no banco de dados',  status: 'pending', detail: 'planoMidiaIndoor_ft' },
  { id: 'ok',      label: 'Configuração salva',          status: 'pending', detail: '' },
];

export default function ConfigurarIndoor({
  planoMidiaGrupo_pk,
  cidadesSalvas,
  quantidadeSemanas,
  onVoltarAba4,
}: Props) {
  const [dims, setDims] = useState<IndoorDims | null>(null);
  const [loadingDims, setLoadingDims] = useState(true);
  const [erroDims, setErroDims] = useState('');

  const semanas = Math.max(1, Math.min(12, quantidadeSemanas));
  const pracasDisponiveis = cidadesSalvas.map((c) => c.nome_cidade);

  const [pracaSelecionada, setPracaSelecionada] = useState<string>(pracasDisponiveis[0] ?? '');

  const [linhasPorPraca, setLinhasPorPraca] = useState<Record<string, IndoorLinha[]>>({});
  const linhas: IndoorLinha[] = linhasPorPraca[pracaSelecionada] ?? [emptyIndoorLinha()];
  const setLinhas = (fn: IndoorLinha[] | ((prev: IndoorLinha[]) => IndoorLinha[])) => {
    setLinhasPorPraca((prev) => {
      const current = prev[pracaSelecionada] ?? [emptyIndoorLinha()];
      const next = typeof fn === 'function' ? fn(current) : fn;
      return { ...prev, [pracaSelecionada]: next };
    });
  };

  const [pracasSalvas, setPracasSalvas] = useState<PracaSalva[]>([]);
  const [erro, setErro] = useState('');

  // Apple loader state
  const [showLoader, setShowLoader] = useState(false);
  const [loaderSteps, setLoaderSteps] = useState<Step[]>([]);
  const [loaderProgress, setLoaderProgress] = useState(0);

  useEffect(() => {
    axios
      .get('/api/indoor-dims')
      .then((r) => {
        if (r.data?.success) setDims(r.data.data);
        else setErroDims(r.data?.message || 'Erro ao carregar dimensões');
      })
      .catch((e) => setErroDims(e.message || 'Erro ao carregar dimensões'))
      .finally(() => setLoadingDims(false));
  }, []);

  const setStep = (id: string, status: StepStatus) =>
    setLoaderSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const handleSalvar = async () => {
    if (!planoMidiaGrupo_pk) { setErro('Roteiro ainda não foi salvo. Finalize as etapas anteriores primeiro.'); return; }
    if (!pracaSelecionada) { setErro('Selecione uma praça.'); return; }

    const linhasValidas = linhas.filter((l) => l.ambiente.trim());
    if (linhasValidas.length === 0) { setErro('Adicione ao menos um ambiente antes de salvar.'); return; }

    // ── Inicia Apple loader ──
    const steps = mkSteps(pracaSelecionada, linhasValidas.length);
    setLoaderSteps(steps);
    setLoaderProgress(0);
    setShowLoader(true);
    setErro('');

    // Etapa 1 — validação (instantânea, só visual)
    setStep('validar', 'processing');
    setLoaderProgress(10);
    await new Promise((r) => setTimeout(r, 400));
    setStep('validar', 'completed');
    setLoaderProgress(35);

    // Etapa 2 — gravar
    setStep('gravar', 'processing');
    setLoaderProgress(50);

    try {
      const payload = {
        planoMidiaGrupo_pk,
        praca: pracaSelecionada,
        semanas,
        linhas: linhasValidas.map((l) => ({
          ambiente: l.ambiente.trim(),
          shopping: l.shopping.trim() || null,
          tamanho: l.tamanho.trim() || null,
          circulacao: l.circulacao.trim() || null,
          tipo: l.tipo || 'Estático',
          passantes: l.passantes !== '' ? Number(l.passantes) : null,
          insercoesPorSlot: l.insercoesPorSlot !== '' ? Number(l.insercoesPorSlot) : null,
          slots: l.slots !== '' ? Number(l.slots) : null,
          localidades: l.locs.map((v) => Number(v) || 0),
        })),
      };

      const response = await axios.post('/api/indoor-salvar', payload);

      if (!response.data?.success) {
        setStep('gravar', 'error');
        setLoaderProgress(50);
        await new Promise((r) => setTimeout(r, 800));
        setShowLoader(false);
        setErro(response.data?.message || 'Erro ao salvar');
        return;
      }

      // Etapa 3 — concluído
      setStep('gravar', 'completed');
      setLoaderProgress(80);
      setStep('ok', 'processing');
      await new Promise((r) => setTimeout(r, 350));
      setStep('ok', 'completed');
      setLoaderProgress(100);
      await new Promise((r) => setTimeout(r, 600));

      setShowLoader(false);

      const novasSalvas = [
        ...pracasSalvas.filter((p) => p.praca !== pracaSelecionada),
        { praca: pracaSelecionada, linhasCount: linhasValidas.length },
      ];
      setPracasSalvas(novasSalvas);

      const proxima = pracasDisponiveis.find(
        (p) => p !== pracaSelecionada && !novasSalvas.some((ps) => ps.praca === p)
      );
      if (proxima) setPracaSelecionada(proxima);

    } catch (e: any) {
      setStep('gravar', 'error');
      setLoaderProgress(50);
      await new Promise((r) => setTimeout(r, 800));
      setShowLoader(false);
      setErro(e?.response?.data?.message || e?.message || 'Erro ao salvar configuração indoor');
    }
  };

  // ── Loading inicial de dimensões (estilo Apple — sem overlay, inline elegante) ──
  if (loadingDims) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-[#ff4600] animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#3a3a3a]">Carregando configurações</p>
          <p className="text-xs text-gray-400 mt-1">Buscando ambientes, tamanhos e parâmetros indoor…</p>
        </div>
      </div>
    );
  }

  if (erroDims) {
    return (
      <div className="rounded border border-red-100 bg-red-50 text-red-600 text-sm p-3">
        Erro ao carregar dimensões: {erroDims}
      </div>
    );
  }

  if (!dims) return null;

  const todasSalvas =
    pracasDisponiveis.length > 0 &&
    pracasDisponiveis.every((p) => pracasSalvas.some((ps) => ps.praca === p));

  const estaSalva = pracasSalvas.some((ps) => ps.praca === pracaSelecionada);

  return (
    <>
      {/* ── Apple Save Loader (overlay) ── */}
      <AppleSaveLoader
        isOpen={showLoader}
        steps={loaderSteps}
        currentProgress={loaderProgress}
        title="Salvando configuração indoor"
      />

      <div className="space-y-5">

        {/* ── Barra de status das praças ── */}
        {pracasSalvas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs text-gray-400">Praças salvas:</span>
            {pracasSalvas.map((ps) => (
              <button
                key={ps.praca}
                type="button"
                onClick={() => { setPracaSelecionada(ps.praca); setErro(''); }}
                className={`inline-flex items-center gap-1 text-xs rounded-full px-3 py-0.5 border transition-colors ${
                  ps.praca === pracaSelecionada
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-green-700 border-green-300 hover:border-green-500'
                }`}
              >
                ✓ {ps.praca} · {ps.linhasCount} amb.
              </button>
            ))}
            {!todasSalvas && (
              <span className="text-xs text-gray-400">
                {pracasDisponiveis.length - pracasSalvas.length} praça(s) pendente(s)
              </span>
            )}
          </div>
        )}

        {/* ── Área de edição ── */}
        <div className="border border-gray-200 rounded-lg bg-white">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {pracasDisponiveis.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Praça</span>
                  <select
                    className="rounded border border-gray-200 px-2 py-1 text-sm text-[#3a3a3a] focus:border-[#ff4600] focus:outline-none"
                    value={pracaSelecionada}
                    onChange={(e) => { setPracaSelecionada(e.target.value); setErro(''); }}
                  >
                    {pracasDisponiveis.map((p) => (
                      <option key={p} value={p}>
                        {p}{pracasSalvas.some((ps) => ps.praca === p) ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Praça</span>
                  <span className="text-sm font-medium text-[#3a3a3a]">{pracaSelecionada || '—'}</span>
                </div>
              )}
              {estaSalva && (
                <span className="text-[11px] text-green-600 font-medium">✓ salvo</span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">W1–W{semanas}</span>
          </div>

          {/* Lista de ambientes */}
          <div className="divide-y divide-gray-100">
            {linhas.map((l, i) => (
              <AmbienteRowIndoor
                key={i}
                idx={i}
                dims={dims}
                linha={l}
                semanas={semanas}
                onChange={(nl) => setLinhas((ls) => ls.map((x, j) => (j === i ? nl : x)))}
                onRemove={() => setLinhas((ls) => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)}
              />
            ))}
          </div>

          {/* Rodapé com ações */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex-wrap">
            <button
              type="button"
              onClick={() => setLinhas((ls) => [...ls, emptyIndoorLinha()])}
              className="text-sm text-gray-500 hover:text-[#ff4600] flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span> Ambiente
            </button>

            <div className="flex-1" />

            {erro && <p className="text-xs text-red-500">{erro}</p>}

            <button
              type="button"
              onClick={handleSalvar}
              disabled={!pracaSelecionada}
              className="rounded bg-[#ff4600] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {estaSalva ? 'Salvar alterações' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* ── Rodapé de conclusão ── */}
        {pracasSalvas.length > 0 && (
          <div className="flex items-center justify-between gap-4 px-1 flex-wrap">
            <p className="text-xs text-gray-500">
              {todasSalvas
                ? 'Todas as praças configuradas. Volte para a Aba 4 para rodar o modelo.'
                : `${pracasSalvas.length}/${pracasDisponiveis.length} praça(s) salva(s). Configure as demais ou finalize na Aba 4.`}
            </p>
            <button
              type="button"
              onClick={onVoltarAba4}
              className="rounded bg-[#ff4600] text-white px-5 py-2 text-sm font-semibold hover:brightness-95 whitespace-nowrap"
            >
              Concluir e voltar para Aba 4
            </button>
          </div>
        )}
      </div>
    </>
  );
}
