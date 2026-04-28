import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../../config/axios';

export interface PontoRef {
  origem: 'legado' | 'exibidor';
  pk: number;
}

interface DrawerDetalhePontoProps {
  ponto: PontoRef | null;
  onClose: () => void;
}

interface DetalheLegado {
  pk: number;
  code: string;
  cidade_st: string | null;
  estado_st: string | null;
  bairro_st: string | null;
  exibidor_st: string | null;
  tipoMidia_st: string | null;
  environment_st: string | null;
  media_format_st: string | null;
  grupo_st: string | null;
  grupoSub_st: string | null;
  categoria_st: string | null;
  latitude: number | null;
  longitude: number | null;
  passantes_vl: number;
  impactos_vl: number;
  rating_st: string | null;
}

interface DetalheExibidor {
  pk: number;
  code: string;
  nome_fantasia_st: string | null;
  latitude: number | null;
  longitude: number | null;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  mapped_ambiente_st: string | null;
  mapped_formato_st: string | null;
  mapped_tipo_st: string | null;
  mapped_bl: boolean;
  valor_tabela_vl: number | null;
  periodo_tabela_st: string | null;
  area_total_largura_vl: number | null;
  area_total_altura_vl: number | null;
  area_total_unidade_st: string | null;
  area_visual_largura_vl: number | null;
  area_visual_altura_vl: number | null;
  area_visual_unidade_st: string | null;
  substrato_st: string | null;
  especificacoes_st: string | null;
  secundagem_st: string | null;
  observacoes_st: string | null;
  status_st: string;
  erroValidacao_st: string | null;
  lote_pk: number;
  lote_arquivo_st: string;
  lote_dataCriacao_dh: string;
}

const Field: React.FC<{ label: string; value?: React.ReactNode; full?: boolean }> = ({ label, value, full }) => (
  <div className={full ? 'col-span-2' : ''}>
    <div className="text-[10px] uppercase tracking-wider text-[#888] font-semibold">{label}</div>
    <div className="text-sm text-[#222] mt-0.5 break-words">{value === null || value === undefined || value === '' ? '—' : value}</div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-5">
    <h4 className="text-xs font-bold text-[#3a3a3a] uppercase tracking-wide mb-2 pb-1 border-b border-[#eee]">{title}</h4>
    <div className="grid grid-cols-2 gap-3">{children}</div>
  </section>
);

const BadgeOrigem: React.FC<{ origem: 'legado' | 'exibidor' }> = ({ origem }) => {
  if (origem === 'legado') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#eaf1ff] text-[#0848bd] border border-[#c7d8ff]">
        Legado BE180
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#fff3eb] text-[#c63a00] border border-[#ffd0b8]">
      Enviado por mim
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; fg: string; border: string }> = {
    APROVADO: { bg: '#e7f7ed', fg: '#127436', border: '#bce5cb' },
    EM_ANALISE: { bg: '#fff7e0', fg: '#8a5a00', border: '#f5dd9b' },
    PARA_CORRIGIR: { bg: '#fdecec', fg: '#8a1f1f', border: '#f4caca' },
  };
  const c = map[status] || { bg: '#eee', fg: '#444', border: '#ddd' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const DrawerDetalhePonto: React.FC<DrawerDetalhePontoProps> = ({ ponto, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [legado, setLegado] = useState<DetalheLegado | null>(null);
  const [exibidor, setExibidor] = useState<DetalheExibidor | null>(null);

  useEffect(() => {
    if (!ponto) return;
    let mounted = true;
    setLoading(true);
    setErro(null);
    setLegado(null);
    setExibidor(null);

    api
      .get('/exibidor-inventario', { params: { mode: 'detalhe-ponto', origem: ponto.origem, pk: ponto.pk } })
      .then(({ data }) => {
        if (!mounted) return;
        if (data.origem === 'legado') setLegado(data.data);
        else setExibidor(data.data);
      })
      .catch((err) => {
        if (!mounted) return;
        setErro(err?.response?.data?.error || err?.message || 'Erro ao carregar detalhes');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [ponto]);

  if (!ponto) return null;

  const lat = legado?.latitude ?? exibidor?.latitude ?? null;
  const lng = legado?.longitude ?? exibidor?.longitude ?? null;
  const code = legado?.code ?? exibidor?.code ?? '';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/35 z-[1100] transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-[1101] shadow-2xl flex flex-col"
        style={{ animation: 'slide-in .25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <style>{`@keyframes slide-in { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

        <header className="px-5 py-4 border-b border-[#eee] flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BadgeOrigem origem={ponto.origem} />
              {exibidor ? <StatusBadge status={exibidor.status_st} /> : null}
            </div>
            <h2 className="text-lg font-bold text-[#222]">{code || `Ponto #${ponto.pk}`}</h2>
            {exibidor?.nome_fantasia_st ? (
              <p className="text-xs text-[#666] mt-0.5">{exibidor.nome_fantasia_st}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-[#222] text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-5">
          {loading ? (
            <div className="text-sm text-[#666]">Carregando detalhes...</div>
          ) : erro ? (
            <div className="text-sm text-[#7f1d1d] bg-[#fff5f5] border border-[#f4caca] p-3 rounded-lg">{erro}</div>
          ) : (
            <>
              {lat !== null && lng !== null ? (
                <div className="rounded-xl overflow-hidden border border-[#eee] mb-5" style={{ height: 180 }}>
                  <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap &copy; CARTO'
                    />
                    <CircleMarker
                      center={[lat, lng]}
                      radius={9}
                      pathOptions={{ fillColor: ponto.origem === 'exibidor' ? '#ff4600' : '#0a52e6', color: '#fff', weight: 2, fillOpacity: 0.9 }}
                    />
                  </MapContainer>
                </div>
              ) : null}

              {legado ? (
                <>
                  <Section title="Identificação">
                    <Field label="Código" value={legado.code} />
                    <Field label="Exibidor" value={legado.exibidor_st} />
                  </Section>

                  <Section title="Localização">
                    <Field label="Cidade" value={legado.cidade_st} />
                    <Field label="UF" value={legado.estado_st} />
                    <Field label="Bairro" value={legado.bairro_st} full />
                    <Field label="Latitude" value={legado.latitude?.toFixed(6)} />
                    <Field label="Longitude" value={legado.longitude?.toFixed(6)} />
                  </Section>

                  <Section title="Mídia">
                    <Field label="Tipo" value={legado.tipoMidia_st} />
                    <Field label="Ambiente" value={legado.environment_st} />
                    <Field label="Formato" value={legado.media_format_st} />
                    <Field label="Categoria" value={legado.categoria_st} />
                    <Field label="Grupo" value={legado.grupo_st} />
                    <Field label="Subgrupo" value={legado.grupoSub_st} />
                  </Section>

                  <Section title="Audiência (BE180)">
                    <Field label="Passantes" value={Math.round(legado.passantes_vl).toLocaleString('pt-BR')} />
                    <Field label="Impactos IPV" value={Math.round(legado.impactos_vl).toLocaleString('pt-BR')} />
                    <Field label="Rating" value={legado.rating_st} full />
                  </Section>
                </>
              ) : null}

              {exibidor ? (
                <>
                  <Section title="Identificação">
                    <Field label="Código" value={exibidor.code} />
                    <Field label="Nome fantasia" value={exibidor.nome_fantasia_st} />
                  </Section>

                  <Section title="Localização">
                    <Field label="Latitude" value={exibidor.latitude?.toFixed(6)} />
                    <Field label="Longitude" value={exibidor.longitude?.toFixed(6)} />
                  </Section>

                  <Section title="Mídia (informada)">
                    <Field label="Ambiente" value={exibidor.ambiente_st} />
                    <Field label="Formato" value={exibidor.formato_midia_st} />
                    <Field label="Tipo" value={exibidor.tipo_midia_st} />
                  </Section>

                  {exibidor.mapped_bl ? (
                    <Section title="Mídia (mapeada — de-para)">
                      <Field label="Ambiente" value={exibidor.mapped_ambiente_st} />
                      <Field label="Formato" value={exibidor.mapped_formato_st} />
                      <Field label="Tipo" value={exibidor.mapped_tipo_st} />
                    </Section>
                  ) : (
                    <div className="text-xs text-[#8a5a00] bg-[#fff7e0] border border-[#f5dd9b] rounded-lg p-2 mb-5">
                      ⚠ Sem de-para de mídia cadastrado — pendente de mapeamento.
                    </div>
                  )}

                  <Section title="Comercial">
                    <Field
                      label="Valor de tabela"
                      value={
                        exibidor.valor_tabela_vl
                          ? `R$ ${Number(exibidor.valor_tabela_vl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : null
                      }
                    />
                    <Field label="Período" value={exibidor.periodo_tabela_st} />
                    <Field label="Secundagem" value={exibidor.secundagem_st} />
                    <Field label="Substrato" value={exibidor.substrato_st} />
                  </Section>

                  <Section title="Dimensões">
                    <Field
                      label="Área total"
                      value={
                        exibidor.area_total_largura_vl
                          ? `${exibidor.area_total_largura_vl} × ${exibidor.area_total_altura_vl} ${exibidor.area_total_unidade_st || ''}`
                          : null
                      }
                    />
                    <Field
                      label="Área visual"
                      value={
                        exibidor.area_visual_largura_vl
                          ? `${exibidor.area_visual_largura_vl} × ${exibidor.area_visual_altura_vl} ${exibidor.area_visual_unidade_st || ''}`
                          : null
                      }
                    />
                  </Section>

                  {exibidor.especificacoes_st ? (
                    <Section title="Especificações">
                      <Field label="Detalhes" value={exibidor.especificacoes_st} full />
                    </Section>
                  ) : null}

                  {exibidor.observacoes_st ? (
                    <Section title="Observações">
                      <Field label="Texto" value={exibidor.observacoes_st} full />
                    </Section>
                  ) : null}

                  <Section title="Origem do dado">
                    <Field label="Lote" value={`#${exibidor.lote_pk}`} />
                    <Field label="Arquivo" value={exibidor.lote_arquivo_st} />
                    <Field
                      label="Enviado em"
                      value={new Date(exibidor.lote_dataCriacao_dh).toLocaleDateString('pt-BR')}
                      full
                    />
                  </Section>

                  {exibidor.erroValidacao_st ? (
                    <div className="text-xs text-[#7f1d1d] bg-[#fdecec] border border-[#f4caca] rounded-lg p-2">
                      <strong>Validação:</strong> {exibidor.erroValidacao_st}
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-[#eee] bg-[#fafafa] text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 border border-[#ddd] rounded-lg hover:bg-white"
          >
            Fechar
          </button>
        </footer>
      </aside>
    </>
  );
};
