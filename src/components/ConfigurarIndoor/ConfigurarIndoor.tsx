import { useEffect, useState } from 'react';
import axios from 'axios';
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
  onFinalizar: () => void;
}

interface PracaSalva {
  praca: string;
  linhasCount: number;
}

export default function ConfigurarIndoor({
  planoMidiaGrupo_pk,
  cidadesSalvas,
  quantidadeSemanas,
  onFinalizar,
}: Props) {
  const [dims, setDims] = useState<IndoorDims | null>(null);
  const [loadingDims, setLoadingDims] = useState(true);
  const [erroDims, setErroDims] = useState('');

  const semanas = Math.max(1, Math.min(12, quantidadeSemanas));
  const pracasDisponiveis = cidadesSalvas.map((c) => c.nome_cidade);

  const [pracaSelecionada, setPracaSelecionada] = useState<string>(
    pracasDisponiveis[0] ?? ''
  );
  const [linhas, setLinhas] = useState<IndoorLinha[]>([emptyIndoorLinha()]);

  const [salvando, setSalvando] = useState(false);
  const [pracasSalvas, setPracasSalvas] = useState<PracaSalva[]>([]);
  const [erro, setErro] = useState('');

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

  const handleSalvar = async () => {
    if (!planoMidiaGrupo_pk) {
      setErro('Roteiro ainda não foi salvo. Finalize a Aba 4 primeiro.');
      return;
    }
    if (!pracaSelecionada) {
      setErro('Selecione uma praça.');
      return;
    }
    const linhasValidas = linhas.filter((l) => l.ambiente.trim());
    if (linhasValidas.length === 0) {
      setErro('Adicione ao menos um ambiente antes de salvar.');
      return;
    }

    setSalvando(true);
    setErro('');

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

      if (response.data?.success) {
        setPracasSalvas((prev) => {
          const sem = prev.filter((p) => p.praca !== pracaSelecionada);
          return [...sem, { praca: pracaSelecionada, linhasCount: linhasValidas.length }];
        });
        setLinhas([emptyIndoorLinha()]);

        // Sugerir próxima praça não salva
        const proxima = pracasDisponiveis.find(
          (p) =>
            p !== pracaSelecionada &&
            !pracasSalvas.some((ps) => ps.praca === p) &&
            p !== pracaSelecionada
        );
        if (proxima) setPracaSelecionada(proxima);
      } else {
        setErro(response.data?.message || 'Erro ao salvar');
      }
    } catch (e: any) {
      setErro(
        e?.response?.data?.message || e?.message || 'Erro ao salvar configuração indoor'
      );
    } finally {
      setSalvando(false);
    }
  };

  if (loadingDims) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin h-5 w-5 border-2 border-[#ff4600] border-t-transparent rounded-full" />
          Carregando configurações indoor...
        </div>
      </div>
    );
  }

  if (erroDims) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
        Erro ao carregar dimensões indoor: {erroDims}
      </div>
    );
  }

  if (!dims) return null;

  const todasSalvas =
    pracasDisponiveis.length > 0 &&
    pracasDisponiveis.every((p) => pracasSalvas.some((ps) => ps.praca === p));

  return (
    <div className="space-y-6">
      {/* Card de status das praças */}
      {pracasSalvas.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">
            Configuração indoor salva em {pracasSalvas.length}{' '}
            {pracasSalvas.length === 1 ? 'praça' : 'praças'}:
          </p>
          <div className="flex flex-wrap gap-2">
            {pracasSalvas.map((ps) => (
              <span
                key={ps.praca}
                className="inline-flex items-center gap-1 text-xs bg-white border border-green-300 text-green-700 rounded-full px-3 py-1"
              >
                <span className="text-green-500">✓</span>
                {ps.praca} · {ps.linhasCount} ambiente{ps.linhasCount !== 1 ? 's' : ''}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-green-600 mt-2">
            Os resultados indoor estarão disponíveis após o processamento ser concluído.
          </p>
        </div>
      )}

      {/* Formulário de configuração */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[#3a3a3a]">Configurar mídia indoor</h4>
          <span className="text-[11px] text-gray-400">
            Semanas ativas: W1–W{semanas}
          </span>
        </div>

        {/* Seletor de praça */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div className="flex-1 min-w-[220px] max-w-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Praça
            </label>
            {pracasDisponiveis.length > 1 ? (
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#ff4600] focus:outline-none focus:ring-1 focus:ring-[#ff4600]"
                value={pracaSelecionada}
                onChange={(e) => {
                  setPracaSelecionada(e.target.value);
                  setLinhas([emptyIndoorLinha()]);
                  setErro('');
                }}
              >
                {pracasDisponiveis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                    {pracasSalvas.some((ps) => ps.praca === p) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700">
                {pracaSelecionada || '—'}
              </div>
            )}
          </div>
        </div>

        {/* Lista de ambientes */}
        <div className="space-y-4">
          {linhas.map((l, i) => (
            <AmbienteRowIndoor
              key={i}
              idx={i}
              dims={dims}
              linha={l}
              semanas={semanas}
              onChange={(nl) =>
                setLinhas((ls) => ls.map((x, j) => (j === i ? nl : x)))
              }
              onRemove={() =>
                setLinhas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))
              }
            />
          ))}
        </div>

        {/* Ações do formulário */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <button
            type="button"
            onClick={() => setLinhas((ls) => [...ls, emptyIndoorLinha()])}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            + Ambiente
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || !pracaSelecionada}
            className="rounded-md bg-[#ff4600] px-5 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {salvando && (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {salvando ? 'Salvando...' : 'Salvar configuração indoor'}
          </button>
        </div>

        {erro && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {erro}
          </div>
        )}
      </div>

      {/* Botão Finalizar — só aparece após salvar ao menos uma praça */}
      {pracasSalvas.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-[#3a3a3a]">
                {todasSalvas
                  ? 'Todas as praças configuradas!'
                  : `${pracasSalvas.length} de ${pracasDisponiveis.length} praça(s) configurada(s)`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {todasSalvas
                  ? 'Você pode finalizar o roteiro agora.'
                  : 'Configure as demais praças ou finalize com as já salvas.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onFinalizar}
              className="rounded-lg bg-[#ff4600] text-white px-6 py-2.5 text-sm font-semibold hover:brightness-95"
            >
              Finalizar roteiro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
