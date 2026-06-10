import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

type Tipo = 'Bug' | 'Sugestão' | 'Dúvida';
type Gravidade = 'Alta' | 'Média' | 'Baixa';
type Estado = 'idle' | 'enviando' | 'sucesso' | 'erro';

const TIPOS: Tipo[]      = ['Bug', 'Sugestão', 'Dúvida'];
const GRAVIDADES: Gravidade[] = ['Alta', 'Média', 'Baixa'];

export function OcorrenciaWidget() {
  const { user, isAuthenticated } = useAuth();

  const [aberto, setAberto]       = useState(false);
  const [tipo, setTipo]           = useState<Tipo>('Bug');
  const [gravidade, setGravidade] = useState<Gravidade>('Média');
  const [descricao, setDescricao] = useState('');
  const [estado, setEstado]       = useState<Estado>('idle');
  const [erroMsg, setErroMsg]     = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);

  // Foco automático no textarea quando abrir
  useEffect(() => {
    if (aberto && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [aberto]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleFechar();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [aberto]);

  if (!isAuthenticated) return null;

  function handleFechar() {
    setAberto(false);
    // Reset com delay para não piscar durante animação de saída
    setTimeout(() => {
      setDescricao('');
      setTipo('Bug');
      setGravidade('Média');
      setEstado('idle');
      setErroMsg('');
    }, 200);
  }

  async function handleEnviar() {
    if (!descricao.trim()) {
      textareaRef.current?.focus();
      return;
    }
    setEstado('enviando');
    setErroMsg('');
    try {
      await axios.post('/api/ocorrencia-criar', {
        tipo,
        gravidade,
        descricao: descricao.trim(),
        usuario: user?.name || user?.email || 'desconhecido',
        url_origem: window.location.href,
      });
      setEstado('sucesso');
      setTimeout(() => handleFechar(), 2200);
    } catch {
      setEstado('erro');
      setErroMsg('Não foi possível registrar. Tente novamente.');
    }
  }

  const sel = (ativo: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer select-none ${
      ativo
        ? 'bg-[#3a3a3a] text-white'
        : 'text-gray-400 hover:text-[#3a3a3a] hover:bg-gray-100'
    }`;

  return (
    <>
      {/* Botão flutuante ? */}
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Registrar ocorrência"
        className={`fixed bottom-6 right-6 z-50 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-150 ${
          aberto
            ? 'bg-[#3a3a3a] text-white shadow-lg'
            : 'bg-white border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:shadow-lg'
        }`}
      >
        {aberto ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 21V4m0 0l8 3 8-3v11l-8 3-8-3V4z" />
          </svg>
        )}
      </button>

      {/* Painel */}
      {aberto && (
        <div
          ref={panelRef}
          className="fixed bottom-[4.5rem] right-6 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ animation: 'ocorrencia-slide-up 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#3a3a3a]">Registrar ocorrência</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Bug, sugestão ou dúvida</p>
            </div>
          </div>

          {estado === 'sucesso' ? (
            /* Estado de sucesso */
            <div className="px-4 py-8 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ff4600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#3a3a3a] text-center">Registrado com sucesso</p>
              <p className="text-xs text-gray-400 text-center">Obrigado! Vamos analisar em breve.</p>
            </div>
          ) : (
            /* Formulário */
            <div className="p-4 space-y-4">
              {/* Tipo */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Tipo</p>
                <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1">
                  {TIPOS.map((t) => (
                    <button key={t} type="button" onClick={() => setTipo(t)} className={sel(tipo === t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gravidade (só visível para Bug) */}
              {tipo === 'Bug' && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Gravidade</p>
                  <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1">
                    {GRAVIDADES.map((g) => (
                      <button key={g} type="button" onClick={() => setGravidade(g)} className={sel(gravidade === g)}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Descrição */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Descrição</p>
                <textarea
                  ref={textareaRef}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={
                    tipo === 'Bug'
                      ? 'O que aconteceu? Em qual tela?'
                      : tipo === 'Sugestão'
                      ? 'Qual melhoria você sugere?'
                      : 'Qual é sua dúvida?'
                  }
                  rows={3}
                  maxLength={1000}
                  className="w-full text-sm text-[#3a3a3a] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#ff4600]/20 focus:border-[#ff4600] placeholder:text-gray-300"
                />
                <p className="text-[10px] text-gray-300 text-right mt-0.5">{descricao.length}/1000</p>
              </div>

              {/* Erro */}
              {estado === 'erro' && (
                <p className="text-xs text-red-500">{erroMsg}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-gray-300 truncate max-w-[160px]">
                  {user?.name || user?.email || ''}
                </p>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={estado === 'enviando' || !descricao.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4600] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {estado === 'enviando' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Animação CSS inline */}
      <style>{`
        @keyframes ocorrencia-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
