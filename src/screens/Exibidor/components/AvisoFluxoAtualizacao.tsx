import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  /** Texto curto explicando o que esta tela faz no fluxo. */
  descricao: string;
}

/**
 * Banner reutilizado nas telas do submenu "Atualizar inventário"
 * para deixar claro ao exibidor que estas operações:
 *   1) atuam apenas sobre os pontos enviados via upload (não sobre o legado);
 *   2) entram em fila de validação antes de virar inventário consolidado.
 */
export const AvisoFluxoAtualizacao: React.FC<Props> = ({ descricao }) => (
  <div className="rounded-xl border border-[#f5dd9b] bg-[#fffaeb] p-4 flex items-start gap-3">
    <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#fff3c7] text-[#8a5a00] text-sm font-bold">
      i
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#fff7e0] text-[#8a5a00] border border-[#f5dd9b]">
          Em análise
        </span>
        <span className="text-xs font-semibold text-[#3a3a3a]">Fluxo de envio e correção</span>
      </div>
      <p className="text-xs text-[#5a4500] leading-relaxed">
        {descricao} Os pontos só passam a fazer parte do{' '}
        <Link to="/exibidor/inventario" className="font-semibold underline hover:text-[#3a2a00]">
          inventário consolidado
        </Link>{' '}
        após validação da equipe BE180.
      </p>
    </div>
  </div>
);
