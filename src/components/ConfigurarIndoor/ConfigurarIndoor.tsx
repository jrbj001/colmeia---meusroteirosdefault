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
  /** Dispara a finalização completa do roteiro (mesma lógica da Aba 4). */
  onFinalizarRoteiro?: () => void;
  /** True enquanto a finalização do roteiro está em andamento. */
  finalizandoRoteiro?: boolean;
  /** True quando as Vias Públicas já estão prontas para finalizar. */
  podeFinalizarRoteiro?: boolean;
  /** Motivo específico pelo qual a finalização está bloqueada (quando podeFinalizarRoteiro=false). */
  motivoBloqueioFinalizacao?: string;
}

interface PracaSalva {
  praca: string;
  linhasCount: number;
}

type StepStatus = 'pending' | 'processing' | 'completed' | 'error';
interface Step { id: string; label: string; status: StepStatus; detail?: string }

const mkSteps = (praca: string, count: number): Step[] => [
  { id: 'validar', label: 'Validando configuração',     status: 'pending', detail: `${count} ambiente(s) · ${praca}` },
  { id: 'gravar',  label: 'Gravando no banco de dados', status: 'pending', detail: 'planoMidiaIndoor_ft' },
  { id: 'ok',      label: 'Configuração salva',         status: 'pending', detail: '' },
];

export default function ConfigurarIndoor({
  planoMidiaGrupo_pk,
  cidadesSalvas,
  quantidadeSemanas,
  onVoltarAba4,
  onFinalizarRoteiro,
  finalizandoRoteiro = false,
  podeFinalizarRoteiro = false,
  motivoBloqueioFinalizacao,
}: Props) {
  const [dims, setDims] = useState<IndoorDims | null>(null);
  const [loadingDims, setLoadingDims] = useState(true);
  const [erroDims, setErroDims] = useState('');

  const semanas = Math.max(1, Math.min(12, quantidadeSemanas));
  const pracasDisponiveis = cidadesSalvas.map((c) => c.nome_cidade);

  // Índice da praça ativa no wizard (0-based)
  const [stepIdx, setStepIdx] = useState(0);
  const pracaSelecionada = pracasDisponiveis[stepIdx] ?? '';
  const isUltimaPraca = stepIdx === pracasDisponiveis.length - 1;
  const isEtapaConclusao = stepIdx >= pracasDisponiveis.length;

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

  // Apple loader
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

  const handleSalvarEAvancar = async () => {
    if (!planoMidiaGrupo_pk) { setErro('Roteiro ainda não foi salvo. Finalize as etapas anteriores primeiro.'); return; }
    if (!pracaSelecionada) { setErro('Selecione uma praça.'); return; }

    const linhasValidas = linhas.filter((l) => l.ambiente.trim());
    if (linhasValidas.length === 0) { setErro('Adicione ao menos um ambiente antes de salvar.'); return; }

    const steps = mkSteps(pracaSelecionada, linhasValidas.length);
    setLoaderSteps(steps);
    setLoaderProgress(0);
    setShowLoader(true);
    setErro('');

    setStep('validar', 'processing');
    setLoaderProgress(10);
    await new Promise((r) => setTimeout(r, 400));
    setStep('validar', 'completed');
    setLoaderProgress(35);

    setStep('gravar', 'processing');
    setLoaderProgress(50);

    try {
      const payload = {
        planoMidiaGrupo_pk,
        praca: pracaSelecionada,
        semanas,
        linhas: linhasValidas.map((l) => ({
          ambiente: l.ambiente.trim(),
          shopping: l.venueNome?.trim() || null,
          tamanho: l.tamanho.trim() || null,
          circulacao: l.circulacao.trim() || null,
          tipo: l.tipo || 'Estático',
          passantes: l.passantes !== '' ? Number(l.passantes) : null,
          insercoesPorSlot: l.insercoesPorSlot !== '' ? Number(l.insercoesPorSlot) : null,
          slots: l.slots !== '' ? Number(l.slots) : null,
          localidades: l.locs.map((v) => Number(v) || 0),
          faces:       l.faces.map((v) => Number(v) || 1),
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

      setStep('gravar', 'completed');
      setLoaderProgress(80);
      setStep('ok', 'processing');
      await new Promise((r) => setTimeout(r, 350));
      setStep('ok', 'completed');
      setLoaderProgress(100);
      await new Promise((r) => setTimeout(r, 600));
      setShowLoader(false);

      setPracasSalvas((prev) => [
        ...prev.filter((p) => p.praca !== pracaSelecionada),
        { praca: pracaSelecionada, linhasCount: linhasValidas.length },
      ]);

      // Avança para próxima praça ou etapa de conclusão
      setStepIdx((i) => i + 1);
      setErro('');

    } catch (e: any) {
      setStep('gravar', 'error');
      setLoaderProgress(50);
      await new Promise((r) => setTimeout(r, 800));
      setShowLoader(false);
      setErro(e?.response?.data?.message || e?.message || 'Erro ao salvar configuração indoor');
    }
  };

  const handlePular = () => {
    setErro('');
    setStepIdx((i) => i + 1);
  };

  const handleVoltar = () => {
    setErro('');
    setStepIdx((i) => Math.max(0, i - 1));
  };

  // ── Loading inicial ──
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

  // ── Stepper ──
  const StepperHeader = () => (
    <div className="flex items-center gap-0 mb-6">
      {pracasDisponiveis.map((p, i) => {
        const salva  = pracasSalvas.some((ps) => ps.praca === p);
        const ativa  = i === stepIdx;
        const futura = i > stepIdx;
        return (
          <div key={p} className="flex items-center">
            <button
              type="button"
              onClick={() => { setStepIdx(i); setErro(''); }}
              disabled={futura && !salva}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                salva
                  ? ativa
                    ? 'bg-[#ff4600] text-white'
                    : 'text-[#ff4600] hover:bg-orange-50'
                  : ativa
                  ? 'bg-[#3a3a3a] text-white'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              {salva && !ativa ? (
                <span className="w-4 h-4 rounded-full bg-[#ff4600] text-white flex items-center justify-center text-[9px]">✓</span>
              ) : (
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                  ativa ? 'border-current bg-current text-white' : 'border-current'
                }`}>
                  {ativa ? <span className="text-white">{i + 1}</span> : i + 1}
                </span>
              )}
              {p}
            </button>
            {i < pracasDisponiveis.length - 1 && (
              <span className="mx-1 text-gray-200 text-sm">›</span>
            )}
          </div>
        );
      })}
      {/* Etapa conclusão */}
      <span className="mx-1 text-gray-200 text-sm">›</span>
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
        isEtapaConclusao ? 'bg-[#3a3a3a] text-white' : 'text-gray-300'
      }`}>
        Concluir
      </span>
    </div>
  );

  // ── Etapa de conclusão ──
  if (isEtapaConclusao) {
    return (
      <>
        <AppleSaveLoader isOpen={showLoader} steps={loaderSteps} currentProgress={loaderProgress} title="Salvando configuração indoor" />
        <div className="space-y-5">
          <StepperHeader />
          <div className="border border-gray-200 rounded-lg bg-white p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#ff4600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#3a3a3a]">
                {pracasSalvas.length === pracasDisponiveis.length
                  ? 'Todas as praças configuradas'
                  : `${pracasSalvas.length} de ${pracasDisponiveis.length} praça(s) configurada(s)`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {onFinalizarRoteiro
                  ? 'Você pode finalizar o roteiro agora mesmo, sem voltar à Aba 4.'
                  : 'Volte para a Aba 4 (Vias Públicas) para finalizar o roteiro.'}
              </p>
            </div>

            {/* Resumo das praças salvas */}
            {pracasSalvas.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {pracasSalvas.map((ps) => (
                  <span key={ps.praca} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-[#3a3a3a]">
                    <span className="text-[#ff4600]">✓</span> {ps.praca} · {ps.linhasCount} amb.
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-2 w-full pt-2">
              {onFinalizarRoteiro && (
                <>
                  <button
                    type="button"
                    onClick={onFinalizarRoteiro}
                    disabled={!podeFinalizarRoteiro || finalizandoRoteiro}
                    className="w-full max-w-xs rounded-lg bg-[#ff4600] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {finalizandoRoteiro ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Finalizando roteiro…
                      </>
                    ) : (
                      'Finalizar roteiro e ver resultados'
                    )}
                  </button>
                  {finalizandoRoteiro && (
                    <p className="text-[11px] text-gray-400 text-center max-w-xs">
                      Isso pode levar até 2 minutos. Você será levado aos resultados automaticamente.
                    </p>
                  )}
                  {!podeFinalizarRoteiro && !finalizandoRoteiro && (
                    <p className="text-[11px] text-amber-600 text-center max-w-xs">
                      {motivoBloqueioFinalizacao ||
                        'Complete as etapas anteriores do roteiro antes de finalizar.'}
                    </p>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={onVoltarAba4}
                disabled={finalizandoRoteiro}
                className={`text-xs ${
                  onFinalizarRoteiro
                    ? 'text-gray-400 hover:text-[#3a3a3a]'
                    : 'w-full max-w-xs rounded-lg bg-[#ff4600] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition-all'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {onFinalizarRoteiro ? '← Revisar Vias Públicas' : 'Voltar para Aba 4 e finalizar roteiro'}
              </button>

              {pracasSalvas.length < pracasDisponiveis.length && !finalizandoRoteiro && (
                <button
                  type="button"
                  onClick={() => setStepIdx(pracasDisponiveis.findIndex((p) => !pracasSalvas.some((ps) => ps.praca === p)))}
                  className="text-xs text-gray-400 hover:text-[#3a3a3a]"
                >
                  Voltar e configurar praças pendentes
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Etapa de configuração de praça ──
  const labelBotao = isUltimaPraca
    ? 'Salvar e concluir'
    : `Salvar e ir para ${pracasDisponiveis[stepIdx + 1] ?? 'próxima'} →`;

  return (
    <>
      <AppleSaveLoader
        isOpen={showLoader}
        steps={loaderSteps}
        currentProgress={loaderProgress}
        title="Salvando configuração indoor"
      />

      <div className="space-y-5">
        <StepperHeader />

        {/* Área de edição */}
        <div className="border border-gray-200 rounded-lg bg-white">

          {/* Cabeçalho da praça */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Praça</span>
              <span className="text-sm font-semibold text-[#3a3a3a]">{pracaSelecionada}</span>
              {pracasSalvas.some((ps) => ps.praca === pracaSelecionada) && (
                <span className="text-[11px] text-[#ff4600] font-medium">✓ salvo</span>
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
                praca={pracaSelecionada}
                onChange={(nl) => setLinhas((ls) => ls.map((x, j) => (j === i ? nl : x)))}
                onRemove={() => setLinhas((ls) => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)}
              />
            ))}
          </div>

          {/* Rodapé da card */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex-wrap">
            <button
              type="button"
              onClick={() => setLinhas((ls) => [...ls, emptyIndoorLinha()])}
              className="text-sm text-gray-400 hover:text-[#ff4600] flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span> Ambiente
            </button>
            <div className="flex-1" />
            {erro && <p className="text-xs text-red-500">{erro}</p>}
          </div>
        </div>

        {/* Navegação wizard */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={handleVoltar}
                className="text-xs text-gray-400 hover:text-[#3a3a3a]"
              >
                ← {pracasDisponiveis[stepIdx - 1]}
              </button>
            )}
            <button
              type="button"
              onClick={handlePular}
              className="text-xs text-gray-400 hover:text-[#3a3a3a]"
            >
              Pular praça
            </button>
          </div>

          <button
            type="button"
            onClick={handleSalvarEAvancar}
            className="rounded-lg bg-[#ff4600] px-5 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {labelBotao}
          </button>
        </div>
      </div>
    </>
  );
}
