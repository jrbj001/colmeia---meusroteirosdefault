# Correção: Tempo Decorrido Incorreto

## Problema Identificado

O tempo de processamento estava mostrando **"3h 2min 55s"** quando o processamento do Databricks leva apenas **3-5 minutos**.

### Causa Raiz

O tempo estava sendo calculado a partir de `date_dh` (data de criação do roteiro no banco), não do início do processamento do Databricks.

**Cenário:**
1. Roteiro criado às 11:10 (date_dh = 11:10)
2. Usuário sai da página
3. Databricks processa (3-5 minutos)
4. Usuário volta às 14:12 (3 horas depois)
5. Timer mostra: **3h 2min** ❌ (tempo desde criação do roteiro)
6. Tempo real de processamento: **3-5 minutos** ✅

## Código ANTES (Incorreto)

```typescript
// Calcular tempo desde date_dh do banco
if (data.dataCriacao && data.inProgress) {
  const dataInicio = new Date(data.dataCriacao).getTime(); // ❌ Data de CRIAÇÃO do roteiro
  const agora = Date.now();
  const tempoDecorridoSegundos = Math.floor((agora - dataInicio) / 1000);
  setTempoDecorrido(tempoDecorridoSegundos); // ❌ Mostra 3 horas!
}
```

## Código DEPOIS (Correto)

```typescript
// Guardar timestamp quando polling INICIA
const pollingStartTimeRef = useRef<number | null>(null);

// Quando polling começa
if (enabled && roteiroPk) {
  if (!pollingStartTimeRef.current) {
    pollingStartTimeRef.current = Date.now(); // ✅ Agora!
    setTempoDecorrido(0);
  }
}

// Calcular tempo desde INÍCIO DO POLLING
if (data.inProgress && pollingStartTimeRef.current) {
  const agora = Date.now();
  const tempoDecorridoSegundos = Math.floor((agora - pollingStartTimeRef.current) / 1000);
  setTempoDecorrido(tempoDecorridoSegundos); // ✅ Tempo real!
}
```

## Fluxo Correto Agora

### Caso 1: Usuário cria roteiro e aguarda
```
11:10:00 - Roteiro criado (date_dh = 11:10:00)
11:10:00 - Aba 6 abre → pollingStartTimeRef = 11:10:00
11:10:03 - Timer: "3s" ✅
11:10:06 - Timer: "6s" ✅
11:10:09 - Timer: "9s" ✅
...
11:14:30 - Processamento termina
11:14:30 - Timer final: "4min 30s" ✅
```

### Caso 2: Usuário cria roteiro e sai
```
11:10:00 - Roteiro criado (date_dh = 11:10:00)
11:10:00 - Usuário sai da página
11:14:30 - Databricks termina de processar (em background)
14:12:00 - Usuário volta e abre Aba 6
14:12:00 - Polling inicia → pollingStartTimeRef = 14:12:00
14:12:00 - Verifica: dados já existem! inProgress = false
14:12:00 - Mostra resultados imediatamente ✅
```

### Caso 3: Usuário volta durante processamento
```
11:10:00 - Roteiro criado (date_dh = 11:10:00)
11:10:00 - Usuário sai da página
11:12:00 - Databricks ainda processando
14:12:00 - Usuário volta e abre Aba 6
14:12:00 - Polling inicia → pollingStartTimeRef = 14:12:00
14:12:00 - Timer: "0s" ✅ (tempo desde que voltou)
14:12:03 - Timer: "3s" ✅
14:12:06 - Timer: "6s" ✅
14:14:30 - Processamento termina
14:14:30 - Timer final: "2min 30s" ✅ (tempo desde que voltou)
```

## Modificações Implementadas

### 1. Hook `useRoteiroStatusPolling.ts`

**Adicionado:**
```typescript
const pollingStartTimeRef = useRef<number | null>(null);
```

**Mudança no cálculo:**
```typescript
// ANTES: Usava data.dataCriacao (date_dh do banco)
const dataInicio = new Date(data.dataCriacao).getTime();

// DEPOIS: Usa timestamp de quando polling começou
const agora = Date.now();
const tempoDecorridoSegundos = Math.floor((agora - pollingStartTimeRef.current) / 1000);
```

**Inicialização do timestamp:**
```typescript
if (enabled && roteiroPk) {
  if (!pollingStartTimeRef.current) {
    pollingStartTimeRef.current = Date.now();
    setTempoDecorrido(0);
  }
  // ... inicia polling
}
```

**Cleanup:**
```typescript
// Quando polling para ou componente desmonta
pollingStartTimeRef.current = null;
```

### 2. Formato do Tempo

Já corrigido anteriormente:
- "3h 2min 55s" (legível)
- Não mais "182:55" (confuso)

### 3. Layout

Já otimizado anteriormente:
- Minimalista estilo Apple
- Spinner clean
- Tipografia leve

## Resultado

### ANTES:
```
Timer mostra: "3h 2min 55s"
Usuário pensa: "Isso não é normal! Databricks não leva 3 horas!"
```

### DEPOIS:
```
Timer mostra: "0min 3s" → "0min 6s" → ... → "4min 30s"
Usuário vê: Tempo real de processamento (3-5 minutos) ✅
```

## Console Logs Esperados

```
▶️ Iniciando polling de status do roteiro: 6941
⏱️ Timestamp inicial do polling guardado
🔍 Verificando status do roteiro PK: 6941
📊 Status recebido - inProgress: true
⏱️ Tempo decorrido desde início do polling: 0 segundos
(3 segundos depois)
🔍 Verificando status do roteiro PK: 6941
📊 Status recebido - inProgress: true
⏱️ Tempo decorrido desde início do polling: 3 segundos
(3 segundos depois)
⏱️ Tempo decorrido desde início do polling: 6 segundos
...
⏱️ Tempo decorrido desde início do polling: 270 segundos (4min 30s)
✅ Processamento concluído! Chamando onComplete...
```

## Teste

1. **Criar novo roteiro simulado**
2. **Observar timer**:
   - ✅ Deve começar em "0s"
   - ✅ Deve atualizar: "3s" → "6s" → "9s"
   - ✅ Quando terminar (3-5 min): "3min 45s" (exemplo)
   - ❌ NÃO deve mostrar "3h 2min" nunca mais!

3. **Teste de "voltar depois"**:
   - Criar roteiro
   - Fechar aba/navegar para outra página
   - Aguardar 10 minutos
   - Voltar para Aba 6
   - ✅ Se já terminou: mostra resultados imediatamente
   - ✅ Se ainda processando: timer começa do zero
