# Indoor — Calculadora (app React)

Protótipo da **calculadora de mídia Indoor (DOR)**, com a cara da Colmeia (React + Vite + TS + Tailwind, laranja `#ff4600`). Reproduz a lógica da planilha `Simulador Indoor_2026.xlsx` usando o **mesmo método de registro e cálculo** que irá para produção: o cálculo **não está no JS** — vive na SP `sp_indoorResultadoInsert` (a planilha já internalizada no banco). O app é a UI de **registro** (espelha "Configurar indoor") + visualização do **resultado** (espelha "Resultados").

> Referência de stack/visual: o app real em `/Users/admin/hmdata/dev/colmeia---meusroteirosdefault`. Aqui só a calculadora indoor importa para o estudo.

## Arquitetura (espelha a Colmeia)

```
web/  (React 18 + Vite 5 + TS + Tailwind)        →  fetch /api/*
api/server.py  (Python + pyodbc)                  →  grava planoIndoorLinha_ft + ...LocalidadeSemana_ft
                                                  →  EXEC sp_indoorResultadoInsert      (motor = planilha no banco)
                                                  →  lê indoorResultado_ft + indoorResultadoAgregado_ft_vw
```

Na Colmeia real o `api/` seria `/api/*` serverless + `mssql` — **mesmo contrato** (dims / simular / resultado). Aqui é Python só porque o pyodbc já estava validado.

> ⚠️ **Uso interno, não compartilhar ainda.** Escreve nas tabelas de produção indoor (autorizado — ainda não consumidas); simulações isoladas em `report_pk ≥ 900000`. `/api/reset` (botão "limpar simulações") apaga só esse range.

## Como rodar

**Opção A — build + servir num porto só (recomendado):**
```bash
cd plan/20260519/indoor/app/web
npm install          # 1ª vez
npm run build        # gera web/dist
cd ..
python3 api/server.py            # http://localhost:8137   (serve o bundle + a API)
# porta ocupada?  INDOOR_SIM_PORT=8200 python3 api/server.py
```

**Opção B — dev com HMR (2 processos):**
```bash
# terminal 1 (API):
cd plan/20260519/indoor/app && python3 api/server.py
# terminal 2 (Vite dev, proxy /api → 8137):
cd plan/20260519/indoor/app/web && npm run dev      # http://localhost:5173
```

## Como usar

1. **Praça** — uma cidade para o plano (como o B5 da planilha).
2. **Ambientes** (+ ambiente): campos **condicionais** —
   - Shopping → mostra o campo Shopping (puxa passantes/área do cadastro → deflator de concentração);
   - não-shopping → mostra Passantes/sem;
   - Tipo Digital → mostra Inserções/slot × Slots; Estático ignora;
   - Edifícios → Tamanho fica fixo em "Pequeno formato" (override da planilha).
3. **▶ Calcular** → roda a SP no banco e mostra: resultado por ambiente + agregado por praça × W1–W12 (Impacto, Cobertura, Frequência, % Cobertura).

## Golden (reproduz a planilha)

- Rio de Janeiro · Metrô · Ambos · 4-Ampla · Digital 1080×1 · passantes 15000 · loc 50 → **300.000 / 8,8032 / 4.868,36**
- São Paulo · Shopping `D&D Shopping` · Grande formato · 4-Ampla · Estático · loc 1 → **26.120 / 5,3449 / 698,11**

## Estrutura

```
app/
  api/server.py          # API JSON + serve web/dist (pyodbc, usuário master)
  web/
    src/
      App.tsx            # shell (sidebar+topbar) + formulário + orquestração
      components/AmbienteRow.tsx   # linha de ambiente, campos condicionais
      components/Resultados.tsx    # tabelas por ambiente + agregado W1–W12
      api.ts, types.ts, index.css, main.tsx
    package.json, vite.config.ts, tailwind.config.js, tsconfig.json
```
