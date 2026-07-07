import * as XLSX from "xlsx";
import type { Resultado } from "./types";

const W = Array.from({ length: 12 }, (_, i) => i + 1);
const wcols = W.map((w) => `W${w}`);

// Espelha a entrega da planilha: aba "Resultados" (total + por ambiente) + aba "Configuração".
export function exportarXlsx(praca: string, semanas: number, rep: number, data: Resultado) {
  const wb = XLSX.utils.book_new();

  // ----- aba Resultados -----
  const rows: (string | number)[][] = [];
  rows.push([`Indoor — ${praca}`, `${semanas} semana(s)`, `simulação #${rep}`]);
  rows.push([]);

  const pracas = [...new Set(data.agregado.map((a) => a.praca_st))];
  for (const p of pracas) {
    const agg = (w: number) => data.agregado.find((a) => a.praca_st === p && a.semana_vl === w);
    rows.push([`TOTAL — ${p}`, ...wcols]);
    rows.push(["Impacto IPV semanal", ...W.map((w) => agg(w)?.impactoTotal_vl ?? 0)]);
    rows.push(["Cobertura dia", ...W.map((w) => agg(w)?.coberturaTotal_vl ?? 0)]);
    rows.push(["Frequência", ...W.map((w) => agg(w)?.frequencia_vl ?? 0)]);
    rows.push(["% Cobertura", ...W.map((w) => agg(w)?.pctCobertura_vl ?? 0)]);
    rows.push([]);
  }

  data.config.forEach((c, idx) => {
    const dc = (w: number) => data.detalhe.find((x) => x.linha_pk === c.linha_pk && x.semana_vl === w);
    const titulo = `Ambiente ${idx + 1} — ${c.ambiente}${c.shopping ? " · " + c.shopping : ""} · ${c.tipo}`;
    rows.push([titulo, ...wcols]);
    rows.push(["Impacto IPV semanal", ...W.map((w) => dc(w)?.impacto_vl ?? 0)]);
    rows.push(["Cobertura dia", ...W.map((w) => dc(w)?.cobertura_vl ?? 0)]);
    rows.push(["Frequência", ...W.map((w) => dc(w)?.frequencia_vl ?? 0)]);
    rows.push([]);
  });

  const wsR = XLSX.utils.aoa_to_sheet(rows);
  wsR["!cols"] = [{ wch: 28 }, ...W.map(() => ({ wch: 13 }))];
  XLSX.utils.book_append_sheet(wb, wsR, "Resultados");

  // ----- aba Configuração (inputs + deflatores) -----
  const cfg: (string | number)[][] = [[
    "Ambiente", "Tipo", "Shopping", "Tamanho", "Circulação", "Praça",
    "Passantes", "IPV ambiente", "Freq base", "Região",
    "× Concentração", "× Tamanho", "× Visualização", "× Digital",
    "IPV aj. shopping", "IPV aj. demais",
  ]];
  data.config.forEach((c) => {
    const df = data.deflatores.find((x) => x.linha_pk === c.linha_pk);
    const d1 = data.detalhe.find((x) => x.linha_pk === c.linha_pk && x.semana_vl === 1);
    cfg.push([
      c.ambiente, c.tipo, c.shopping, c.tamanho, c.circulacao, c.praca,
      df?.passantes_vl ?? "", df?.ipv_vl ?? "", df?.freqBase_vl ?? "", df?.regiaoTgi_st ?? "",
      df?.defConcentracao_vl ?? "", df?.defTamanho_vl ?? "", df?.defVisualizacao_vl ?? "", df?.defDigital_vl ?? "",
      d1?.ipvAjustadoShopping_vl ?? "", d1?.ipvAjustadoDemais_vl ?? "",
    ]);
  });
  const wsC = XLSX.utils.aoa_to_sheet(cfg);
  wsC["!cols"] = cfg[0].map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, wsC, "Configuração");

  const slug = praca.normalize("NFKD").replace(/[^\w]+/g, "_");
  XLSX.writeFile(wb, `indoor_${slug}_${rep}.xlsx`);
}
