# Solução CORRETA: Timestamp Baseado no Início do Polling

## Problema com a Solução Anterior (usando dataCriacao do banco)

A implementação usando `dataCriacao` do banco tinha um **problema fatal**:

### dataCriacao ≠ Início do Processamento

```
10:00:00 - Usuário cria o roteiro
         - dataCriacao = 10:00:00 ✅
         - Roteiro salvo no banco

10:01:00 - Usuário preenche abas 2, 3, 4, 5

10:30:00 - Usuário clica "Salvar" e inicia processamento
         - Job Databricks inicia AGORA
         - dataCriacao ainda é 10:00:00 ❌ (não muda!)
         
10:30:30 - Timer mostra: 30 MINUTOS ❌❌❌
         - Calculou: Date.now() - dataCriacao = 30 minutos
         - Processamento REAL: 30 SEGUNDOS
         - Barra de progresso: 99% (porque 30min > limite)
```

**Resultado**: Timer mostra tempo desde que o roteiro foi criado, NÃO desde que o processamento começou!

## Solução Correta: Timestamp de Quando o Polling É Ativado

### Conceito

O **início do processamento** é quando:
- `setAguardandoProcessamento(true)` é chamado
- O hook de polling é ativado (`enabled = true`)
- **NESSE MOMENTO** guardamos `Date.now()` como referência

```
10:30:00 - setAguardandoProcessamento(true)
10:30:00 - Hook ativo: pollingStartTimeRef.current = Date.now() ✅
10:30:00 - Salvar no localStorage ✅

10:30:30 - Timer: 30 SEGUNDOS ✅
         - Calcula: Date.now() - pollingStartTimeRef.current
         - = 10:30:30 - 10:30:00 = 30s ✅
```

## Implementação

### 1. Helpers no Hook

```typescript
// Salvar timestamp no localStorage
const saveTimestampToStorage = (pk: number, timestamp: number) => {
  localStorage.setItem(`roteiro_polling_start_${pk}`, timestamp.toString());
};

// Recuperar timestamp do localStorage
const getTimestampFromStorage = (pk: number): number | null => {
  const saved = localStorage.getItem(`roteiro_polling_start_${pk}`);
  return saved ? parseInt(saved, 10) : null;
};

// Limpar timestamp do localStorage
const clearTimestampFromStorage = (pk: number) => {
  localStorage.removeItem(`roteiro_polling_start_${pk}`);
};
```

**Chave**: `roteiro_polling_start_${pk}`
- Cada roteiro tem seu próprio timestamp
- Diferente da tentativa anterior (`roteiro_timestamp_${pk}`)

### 2. Criar/Recuperar Timestamp no useEffect

```typescript
useEffect(() => {
  // Detectar mudança de roteiro
  if (roteiroPk && roteiroPk !== lastRoteiroPkRef.current) {
    pollingStartTimeRef.current = null; // Reset para novo roteiro
    lastRoteiroPkRef.current = roteiroPk;
  }
  
  if (enabled && roteiroPk) {
    // Só cria/recupera timestamp se não existir
    if (!pollingStartTimeRef.current) {
      const savedTimestamp = getTimestampFromStorage(roteiroPk);
      
      if (savedTimestamp) {
        // Caso 1: Voltou depois de sair (recupera)
        pollingStartTimeRef.current = savedTimestamp;
      } else {
        // Caso 2: Primeira vez (cria novo)
        const novoTimestamp = Date.now();
        pollingStartTimeRef.current = novoTimestamp;
        saveTimestampToStorage(roteiroPk, novoTimestamp);
      }
    }
    
    // Inicia polling
    checkStatus();
    intervalRef.current = setInterval(checkStatus, interval);
  }
}, [enabled, roteiroPk, interval]);
```

### 3. Calcular Tempo Usando o Timestamp

```typescript
if (data.inProgress && pollingStartTimeRef.current) {
  const agora = Date.now();
  const tempoDecorridoSegundos = Math.floor((agora - pollingStartTimeRef.current) / 1000);
  setTempoDecorrido(tempoDecorridoSegundos);
}
```

### 4. Limpar Timestamp Quando Completar

```typescript
if (!data.inProgress && wasProcessingRef.current) {
  console.log('✅ Processamento concluído!');
  
  // Limpar timestamp
  if (roteiroPk) {
    clearTimestampFromStorage(roteiroPk);
  }
  pollingStartTimeRef.current = null;
  
  onComplete();
}
```

## Cenários Cobertos

### Cenário 1: Criar Roteiro e Aguardar

```
10:30:00 - Salvar roteiro simulado
         - setAguardandoProcessamento(true)
         - Hook ativo
         - pollingStartTimeRef.current = 10:30:00 ✅
         - localStorage: "1706623800000" ✅

10:30:30 - Timer: 30s ✅
10:31:00 - Timer: 60s ✅
10:32:00 - Timer: 2min ✅
```

### Cenário 2: Navegar Entre Abas (Componente NÃO desmonta)

```
10:30:00 - Salvar, polling ativo
         - pollingStartTimeRef.current = 10:30:00 ✅

10:30:30 - Timer: 30s
10:30:30 - Muda para Aba 2
         - Hook pausado (enabled = false)
         - pollingStartTimeRef.current = 10:30:00 ✅ (PRESERVADO!)
         - localStorage: "1706623800000" ✅ (PRESERVADO!)

10:31:00 - Volta para Aba 6
         - Hook reativado (enabled = true)
         - pollingStartTimeRef.current JÁ EXISTE ✅
         - NÃO cria novo timestamp
         - Calcula: 10:31:00 - 10:30:00 = 60s ✅
         - Timer: 1min ✅ (CONTINUOU!)
```

### Cenário 3: Ir para "Meus Roteiros" e Voltar (Componente desmonta)

```
10:30:00 - Salvar, polling ativo
         - pollingStartTimeRef.current = 10:30:00 ✅
         - localStorage: "1706623800000" ✅

10:30:30 - Timer: 30s
10:30:30 - Clica "Meus Roteiros"
         - CriarRoteiro DESMONTA ❌
         - pollingStartTimeRef.current: PERDIDO ❌
         - localStorage: "1706623800000" ✅✅✅ (SOBREVIVE!)

10:31:00 - Clica no roteiro (volta)
         - CriarRoteiro MONTA DO ZERO
         - roteiroPk = 6946
         - aguardandoProcessamento = true (estado do banco)
         - Hook ativo
         - pollingStartTimeRef.current = null (novo componente)
         - ✅ getTimestampFromStorage(6946) retorna "1706623800000"
         - pollingStartTimeRef.current = 10:30:00 ✅ (RECUPERADO!)
         - Calcula: 10:31:00 - 10:30:00 = 60s ✅
         - Timer: 1min ✅ (CONTINUOU!)
```

### Cenário 4: Processamento Completa

```
10:34:30 - Databricks termina
         - API retorna inProgress: false
         - Limpa localStorage ✅
         - pollingStartTimeRef.current = null ✅
         - onComplete() chamado
         - Mostra resultados
```

### Cenário 5: Novo Roteiro (PK Diferente)

```
10:35:00 - Criar segundo roteiro
         - roteiroPk = 6947 (diferente!)
         - lastRoteiroPkRef.current = 6946
         
         - ✅ Detecta mudança: 6947 !== 6946
         - pollingStartTimeRef.current = null (reset!)
         - lastRoteiroPkRef.current = 6947
         
         - getTimestampFromStorage(6947) retorna null (novo roteiro)
         - pollingStartTimeRef.current = 10:35:00 ✅ (novo timestamp!)
         - Timer: 0s (começa do zero, correto!) ✅
```

## Por Que Esta Solução É Correta?

### ✅ 1. Timestamp Representa o Início Real do Processamento

- NÃO usa `dataCriacao` (que é quando o roteiro foi criado)
- USA `Date.now()` quando `enabled = true` (quando o job Databricks realmente inicia)

### ✅ 2. Persiste Entre Navegações

- **localStorage** guarda o timestamp mesmo se componente desmontar
- Funciona em todos os cenários:
  - Navegar entre abas ✅
  - Ir para "Meus Roteiros" e voltar ✅
  - Recarregar página (F5) ✅
  - Fechar e abrir browser ✅

### ✅ 3. Detecta Mudanças de Roteiro

- `lastRoteiroPkRef` rastreia o último PK
- Quando PK muda, reseta timestamp (novo processamento)

### ✅ 4. Limpa Recursos Corretamente

- Remove do localStorage quando processamento completa
- Não deixa dados órfãos

### ✅ 5. Simples e Robusto

- Menos de 100 linhas de código
- Lógica clara e fácil de entender
- Não depende de dados do banco (exceto para status)

## Console Logs Esperados

### Primeira vez (criar timestamp):
```
▶️ Polling ativo para roteiro: 6946
🆕 Novo timestamp criado: 2026-01-26T10:30:00.000Z
💾 Timestamp salvo no localStorage
```

### Voltar depois de sair:
```
▶️ Polling ativo para roteiro: 6946
📂 Timestamp recuperado do localStorage: 2026-01-26T10:30:00.000Z
🔄 Timestamp recuperado: 2026-01-26T10:30:00.000Z
⏱️ Tempo decorrido desde início do polling: 90 segundos
```

**CRÍTICO**: Timestamp é o MESMO de antes!

### Processar completo:
```
✅ Processamento concluído!
🗑️ Timestamp removido do localStorage
```

### Novo roteiro:
```
🆕 Novo roteiro detectado! PK anterior: 6946 → Novo PK: 6947
🆕 Novo timestamp criado: 2026-01-26T10:35:00.000Z
```

## Diferenças das Tentativas Anteriores

| Tentativa | Origem do Timestamp | Problema |
|-----------|---------------------|----------|
| **1ª (ref no hook)** | `Date.now()` no hook | Perdido ao desmontar componente |
| **2ª (localStorage manual)** | `Date.now()` no componente pai | Complexo, 70+ linhas |
| **3ª (dataCriacao do banco)** | `dataCriacao` do DB | ❌ Não é quando processamento começou! |
| **4ª (ATUAL)** | `Date.now()` quando polling ativa + localStorage | ✅ Simples e correto |

## Resumo

**Regra de Ouro**: O timestamp deve marcar quando o **POLLING FOI ATIVADO** (= quando o processamento começou), NÃO quando o roteiro foi criado no banco.

**Implementação**:
1. Quando `enabled = true` → Criar timestamp = `Date.now()`
2. Salvar no `localStorage` com chave `roteiro_polling_start_${pk}`
3. Calcular tempo: `Date.now() - pollingStartTimeRef.current`
4. Limpar localStorage quando procesamento completa

**Resultado**: Timer sempre mostra o tempo real desde que o processamento Databricks iniciou, independente de navegação. ✅
