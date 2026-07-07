# Como obter as métricas para apresentação — Colmeia

Métricas sugeridas para slides (General: Number of Simulations, Tool Response Time, Accuracy in Workflows, Errors, Application in Daily Media Planning). Onde buscar hoje e o que implementar se ainda não existir.

---

## Valores executados (script `node scripts/metrics.js`)

| Métrica | Valor | Período |
|--------|--------|--------|
| **Number of Simulations (total)** | **2.692** | Todos os roteiros ativos (delete_bl = 0) |
| **Number of Simulations (últimos 30 dias)** | **110** | Último mês |
| **Number of Simulations (últimos 7 dias)** | **29** | Última semana |
| Por tipo (na view) | Completo: 2.482 | Restante pode ser simulado/outro conforme `planoMidiaType_st` |

Para atualizar esses números: `node scripts/metrics.js` (requer .env com acesso ao SQL Server).

---

## 1. Number of Simulations (número de simulações / roteiros)

**O que é:** Quantidade de roteiros (planos) criados no Colmeia — no total ou só “simulado”.

**Como obter hoje:**

- **Total de roteiros (ativos, não excluídos):** consultar o SQL Server na view usada pela API.

```sql
-- Total de roteiros (ajuste o schema se necessário)
SELECT COUNT(*) AS total_roteiros
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE delete_bl = 0;
```

- **Só roteiros simulados:** se na sua base existir um campo que identifique o tipo (ex.: `planoMidiaType_st` ou equivalente na view/tabela origem), use algo como:

```sql
-- Exemplo: se planoMidiaType_st = 'simulado' existir na view/tabela
SELECT COUNT(*) AS total_simulacoes
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE delete_bl = 0
  AND planoMidiaType_st = 'simulado';  -- ajustar nome da coluna conforme o banco
```

- **Por período (ex.: último mês):**

```sql
SELECT COUNT(*) AS total_roteiros
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE delete_bl = 0
  AND date_dh >= DATEADD(month, -1, GETUTCDATE());
```

**Se não houver coluna de tipo:** use o total de roteiros como “number of simulations” (todos os planos são “simulações” no sentido de planejamento) ou combine com dados do Databricks/jobs se tiverem classificação lá.

---

## 2. Tool Response Time (tempo de resposta da ferramenta)

**O que é:** Tempo que a aplicação leva para responder ao usuário (ex.: tempo até a API devolver resposta).

**Como obter:**

- **Vercel:** no dashboard da Vercel, em **Analytics** ou **Speed Insights**, use as métricas de **response time** / **latency** por função serverless (ex.: `/api/roteiros`, `/api/roteiro-status`). Isso já dá um número “Tool Response Time” para a camada API.

- **Medir manualmente (uma vez):** abra o DevTools do navegador (aba Network), faça as ações principais (listar roteiros, abrir Criar Roteiro, salvar simulado, etc.) e anote o tempo da requisição (ex.: “Time” ou “Duration”) das chamadas à API. Use a média ou o P95 para o slide.

- **Implementar no código (para números contínuos):** adicionar middleware na API que registre o tempo entre o início do request e o `res.send()`, e envie para um log ou serviço (ex.: Vercel Logs, Datadog, BigQuery). Exemplo conceitual:

```javascript
// No início do handler ou em um middleware global
const start = Date.now();
res.on('finish', () => {
  const duration = Date.now() - start;
  console.log(JSON.stringify({ path: req.url, duration_ms: duration }));
});
```

Depois você agrega (média, P95) por período para o slide.

---

## 3. Accuracy in Workflows (precisão nos fluxos)

**O que é:** Quanto dos fluxos principais terminam corretamente, sem falha (ex.: criar roteiro, importar Excel, processar no Databricks).

**Como obter:**

- **Definição operacional sugerida:**  
  **Accuracy = (fluxos concluídos com sucesso / total de fluxos iniciados) × 100%**, por tipo de fluxo (ex.: “Criar Roteiro simulado”, “Importar plano OOH”, “Processamento Databricks”).

- **Se já existir log de sucesso/erro por etapa:**  
  Contar, por período, quantas vezes cada fluxo foi iniciado e quantas terminaram em sucesso (ex.: status “completed” ou resposta 200 na última chamada). A precisão é a razão entre os dois.

- **Se ainda não existir:**  
  - **Opção A:** Implementar logs estruturados (ou eventos) no backend: “fluxo X iniciado”, “fluxo X concluído” / “fluxo X erro”. Depois contar em um dashboard ou query.  
  - **Opção B:** Estimar a partir de erros conhecidos: por exemplo, (total de roteiros criados no período − quantidade de falhas reportadas ou logadas) / total de tentativas.  
  - **Opção C:** Pesquisa interna: “Em quantos % dos casos o fluxo de criar roteiro / importar plano atendeu sua expectativa?” e usar esse % como “accuracy” para o slide.

---

## 4. Errors (erros)

**O que é:** Quantidade de erros (ou taxa de erro) da aplicação — ex.: erros de API, falhas de processamento, importação.

**Como obter:**

- **Logs atuais:** Vários handlers usam `console.error` (ex.: `handlers/roteiro-simulado.js`, `databricks-roteiro-simulado.js`, `sp-plano-midia-ooh-insert.js`). Nos **Vercel Logs** (ou onde os logs da Vercel forem agregados), filtre por nível “error” ou por mensagens que contenham “Erro” / “Error” e conte por dia ou semana. Esse número pode ser “Errors” no slide.

- **Respostas HTTP de erro:** Se tiver um proxy ou log de todas as respostas da API, conte quantas respostas foram 4xx ou 5xx no período. Isso dá “número de erros” ou “taxa de erro” (erros / total de requests).

- **Para números mais estáveis:** Integrar um serviço de erro (ex.: **Sentry**): instalar o SDK no frontend e, se quiser, no backend Node.js; enviar exceções e respostas de erro para o Sentry. No dashboard do Sentry você vê “número de erros” e “eventos” por período — use esses valores no slide.

- **Erros de negócio:** Para “erros de importação” ou “falha no Databricks”, usar os `console.error` e mensagens já existentes (ex.: “Erro ao salvar roteiro simulado”, “Erro no processamento Databricks”) e contá-los nos logs, ou registrar em uma tabela (ex.: `erro_log_ft`) com tipo e data para relatório.

---

## 5. Application in Daily Media Planning (uso no planejamento diário)

**O que é:** Até que ponto o Colmeia é usado no dia a dia do planejamento de mídia (adoção, frequência de uso).

**Como obter:**

- **Uso da aplicação (proxy de “daily planning”):**  
  - **Logins:** Se o Auth0 ou sua aplicação registrarem logins (ex.: em uma tabela `login_log` ou via Auth0 Logs), use “logins por dia” ou “usuários únicos por semana” como indicador de uso no planejamento.  
  - **Roteiros criados por período:** O mesmo “Number of Simulations” por semana ou mês indica intensidade de uso (ex.: “X roteiros criados no último mês”).  
  - **Atividade por usuário:** Se no futuro houver eventos (ex.: “Criar Roteiro aberto”, “Roteiro salvo”), contar “dias com pelo menos uma ação” por usuário dá uma métrica de “aplicação no dia a dia”.

- **Pesquisa (qualitativa / NPS):** Pergunta tipo: “Com que frequência você usa o Colmeia no planejamento de mídia?” (diário / semanal / mensal / raramente) ou “O Colmeia faz parte do seu fluxo diário de planejamento?” (Sim/Não). O % de “Sim” ou “diário/semanal” pode ser o número do slide (“Application in Daily Media Planning”: ex.: “X% dos usuários usam no planejamento diário”).

- **Resumo para slide:** Pode ser um único número (ex.: “X logins/semana” ou “X% usa no planejamento diário”) ou uma frase (“Utilizado em X% dos planejamentos ativos no período”).

---

## Resumo rápido para o slide

| Métrica | Fonte sugerida | Exemplo de valor para slide |
|--------|----------------|-----------------------------|
| **Number of Simulations** | `COUNT(*)` em `planoMidiaGrupo_dm_vw` (delete_bl=0), total ou por tipo/periodo | “X roteiros no último ano” |
| **Tool Response Time** | Vercel Analytics / Speed Insights ou middleware medindo tempo da API | “~Y ms (média)” ou “&lt; Z s (P95)” |
| **Accuracy in Workflows** | (Sucessos / Total de fluxos) × 100%, ou pesquisa interna | “Z% dos fluxos concluídos com sucesso” |
| **Errors** | Vercel Logs (console.error) ou Sentry; opcional: contagem de 5xx/4xx | “N erros no período” ou “W% taxa de erro” |
| **Application in Daily Media Planning** | Logins, roteiros criados por período, ou pesquisa de uso | “X logins/semana” ou “Y% usa no planejamento diário” |

---

## Checklist antes de montar o slide

- [ ] Rodar a query de **Number of Simulations** no SQL Server (total e, se existir, por tipo/período).
- [ ] Anotar **Tool Response Time** do Vercel ou de um teste manual (Network no navegador).
- [ ] Definir **Accuracy** (qual fluxo? sucesso = quê?) e obter a razão ou fazer a pergunta na equipe.
- [ ] Contar **Errors** nos logs da Vercel (ou no Sentry, se já tiver) no período desejado.
- [ ] Escolher **Application in Daily Media Planning**: número de logins/roteiros ou % da pesquisa e preencher o texto do slide.

Se quiser, na próxima iteração podemos: (1) criar um endpoint interno `/api/metrics` que devolva “total de roteiros” e “total no mês” para você copiar no slide; ou (2) esboçar o texto exato de um slide com placeholders (ex.: “X simulações”, “Y ms”) para você só substituir pelos números.
