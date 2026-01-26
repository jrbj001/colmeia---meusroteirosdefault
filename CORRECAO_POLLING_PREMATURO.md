# Correção: Polling Terminando Prematuramente

## Problema Identificado

O polling estava terminando **antes** do Databricks realmente concluir o processamento dos dados.

### Comportamento Observado:

1. ✅ Polling inicia corretamente
2. ✅ Timer funciona (10936 segundos = ~3 horas)
3. ❌ `inProgress_bl` muda para `false` MUITO CEDO
4. ❌ Polling para, mas os dados ainda não foram processados
5. ❌ Tela mostra loadings confusos/duplicados
6. ❌ Ao recarregar depois, os dados aparecem

## Causa Raiz

O campo `inProgress_bl` na view `planoMidiaGrupo_dm_vw` indica apenas que:
- ✅ O job do Databricks foi **submetido**
- ✅ A **submissão** foi concluída

**MAS NÃO** indica que:
- ❌ O Databricks **terminou de processar**
- ❌ Os dados estão **disponíveis nas views**

## Solução Implementada

### Verificação em 2 Etapas

Agora a API `/roteiro-status` faz uma verificação robusta:

#### ETAPA 1: Verificar `inProgress_bl`
```sql
SELECT inProgress_bl FROM planoMidiaGrupo_dm_vw WHERE pk = @pk
```

- `inProgress_bl = 1` → Ainda submetendo job → **CONTINUAR POLLING**
- `inProgress_bl = 0` → Job submetido → **IR PARA ETAPA 2**

#### ETAPA 2: Verificar se dados existem
```sql
SELECT COUNT(*) as total 
FROM serv_product_be180.report_indicadores_vw 
WHERE planoMidiaGrupo_pk = @pk
```

- `total = 0` → Databricks ainda processando → **CONTINUAR POLLING**
- `total > 0` → Databricks terminou! → **PARAR POLLING ✅**

### Lógica Final

```typescript
const isStillProcessing = 
  (inProgress_bl === 1) ||          // Ainda submetendo OU
  (!dadosProcessados);              // Não tem dados ainda

inProgress: isStillProcessing
```

## Fluxo Completo Agora

### Fase 1: Submissão (0-5 segundos)
```
inProgress_bl: 1 (true)
dadosProcessados: false
STATUS: "processing" ⏳
AÇÃO: CONTINUAR POLLING
```

### Fase 2: Databricks Processando (5 segundos - 3 horas)
```
inProgress_bl: 0 (false) ← Mudou cedo!
dadosProcessados: false  ← MAS ainda não tem dados
STATUS: "processing" ⏳
AÇÃO: CONTINUAR POLLING
```

### Fase 3: Processamento Concluído
```
inProgress_bl: 0 (false)
dadosProcessados: true   ← AGORA SIM!
STATUS: "completed" ✅
AÇÃO: PARAR POLLING + CARREGAR DADOS
```

## Response da API

### ANTES (Incorreto):
```json
{
  "inProgress": false,  // ❌ Falso positivo!
  "status": "completed"
}
```

### DEPOIS (Correto):
```json
{
  "inProgress": true,   // ✅ Ainda processando
  "status": "processing",
  "dadosProcessados": false
}
```

E quando realmente terminar:
```json
{
  "inProgress": false,  // ✅ Realmente terminou
  "status": "completed",
  "dadosProcessados": true
}
```

## Console Logs Esperados

### Enquanto Databricks Processa:
```
🔍 inProgress_bl = false. Verificando se dados foram realmente processados...
📊 Total de registros na view de resultados: 0
⚠️ inProgress_bl = false, mas ainda não há dados. Databricks ainda processando...
```

### Quando Databricks Termina:
```
🔍 inProgress_bl = false. Verificando se dados foram realmente processados...
📊 Total de registros na view de resultados: 150
✅ Dados processados encontrados! Databricks terminou.
```

## Resultado

Agora o polling só vai parar quando:
- ✅ `inProgress_bl = 0` (job submetido)
- ✅ `COUNT(*) > 0` (dados realmente processados)
- ✅ Timer continua atualizando até o fim real
- ✅ Sem loadings duplicados ou confusos
- ✅ Transição suave para exibição dos dados

## Teste

1. Criar um roteiro simulado
2. Aguardar processamento
3. Observar no console do servidor:
   - `⚠️ inProgress_bl = false, mas ainda não há dados...` (repetido várias vezes)
   - `✅ Dados processados encontrados! Databricks terminou.` (uma vez, no final)
4. Timer deve continuar até ver a mensagem de sucesso
5. Ao terminar, deve mostrar apenas a tela de resultados (sem loadings confusos)
