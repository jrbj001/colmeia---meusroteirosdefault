# Correção DEFINITIVA: Timestamp Persistente com localStorage

## Problema que Ainda Persistia

Mesmo com o timestamp no componente pai (CriarRoteiro), quando o usuário navegava para **"Meus Roteiros"** e depois voltava clicando no roteiro, o loading voltava ao zero.

## Causa Raiz REAL

Quando você navega para "Meus Roteiros":
1. O componente `CriarRoteiro` é **DESMONTADO** completamente
2. Todas as refs e estados são **perdidos**
3. Quando você volta clicando no roteiro, é um **componente novo** do zero
4. `timestampInicioProcessamentoRef` volta a ser `null`

**Diagrama do Problema:**

```
11:10:00 - Criar roteiro, timestamp guardado na ref
11:10:30 - Timer: 30s ✅
11:10:45 - 👤 Clica em "Meus Roteiros"
         - CriarRoteiro DESMONTA ❌
         - Ref é perdida ❌
11:11:00 - 👤 Clica no roteiro de volta
         - CriarRoteiro MONTA DO ZERO
         - Ref = null ❌
         - Timer: 0s ❌ (deveria ser 60s!)
```

## Solução DEFINITIVA: localStorage

O `localStorage` persiste dados mesmo quando:
- ✅ Componente é desmontado
- ✅ Você navega entre páginas
- ✅ Você fecha e abre o browser (!)
- ✅ Você recarrega a página

## Implementação

### 1. Funções Helper para localStorage

```typescript
// Salvar timestamp
const salvarTimestampLocalStorage = (pk: number, timestamp: number) => {
  localStorage.setItem(`roteiro_timestamp_${pk}`, timestamp.toString());
  console.log('💾 Timestamp salvo no localStorage:', pk, '→', new Date(timestamp).toISOString());
};

// Recuperar timestamp
const recuperarTimestampLocalStorage = (pk: number): number | null => {
  const saved = localStorage.getItem(`roteiro_timestamp_${pk}`);
  if (saved) {
    const timestamp = parseInt(saved, 10);
    console.log('📂 Timestamp recuperado do localStorage:', pk, '→', new Date(timestamp).toISOString());
    return timestamp;
  }
  return null;
};

// Limpar timestamp
const limparTimestampLocalStorage = (pk: number) => {
  localStorage.removeItem(`roteiro_timestamp_${pk}`);
  console.log('🗑️ Timestamp removido do localStorage:', pk);
};
```

**Chave no localStorage**: `roteiro_timestamp_${pk}`
- Cada roteiro tem seu próprio timestamp
- Diferentes roteiros não interferem entre si

### 2. Função Helper Unificada

Para evitar duplicação de código:

```typescript
const guardarTimestamp = (pk: number) => {
  if (!timestampInicioProcessamentoRef.current) {
    const timestamp = Date.now();
    timestampInicioProcessamentoRef.current = timestamp; // Ref (para acesso rápido)
    salvarTimestampLocalStorage(pk, timestamp); // localStorage (para persistência)
    console.log('⏱️ Timestamp guardado (ref + localStorage):', new Date(timestamp).toISOString());
  } else {
    console.log('⏱️ Timestamp já existe, não sobrescrever');
  }
};
```

**Guarda em 2 lugares**:
1. **Ref**: Acesso rápido durante a sessão
2. **localStorage**: Persistência entre sessões

### 3. Recuperar Timestamp ao Montar Componente

```typescript
useEffect(() => {
  if (planoMidiaGrupo_pk && !timestampInicioProcessamentoRef.current) {
    const timestampSalvo = recuperarTimestampLocalStorage(planoMidiaGrupo_pk);
    if (timestampSalvo) {
      timestampInicioProcessamentoRef.current = timestampSalvo;
      console.log('🔄 Timestamp recuperado e aplicado na ref:', new Date(timestampSalvo).toISOString());
    }
  }
}, [planoMidiaGrupo_pk]);
```

**Quando executa**: Sempre que o componente monta ou o `planoMidiaGrupo_pk` muda.

**O que faz**: 
1. Verifica se existe timestamp salvo no localStorage
2. Se existe, carrega na ref
3. Hook de polling usa o timestamp recuperado

### 4. Limpar Timestamp ao Completar

```typescript
onComplete: () => {
  console.log('✅ Processamento concluído! Carregando resultados...');
  setAguardandoProcessamento(false);
  timestampInicioProcessamentoRef.current = null; // Limpa ref
  if (planoMidiaGrupo_pk) {
    limparTimestampLocalStorage(planoMidiaGrupo_pk); // Limpa localStorage
    carregarDadosResultados(planoMidiaGrupo_pk);
  }
}
```

**Importante**: Limpar AMBOS os lugares (ref + localStorage).

### 5. Usar `guardarTimestamp` em Todos os Locais

Substituído em 5 locais:

**1. Ao detectar roteiro em processamento (visualização):**
```typescript
if (roteiro.inProgress_bl === 1) {
  guardarTimestamp(roteiro.planoMidiaGrupo_pk);
  setAguardandoProcessamento(true);
}
```

**2. Após salvar roteiro simulado:**
```typescript
guardarTimestamp(planoMidiaGrupo_pk);
setAguardandoProcessamento(true);
```

**3. Em `verificarStatusECarregarDados`:**
```typescript
if (inProgress) {
  guardarTimestamp(planoMidiaGrupo_pk);
  setAguardandoProcessamento(true);
}
```

**4. Após publicar roteiro:**
```typescript
if (inProgress) {
  guardarTimestamp(planoMidiaGrupo_pk);
  setAguardandoProcessamento(true);
}
```

**5. Fallback em caso de erro:**
```typescript
catch (error) {
  guardarTimestamp(planoMidiaGrupo_pk);
  setAguardandoProcessamento(true);
}
```

## Fluxo Completo CORRIGIDO

### Cenário 1: Navegar entre abas (mesmo componente)

```
11:10:00 - Criar roteiro, timestamp: 11:10:00
         - Ref: 11:10:00 ✅
         - localStorage: 11:10:00 ✅
11:10:30 - Aba 6, Timer: 30s ✅
11:10:45 - Mudar para Aba 2
         - Componente NÃO desmonta
         - Ref: 11:10:00 ✅ (preservada)
11:11:00 - Voltar para Aba 6
         - Ref: 11:10:00 ✅ (nunca foi perdida)
         - Timer: 60s ✅
```

### Cenário 2: Navegar para "Meus Roteiros" e voltar

```
11:10:00 - Criar roteiro, timestamp: 11:10:00
         - Ref: 11:10:00 ✅
         - localStorage: 11:10:00 ✅
11:10:30 - Aba 6, Timer: 30s ✅
11:10:45 - 👤 Clica "Meus Roteiros"
         - CriarRoteiro DESMONTA
         - Ref: PERDIDA ❌
         - localStorage: 11:10:00 ✅✅✅ (PRESERVADO!)
11:11:00 - 👤 Clica no roteiro
         - CriarRoteiro MONTA DO ZERO
         - useEffect executa
         - 📂 Recupera localStorage: 11:10:00 ✅
         - Ref: 11:10:00 ✅ (restaurada!)
         - Timer: 60s ✅✅✅ (CONTINUOU!)
```

### Cenário 3: Recarregar página (F5)

```
11:10:00 - Criar roteiro, timestamp: 11:10:00
         - localStorage: 11:10:00 ✅
11:10:30 - Aba 6, Timer: 30s ✅
11:11:00 - 👤 Aperta F5 (recarrega página)
         - TUDO resetado
         - localStorage: 11:10:00 ✅✅✅ (SOBREVIVEU!)
11:11:05 - Página carrega
         - useEffect executa
         - 📂 Recupera localStorage: 11:10:00 ✅
         - Timer: 65s ✅✅✅ (CONTINUOU!)
```

### Cenário 4: Processamento completa

```
11:14:30 - Databricks termina
11:14:30 - onComplete() chamado
11:14:30 - Ref: null ✅
11:14:30 - localStorage: REMOVIDO ✅
11:14:30 - Mostra resultados
```

### Cenário 5: Novo roteiro

```
11:15:00 - Criar segundo roteiro (PK diferente!)
11:15:00 - useEffect não encontra timestamp no localStorage (PK diferente)
11:15:00 - guardarTimestamp: 11:15:00 (novo!)
11:15:03 - Timer: 3s ✅ (começa do zero, correto!)
```

## Console Logs Esperados

### Ao criar roteiro:
```
⏱️ Timestamp guardado (ref + localStorage): 2026-01-26T11:10:00.000Z
💾 Timestamp salvo no localStorage: 6941 → 2026-01-26T11:10:00.000Z
```

### Ao voltar de "Meus Roteiros":
```
📂 Timestamp recuperado do localStorage: 6941 → 2026-01-26T11:10:00.000Z
🔄 Timestamp recuperado e aplicado na ref: 2026-01-26T11:10:00.000Z
▶️ Polling ativo para roteiro: 6941 | Timestamp: 2026-01-26T11:10:00.000Z
⏱️ Tempo decorrido desde início: 90 segundos (timestamp: 2026-01-26T11:10:00.000Z)
```

**CRÍTICO**: O timestamp é o MESMO de quando o processamento começou!

### Ao completar:
```
✅ Processamento concluído! Carregando resultados...
🗑️ Timestamp removido do localStorage: 6941
```

## Por que Esta Solução é DEFINITIVA?

1. **localStorage sobrevive**:
   - ✅ Desmontagem de componente
   - ✅ Navegação entre páginas
   - ✅ Reload da página (F5)
   - ✅ Fechar e abrir browser

2. **Ref para performance**:
   - Acesso rápido durante a sessão
   - Não precisa ler localStorage a cada render

3. **Chave única por roteiro**:
   - `roteiro_timestamp_${pk}`
   - Diferentes roteiros não interferem

4. **Limpeza correta**:
   - Remove do localStorage quando completa
   - Evita dados órfãos

## Verificar no DevTools

### localStorage:

1. Abra DevTools (F12)
2. Vá para "Application" > "Local Storage"
3. Deve ver: `roteiro_timestamp_6941: "1706265000000"`

### Durante processamento:
```
roteiro_timestamp_6941: "1706265000000"
```

### Após completar:
```
(vazio - foi removido) ✅
```

## Teste Final DEFINITIVO

1. **Criar roteiro simulado**
2. **Aguardar 30 segundos** (timer: 30s)
3. **Clicar em "Meus Roteiros"** ← CRUCIAL!
4. **Aguardar 60 segundos** (no Meus Roteiros)
5. **Clicar no roteiro** para voltar
6. **Verificar**:
   - ✅ Timer: **~1min 30s** (NÃO 0s!)
   - ✅ Progresso: **~52%** (NÃO 0%!)
   - ✅ Console mostra "📂 Timestamp recuperado"
   - ✅ Timestamp é o MESMO de 90s atrás

## Se AINDA Não Funcionar

Se AINDA voltar ao zero após esse fix, então o problema NÃO é o timestamp, mas sim:

1. **`aguardandoProcessamento` está false** (polling não ativa)
2. **`planoMidiaGrupo_pk` está mudando** (PK diferente)
3. **Backend respondendo `inProgress: false`** incorretamente
4. **Outro componente/hook resetando estados**

Mas o **timestamp em si** está 100% garantido pela implementação com localStorage.
