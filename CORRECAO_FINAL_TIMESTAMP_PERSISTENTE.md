# Correção FINAL: Timestamp Persistente no Componente Pai

## Problema que Persistia

Mesmo após as correções anteriores, quando o usuário navegava entre abas, a barra de progresso e o timer ainda voltavam para 0.

## Causa Raiz Final

O `pollingStartTimeRef` estava sendo gerenciado **dentro do hook** `useRoteiroStatusPolling`. 

**Problema**: O hook é afetado por mudanças nas suas dependências, especialmente `enabled`. Quando você mudava de aba:
1. `enabled` poderia mudar (mesmo que temporariamente)
2. useEffect executava de novo
3. Refs internas podiam ser afetadas por re-renders
4. Timestamp era perdido ou recriado

## Solução Definitiva

### Mover Timestamp para Componente Pai

**ANTES** (timestamp no hook):
```typescript
// useRoteiroStatusPolling.ts
const pollingStartTimeRef = useRef<number | null>(null);
// ❌ Problema: Dependente do ciclo de vida do hook
```

**DEPOIS** (timestamp no componente pai):
```typescript
// CriarRoteiro.tsx
const timestampInicioProcessamentoRef = useRef<number | null>(null);
// ✅ Solução: Independente do ciclo de vida do hook
```

### Por que Funciona?

1. **Componente CriarRoteiro não desmonta** quando você muda de aba
2. **Ref persiste** durante toda a sessão
3. **Hook apenas LEIA** o timestamp, não gerencia

## Implementação

### 1. Adicionar Ref no Componente Pai

```typescript
const timestampInicioProcessamentoRef = useRef<number | null>(null);
```

### 2. Passar Timestamp para o Hook

```typescript
const { isProcessing, tempoDecorrido } = useRoteiroStatusPolling({
  roteiroPk: planoMidiaGrupo_pk,
  enabled: aguardandoProcessamento,
  timestampInicio: timestampInicioProcessamentoRef.current, // ✅ Passa o timestamp
  onComplete: () => {
    setAguardandoProcessamento(false);
    timestampInicioProcessamentoRef.current = null; // ✅ Reseta no pai
    // ...
  }
});
```

### 3. Setar Timestamp ao Iniciar Processamento

Em **todos os locais** onde `setAguardandoProcessamento(true)` é chamado:

```typescript
// Guardar timestamp de início se ainda não existe
if (!timestampInicioProcessamentoRef.current) {
  timestampInicioProcessamentoRef.current = Date.now();
  console.log('⏱️ Timestamp guardado:', new Date(timestampInicioProcessamentoRef.current).toISOString());
}
setAguardandoProcessamento(true);
```

**Locais atualizados:**
1. Após salvar roteiro simulado (linha ~1011)
2. Em `verificarStatusECarregarDados` (linha ~1575)
3. Ao detectar roteiro em processamento no modo visualização (linha ~181)
4. Após publicar roteiro completo (linhas ~2211 e ~2222)

### 4. Simplificar Hook

O hook agora **apenas lê** o timestamp, não gerencia:

```typescript
// Calcular tempo usando timestamp PASSADO PELO PAI
if (data.inProgress && timestampInicio) {
  const agora = Date.now();
  const tempoDecorridoSegundos = Math.floor((agora - timestampInicio) / 1000);
  setTempoDecorrido(tempoDecorridoSegundos);
}
```

## Fluxo Completo

### Criar Roteiro e Navegar

```
11:10:00 - Criar roteiro simulado
11:10:00 - timestampInicioProcessamentoRef.current = 11:10:00 (guardado no pai)
11:10:00 - setAguardandoProcessamento(true)
11:10:00 - Aba 6 abre, timer: 0s

11:10:30 - Timer: 30s, Progresso: 28%
11:10:30 - 👤 Muda para Aba 2
         - Hook executa cleanup (limpa intervalo)
         - timestampInicioProcessamentoRef.current = 11:10:00 ✅ (PRESERVADO!)
         
11:11:00 - (processamento continua em background)

11:11:30 - 👤 Volta para Aba 6
         - Hook lê timestampInicioProcessamentoRef.current = 11:10:00 ✅
         - Calcula: Date.now() - 11:10:00 = 90 segundos
         - Timer: 1min 30s, Progresso: 52% ✅ (CONTINUOU!)
```

### Processamento Completa

```
11:14:30 - Databricks termina
11:14:30 - onComplete() é chamado
11:14:30 - timestampInicioProcessamentoRef.current = null ✅ (resetado no pai)
11:14:30 - Carrega dados e mostra resultados
```

### Novo Roteiro

```
11:15:00 - Criar segundo roteiro
11:15:00 - timestampInicioProcessamentoRef.current === null (foi resetado)
11:15:00 - timestampInicioProcessamentoRef.current = 11:15:00 ✅ (novo timestamp)
11:15:03 - Timer: 3s (começa do zero, correto!) ✅
```

## Modificações nos Arquivos

### `src/screens/CriarRoteiro/CriarRoteiro.tsx`

1. ✅ Adicionado `useRef` aos imports
2. ✅ Criado `timestampInicioProcessamentoRef`
3. ✅ Passado `timestampInicio` para o hook
4. ✅ Resetado timestamp no `onComplete`
5. ✅ Setado timestamp em todos os locais que ativam processamento

### `src/hooks/useRoteiroStatusPolling.ts`

1. ✅ Adicionado parâmetro `timestampInicio` na interface
2. ✅ Removido `pollingStartTimeRef` e `lastRoteiroPkRef` internos
3. ✅ Usamos `timestampInicio` passado como prop
4. ✅ Simplificado useEffect (sem lógica de gerenciar timestamp)

## Console Logs Esperados

### Ao Iniciar Processamento:
```
⏱️ Timestamp de início do processamento guardado: 2026-01-26T11:10:00.000Z
▶️ Polling ativo para roteiro: 6941 | Timestamp: 2026-01-26T11:10:00.000Z
```

### Ao Mudar de Aba:
```
⏸️ Polling pausado. enabled: false roteiroPk: 6941
🧹 Limpando intervalo no cleanup
```

### Ao Voltar para Aba 6:
```
▶️ Polling ativo para roteiro: 6941 | Timestamp: 2026-01-26T11:10:00.000Z
🔍 Verificando status do roteiro PK: 6941
⏱️ Tempo decorrido desde início: 90 segundos (timestamp: 2026-01-26T11:10:00.000Z)
```

**IMPORTANTE**: Timestamp é o MESMO! 11:10:00 não mudou!

### Ao Completar:
```
✅ Processamento concluído! Chamando onComplete...
(timestamp resetado no componente pai)
```

## Resultado Final

### ANTES (Problema):
```
Aba 6 (0s) → Muda para Aba 2 → Volta → Aba 6 (0s novamente) ❌
```

### DEPOIS (Funciona):
```
Aba 6 (30s) → Muda para Aba 2 (timestamp preservado) → Volta → Aba 6 (90s!) ✅
```

## Por que Esta Solução é Definitiva?

1. **Timestamp vive no componente pai** que NÃO desmonta
2. **Hook é stateless** em relação ao timestamp (apenas lê)
3. **Não depende de useEffect** re-executar corretamente
4. **Não depende de refs internas** do hook
5. **Simples e direto**: quem cria o processamento guarda o timestamp

## Teste Final

1. **Criar roteiro simulado**
2. **Aguardar 30 segundos** (timer: 30s, progresso: ~28%)
3. **Mudar para qualquer outra aba**
4. **Aguardar mais 60 segundos**
5. **Voltar para Aba 6**
6. **Verificar**:
   - ✅ Timer deve mostrar **~1min 30s** (não 0s!)
   - ✅ Progresso deve estar **~52%** (não 0%!)
   - ✅ Etapa deve ser "Calculando alcance e cobertura"
   - ✅ Console deve mostrar MESMO timestamp de antes

Se ainda não funcionar, o problema está em OUTRO lugar (não no timestamp).
