/**
 * Regra de ordenação de exibidores nas abas Exibidor e Modelo P1A.
 *  1. Exibidores prioritários, em ordem fixa
 *  2. Demais exibidores em ordem alfabética
 *  3. "Demais OOH" sempre por último
 *  4. Linhas com `exibidorP1a_st` null/vazio são rotuladas como
 *     "Não informado" e ficam ao final, antes de "Demais OOH".
 */
const PRIORIDADE_ORDEM = ['Jcdecaux', 'Eletromidia', 'Urbia', 'Pacote banka'];
const DEMAIS_OOH = 'Demais OOH';
export const NAO_INFORMADO = 'Não informado';

function normalize(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function nomeExibidor(value: string | null | undefined): string {
  if (!value || !value.trim()) return NAO_INFORMADO;
  return value;
}

export function ordenarExibidores(nomes: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  nomes.forEach((n) => {
    const nome = nomeExibidor(n);
    if (nome) set.add(nome);
  });

  const prioritarios: string[] = [];
  const demais: string[] = [];
  let temDemaisOOH = false;
  let temNaoInformado = false;

  set.forEach((nome) => {
    const n = normalize(nome);
    if (n === normalize(NAO_INFORMADO)) {
      temNaoInformado = true;
      return;
    }
    if (n === normalize(DEMAIS_OOH)) {
      temDemaisOOH = true;
      return;
    }
    const matchPrior = PRIORIDADE_ORDEM.find((p) => normalize(p) === n);
    if (matchPrior) {
      prioritarios.push(nome);
      return;
    }
    demais.push(nome);
  });

  prioritarios.sort((a, b) => {
    const ia = PRIORIDADE_ORDEM.findIndex((p) => normalize(p) === normalize(a));
    const ib = PRIORIDADE_ORDEM.findIndex((p) => normalize(p) === normalize(b));
    return ia - ib;
  });

  demais.sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const result = [...prioritarios, ...demais];
  if (temNaoInformado) result.push(NAO_INFORMADO);
  if (temDemaisOOH) result.push(DEMAIS_OOH);
  return result;
}
