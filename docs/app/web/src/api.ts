import type { Dims, Linha, Resultado } from "./types";

async function J<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json();
}

export const getDims = (): Promise<Dims> => fetch("/api/dims").then(J<Dims>);

export const simular = (praca: string, semanas: number, linhas: Linha[]): Promise<{ report_pk: number }> =>
  fetch("/api/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ praca, semanas, linhas }),
  }).then(J<{ report_pk: number }>);

export const getResultado = (rep: number): Promise<Resultado> =>
  fetch(`/api/resultado?rep=${rep}`).then(J<Resultado>);

export const reset = (): Promise<{ ok: boolean }> =>
  fetch("/api/reset", { method: "POST" }).then(J<{ ok: boolean }>);
