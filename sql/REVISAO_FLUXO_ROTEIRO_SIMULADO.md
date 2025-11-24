# 🔍 REVISÃO COMPLETA - FLUXO ROTEIRO SIMULADO

## ✅ FLUXO ATUAL (CORRIGIDO)

```
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1: Criar planoMidiaDesc_pk                               │
│ ────────────────────────────────────────────────────────────── │
│ Chamadas: 1 (UMA VEZ)                                          │
│                                                                 │
│ Frontend → Backend:                                            │
│   POST /plano-midia-desc                                       │
│   {                                                            │
│     planoMidiaGrupo_pk: 6812,                                 │
│     recordsJson: [                                            │
│       { cidade: "SAO PAULO", ... },                           │
│       { cidade: "RIO DE JANEIRO", ... },                      │
│       { cidade: "BELO HORIZONTE", ... }                       │
│     ]                                                          │
│   }                                                            │
│                                                                 │
│ Backend → SQL:                                                 │
│   EXEC sp_planoMidiaDescInsert                                │
│     @planoMidiaGrupo_pk = 6812,                              │
│     @recordsJson = '[...]'                                    │
│                                                                 │
│ Resultado:                                                     │
│   planoMidiaDesc_pk: 7698 (São Paulo)                        │
│   planoMidiaDesc_pk: 7699 (Rio de Janeiro)                   │
│   planoMidiaDesc_pk: 7700 (Belo Horizonte)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2: Salvar dados do roteiro simulado                     │
│ ────────────────────────────────────────────────────────────── │
│ Chamadas: N (LOOP - uma por cidade)                           │
│                                                                 │
│ Frontend → Backend (cidade 1):                                 │
│   POST /roteiro-simulado                                       │
│   {                                                            │
│     planoMidiaDesc_pk: 7698,  ← PK individual São Paulo      │
│     dadosTabela: [                                            │
│       { grupoSub_st: "G2D", semanas: [...] }                 │
│     ],                                                         │
│     quantidadeSemanas: 2                                      │
│   }                                                            │
│                                                                 │
│ Backend → SQL:                                                 │
│   EXEC sp_planoColmeiaSimuladoInsert                          │
│     @planoMidiaDesc_pk = 7698,                               │
│     @recordsJson = '[                                         │
│       { week_vl: 1, grupoSub_st: "G2D", contagem_vl: 100 },  │
│       { week_vl: 2, grupoSub_st: "G2D", contagem_vl: 120 }   │
│     ]'                                                         │
│                                                                 │
│ Tabela uploadRoteiros_ft:                                     │
│   planoMidiaDesc_pk | week_vl | grupoSub_st | contagem_vl    │
│   7698              | 1       | G2D         | 100            │
│   7698              | 2       | G2D         | 120            │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Frontend → Backend (cidade 2):                                 │
│   POST /roteiro-simulado                                       │
│   {                                                            │
│     planoMidiaDesc_pk: 7699,  ← PK individual Rio            │
│     dadosTabela: [...],                                       │
│     quantidadeSemanas: 2                                      │
│   }                                                            │
│                                                                 │
│ Backend → SQL:                                                 │
│   EXEC sp_planoColmeiaSimuladoInsert                          │
│     @planoMidiaDesc_pk = 7699,                               │
│     @recordsJson = '[...]'                                    │
│                                                                 │
│ Tabela uploadRoteiros_ft:                                     │
│   planoMidiaDesc_pk | week_vl | grupoSub_st | contagem_vl    │
│   7699              | 1       | G2D         | 100            │
│   7699              | 2       | G2D         | 120            │
│                                                                 │
│ (Repete para cada cidade...)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3: Executar processamento Databricks                    │
│ ────────────────────────────────────────────────────────────── │
│ Chamadas: 1 (UMA VEZ para o grupo inteiro)                    │
│                                                                 │
│ Frontend → Backend:                                            │
│   POST /databricks-roteiro-simulado                           │
│   {                                                            │
│     planoMidiaDesc_pk: 6812,  ← PK do GRUPO!                 │
│     date_dh: "2025-11-19 22:40:39",                          │
│     date_dt: "2025-11-19"                                     │
│   }                                                            │
│                                                                 │
│ Backend → Databricks:                                          │
│   POST /api/2.1/jobs/run-now                                  │
│   {                                                            │
│     job_id: 253075688202926,                                  │
│     notebook_params: {                                        │
│       planoMidiaGrupo_pk: "6812",  ← PK do GRUPO             │
│       date_dh: "2025-11-19 22:40:39",                        │
│       date_dt: "2025-11-19"                                   │
│     }                                                          │
│   }                                                            │
│                                                                 │
│ Databricks processa:                                           │
│   1. Busca TODOS os planoMidiaDesc_pk do grupo 6812           │
│      → Encontra: 7698, 7699, 7700                            │
│                                                                 │
│   2. Para cada planoMidiaDesc_pk:                             │
│      - Busca dados em uploadRoteiros_ft                       │
│      - Busca pontos em baseCalculadoraLastPlanoMidia_ft_vw   │
│      - Executa cálculos (impacto, cobertura, etc.)           │
│      - Salva resultados                                       │
│                                                                 │
│   3. Gera resultados em:                                       │
│      - reportDataPlanoMidiaWeekResultGb_dm_vw                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 PONTOS CRÍTICOS

### **1. Parâmetro `planoMidiaDesc_pk` tem significado diferente em cada etapa:**

| Etapa | Parâmetro enviado | O que significa |
|-------|-------------------|-----------------|
| ETAPA 1 | `planoMidiaGrupo_pk: 6812` | PK do grupo/campanha |
| ETAPA 2 | `planoMidiaDesc_pk: 7698` | PK individual da cidade |
| ETAPA 3 | `planoMidiaDesc_pk: 6812` | PK do grupo (nome do param é confuso!) |

### **2. Backend da ETAPA 3 faz conversão:**

```javascript
// Frontend envia:
planoMidiaDesc_pk: 6812

// Backend converte para:
planoMidiaGrupo_pk: "6812"  // ← Nome correto para o Databricks
```

**Por que o nome está confuso?**
- O parâmetro se chama `planoMidiaDesc_pk` no frontend
- Mas na verdade é o `planoMidiaGrupo_pk`
- O backend faz a conversão do nome para o Databricks

---

## 📊 DADOS EM CADA TABELA

### **planoMidiaDesc_dm** (após ETAPA 1)
```
pk   | planoMidiaDesc_st        | ibgeCode_vl
7698 | CAMPANHA_SAO_PAULO       | 3550308
7699 | CAMPANHA_RIO_DE_JANEIRO  | 3304557
7700 | CAMPANHA_BELO_HORIZONTE  | 3106200
```

### **planoMidia_dm_vw** (após ETAPA 1)
```
planoMidiaGrupo_pk | planoMidiaDescPk_st
6812               | 7698,7699,7700
```

### **uploadRoteiros_ft** (após ETAPA 2)
```
planoMidiaDesc_pk | week_vl | grupoSub_st | contagem_vl
7698              | 1       | G2D         | 100
7698              | 2       | G2D         | 120
7699              | 1       | G2D         | 100
7699              | 2       | G2D         | 120
7700              | 1       | G2D         | 100
7700              | 2       | G2D         | 120
```

### **reportDataPlanoMidiaWeekResultGb_dm_vw** (após ETAPA 3)
```
report_pk | planoMidiaDesc_pk | cidade_st       | week_vl | impactos_vl | coberturaPessoas_vl
...       | 7698              | SAO PAULO       | 1       | 1500000     | 500000
...       | 7698              | SAO PAULO       | 2       | 1800000     | 600000
...       | 7699              | RIO DE JANEIRO  | 1       | 1200000     | 400000
...       | 7699              | RIO DE JANEIRO  | 2       | 1440000     | 480000
...       | 7700              | BELO HORIZONTE  | 1       | 800000      | 300000
...       | 7700              | BELO HORIZONTE  | 2       | 960000      | 360000
```

---

## ✅ CÓDIGO ATUAL (CORRETO)

### **Frontend - ETAPA 3 (linha 813-817)**
```typescript
const databricksResponse = await axios.post('/databricks-roteiro-simulado', {
  planoMidiaDesc_pk: planoMidiaGrupo_pk, // ← Envia PK do GRUPO (6812)
  date_dh: new Date().toISOString().slice(0, 19).replace('T', ' '),
  date_dt: new Date().toISOString().slice(0, 10)
});
```

### **Backend - ETAPA 3 (api/databricks-roteiro-simulado.js, linha 55-62)**
```javascript
const requestBody = {
  job_id: parseInt(databricksJobId),
  notebook_params: {
    planoMidiaGrupo_pk: planoMidiaDesc_pk.toString(), // ← Converte nome do param
    date_dh: date_dh,
    date_dt: date_dt
  }
};
```

---

## 🎯 RESUMO EXECUTIVO

| Etapa | Chamadas | Parâmetro principal | Valor | Stored Procedure |
|-------|----------|---------------------|-------|------------------|
| 1. Criar PKs | 1 | `planoMidiaGrupo_pk` | 6812 | `sp_planoMidiaDescInsert` |
| 2. Salvar dados | N (loop) | `planoMidiaDesc_pk` | 7698, 7699, 7700 | `sp_planoColmeiaSimuladoInsert` |
| 3. Databricks | 1 | `planoMidiaDesc_pk` → `planoMidiaGrupo_pk` | 6812 | (Job Databricks) |

---

**Data**: 2025-11-19  
**Branch**: `fix-roteiro-simulado`  
**Status**: ✅ Código revisado e correto

