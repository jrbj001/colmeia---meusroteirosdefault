import type { Resultado } from "../types";

const fmt = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

const th = "px-3 py-2 text-xs font-semibold text-sub bg-gray-50 border border-gray-200 whitespace-nowrap";
const td = "px-3 py-1.5 text-sm border border-gray-200 text-right tabular-nums whitespace-nowrap";
const tdL = "px-3 py-1.5 text-sm border border-gray-200 text-left font-medium whitespace-nowrap";
const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Resultados({ data }: { data: Resultado }) {
  const pracas = [...new Set(data.agregado.map((a) => a.praca_st))];
  const aggCell = (p: string, w: number) => data.agregado.find((a) => a.praca_st === p && a.semana_vl === w);
  const detCell = (linhaPk: number, w: number) =>
    data.detalhe.find((d) => d.linha_pk === linhaPk && d.semana_vl === w);

  const weekTable = (
    label: string,
    rows: { lbl: string; get: (w: number) => number | null | undefined; dec?: number; pct?: boolean }[]
  ) => (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className={th + " text-left"}>{label}</th>
            {WEEKS.map((w) => <th key={w} className={th}>W{w}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lbl} className="hover:bg-orange-50/40">
              <td className={tdL}>{r.lbl}</td>
              {WEEKS.map((w) => {
                const v = r.get(w);
                return <td key={w} className={td}>{r.pct ? (v == null ? "—" : fmt(v * 100, r.dec ?? 3) + "%") : fmt(v, r.dec)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {/* Por ambiente (espelha cada bloco da aba Resultados) */}
      {data.config.map((c, i) => {
        const d = data.deflatores.find((x) => x.linha_pk === c.linha_pk);
        const dd = data.detalhe.find((x) => x.linha_pk === c.linha_pk && x.semana_vl === 1);
        const chip = (k: string, v: string, accent = false) => (
          <span className={"inline-flex flex-col px-2.5 py-1 rounded border " +
            (accent ? "border-brand/40 bg-orange-50" : "border-gray-200 bg-gray-50")}>
            <span className="text-[10px] text-sub uppercase tracking-wide">{k}</span>
            <span className="text-sm font-semibold text-ink tabular-nums">{v}</span>
          </span>
        );
        return (
        <div key={c.linha_pk} className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 mb-4">
          <h3 className="text-sm font-bold text-ink mb-3">
            <span className="text-brand">Ambiente {i + 1}</span> · {c.ambiente}
            {c.shopping ? <span className="text-sub font-normal"> · {c.shopping}</span> : null}
            <span className="text-sub font-normal"> · {c.tipo}</span>
          </h3>

          {d && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sub mb-1.5">Deflatores aplicados</div>
              <div className="flex flex-wrap gap-2">
                {chip("Passantes", fmt(d.passantes_vl, 0), true)}
                {chip("IPV ambiente", fmt(d.ipv_vl, 2), true)}
                {chip("Freq base" + (d.regiaoTgi_st ? ` · ${d.regiaoTgi_st}` : ""), fmt(d.freqBase_vl, 2))}
                {chip("× Concentração", fmt(d.defConcentracao_vl, 2))}
                {chip("× Tamanho" + (d.tamanhoEfetivo_st ? ` (${d.tamanhoEfetivo_st})` : ""), fmt(d.defTamanho_vl, 2))}
                {chip("× Visualização", fmt(d.defVisualizacao_vl, 2))}
                {chip("× Digital", fmt(d.defDigital_vl, 2))}
                {chip("IPV aj. shopping", fmt(dd?.ipvAjustadoShopping_vl, 3))}
                {chip("IPV aj. demais", fmt(dd?.ipvAjustadoDemais_vl, 3))}
              </div>
              <p className="text-[11px] text-sub mt-2 leading-relaxed">
                <b>impacto</b> = passantes × IPV × localidades × digital &nbsp;·&nbsp;
                <b>freq</b> = máx(1, freq base × concentração × tamanho × visualização × digital) &nbsp;·&nbsp;
                <b>cobertura</b> = impacto / freq / 7
                <br />
                <b>IPV ajustado</b> = (deflatores aplicados) ÷ régua máxima (3,92 shopping · 1,96 demais) — diagnóstico, 1,0 = teto (campos N/O da planilha)
              </p>
            </div>
          )}

          {weekTable("Métrica", [
            { lbl: "Impacto IPV semanal", get: (w) => detCell(c.linha_pk, w)?.impacto_vl, dec: 0 },
            { lbl: "Cobertura dia", get: (w) => detCell(c.linha_pk, w)?.cobertura_vl, dec: 0 },
            { lbl: "Frequência", get: (w) => detCell(c.linha_pk, w)?.frequencia_vl, dec: 2 },
          ])}
        </div>
        );
      })}

      {/* Agregado por praça (soma dos ambientes) */}
      {pracas.map((p) => (
        <div key={p} className="rounded-lg border-2 border-brand/30 bg-white shadow-sm p-4 mb-4">
          <h3 className="text-sm font-bold text-ink mb-1">Total agregado · <span className="text-brand">{p}</span></h3>
          <p className="text-xs text-sub mb-3">soma de todos os ambientes (espelha o topo da aba “Resultados”)</p>
          {weekTable("Métrica", [
            { lbl: "Impacto IPV semanal", get: (w) => aggCell(p, w)?.impactoTotal_vl, dec: 0 },
            { lbl: "Cobertura dia", get: (w) => aggCell(p, w)?.coberturaTotal_vl, dec: 0 },
            { lbl: "Frequência", get: (w) => aggCell(p, w)?.frequencia_vl, dec: 2 },
            { lbl: "% Cobertura", get: (w) => aggCell(p, w)?.pctCobertura_vl, pct: true, dec: 3 },
          ])}
        </div>
      ))}
    </>
  );
}
