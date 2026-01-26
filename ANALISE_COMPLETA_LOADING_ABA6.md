# Análise Completa: Loading da Aba 6 - Todos os Caminhos e Estados

## Data: 2026-01-22
## Branch: ajuste-loading-resultados

---

## 📊 ESTADOS DE LOADING IDENTIFICADOS

### 1. aguardandoProcessamento (boolean)
**Quando**: Databricks está processando os dados (inProgress_bl = 1)  
**Componente**: `ProcessingResultsLoader` (tempo real, atualiza a cada 3s)  
**Cor**: Laranja (#FF9800)  
**Local**: Linha 4419-4423

```tsx
{aguardandoProcessamento ? (
  <ProcessingResultsLoader 
    nomeRoteiro={nomeRoteiro || roteiroData?.planoMidiaGrupo_st || 'Roteiro'}
    tempoDecorrido={tempoDecorrido}
  />
) : ( ... )}
```

---

### 2. carregandoResultados (boolean)
**Quando**: Carregando dados gerais (visão geral) da API  
**Componente**: Loading simples com spinner  
**Cor**: Laranja (#ff4600)  
**Local**: Linha 4434-4443

```tsx
return carregandoResultados && !aguardandoProcessamento ? (
  <div className="text-center py-12">
    <svg>... spinner laranja ...</svg>
    <p>Carregando dados dos resultados...</p>
  </div>
) : ( ... )
```

---

### 3. carregandoTarget (boolean)
**Quando**: Carregando dados de target da API  
**Componente**: Loading simples com spinner  
**Cor**: Azul (#3b82f6)  
**Local**: Linha 4523-4533

```tsx
if ((carregandoTarget || carregandoResultados) && !aguardandoProcessamento) {
  return (
    <div className="text-center py-12">
      <svg>... spinner azul ...</svg>
      <p>Carregando dados de target...</p>
    </div>
  );
}
```

**⚠️ PROBLEMA**: Depende também de `carregandoResultados` - SOBREPOSIÇÃO!

---

### 4. carregandoSemanais (boolean)
**Quando**: Carregando dados semanais (visão por praça) da API  
**Componente**: Loading simples com spinner  
**Cor**: Verde (#10b981)  
**Local**: Linha 4619-4629

```tsx
if (carregandoSemanais && !aguardandoProcessamento) {
  return (
    <div className="text-center py-12">
      <svg>... spinner verde ...</svg>
      <p>Carregando dados semanais...</p>
    </div>
  );
}
```

---

### 5. carregandoSemanaisTarget (boolean)
**Quando**: Carregando dados semanais de target da API  
**Componente**: Loading simples (não renderizado separadamente)  
**Uso**: Interno, não tem UI próprio

---

## 🛤️ DOIS CAMINHOS PARA ABA 6

### CAMINHO 1: Via "Meus Roteiros" (Modo Visualização)

**Fluxo**:
```
1. Usuário clica em roteiro na lista MeusRoteiros
2. Sistema navega para CriarRoteiro com:
   - location.state.modoVisualizacao = true
   - location.state.roteiroData = { ...dados }
   - location.state.abaInicial = 6

3. useEffect (linha 128-184) detecta modoVisualizacao
4. Carrega dados básicos (nome, gênero, classe, etc.)
5. Se location.state.abaInicial === 6:
   a. setAbaAtiva(6)
   b. setAba6Habilitada(true)
   c. setPlanoMidiaGrupo_pk(roteiro.planoMidiaGrupo_pk)
   
   d. Verifica roteiro.inProgress_bl:
      - Se === 1: setAguardandoProcessamento(true)
      - Se !== 1: carregarDadosResultados(pk)

6. Se aguardandoProcessamento = true:
   - Hook de polling inicia (linha 114-125)
   - ProcessingResultsLoader é exibido
   - Tempo atualiza a cada 3s
   - Quando terminar: onComplete() → carregarDadosResultados()

7. Se carregarDadosResultados() é chamado:
   - Ativa carregandoResultados, carregandoTarget, carregandoSemanais
   - Faz 6 requisições em paralelo
   - Processa dados
   - Desativa todos os loadings no finally
```

---

### CAMINHO 2: Após Preencher Aba 4 (Criação de Roteiro)

**Sub-Caminho 2A: Roteiro Simulado (Aba 4)**
```
1. Usuário preenche dados e clica "Salvar Roteiro Simulado"
2. handleSalvarRoteiroSimulado() executa
3. Sistema salva dados via /roteiro-simulado
4. Sistema dispara /databricks-roteiro-simulado
5. Linha 986-997:
   - setRoteiroSimuladoSalvo(true)
   - setAba4Preenchida(true)
   - setAba6Habilitada(true)
   - setAbaAtiva(6) ✅ NAVEGAÇÃO AUTOMÁTICA
   - setAguardandoProcessamento(true) ✅ ATIVA POLLING

6. ProcessingResultsLoader é exibido imediatamente
7. Hook de polling verifica status a cada 3s
8. Tempo atualiza em tempo real
9. Quando terminar: carregarDadosResultados()
```

**Sub-Caminho 2B: Roteiro Completo (Upload Excel)**
```
1. Usuário faz upload do Excel e clica "Publicar plano de mídia"
2. handlePublicarPlanoMidia() executa
3. Sistema processa:
   - Upload dos roteiros
   - Banco de Ativos
   - Criação de planos mídia
   - Databricks job
   - Carrega dados da Matrix (Aba 5)

4. Linha 2156-2181:
   - setAba6Habilitada(true)
   - setAbaAtiva(6) ✅ NAVEGAÇÃO AUTOMÁTICA
   - Verifica status via API /roteiro-status
   
   - Se inProgress = true:
     → setAguardandoProcessamento(true)
     → ProcessingResultsLoader exibido
   
   - Se inProgress = false:
     → carregarDadosResultados()
     → Loading simples exibido

5. Se aguardandoProcessamento:
   - Polling monitora
   - Tempo atualiza
   - Quando terminar: carrega dados

6. Se carregarDadosResultados:
   - Loadings simples exibidos
   - Dados carregados
   - Loadings desativados
```

---

### CAMINHO 3: Navegação Manual entre Abas

**Fluxo**:
```
1. Usuário está em outra aba (ex: Aba 5)
2. Clica no botão "06 Resultados"
3. navegarParaAba(6) é chamado (linha 2596)
4. Verifica se aba4Preenchida:
   - Se NÃO: Alert("É necessário preencher Aba 4...")
   - Se SIM: setAbaAtiva(6)

5. useEffect (linha 197-206) detecta mudança:
   - Se abaAtiva === 6 && aba6Habilitada && planoMidiaGrupo_pk
   - Se dadosResultados.length === 0
   - Se !aguardandoProcessamento && !carregandoResultados
   - Então: verificarStatusECarregarDados()

6. verificarStatusECarregarDados() (linha 1540-1571):
   - Verifica status via API
   - Se inProgress: setAguardandoProcessamento(true)
   - Se !inProgress: carregarDadosResultados()
```

---

## 🔴 PROBLEMAS E SOBREPOSIÇÕES IDENTIFICADOS

### Problema 1: Sobreposição de Loadings
**Localização**: Linha 4523

```tsx
if ((carregandoTarget || carregandoResultados) && !aguardandoProcessamento) {
```

**Problema**: 
- O loading de TARGET verifica `carregandoResultados` OU `carregandoTarget`
- Se ambos estiverem true, exibe loading de target
- Mas o loading de resultados gerais já foi exibido antes

**Impacto**:
- Dois loadings podem ser exibidos simultaneamente
- Confusão visual

---

### Problema 2: Ativação Simultânea de Múltiplos Loadings
**Localização**: Linha 1589-1591

```tsx
// ATIVAR TODOS OS LOADINGS ANTES DE COMEÇAR A CARREGAR
setCarregandoResultados(true);
setCarregandoTarget(true);
setCarregandoSemanais(true);
```

**Problema**:
- Todos os loadings são ativados ao mesmo tempo
- As requisições são em paralelo (Promise.all)
- Mas os loadings são desativados juntos no finally
- Usuário vê apenas 1 loading (o primeiro a ser renderizado)

**Impacto**:
- Não reflete o progresso real das requisições
- Experiência pode ser confusa

---

### Problema 3: useEffect Desativa Loading Prematuramente
**Localização**: Linha 192-193

```tsx
if (tipoVisualizacao === 'geral' && dadosResultados.length > 0 && carregandoResultados) {
  setCarregandoResultados(false);
}
```

**Problema**:
- useEffect pode desativar loading enquanto ainda está carregando
- Depende de dadosResultados.length, mas dados podem estar sendo processados

**Impacto**:
- Loading desaparece antes do tempo
- Flicker visual

---

### Problema 4: Condição de Renderização Complexa
**Localização**: Linha 4434

```tsx
return carregandoResultados && !aguardandoProcessamento ? (...)
```

**Problema**:
- Precisa verificar negação de outro estado
- Lógica booleana complexa espalhada em múltiplos locais
- Difícil de manter e entender

---

### Problema 5: ProcessingResultsLoader Sem Validação de Dados
**Localização**: Linha 4419-4423

```tsx
{aguardandoProcessamento ? (
  <ProcessingResultsLoader ... />
) : ( ... )}
```

**Problema**:
- Não verifica se planoMidiaGrupo_pk existe
- Não verifica se polling está realmente ativo
- Se aguardandoProcessamento for true por engano, mostra loader incorreto

---

## 💡 SOLUÇÃO PROPOSTA

### Princípio: Um Loading de Cada Vez

**Hierarquia de Prioridade**:
```
1. aguardandoProcessamento (ProcessingResultsLoader)
   ↓ SÓ SE FALSO ↓
2. carregandoDadosGerais (loading simples unificado)
   ↓ DENTRO DE CADA SEÇÃO ↓
3. Dados ou mensagem "sem dados"
```

### Nova Estrutura

```tsx
{/* ABA 6 - RENDERIZAÇÃO */}
{abaAtiva === 6 && (aba6Habilitada || modoVisualizacao) && (
  <>
    {/* Informações do plano - sempre visível */}
    <div>...</div>
    
    {/* Combo de visualização - sempre visível */}
    <div>...</div>
    
    {/* LOADING PRINCIPAL - PROCESSAMENTO DATABRICKS */}
    {aguardandoProcessamento && planoMidiaGrupo_pk ? (
      <ProcessingResultsLoader 
        nomeRoteiro={nomeRoteiro}
        tempoDecorrido={tempoDecorrido}
      />
    ) : carregandoDadosGerais ? (
      {/* LOADING SECUNDÁRIO - CARREGANDO DADOS PRONTOS */}
      <LoadingDadosGerais />
    ) : (
      {/* DADOS - Visão Geral ou Por Praça */}
      <DadosResultados />
    )}
  </>
)}
```

---

### Novo Estado Unificado

```tsx
// Remover: carregandoResultados, carregandoTarget, carregandoSemanais
// Adicionar: carregandoDadosGerais (boolean)

const [carregandoDadosGerais, setCarregandoDadosGerais] = useState(false);
```

**Quando ativar**:
- Início de carregarDadosResultados()

**Quando desativar**:
- Fim de carregarDadosResultados() (finally)

**Benefícios**:
- Um único loading para todas as requisições
- Mais simples de gerenciar
- Sem sobreposições

---

### Nova Função carregarDadosResultados()

```tsx
const carregarDadosResultados = async (pkOverride?: number) => {
  const pkToUse = pkOverride || planoMidiaGrupo_pk;
  
  if (!pkToUse) {
    console.log('⚠️ planoMidiaGrupo_pk não disponível');
    return;
  }

  try {
    // ✅ ATIVAR APENAS UM LOADING
    setCarregandoDadosGerais(true);
    
    console.log('🔄 Carregando TODOS os dados em paralelo...');

    // Carregar TUDO em paralelo
    const [
      responseGeral,
      summaryResponseGeral,
      responseTarget,
      summaryResponseTarget,
      responseSemanais,
      summaryResponseSemanais
    ] = await Promise.all([
      axios.post('/report-indicadores-vias-publicas', { report_pk: pkToUse }),
      axios.post('/report-indicadores-summary', { report_pk: pkToUse }),
      axios.post('/report-indicadores-target', { report_pk: pkToUse }),
      axios.post('/report-indicadores-target-summary', { report_pk: pkToUse }),
      axios.post('/report-indicadores-week', { report_pk: pkToUse }),
      axios.post('/report-indicadores-week-summary', { report_pk: pkToUse })
    ]);

    // Processar dados gerais
    if (responseGeral.data.success) {
      setDadosResultados(responseGeral.data.data);
      if (summaryResponseGeral.data.success) {
        setTotaisResultados(summaryResponseGeral.data.data);
      }
    }

    // Processar dados de target
    if (responseTarget.data.success) {
      setDadosTarget(responseTarget.data.data);
      if (summaryResponseTarget.data.success) {
        setTotaisTarget(summaryResponseTarget.data.data);
      }
    }

    // Processar dados semanais
    if (responseSemanais.data.success) {
      setDadosSemanais(responseSemanais.data.data);
      if (summaryResponseSemanais.data.success) {
        setDadosSemanaisSummary(summaryResponseSemanais.data.data);
      }
    }

    // Carregar dados semanais de target (não bloqueia)
    carregarDadosSemanaisTarget(pkToUse);
    
    console.log('✅ TODOS os dados carregados!');
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    setAba6Habilitada(true);
  } finally {
    // ✅ DESATIVAR APENAS UM LOADING
    setCarregandoDadosGerais(false);
  }
};
```

---

### Nova Renderização da Aba 6

```tsx
{abaAtiva === 6 && (aba6Habilitada || modoVisualizacao) && (
  <>
    {/* Informações do plano */}
    <InformacoesPlano />
    
    {/* Combo de visualização */}
    <ComboVisualizacao />
    
    {/* HIERARQUIA DE LOADING CLARA */}
    {aguardandoProcessamento && planoMidiaGrupo_pk ? (
      // NÍVEL 1: Processamento Databricks em andamento
      <ProcessingResultsLoader 
        nomeRoteiro={nomeRoteiro || roteiroData?.planoMidiaGrupo_st || 'Roteiro'}
        tempoDecorrido={tempoDecorrido}
      />
    ) : carregandoDadosGerais ? (
      // NÍVEL 2: Carregando dados já processados
      <div className="text-center py-16">
        <div className="mx-auto mb-6" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" 
               style={{ animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
            <circle cx="12" cy="12" r="10" fill="none" 
                    stroke="#ff4600" strokeWidth="2.5" 
                    strokeLinecap="round" strokeDasharray="60 158" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold text-lg mb-2">
          Carregando dados dos resultados
        </p>
        <p className="text-sm text-gray-500">
          Buscando métricas de performance...
        </p>
      </div>
    ) : (
      // NÍVEL 3: Dados carregados - mostrar tabelas
      <div className="space-y-8">
        {tipoVisualizacao === 'geral' ? (
          <>
            {/* Visão Geral */}
            {dadosResultados.length > 0 ? (
              <TabelaResultadosGeral dados={dadosResultados} totais={totaisResultados} />
            ) : (
              <MensagemSemDados tipo="geral" />
            )}
            
            {/* Target */}
            {dadosTarget.length > 0 ? (
              <TabelaResultadosTarget dados={dadosTarget} totais={totaisTarget} />
            ) : (
              <MensagemSemDados tipo="target" />
            )}
          </>
        ) : (
          <>
            {/* Visão Por Praça */}
            {dadosSemanais.length > 0 ? (
              <TabelaResultadosSemanais dados={dadosSemanais} summary={dadosSemanaisSummary} />
            ) : (
              <MensagemSemDados tipo="semanal" />
            )}
          </>
        )}
      </div>
    )}
  </>
)}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Limpeza
- [ ] 1.1. Remover useEffect que desativa loading (linha 192-193)
- [ ] 1.2. Criar novo estado `carregandoDadosGerais`
- [ ] 1.3. Remover `carregandoResultados`, `carregandoTarget`, `carregandoSemanais`

### Fase 2: Atualizar carregarDadosResultados()
- [ ] 2.1. Substituir múltiplos `set...Loading(true)` por `setCarregandoDadosGerais(true)`
- [ ] 2.2. Substituir múltiplos `set...Loading(false)` por `setCarregandoDadosGerais(false)`
- [ ] 2.3. Manter logs para debug

### Fase 3: Atualizar Renderização
- [ ] 3.1. Simplificar condições de loading
- [ ] 3.2. Usar hierarquia clara: aguardandoProcessamento > carregandoDadosGerais > dados
- [ ] 3.3. Remover lógicas booleanas complexas

### Fase 4: Validações
- [ ] 4.1. Adicionar validação `planoMidiaGrupo_pk` no ProcessingResultsLoader
- [ ] 4.2. Adicionar fallbacks para dados ausentes
- [ ] 4.3. Melhorar mensagens de erro

### Fase 5: Testes
- [ ] 5.1. Testar caminho 1 (Meus Roteiros - em processamento)
- [ ] 5.2. Testar caminho 1 (Meus Roteiros - processado)
- [ ] 5.3. Testar caminho 2A (Roteiro simulado)
- [ ] 5.4. Testar caminho 2B (Roteiro completo)
- [ ] 5.5. Testar caminho 3 (Navegação manual)
- [ ] 5.6. Testar mudança de visualização (geral ↔ praça)

---

## ⚠️ CUIDADOS

1. **Não quebrar modo visualização**: Garantir que modoVisualizacao continua funcionando
2. **Manter polling**: Garantir que polling continua em background
3. **Logs**: Manter logs para debug durante transição
4. **Backward compatibility**: Garantir que roteiros antigos continuam funcionando

---

## 🎯 RESULTADO ESPERADO

### Antes (Problemático)
```
- Múltiplos loadings ativados simultaneamente
- Sobreposições visuais
- Lógica complexa espalhada
- Difícil de manter
```

### Depois (Limpo)
```
- Um loading por vez
- Hierarquia clara
- Lógica centralizada
- Fácil de entender e manter
```

---

**Status**: 🔴 ANÁLISE COMPLETA - AGUARDANDO IMPLEMENTAÇÃO  
**Próximo Passo**: Implementar fase 1 (Limpeza)
