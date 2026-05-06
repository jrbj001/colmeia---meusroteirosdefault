import React, { useMemo, useState } from 'react';
import { ReportOption } from '../types';
import { formatDateBr } from '../utils/formatters';

interface P1aReportSelectorProps {
  reports: ReportOption[];
  selected: number[];
  onChange: (next: number[]) => void;
  loading?: boolean;
}

export const P1aReportSelector: React.FC<P1aReportSelectorProps> = ({
  reports,
  selected,
  onChange,
  loading,
}) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('');

  const usuarios = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.usuarioName_st) set.add(r.usuarioName_st);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [reports]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reports.filter((r) => {
      if (filtroUsuario && r.usuarioName_st !== filtroUsuario) return false;
      if (!termo) return true;
      const haystack = [
        r.planoMidiaGrupo_pk,
        r.planoMidiaGrupo_st,
        r.marca_st,
        r.agencia_st,
        r.cidadeUpper_st_concat,
        r.usuarioName_st,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(termo);
    });
  }, [reports, busca, filtroUsuario]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (pk: number) => {
    if (selectedSet.has(pk)) {
      onChange(selected.filter((s) => s !== pk));
    } else {
      onChange([...selected, pk]);
    }
  };

  const marcarVisiveis = () => {
    const ids = new Set(selected);
    filtrados.forEach((r) => ids.add(r.planoMidiaGrupo_pk));
    onChange(Array.from(ids));
  };

  const limpar = () => onChange([]);

  const resumo =
    selected.length === 0
      ? 'Selecionar roteiros'
      : selected.length === 1
      ? `1 roteiro selecionado`
      : `${selected.length} roteiros selecionados`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 h-[44px] px-4 rounded-lg border bg-white text-left transition-colors ${
          aberto
            ? 'border-[#ff4600] ring-2 ring-[#ff4600]/20'
            : 'border-[#d9d9d9] hover:border-[#bbb]'
        }`}
      >
        <span
          className={`text-sm truncate ${
            selected.length > 0 ? 'text-[#222]' : 'text-[#757575]'
          }`}
        >
          {resumo}
        </span>
        <svg
          className={`w-4 h-4 text-[#757575] transition-transform ${
            aberto ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {aberto && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#d9d9d9] rounded-lg shadow-xl z-30 max-h-[520px] flex flex-col">
          <div className="p-3 border-b border-[#ededed] flex flex-col gap-2">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por PK, nome, marca, agência, cidade..."
              className="w-full h-[36px] px-3 rounded-md border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600]/30 focus:border-[#ff4600] text-sm"
            />
            <div className="flex items-center gap-2">
              <select
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="h-[32px] px-2 rounded-md border border-[#d9d9d9] text-sm text-[#3a3a3a] flex-1"
              >
                <option value="">Todos os usuários</option>
                {usuarios.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={marcarVisiveis}
                className="text-xs px-2 py-1 rounded border border-[#d9d9d9] hover:bg-[#f8f8f8] text-[#3a3a3a]"
                disabled={filtrados.length === 0}
              >
                Marcar visíveis
              </button>
              <button
                type="button"
                onClick={limpar}
                className="text-xs px-2 py-1 rounded border border-[#d9d9d9] hover:bg-[#f8f8f8] text-[#3a3a3a]"
                disabled={selected.length === 0}
              >
                Limpar
              </button>
            </div>
            <div className="text-xs text-[#757575]">
              {filtrados.length} de {reports.length} roteiros · {selected.length} selecionados
            </div>
          </div>

          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-[#757575]">Carregando roteiros…</div>
            ) : filtrados.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#757575]">Nenhum roteiro encontrado.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#f8f8f8] text-left text-xs uppercase tracking-wide text-[#757575]">
                  <tr>
                    <th className="px-3 py-2 w-[40px]"></th>
                    <th className="px-2 py-2">PK</th>
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">Usuário</th>
                    <th className="px-2 py-2">Cidade(s)</th>
                    <th className="px-2 py-2">Sem</th>
                    <th className="px-2 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => {
                    const checked = selectedSet.has(r.planoMidiaGrupo_pk);
                    return (
                      <tr
                        key={r.planoMidiaGrupo_pk}
                        onClick={() => toggle(r.planoMidiaGrupo_pk)}
                        className={`cursor-pointer border-t border-[#f0f0f0] hover:bg-[#fafafa] ${
                          checked ? 'bg-[#fff5ef]' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggle(r.planoMidiaGrupo_pk);
                            }}
                            className="accent-[#ff4600]"
                          />
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-[#3a3a3a]">
                          {r.planoMidiaGrupo_pk}
                        </td>
                        <td className="px-2 py-2 text-[#222]">{r.planoMidiaGrupo_st}</td>
                        <td className="px-2 py-2 text-[#3a3a3a]">{r.usuarioName_st || '—'}</td>
                        <td className="px-2 py-2 text-[#3a3a3a] truncate max-w-[200px]">
                          {r.cidadeUpper_st_concat || '—'}
                        </td>
                        <td className="px-2 py-2 text-[#3a3a3a]">{r.semanasMax_vl ?? '—'}</td>
                        <td className="px-2 py-2 text-xs text-[#757575] whitespace-nowrap">
                          {formatDateBr(r.date_dh)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-2 border-t border-[#ededed] flex justify-end">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="px-3 py-1.5 text-sm rounded-md bg-[#ff4600] text-white hover:bg-[#e63d00]"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
