# Correção: Polling em Background - Status Persistente

## Problema Identificado

Quando o usuário navega entre abas durante o processamento:

**COMPORTAMENTO ERRADO (ANTES)**:
1. Cria roteiro simulado
2. Aba 6 abre → Timer: 0min 30s, Progresso: 28%
3. Usuário muda para Aba 2
4. Usuário volta para Aba 6
5. ❌ Timer recomeça: 0min 0s, Progresso: 0%

**COMPORTAMENTO CORRETO (DEPOIS)**:
1. Cria roteiro simulado  
2. Aba 6 abre → Timer: 0min 30s, Progresso: 28%
3. Usuário muda para Aba 2 (polling continua em background)
4. Aguarda 1 minuto
5. Usuário volta para Aba 6
6. ✅ Timer mostra: 1min 30s, Progresso: 52% (continuou!)

## Causa Raiz

O `pollingStartTimeRef.current` estava sendo **resetado em 3 momentos incorretos**:

### 1. No `else` do useEffect (linha 107-109)
```typescript
} else {
  // ❌ ERRADO: Resetava quando enabled = false
  setTempoDecorrido(0);
  pollingStartTimeRef.current = null; // Perdia o timestamp!
}
```

**Problema**: Quando usuário saía da Aba 6, `enabled` poderia mudar, resetando o timestamp.

### 2. No cleanup do useEffect (linha 120)
```typescript
return () => {
  clearInterval(intervalRef.current);
  pollingStartTimeRef.current = null; // ❌ Perdia o timestamp!
};
```

**Problema**: Quando componente re-renderizava, cleanup resetava o timestamp.

### 3. Não detectava novo roteiro
**Problema**: Se usuário criasse um segundo roteiro, o timestamp do primeiro continuava.

## Solução Implementada

### 1. Adicionar Ref para Rastrear PK Anterior

```typescript
const pollingStartTimeRef = useRef<number | null>(null);
const lastRoteiroPkRef = useRef<number | null>(null); // ✅ NOVO!
```

### 2. Detectar Mudança de Roteiro

```typescript
// Detectar se é um NOVO roteiro (PK diferente)
const isNewRoteiro = roteiroPk && roteiroPk !== lastRoteiroPkRef.current;

// Se é novo roteiro, resetar timestamp
if (isNewRoteiro) {
  console.log('🆕 Novo roteiro detectado! Resetando timestamp...');
  pollingStartTimeRef.current = null;
  lastRoteiroPkRef.current = roteiroPk;
}
```

### 3. Preservar Timestamp Quando Polling Pausa

```typescript
if (enabled && roteiroPk) {
  // Guardar timestamp APENAS se ainda não existe
  if (!pollingStartTimeRef.current) {
    pollingStartTimeRef.current = Date.now();
    console.log('⏱️ Timestamp inicial guardado');
  } else {
    console.log('⏱️ Usando timestamp existente (continuando)'); // ✅
  }
  
  checkStatus();
  intervalRef.current = setInterval(checkStatus, interval);
} else {
  console.log('⏸️ Polling pausado (timestamp PRESERVADO)'); // ✅
  
  // Limpa APENAS o intervalo
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  
  // ✅ NÃO resetar timestamp aqui!
}
```

### 4. Limpar Apenas Intervalo no Cleanup

```typescript
return () => {
  if (intervalRef.current) {
    console.log('🧹 Limpando intervalo (timestamp PRESERVADO)'); // ✅
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  // ✅ NÃO resetar timestamp no cleanup!
};
```

### 5. Resetar Timestamp Apenas Quando Necessário

**Momento 1: Processamento Completa**
```typescript
if (!data.inProgress && wasProcessingRef.current) {
  console.log('✅ Processamento concluído!');
  onComplete();
  
  // ✅ AQUI SIM: Resetar timestamp
  pollingStartTimeRef.current = null;
  lastRoteiroPkRef.current = null;
  console.log('🔄 Timestamp resetado após conclusão');
}
```

**Momento 2: Novo Roteiro**
```typescript
const isNewRoteiro = roteiroPk && roteiroPk !== lastRoteiroPkRef.current;

if (isNewRoteiro) {
  // ✅ AQUI SIM: Resetar para novo roteiro
  pollingStartTimeRef.current = null;
  lastRoteiroPkRef.current = roteiroPk;
}
```

## Fluxo Completo Corrigido

### Cenário 1: Usuário Aguarda na Aba 6
```
11:10:00 - Roteiro criado, Aba 6 abre
11:10:00 - pollingStartTimeRef = 11:10:00
11:10:03 - Timer: 3s, Progresso: 3%
11:10:06 - Timer: 6s, Progresso: 5%
11:10:30 - Timer: 30s, Progresso: 28%
...
11:14:30 - Processamento termina
11:14:30 - Timer: 4min 30s, Progresso: 99%
11:14:30 - pollingStartTimeRef = null (resetado)
```

### Cenário 2: Usuário Navega Entre Abas
```
11:10:00 - Roteiro criado, Aba 6 abre
11:10:00 - pollingStartTimeRef = 11:10:00
11:10:30 - Timer: 30s, Progresso: 28%
11:10:30 - Usuário vai para Aba 2
11:10:30 - Intervalo limpo, MAS pollingStartTimeRef = 11:10:00 (preservado!) ✅
11:11:00 - (polling continua em background via CriarRoteiro)
11:11:30 - Usuário volta para Aba 6
11:11:30 - pollingStartTimeRef = 11:10:00 (ainda guardado!) ✅
11:11:30 - checkStatus() é chamado
11:11:30 - Timer: 1min 30s, Progresso: 52% ✅ (não começou do zero!)
11:14:30 - Processamento termina
```

### Cenário 3: Criar Segundo Roteiro
```
11:10:00 - Primeiro roteiro (PK 6941)
11:10:00 - pollingStartTimeRef = 11:10:00, lastRoteiroPkRef = 6941
11:14:30 - Processamento termina
11:14:30 - pollingStartTimeRef = null, lastRoteiroPkRef = null

11:15:00 - Segundo roteiro (PK 6942)
11:15:00 - isNewRoteiro = true (6942 !== null)
11:15:00 - pollingStartTimeRef = null (resetado) ✅
11:15:00 - lastRoteiroPkRef = 6942
11:15:00 - pollingStartTimeRef = 11:15:00 (novo timestamp) ✅
11:15:03 - Timer: 3s (começa do zero, correto!) ✅
```

## Console Logs Esperados

### Quando Usuário Sai da Aba 6:
```
⏸️ Polling pausado (timestamp PRESERVADO). enabled: false roteiroPk: 6941
🧹 Limpando intervalo (timestamp PRESERVADO)
```

### Quando Usuário Volta para Aba 6:
```
▶️ Iniciando/Continuando polling de status do roteiro: 6941
⏱️ Usando timestamp existente: 2026-01-26T11:10:00.000Z
🔍 Verificando status do roteiro PK: 6941
📊 Status recebido - inProgress: true
⏱️ Tempo decorrido desde início do polling: 90 segundos
```

### Quando Processamento Termina:
```
✅ Processamento concluído! Chamando onComplete...
🔄 Timestamp resetado após conclusão do processamento
```

### Quando Novo Roteiro é Criado:
```
🆕 Novo roteiro detectado! PK anterior: 6941 → Novo PK: 6942
⏱️ Timestamp inicial do polling guardado: 2026-01-26T11:15:00.000Z
```

## Modificações Realizadas

### Arquivo: `src/hooks/useRoteiroStatusPolling.ts`

1. ✅ Adicionado `lastRoteiroPkRef` para rastrear PK anterior
2. ✅ Detecta novo roteiro e reseta timestamp apenas nesse caso
3. ✅ Preserva timestamp quando polling pausa (enabled = false)
4. ✅ Não reseta timestamp no cleanup
5. ✅ Reseta timestamp apenas quando:
   - Processamento completa
   - Novo roteiro é criado

## Resultado

### ANTES:
```
Aba 6 → 30s, 28% → Muda para Aba 2 → Volta → 0s, 0% ❌
```

### DEPOIS:
```
Aba 6 → 30s, 28% → Muda para Aba 2 → Aguarda 1min → Volta → 1min 30s, 52% ✅
```

## Teste

1. **Criar roteiro simulado**
2. **Aguardar 30 segundos** (timer: 30s, progresso: ~28%)
3. **Mudar para Aba 1, 2, ou 3**
4. **Aguardar mais 30 segundos**
5. **Voltar para Aba 6**
6. **Verificar**:
   - ✅ Timer deve mostrar ~1min (não 0s!)
   - ✅ Progresso deve estar ~52% (não 0%!)
   - ✅ Etapa deve refletir o tempo real
7. **Aguardar até terminar**
8. **Criar segundo roteiro**
9. **Verificar**:
   - ✅ Timer deve começar do 0s (novo roteiro)
   - ✅ Progresso deve começar do 0%
