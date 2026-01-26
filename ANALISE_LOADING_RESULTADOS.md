# Análise: Problema com Loading da Aba 6 (Resultados)

## Data: 2026-01-22
## Branch: ajuste-loading-resultados

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Loading Inicial dos Resultados (carregandoResultados)

**Localização**: Linha 4364 em `CriarRoteiro.tsx`

**Problema**: 
- O loading `carregandoResultados` não reflete a evolução do carregamento
- Os estados são ativados e desativados muito rápido
- A experiência do usuário não mostra feedback visual adequado

**Código Atual**:
```tsx
return carregandoResultados && !aguardandoProcessamento ? (
  <div className="text-center py-12">
    {/* Loading simples */}
  </div>
) : dadosResultados.length > 0 ? (
  {/* Tabela de dados */}
) : (
  {/* Mensagem "nenhum dado disponível" */}
)
```

**Fluxo Atual da Função `carregarDadosResultados()` (linhas 1529-1629)**:
1. Ativa TODOS os loadings (`setCarregandoResultados(true)`, `setCarregandoTarget(true)`, `setCarregandoSemanais(true)`)
2. Faz 6 requisições em paralelo via `Promise.all()`
3. Processa as respostas
4. No `finally`: **Desativa TODOS os loadings imediatamente**

**Resultado**: Loading fica visível por milissegundos apenas

---

### 2. Loading Após Publicação (ProcessingResultsLoader)

**Localização**: Linha 4349 em `CriarRoteiro.tsx`

**Problema**: 
- Após publicar na aba 4, o sistema não ativa o `ProcessingResultsLoader`
- O usuário vai para a aba 6 e não vê feedback de que o processamento está em andamento
- O componente `ProcessingResultsLoader` só é mostrado se `aguardandoProcessamento === true`

**Código Atual**:
```tsx
{aguardandoProcessamento ? (
  <ProcessingResultsLoader 
    nomeRoteiro={nomeRoteiro || roteiroData?.planoMidiaGrupo_st || 'Roteiro'}
    tempoDecorrido={tempoDecorrido}
  />
) : (
  {/* Tabelas de resultados */}
)}
```

**Fluxo Atual Após Publicação (linha 2112)**:
```tsx
// 8. Habilitar Aba 6 e carregar dados dos resultados imediatamente
console.log('✅ Habilitando Aba 6 e carregando dados dos resultados...');
setAba6Habilitada(true);
await carregarDadosResultados();  // ❌ PROBLEMA AQUI
```

**Problema**: 
- O sistema chama `carregarDadosResultados()` imediatamente após a publicação
- **MAS** os dados ainda não foram processados pelo Databricks (pode levar minutos)
- Resultado: Tabelas vazias ou dados incompletos

---

### 3. Hook de Polling (useRoteiroStatusPolling)

**Localização**: `src/hooks/useRoteiroStatusPolling.ts`

**Funcionamento**:
```tsx
const { isProcessing, tempoDecorrido } = useRoteiroStatusPolling({
  roteiroPk: planoMidiaGrupo_pk,
  enabled: aguardandoProcessamento && abaAtiva === 6,  // ⚠️ Só ativa se aguardandoProcessamento = true
  onComplete: () => {
    setAguardandoProcessamento(false);
    carregarDadosResultados(planoMidiaGrupo_pk);
  },
  interval: 3000
});
```

**O que faz**:
- Faz polling a cada 3 segundos para verificar status do roteiro
- Verifica se `inProgress_bl === false` (processamento concluído)
- Quando termina, chama `onComplete()` que carrega os dados

**Problema**: 
- Só funciona se `aguardandoProcessamento === true` E `abaAtiva === 6`
- Após a publicação, `aguardandoProcessamento` **não é ativado automaticamente**
- Portanto, o polling **nunca inicia**

---

## 🎯 SITUAÇÕES QUE PRECISAM SER CORRIGIDAS

### Situação 1: Após Publicar na Aba 4

**O que acontece hoje**:
1. Usuário publica roteiro na aba 4
2. Sistema chama `carregarDadosResultados()` (linha 2112)
3. API retorna dados vazios (ainda não processados)
4. Loading desaparece em milissegundos
5. Usuário vê mensagem "Nenhum dado disponível"
6. **MAS** o Databricks está processando em background

**O que deveria acontecer**:
1. Usuário publica roteiro na aba 4
2. Sistema verifica se roteiro está `inProgress_bl === 1`
3. Se SIM: Ativa `aguardandoProcessamento = true`
4. Não chama `carregarDadosResultados()` ainda
5. Usuário vê `ProcessingResultsLoader` com tempo decorrido
6. Polling verifica status a cada 3 segundos
7. Quando processar, carrega dados automaticamente

### Situação 2: Navegando de Volta para Aba 6

**O que acontece hoje**:
1. Usuário cria roteiro, navega para outras abas
2. Volta para aba 6 depois de alguns minutos
3. Dados podem ter sido processados, mas não são recarregados automaticamente
4. Usuário precisa recarregar a página

**O que deveria acontecer**:
1. Ao entrar na aba 6, verificar status do roteiro
2. Se ainda em processamento: Mostrar `ProcessingResultsLoader`
3. Se processado mas dados não carregados: Carregar dados
4. Se dados já carregados: Mostrar dados

### Situação 3: Modo Visualização (Vindo de MeusRoteiros)

**O que acontece hoje**:
✅ Este fluxo ESTÁ funcionando corretamente (linhas 172-178)
```tsx
if (roteiro.inProgress_bl === 1) {
  console.log('⏳ Roteiro em processamento. Ativando polling...');
  setAguardandoProcessamento(true);
} else {
  console.log('✅ Roteiro finalizado. Carregando dados...');
  carregarDadosResultados(roteiro.planoMidiaGrupo_pk);
}
```

---

## 💡 SOLUÇÃO PROPOSTA

### 1. Modificar fluxo após publicação (linha 2112)

**Antes**:
```tsx
setAba6Habilitada(true);
await carregarDadosResultados();
```

**Depois**:
```tsx
setAba6Habilitada(true);
// Verificar se está em processamento antes de carregar dados
const statusResponse = await axios.get(`/roteiro-status?pk=${planoMidiaGrupo_pk}`);
if (statusResponse.data.success && statusResponse.data.data.inProgress) {
  console.log('⏳ Roteiro publicado está em processamento. Ativando polling...');
  setAguardandoProcessamento(true);
} else {
  console.log('✅ Roteiro publicado já processado. Carregando dados...');
  await carregarDadosResultados();
}
```

### 2. Adicionar verificação ao entrar na Aba 6

**Criar useEffect** para monitorar mudanças de aba:
```tsx
useEffect(() => {
  if (abaAtiva === 6 && aba6Habilitada && planoMidiaGrupo_pk) {
    // Verificar se já tem dados carregados
    if (dadosResultados.length === 0 && !aguardandoProcessamento && !carregandoResultados) {
      console.log('📊 Entrando na Aba 6 sem dados. Verificando status...');
      verificarStatusECarregarDados();
    }
  }
}, [abaAtiva, aba6Habilitada, planoMidiaGrupo_pk]);

const verificarStatusECarregarDados = async () => {
  if (!planoMidiaGrupo_pk) return;
  
  try {
    const statusResponse = await axios.get(`/roteiro-status?pk=${planoMidiaGrupo_pk}`);
    if (statusResponse.data.success && statusResponse.data.data) {
      const { inProgress } = statusResponse.data.data;
      
      if (inProgress) {
        console.log('⏳ Roteiro ainda em processamento. Ativando polling...');
        setAguardandoProcessamento(true);
      } else {
        console.log('✅ Roteiro processado. Carregando dados...');
        carregarDadosResultados(planoMidiaGrupo_pk);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
  }
};
```

### 3. Melhorar feedback visual do loading simples

Manter o loading `carregandoResultados` para carregamentos rápidos, mas com melhor animação e mensagens

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] 1. Criar função `verificarStatusECarregarDados()`
- [ ] 2. Modificar fluxo após publicação (linha 2112) para verificar status
- [ ] 3. Adicionar useEffect para monitorar entrada na Aba 6
- [ ] 4. Testar fluxo: Criar roteiro → Ir para Aba 6 → Verificar ProcessingResultsLoader
- [ ] 5. Testar fluxo: Criar roteiro → Sair da Aba 6 → Voltar depois
- [ ] 6. Testar fluxo: Modo visualização com roteiro em processamento
- [ ] 7. Testar fluxo: Modo visualização com roteiro já processado

---

## 🧪 CENÁRIOS DE TESTE

1. **Criar roteiro novo e ir direto para Aba 6**
   - Deve mostrar ProcessingResultsLoader
   - Deve atualizar tempo decorrido
   - Deve carregar dados quando processar

2. **Criar roteiro, sair da Aba 6, voltar depois**
   - Se ainda processando: Mostrar ProcessingResultsLoader
   - Se já processado: Carregar e mostrar dados

3. **Abrir roteiro em processamento via MeusRoteiros**
   - Deve mostrar ProcessingResultsLoader (JÁ FUNCIONA)

4. **Abrir roteiro processado via MeusRoteiros**
   - Deve carregar e mostrar dados (JÁ FUNCIONA)

5. **Recarregar página com aba 6 ativa**
   - Deve verificar status e agir adequadamente

---

## 🔑 PONTOS-CHAVE

1. **NUNCA** chamar `carregarDadosResultados()` se `inProgress === true`
2. **SEMPRE** verificar status antes de decidir mostrar loading ou dados
3. **ProcessingResultsLoader** é para processamento longo (Databricks)
4. **Loading simples** (`carregandoResultados`) é para carregamento rápido de dados prontos
5. **Hook de polling** só funciona se `aguardandoProcessamento === true` E `abaAtiva === 6`

---

## ⚠️ CUIDADOS

1. Não criar loops infinitos de verificação
2. Garantir que polling seja limpo (cleanup) quando não necessário
3. Manter logs para debug durante implementação
4. Testar com roteiros que processam rápido E devagar
5. Garantir que não quebra fluxo de visualização existente
