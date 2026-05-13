import React, { useState } from 'react';
import { LoteAnalise } from '../types';
import { StatusBadge } from './StatusBadge';
import { InventarioCompleto } from './InventarioCompleto';

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
};

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');

const dataFmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
};

const RECOMEND_CFG = {
  verde:    { color: '#15803d', bg: '#f0fdf4', border: '#86efac', label: 'PRONTO PARA APROVAÇÃO' },
  amarelo:  { color: '#b45309', bg: '#fffbeb', border: '#fcd34d', label: 'ATENÇÃO' },
  vermelho: { color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'NÃO PRONTO' },
};

interface Props {
  analise: LoteAnalise;
  onComentar: (mensagem: string) => Promise<void>;
  onAprovar: (mensagem: string) => Promise<void>;
  onPedirCorrecao: (mensagem: string) => Promise<void>;
  onRejeitar: (mensagem: string) => Promise<void>;
  acaoEmCurso: boolean;
}

export const PainelAnalise: React.FC<Props> = ({
  analise,
  onComentar,
  onAprovar,
  onPedirCorrecao,
  onRejeitar,
  acaoEmCurso,
}) => {
  const { lote, visao, qualidade, distribuicao, duplicidades, erros, sem_depara, comparativo_tipos, pracas_reconciliacao, amostra, legado, places, comentarios, veredito } = analise;
  const [mensagem, setMensagem] = useState('');
  const [confirmando, setConfirmando] = useState<null | 'aprovar' | 'corrigir' | 'rejeitar'>(null);

  const recomend = RECOMEND_CFG[veredito.recomendacao];

  const enviarComentario = async () => {
    if (!mensagem.trim()) return;
    await onComentar(mensagem.trim());
    setMensagem('');
  };

  const executarDecisao = async (tipo: 'aprovar' | 'corrigir' | 'rejeitar') => {
    if (tipo === 'aprovar') await onAprovar(mensagem.trim());
    else if (tipo === 'corrigir') await onPedirCorrecao(mensagem.trim());
    else await onRejeitar(mensagem.trim());
    setMensagem('');
    setConfirmando(null);
  };

  return (
    <div className="space-y-12">
      {/* ─────────────────────────  VEREDITO  ───────────────────────── */}
      <section
        className="rounded-2xl px-8 py-7 border"
        style={{ backgroundColor: recomend.bg, borderColor: recomend.border }}
      >
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: recomend.color }}
            >
              {veredito.recomendacao === 'verde' ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : veredito.recomendacao === 'amarelo' ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold mb-1.5" style={{ color: recomend.color }}>
              Veredito
            </p>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: recomend.color }}>{recomend.label}</h2>
            <p className="text-[15px] leading-relaxed" style={{ color: recomend.color }}>
              {veredito.recomendacao_texto}
            </p>

            {(veredito.diagnosticos.length > 0 || veredito.positivos.length > 0) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5">
                {veredito.diagnosticos.length > 0 && (
                  <div className="flex items-center gap-3 text-[13px]" style={{ color: recomend.color }}>
                    <span className="font-bold text-base">{veredito.diagnosticos.length}</span>
                    {veredito.diagnosticos.length === 1 ? 'ponto a tratar' : 'pontos a tratar'}
                    {veredito.diagnosticos.filter((d) => d.bloqueia).length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-[#b91c1c]">
                        {veredito.diagnosticos.filter((d) => d.bloqueia).length} bloqueador{veredito.diagnosticos.filter((d) => d.bloqueia).length > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                )}
                {veredito.positivos.map((p, i) => (
                  <div key={`p-${i}`} className="flex items-center gap-2 text-[13px] text-[#15803d]">
                    <span className="font-bold">✓</span>{p}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ────────────────  TIMELINE DO FLUXO  ──────────────── */}
      <section>
        <SectionTitle eyebrow="Fluxo" titulo="Onde estamos no processo" />
        <FluxoTimeline lote={lote} />
      </section>

      {/* ────────────────  PRÓXIMAS AÇÕES (diagnósticos)  ──────────────── */}
      {veredito.diagnosticos.length > 0 && (
        <section>
          <SectionTitle eyebrow="Próximas ações" titulo="O que precisa ser feito antes da aprovação" />
          <ol className="space-y-4">
            {veredito.diagnosticos.map((d, i) => {
              const cor = d.tipo === 'critico' ? '#b91c1c' : '#b45309';
              const bg = d.tipo === 'critico' ? '#fef2f2' : '#fffbeb';
              const border = d.tipo === 'critico' ? '#fecaca' : '#fed7aa';
              return (
                <li
                  key={i}
                  className="flex gap-5 p-6 rounded-2xl bg-white border"
                  style={{ borderColor: border }}
                >
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: cor }}
                    >
                      {i + 1}
                    </div>
                    {d.bloqueia && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#b91c1c] writing-mode-vertical">
                        BLOQUEIA
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="text-[16px] font-semibold" style={{ color: cor }}>
                        {d.titulo}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: '#fff', backgroundColor: d.responsavel === 'BE180' ? '#1d4ed8' : '#ff4600' }}
                        >
                          {d.responsavel === 'BE180' ? 'Time BE' : 'Exibidor'}
                        </span>
                        {d.bloqueia && (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-[#b91c1c]">
                            Bloqueia
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold">Causa</span>
                        <p className="text-[13.5px] text-gray-700 leading-relaxed mt-0.5">{d.causa}</p>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: bg }}>
                        <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: cor }}>
                          Ação recomendada
                        </span>
                        <p className="text-[13.5px] text-gray-800 leading-relaxed mt-0.5">{d.acao}</p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ──────────────────────  CABEÇALHO DO LOTE  ────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
        <Info label="Arquivo enviado" valor={lote.arquivo_st} mono />
        <Info
          label="Enviado por"
          valor={lote.uploadedBy_st || 'usuário não identificado'}
          sublabel={dataFmt(lote.dataCriacao_dh)}
        />
        <Info
          label="Exibidor"
          valor={lote.exibidor_fantasia_st || lote.exibidor_nome_st || `#${lote.exibidor_fk}`}
          sublabel={lote.exibidor_dominio_st || lote.exibidor_codigo_st || ''}
        />
      </section>

      {/* ─────────────────────────  KPIs  ───────────────────────── */}
      <section>
        <SectionTitle eyebrow="Visão geral" titulo="Volume de itens" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
          <KPI label="Total no arquivo" valor={fmt(visao.total)} bg />
          <KPI label="Ativos" valor={fmt(visao.ativos)} bg />
          <KPI label="Em análise" valor={fmt(visao.em_analise)} bg color="#b45309" />
          <KPI label="Aprovados" valor={fmt(visao.aprovados)} bg color="#15803d" />
          <KPI label="Para corrigir" valor={fmt(visao.para_corrigir)} bg color="#b91c1c" />
          <KPI label="Rejeitados" valor={fmt(visao.rejeitados)} bg />
        </div>
      </section>

      {/* ─────────────────────  QUALIDADE  ─────────────────────── */}
      <section>
        <SectionTitle eyebrow="Qualidade" titulo="Indicadores principais" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          <BigStat label="Lat / Long" pct={qualidade.geo_pct} detalhe={`${fmt(visao.com_geo)} de ${fmt(visao.ativos)}`} modo="ok" />
          <BigStat label="De-para" pct={qualidade.depara_pct} detalhe={`${fmt(visao.com_depara)} mapeados`} modo="ok" />
          <BigStat label="Sem código" pct={qualidade.sem_codigo_pct} detalhe={`${fmt(visao.sem_codigo)} itens`} modo="alerta" />
          <BigStat label="Sem valor de tabela" pct={qualidade.sem_valor_pct} detalhe={`${fmt(visao.sem_valor)} itens`} modo="alerta" />
          <BigStat label="Com erro" pct={qualidade.com_erro_pct} detalhe={`${fmt(visao.com_erro)} itens`} modo="alerta" />
        </div>

        {(visao.sem_praca || visao.sem_uf || visao.sem_ambiente || visao.sem_formato || visao.sem_tipo) ? (
          <p className="text-[13px] text-gray-500 mt-4">
            Faltantes adicionais: {[
              visao.sem_praca   && `${fmt(visao.sem_praca)} sem praça`,
              visao.sem_uf      && `${fmt(visao.sem_uf)} sem UF`,
              visao.sem_ambiente&& `${fmt(visao.sem_ambiente)} sem ambiente`,
              visao.sem_formato && `${fmt(visao.sem_formato)} sem formato`,
              visao.sem_tipo    && `${fmt(visao.sem_tipo)} sem tipo`,
            ].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </section>

      {/* ─────────────  COMPARATIVO COM LEGADO  ─────────────── */}
      {legado && (
        <section>
          <SectionTitle eyebrow="Comparativo" titulo="Versus banco de ativos atual" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-6">
            <BigNumber label="Legado válido" valor={fmt(legado.validos)} />
            <BigNumber label="Novo (ativos)" valor={fmt(visao.ativos)} />
            <BigNumber
              label="Delta"
              valor={`${visao.ativos - legado.validos > 0 ? '+' : ''}${fmt(visao.ativos - legado.validos)}`}
              cor={visao.ativos - legado.validos < 0 ? '#b91c1c' : '#15803d'}
            />
            <BigNumber label="Cidades em comum" valor={fmt(legado.cidades?.comum)} />
            <BigNumber label="Cidades só no legado" valor={fmt(legado.cidades?.apenas_legado)} cor={legado.cidades?.apenas_legado ? '#b45309' : undefined} />
          </div>

          <p className="text-[13px] text-gray-500 mb-6">
            Códigos do lote que coincidem com o legado: <strong className="text-gray-700">{fmt(legado.codigos_match)}</strong> de {fmt(legado.codigos_lote)} ({pct(legado.codigos_match, legado.codigos_lote)})
          </p>

          {legado.cidades_faltantes.length > 0 && (
            <SubCard titulo={`${legado.cidades_faltantes.length} cidades existiam no legado e não vieram no novo`} alerta>
              <Tabela
                cabecalho={['Cidade', 'UF', 'Pontos no legado']}
                linhas={legado.cidades_faltantes.map((r) => [r.cidade_st, r.estado_st, fmt(r.qtd)])}
              />
            </SubCard>
          )}
        </section>
      )}

      {/* ───────────  DISTRIBUIÇÃO GEOGRÁFICA  ──────────── */}
      <section>
        <SectionTitle eyebrow="Distribuição" titulo="Cobertura geográfica" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubCard titulo={`Por UF (${distribuicao.ufs.length})`}>
            <Tabela
              cabecalho={['UF', 'Itens', 'Praças']}
              linhas={distribuicao.ufs.map((r) => [r.uf, fmt(r.qtd), fmt(r.pracas)])}
            />
          </SubCard>
          <SubCard titulo={`Por praça (${distribuicao.pracas.length})`}>
            <Tabela
              cabecalho={['Praça', 'UF', 'Itens']}
              linhas={distribuicao.pracas.map((r) => [r.praca, r.uf, fmt(r.qtd)])}
            />
          </SubCard>
        </div>
      </section>

      {/* ───────────  RECONCILIAÇÃO DE PRAÇAS  ──────────── */}
      {pracas_reconciliacao.length > 0 && pracas_reconciliacao.some((p) => p.status !== 'match') && (
        <section>
          <SectionTitle
            eyebrow="Nomenclatura"
            titulo="Reconciliação de praças com o legado"
            descricao="Como os nomes das praças no envio podem diferir do banco atual (ex: 'Brasília Relógio' vs 'Brasília'), tentamos identificar a cidade equivalente. Decida com o exibidor se padroniza para o nome canônico ou registra como subdivisão intencional."
          />
          <SubCard>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">Praça no envio</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-16">UF</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-24">Itens</th>
                  <th className="px-5 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-32">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">Cidade equivalente no legado</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-32">Pontos no legado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pracas_reconciliacao.map((p, idx) => {
                  const cfg =
                    p.status === 'match'    ? { label: 'Match exato', color: '#15803d', bg: '#dcfce7' }
                    : p.status === 'parecida' ? { label: 'Parecida',   color: '#b45309', bg: '#fef3c7' }
                    :                            { label: 'Nova',        color: '#1d4ed8', bg: '#dbeafe' };
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-800 font-medium">{p.praca_novo}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono uppercase">{p.uf_novo || '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-600 font-mono">{fmt(p.qtd_novo)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{p.cidade_legado || '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-500 font-mono">{p.qtd_legado != null ? fmt(p.qtd_legado) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SubCard>
        </section>
      )}

      {/* ───────────  TIPOS DE MÍDIA  ──────────── */}
      <section>
        <SectionTitle eyebrow="Tipos de mídia" titulo="Ambiente e formato no envio" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubCard titulo="Ambiente">
            <Tabela
              cabecalho={['Ambiente', 'Itens', 'Mapeados']}
              linhas={distribuicao.ambientes.map((r) => [r.ambiente, fmt(r.qtd), fmt(r.mapeados)])}
            />
          </SubCard>
          <SubCard titulo="Formato">
            <Tabela
              cabecalho={['Formato', 'Itens']}
              linhas={distribuicao.formatos.map((r) => [r.formato, fmt(r.qtd)])}
            />
          </SubCard>
        </div>
      </section>

      {/* ───────────  COMPARATIVO DE TIPOS NOVO ↔ LEGADO  ──────────── */}
      {comparativo_tipos.length > 0 && (
        <section>
          <SectionTitle
            eyebrow="Mapeamento de tipos"
            titulo="Tipos do envio vs banco atual"
            descricao="Para cada tipo de mídia trazido no envio, comparamos com o tipo equivalente no banco de ativos atual. A coluna “Sugestão” é uma heurística por palavras-chave para acelerar o cadastro de regras de-para."
          />
          <SubCard>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">
                    Tipo no envio
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-32">
                    Itens
                  </th>
                  <th className="px-3 text-center text-gray-300">→</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">
                    Sugestão (banco atual)
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold w-32">
                    Pontos no legado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparativo_tipos.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-800 font-medium">{c.tipo_novo}</td>
                    <td className="px-5 py-3 text-right text-gray-600 font-mono">{fmt(c.qtd_novo)}</td>
                    <td className="px-3 text-center text-gray-300">→</td>
                    <td className="px-5 py-3">
                      {c.sugestao_legado ? (
                        <span className="text-gray-700">{c.sugestao_legado.tipo}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[#b91c1c] bg-red-50">
                          Sem equivalente — tipo novo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 font-mono">
                      {c.sugestao_legado ? fmt(c.sugestao_legado.qtd) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SubCard>
        </section>
      )}

      {/* ───────────  GAP DE-PARA  ──────────── */}
      {sem_depara.length > 0 && (
        <section>
          <SectionTitle
            eyebrow="Mapeamento"
            titulo="Combinações sem de-para cadastrado"
            alerta
            descricao="Estas combinações precisam ter regras de-para cadastradas antes da aprovação para integrar com a nomenclatura padrão do produto."
          />
          <SubCard alerta titulo={`${sem_depara.length} combinações distintas`}>
            <Tabela
              cabecalho={['Ambiente', 'Formato', 'Tipo', 'Itens']}
              linhas={sem_depara.map((r) => [r.ambiente, r.formato, r.tipo, fmt(r.qtd)])}
            />
          </SubCard>
        </section>
      )}

      {/* ───────────  DUPLICIDADES + ERROS  ──────────── */}
      {(duplicidades.length > 0 || erros.length > 0) && (
        <section>
          <SectionTitle eyebrow="Problemas" titulo="Itens com inconsistência" alerta />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {duplicidades.length > 0 && (
              <SubCard titulo={`${duplicidades.length} códigos duplicados`} alerta>
                <Tabela cabecalho={['Código', 'Repetições']} linhas={duplicidades.map((r) => [r.codigo_ativo_st, fmt(r.qtd)])} />
              </SubCard>
            )}
            {erros.length > 0 && (
              <SubCard titulo={`${erros.length} erros de validação`} alerta>
                <Tabela cabecalho={['Item', 'Código', 'Erro']} linhas={erros.map((r) => [`#${r.item_pk}`, r.codigo_ativo_st, r.erroValidacao_st])} />
              </SubCard>
            )}
          </div>
        </section>
      )}

      {/* ───────────  AMOSTRA  ──────────── */}
      <section>
        <SectionTitle eyebrow="Amostra" titulo="Primeiros 10 itens" descricao="Visão rápida para conferência. Para inspecionar o envio inteiro, use a seção “Inventário completo” logo abaixo." />
        <SubCard>
          <Tabela
            cabecalho={['Item', 'Código', 'Praça', 'UF', 'Tipo', 'Lat / Long', 'Valor']}
            linhas={amostra.map((r) => [
              `#${r.item_pk}`,
              r.codigo_ativo_st,
              r.praca_st || '—',
              r.uf_st || '—',
              r.tipo_midia_st || '—',
              r.latitude && r.longitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : '—',
              r.valor_tabela_vl ? `R$ ${Number(r.valor_tabela_vl).toFixed(2)}` : '—',
            ])}
          />
        </SubCard>
      </section>

      {/* ───────────  INVENTÁRIO COMPLETO  ──────────── */}
      <section>
        <SectionTitle eyebrow="Inventário completo" titulo="Todos os itens enviados" descricao="Tabela paginada com busca, filtros rápidos (sem geo, sem de-para, sem código, sem valor, com erro) e exportação CSV." />
        <InventarioCompleto
          lotePk={lote.lote_pk}
          totalAtivos={visao.ativos}
          semGeo={visao.sem_geo}
          semDePara={visao.sem_depara}
          semCodigo={visao.sem_codigo}
          semValor={visao.sem_valor}
          comErro={visao.com_erro}
        />
      </section>

      {/* ───────────  PLACES  ──────────── */}
      {places.total > 0 && (
        <section>
          <SectionTitle eyebrow="Enriquecimento" titulo="Google Places" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <BigNumber label="Total enfileirado" valor={fmt(places.total)} />
            <BigNumber label="Pendente" valor={fmt(places.pendente)} cor="#b45309" />
            <BigNumber label="Processando" valor={fmt(places.processando)} cor="#1d4ed8" />
            <BigNumber label="Concluído" valor={fmt(places.concluido)} cor="#15803d" />
            <BigNumber label="Erro" valor={fmt(places.erro)} cor="#b91c1c" />
          </div>
        </section>
      )}

      {/* ───────────  CONVERSA  ──────────── */}
      <section>
        <SectionTitle eyebrow="Conversa" titulo={`Comentários (${comentarios.length})`} />
        <div className="rounded-2xl border border-gray-200 bg-white">
          {comentarios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhuma mensagem ainda — comece a conversa abaixo.</p>
          ) : (
            <div className="p-6 space-y-5 max-h-[480px] overflow-auto">
              {comentarios.map((c) => {
                const isExibidor = c.autor_st === 'Exibidor';
                return (
                  <div key={c.comentario_pk} className={`flex gap-3 ${isExibidor ? '' : 'flex-row-reverse'}`}>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      isExibidor ? 'bg-gray-200 text-gray-600' : 'bg-[#ff4600] text-white'
                    }`}>
                      {c.autor_st.slice(0, 1).toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] flex flex-col gap-1 ${isExibidor ? 'items-start' : 'items-end'}`}>
                      <div className={`rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                        isExibidor ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#ff4600] text-white rounded-tr-sm'
                      }`}>
                        {c.mensagem_st}
                      </div>
                      <p className="text-[10px] text-gray-400 px-1">
                        {c.autor_st} · {dataFmt(c.dataCriacao_dh)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ───────────  AÇÕES  ──────────── */}
      <section className="sticky bottom-6 z-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-bold">Decisão</p>
            <StatusBadge status={lote.status_st} />
          </div>
          <textarea
            rows={3}
            className="w-full text-sm rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-gray-400 focus:bg-white transition-colors resize-none"
            placeholder="Mensagem para o exibidor (obrigatória ao pedir correção ou rejeitar)..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            disabled={acaoEmCurso}
          />
          {veredito.diagnosticos.length > 0 && (
            <p className="text-[11px] text-gray-500 -mt-2">
              Ao pedir correção, o plano detalhado com os {veredito.diagnosticos.length} pontos identificados será anexado
              automaticamente ao chat do exibidor (com causa e ação para cada item).
            </p>
          )}

          {confirmando === 'corrigir' && (
            <div className="text-[13px] bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-gray-800">
                <strong>Confirma pedir correção</strong> deste lote?
              </p>
              {veredito.diagnosticos.length > 0 ? (
                <p className="text-gray-700">
                  O <strong>plano de correção detalhado</strong> com{' '}
                  <strong>{veredito.diagnosticos.length} {veredito.diagnosticos.length === 1 ? 'ponto' : 'pontos'}</strong>
                  {veredito.diagnosticos.filter((d) => d.bloqueia).length > 0 && (
                    <> ({veredito.diagnosticos.filter((d) => d.bloqueia).length} bloqueador
                    {veredito.diagnosticos.filter((d) => d.bloqueia).length > 1 ? 'es' : ''})</>
                  )}
                  {' '}será enviado <strong>automaticamente no chat do exibidor</strong> com causa e ação para cada item.
                </p>
              ) : (
                <p className="text-gray-700">A mensagem digitada acima será enviada ao exibidor.</p>
              )}
              {!mensagem.trim() && (
                <p className="text-red-600">É obrigatório informar uma mensagem (pode ser um resumo, o detalhamento vai automático).</p>
              )}
            </div>
          )}

          {confirmando === 'rejeitar' && (
            <div className="text-[13px] text-gray-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <strong>Confirma rejeitar</strong> este lote? O envio será descartado e o exibidor receberá sua mensagem no chat.
              {!mensagem.trim() && (
                <p className="text-red-600 mt-1">É obrigatório informar uma mensagem.</p>
              )}
            </div>
          )}

          {confirmando === 'aprovar' && (
            <div className="text-[13px] text-gray-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <strong>Confirma aprovar</strong> este lote? Será marcado como APROVADO e o exibidor verá no chat.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={enviarComentario}
              disabled={acaoEmCurso || !mensagem.trim()}
              className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Enviar comentário
            </button>

            <div className="flex items-center gap-2">
              {confirmando ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmando(null)}
                    disabled={acaoEmCurso}
                    className="px-3 py-2.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => executarDecisao(confirmando)}
                    disabled={acaoEmCurso || ((confirmando === 'corrigir' || confirmando === 'rejeitar') && !mensagem.trim())}
                    className={`px-5 py-2.5 text-sm rounded-lg text-white font-semibold disabled:opacity-50 ${
                      confirmando === 'aprovar' ? 'bg-[#16a34a] hover:bg-[#15803d]' :
                      confirmando === 'corrigir' ? 'bg-[#d97706] hover:bg-[#b45309]' :
                      'bg-[#dc2626] hover:bg-[#b91c1c]'
                    }`}
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmando('rejeitar')}
                    disabled={acaoEmCurso || lote.status_st === 'REJEITADO'}
                    className="px-4 py-2.5 text-sm rounded-lg border border-[#dc2626] text-[#dc2626] hover:bg-red-50 disabled:opacity-40 font-semibold"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando('corrigir')}
                    disabled={acaoEmCurso || lote.status_st === 'PARA_CORRIGIR'}
                    className="px-4 py-2.5 text-sm rounded-lg border border-[#d97706] text-[#d97706] hover:bg-orange-50 disabled:opacity-40 font-semibold"
                  >
                    Pedir correção
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando('aprovar')}
                    disabled={acaoEmCurso || lote.status_st === 'APROVADO'}
                    className="px-5 py-2.5 text-sm rounded-lg bg-[#16a34a] text-white font-semibold hover:bg-[#15803d] disabled:opacity-40"
                  >
                    Aprovar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ─────────────────  AUXILIARES VISUAIS  ─────────────────────

const SectionTitle: React.FC<{ eyebrow: string; titulo: string; alerta?: boolean; descricao?: string }> = ({ eyebrow, titulo, alerta, descricao }) => (
  <header className="mb-5">
    <p className={`text-[11px] uppercase tracking-[0.18em] font-bold mb-1 ${alerta ? 'text-[#b91c1c]' : 'text-[#ff4600]'}`}>
      {eyebrow}
    </p>
    <h2 className="text-2xl font-light text-[#1a1a1a]">{titulo}</h2>
    {descricao && <p className="text-[14px] text-gray-500 mt-2 max-w-2xl leading-relaxed">{descricao}</p>}
  </header>
);

const Info: React.FC<{ label: string; valor: string; sublabel?: string; mono?: boolean }> = ({ label, valor, sublabel, mono }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold">{label}</span>
    <span className={`text-[15px] text-[#1a1a1a] font-medium ${mono ? 'font-mono break-all' : ''}`}>{valor}</span>
    {sublabel && <span className="text-[12px] text-gray-500">{sublabel}</span>}
  </div>
);

const KPI: React.FC<{ label: string; valor: string; bg?: boolean; color?: string }> = ({ label, valor, bg, color }) => (
  <div className={`flex flex-col gap-1 px-6 py-5 ${bg ? 'bg-white' : ''}`}>
    <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">{label}</span>
    <span className="text-3xl font-light" style={{ color: color || '#1a1a1a' }}>{valor}</span>
  </div>
);

const BigNumber: React.FC<{ label: string; valor: string; cor?: string }> = ({ label, valor, cor }) => (
  <div className="flex flex-col gap-1 px-5 py-4 rounded-xl bg-white border border-gray-200">
    <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">{label}</span>
    <span className="text-2xl font-light" style={{ color: cor || '#1a1a1a' }}>{valor}</span>
  </div>
);

const BigStat: React.FC<{ label: string; pct: number; detalhe: string; modo: 'ok' | 'alerta' }> = ({ label, pct, detalhe, modo }) => {
  let cor = '#dc2626';
  let bg = '#fee2e2';
  let etiqueta = 'CRÍTICO';
  if (modo === 'ok') {
    if (pct >= 95)      { cor = '#15803d'; bg = '#dcfce7'; etiqueta = 'OK'; }
    else if (pct >= 70) { cor = '#b45309'; bg = '#fef3c7'; etiqueta = 'ATENÇÃO'; }
  } else {
    if (pct === 0)      { cor = '#15803d'; bg = '#dcfce7'; etiqueta = 'OK'; }
    else if (pct <= 5)  { cor = '#b45309'; bg = '#fef3c7'; etiqueta = 'ATENÇÃO'; }
  }
  return (
    <div className="flex flex-col gap-2 p-5 rounded-xl bg-white border border-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">{label}</span>
        <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider" style={{ color: cor, backgroundColor: bg }}>
          {etiqueta}
        </span>
      </div>
      <span className="text-3xl font-light" style={{ color: cor }}>{pct.toFixed(1)}%</span>
      <span className="text-[12px] text-gray-500">{detalhe}</span>
    </div>
  );
};

const SubCard: React.FC<{ titulo?: string; alerta?: boolean; children: React.ReactNode }> = ({ titulo, alerta, children }) => (
  <div className={`rounded-xl border bg-white overflow-hidden ${alerta ? 'border-red-200' : 'border-gray-200'}`}>
    {titulo && (
      <div className={`px-5 py-3 text-[11px] uppercase tracking-[0.15em] font-bold border-b ${
        alerta ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'
      }`}>
        {titulo}
      </div>
    )}
    <div className="overflow-auto max-h-[400px]">{children}</div>
  </div>
);

// ─────────────────  TIMELINE DO FLUXO  ─────────────────────

type EtapaEstado = 'feito' | 'atual' | 'futuro' | 'pulado' | 'falhou';

interface Etapa {
  numero: number;
  titulo: string;
  subtitulo: string;
  estado: EtapaEstado;
  detalhe?: string;
}

const FluxoTimeline: React.FC<{ lote: LoteAnalise['lote'] }> = ({ lote }) => {
  const status = lote.status_st;
  const dataEnvio = lote.dataCriacao_dh ? dataFmt(lote.dataCriacao_dh) : '—';
  const dataDecisao = lote.dataAtualizacao_dh && status !== 'EM_ANALISE' ? dataFmt(lote.dataAtualizacao_dh) : null;
  const remetente = lote.uploadedBy_st || 'usuário não identificado';

  const etapa2: EtapaEstado =
    status === 'EM_ANALISE'      ? 'atual'
    : status === 'PARA_CORRIGIR'  ? 'feito'
    : 'feito';

  const etapa3: EtapaEstado =
    status === 'EM_ANALISE'      ? 'futuro'
    : status === 'PARA_CORRIGIR'  ? 'atual'
    : status === 'APROVADO'       ? 'feito'
    : 'falhou';

  const etapa4: EtapaEstado =
    status === 'APROVADO' ? 'feito'
    : status === 'REJEITADO' ? 'pulado'
    : 'futuro';

  const etapa5: EtapaEstado =
    status === 'APROVADO' ? 'futuro'    // próximo épico
    : status === 'REJEITADO' ? 'pulado'
    : 'futuro';

  const etapas: Etapa[] = [
    {
      numero: 1,
      titulo: 'Envio do exibidor',
      subtitulo: dataEnvio,
      estado: 'feito',
      detalhe: `Por ${remetente}`,
    },
    {
      numero: 2,
      titulo: 'Análise pela BE',
      subtitulo:
        status === 'EM_ANALISE' ? 'Em curso agora'
        : status === 'PARA_CORRIGIR' ? 'Análise concluída'
        : 'Análise concluída',
      estado: etapa2,
      detalhe: status === 'EM_ANALISE' ? 'Aguardando decisão' : undefined,
    },
    {
      numero: 3,
      titulo:
        status === 'APROVADO'      ? 'Aprovado'
        : status === 'REJEITADO'    ? 'Rejeitado'
        : status === 'PARA_CORRIGIR' ? 'Em correção pelo exibidor'
        : 'Decisão',
      subtitulo: dataDecisao || 'Aprovar / Pedir correção / Rejeitar',
      estado: etapa3,
      detalhe:
        status === 'PARA_CORRIGIR' ? 'Lote volta para análise após reenvio'
        : status === 'APROVADO' ? 'Lote validado pela BE'
        : status === 'REJEITADO' ? 'Envio descartado'
        : undefined,
    },
    {
      numero: 4,
      titulo: 'Aprovação final',
      subtitulo: status === 'APROVADO' ? 'Lote aprovado' : 'Aguarda decisão favorável',
      estado: etapa4,
    },
    {
      numero: 5,
      titulo: 'Integração ao banco',
      subtitulo: 'Substituição/atualização do banco de ativos',
      estado: etapa5,
      detalhe: 'Próximo épico — em desenvolvimento',
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-4 relative">
        {etapas.map((etapa, idx) => (
          <EtapaCard key={etapa.numero} etapa={etapa} ehUltimo={idx === etapas.length - 1} />
        ))}
      </div>
    </div>
  );
};

const ESTADO_CFG: Record<EtapaEstado, { circuloBg: string; circuloTxt: string; tituloCor: string; linha: string; selo?: { label: string; cor: string; bg: string } }> = {
  feito:   { circuloBg: '#16a34a', circuloTxt: '#fff',    tituloCor: '#1a1a1a', linha: '#16a34a' },
  atual:   { circuloBg: '#ff4600', circuloTxt: '#fff',    tituloCor: '#ff4600', linha: '#e5e7eb', selo: { label: 'Etapa atual', cor: '#fff', bg: '#ff4600' } },
  futuro:  { circuloBg: '#f3f4f6', circuloTxt: '#9ca3af', tituloCor: '#9ca3af', linha: '#e5e7eb' },
  pulado:  { circuloBg: '#f3f4f6', circuloTxt: '#9ca3af', tituloCor: '#cbd5e1', linha: '#e5e7eb', selo: { label: 'Não se aplica', cor: '#6b7280', bg: '#f3f4f6' } },
  falhou:  { circuloBg: '#dc2626', circuloTxt: '#fff',    tituloCor: '#dc2626', linha: '#dc2626' },
};

const EtapaCard: React.FC<{ etapa: Etapa; ehUltimo: boolean }> = ({ etapa, ehUltimo }) => {
  const cfg = ESTADO_CFG[etapa.estado];

  const icone = (() => {
    if (etapa.estado === 'feito') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (etapa.estado === 'falhou') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return <span className="font-bold text-sm">{etapa.numero}</span>;
  })();

  return (
    <div className="relative flex flex-col items-center text-center px-2">
      {/* linha conectora à direita */}
      {!ehUltimo && (
        <div
          className="hidden md:block absolute top-5 left-1/2 right-[-50%] h-px"
          style={{ backgroundColor: cfg.linha, zIndex: 0 }}
        />
      )}

      {/* círculo */}
      <div
        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-3 ${etapa.estado === 'atual' ? 'ring-4 ring-orange-100' : ''}`}
        style={{ backgroundColor: cfg.circuloBg, color: cfg.circuloTxt }}
      >
        {icone}
      </div>

      {/* selo */}
      {cfg.selo && (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-2"
          style={{ color: cfg.selo.cor, backgroundColor: cfg.selo.bg }}>
          {cfg.selo.label}
        </span>
      )}

      {/* título */}
      <p className="text-[13px] font-semibold leading-tight" style={{ color: cfg.tituloCor }}>
        {etapa.titulo}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">{etapa.subtitulo}</p>
      {etapa.detalhe && (
        <p className={`text-[10px] mt-1.5 ${etapa.estado === 'atual' ? 'text-[#ff4600] font-semibold' : 'text-gray-400'}`}>
          {etapa.detalhe}
        </p>
      )}
    </div>
  );
};

const Tabela: React.FC<{ cabecalho: string[]; linhas: (string | number)[][] }> = ({ cabecalho, linhas }) => (
  <table className="w-full text-[13px]">
    <thead className="sticky top-0 bg-gray-50 z-10">
      <tr>
        {cabecalho.map((h, i) => (
          <th key={i} className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {linhas.map((linha, idx) => (
        <tr key={idx} className="hover:bg-gray-50 transition-colors">
          {linha.map((cell, j) => (
            <td key={j} className="px-5 py-2.5 text-gray-700">{String(cell ?? '—')}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
