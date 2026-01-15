# ⏳ Implementação: Loading Inteligente de Resultados

## 📝 Resumo

Implementação de um sistema de **polling inteligente** que detecta quando um roteiro está sendo processado em background (Databricks) e exibe um loading informativo até que os resultados estejam disponíveis.

---

## ❌ **Problema Identificado**

### **Situação Anterior:**
1. Usuário sobe plano de mídia → Backend inicia processamento (Databricks)
2. Campo `inProgress_bl = 1` indica processamento ativo
3. Usuário clica em "Visualizar Resultados" na Aba 6
4. **PROBLEMA**: Tela tenta carregar dados que ainda não existem
5. Usuário não sabe o que está acontecendo ou quanto tempo vai demorar

---

## ✅ **Solução Implementada**

### **Sistema de Polling Inteligente com:**
- ✅ Detecta automaticamente se roteiro está processando (`inProgress_bl = 1`)
- ✅ Faz polling no banco de dados a cada 3 segundos
- ✅ Exibe loading visual informativo com:
  - Tempo decorrido em tempo real (MM:SS)
  - Mensagens motivacionais dinâmicas
  - Barra de progresso estimada
  - Informações sobre o que está acontecendo
- ✅ Carrega resultados automaticamente quando processamento termina
- ✅ Usuário pode sair e voltar - processamento continua em background

---

## 📦 **Arquivos Criados/Modificados**

### **1. API Endpoint - Status do Roteiro**
📁 `api/roteiro-status.js` **[NOVO]**

**Endpoint:** `GET /roteiro-status?pk=123`

**Funcionalidade:**
- Consulta status atual do roteiro no banco
- Retorna se está processando (`inProgress_bl`)
- Dados retornados:
  ```json
  {
    "success": true,
    "data": {
      "pk": 123,
      "nome": "Nome do Roteiro",
      "inProgress": true,
      "status": "Processando",
      "dataCriacao": "2025-12-19T...",
      "ativo": true,
      "deletado": false
    }
  }
  ```

---

### **2. Hook Customizado - Polling de Status**
📁 `src/hooks/useRoteiroStatusPolling.ts` **[NOVO]**

**Funcionalidade:**
- Hook React customizado para fazer polling do status
- Verifica status a cada 3 segundos (configurável)
- Conta tempo decorrido desde o início
- Chama callback quando processamento completa
- Para automaticamente quando detecta conclusão

**Uso:**
```typescript
const { isProcessing, tempoDecorrido } = useRoteiroStatusPolling({
  roteiroPk: 123,
  enabled: true,
  onComplete: () => {
    console.log('Processamento concluído!');
    carregarResultados();
  },
  interval: 3000 // 3 segundos
});
```

---

### **3. Componente Visual - Loading Informativo**
📁 `src/components/ProcessingResultsLoader/ProcessingResultsLoader.tsx` **[NOVO]**

**Funcionalidade:**
- Componente visual bonito e informativo
- Spinner animado com gradiente
- Nome do roteiro destacado
- Mensagens dinâmicas baseadas no tempo:
  - 0-30s: "Iniciando processamento..."
  - 30-60s: "Analisando dados do plano de mídia..."
  - 60-120s: "Processando indicadores de performance..."
  - 120-180s: "Calculando métricas de cobertura..."
  - 180-240s: "Quase lá! Finalizando cálculos..."
  - 240s+: "Processamento em andamento no Databricks..."
- Barra de progresso visual (estimativa até 5 minutos)
- Contador de tempo decorrido (MM:SS)
- Card informativo explicando o que está acontecendo
- Indicador de atualização automática

---

### **4. Integração no CriarRoteiro.tsx**
📁 `src/screens/CriarRoteiro/CriarRoteiro.tsx` **[MODIFICADO]**

**Modificações:**

#### **a) Imports adicionados:**
```typescript
import { useRoteiroStatusPolling } from "../../hooks/useRoteiroStatusPolling";
import { ProcessingResultsLoader } from "../../components/ProcessingResultsLoader/ProcessingResultsLoader";
```

#### **b) Novo estado:**
```typescript
const [aguardandoProcessamento, setAguardandoProcessamento] = useState(false);
```

#### **c) Hook de polling:**
```typescript
const { isProcessing, tempoDecorrido } = useRoteiroStatusPolling({
  roteiroPk: planoMidiaGrupo_pk,
  enabled: aguardandoProcessamento && abaAtiva === 6,
  onComplete: () => {
    setAguardandoProcessamento(false);
    if (planoMidiaGrupo_pk) {
      carregarDadosResultados(planoMidiaGrupo_pk);
    }
  },
  interval: 3000
});
```

#### **d) Lógica de detecção no modo visualização:**
```typescript
// Verificar se está em processamento
if (roteiro.inProgress_bl === 1) {
  console.log('⏳ Roteiro em processamento. Ativando polling...');
  setAguardandoProcessamento(true);
} else {
  console.log('✅ Roteiro finalizado. Carregando dados...');
  carregarDadosResultados(roteiro.planoMidiaGrupo_pk);
}
```

#### **e) Renderização condicional na Aba 6:**
```tsx
{aguardandoProcessamento ? (
  <ProcessingResultsLoader 
    nomeRoteiro={nomeRoteiro || roteiroData?.planoMidiaGrupo_st || 'Roteiro'}
    tempoDecorrido={tempoDecorrido}
  />
) : (
  // Tabelas de resultados normais
)}
```

---

### **5. Configuração Vercel**
📁 `vercel.json` **[MODIFICADO]**

**Rota adicionada:**
```json
{
  "source": "/roteiro-status",
  "destination": "/api/roteiro-status.js"
}
```

---

## 🔄 **Fluxo de Funcionamento**

### **Cenário 1: Roteiro Já Processado**
1. Usuário clica em "Visualizar Resultados"
2. Sistema detecta `inProgress_bl = 0`
3. Carrega dados imediatamente
4. Exibe tabelas de resultados normalmente

### **Cenário 2: Roteiro em Processamento**
1. Usuário clica em "Visualizar Resultados"
2. Sistema detecta `inProgress_bl = 1`
3. Ativa `aguardandoProcessamento = true`
4. Hook de polling inicia verificação a cada 3s
5. Exibe `ProcessingResultsLoader` com:
   - Nome do roteiro
   - Tempo decorrido (atualizando a cada segundo)
   - Mensagens motivacionais
   - Barra de progresso
6. A cada 3 segundos:
   - Faz GET /roteiro-status?pk=123
   - Verifica se `inProgress = false`
7. Quando detecta conclusão:
   - Para o polling
   - Desativa `aguardandoProcessamento`
   - Chama `carregarDadosResultados()`
   - Exibe resultados automaticamente

---

## 🎯 **Benefícios**

### **Para o Usuário:**
✅ Sabe exatamente o que está acontecendo  
✅ Vê quanto tempo passou desde o início  
✅ Recebe mensagens motivacionais  
✅ Entende que é processamento em background  
✅ Não precisa ficar atualizando a página  
✅ Pode sair e voltar depois  

### **Para o Sistema:**
✅ Evita tentativas de carregar dados inexistentes  
✅ Reduz carga no servidor (polling otimizado)  
✅ Experiência profissional e polida  
✅ Código limpo e reutilizável  
✅ Fácil manutenção  

---

## 🧪 **Como Testar**

### **Teste 1: Roteiro em Processamento**
1. Criar um novo roteiro e submeter plano de mídia
2. IMEDIATAMENTE clicar em "Visualizar Resultados"
3. **Resultado Esperado:**
   - Loading informativo aparece
   - Tempo começa a contar
   - Mensagens mudam conforme tempo passa
   - Quando processar terminar, resultados aparecem automaticamente

### **Teste 2: Roteiro Já Finalizado**
1. Abrir "Meus Roteiros"
2. Clicar em "Visualizar Resultados" de um roteiro com status "Finalizado"
3. **Resultado Esperado:**
   - Resultados carregam imediatamente
   - Sem mostrar loading de processamento

### **Teste 3: Sair e Voltar Durante Processamento**
1. Criar roteiro e submeter
2. Ir para "Visualizar Resultados" (loading aparece)
3. Voltar para "Meus Roteiros"
4. Aguardar alguns segundos
5. Voltar para "Visualizar Resultados"
6. **Resultado Esperado:**
   - Se ainda está processando: loading volta a aparecer (tempo reseta)
   - Se terminou: resultados aparecem

---

## ⚙️ **Configurações Ajustáveis**

### **Intervalo de Polling:**
```typescript
// Em useRoteiroStatusPolling
interval: 3000 // 3 segundos (padrão)
```

### **Tempo Máximo Estimado:**
```typescript
// Em ProcessingResultsLoader.tsx
const maxTempo = 300; // 5 minutos (padrão)
```

### **Mensagens Motivacionais:**
```typescript
// Em ProcessingResultsLoader.tsx
const mensagem = useMemo(() => {
  if (tempoDecorrido < 30) return "Iniciando processamento...";
  // ... customize aqui
}, [tempoDecorrido]);
```

---

## 📊 **Estrutura de Arquivos**

```
📁 api/
  └── roteiro-status.js                             [NOVO]

📁 src/
  ├── hooks/
  │   └── useRoteiroStatusPolling.ts                [NOVO]
  ├── components/
  │   └── ProcessingResultsLoader/
  │       └── ProcessingResultsLoader.tsx           [NOVO]
  └── screens/
      └── CriarRoteiro/
          └── CriarRoteiro.tsx                      [MODIFICADO]

📄 vercel.json                                      [MODIFICADO]
```

---

## 🐛 **Troubleshooting**

### Problema: Polling não para
**Solução**: Verificar se campo `inProgress_bl` está sendo atualizado corretamente no banco após processamento

### Problema: Loading não aparece
**Solução**: Verificar se `inProgress_bl = 1` quando roteiro é criado

### Problema: Erro 404 na API
**Solução**: Verificar se route foi adicionada no vercel.json e fazer redeploy

### Problema: Tempo não atualiza
**Solução**: Verificar se hook está enabled (`aguardandoProcessamento && abaAtiva === 6`)

---

## 🚀 **Próximos Passos (Opcionais)**

- [ ] Adicionar notificação push quando processamento terminar
- [ ] Salvar histórico de tempo de processamento para melhor estimativa
- [ ] Adicionar opção de cancelar processamento
- [ ] Integrar com WebSockets para atualização em tempo real (eliminar polling)
- [ ] Adicionar analytics de tempo médio de processamento

---

**Implementado em:** 19/12/2025  
**Branch:** `loading-resultados`  
**Status:** ✅ Completo e pronto para testes  
**Testado com:** Vercel Dev
