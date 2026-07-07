# Colmeia — Arquitetura, pipeline e visão (documento para apresentação)

Nova versão do documento de arquitetura e visão geral da plataforma Colmeia, alinhada à versão 2.0 em produção (React, Node.js serverless, Auth0, multi-tenant).  
*Revisão: 2026 — substitui o documento anterior com anotação "@ Ze, revisar".*

---

## Visão geral (Overview)

- **Colmeia** é uma solução proprietária da Be Mediatech para aumentar a visibilidade e a eficiência no planejamento de mídia OOH (Out-of-Home).
- Permite simular, comparar e otimizar planos com base em cenários e variáveis como localização, período, tipo de mídia e alvo demográfico.
- Integra dados de visibilidade por tipo de ponto, dados geográficos, perfis de consumo e fluxos de tráfego, gerando indicadores de impacto, cobertura e frequência.
- Utiliza deflatores proprietários (sobreposição geográfica, penetração de mídia, potencial de visualização) para estimativas de impacto.
- Suporta roteirização automatizada ou manual, análise de planos existentes e suporte a propostas a clientes.
- **Indicadores principais:** cobertura absoluta e percentual, frequência média, impactos totais, TRP e CPM, por alvo.
- **Modelo SaaS:** Be (uso interno) e agências parceiras acessam a mesma aplicação; agências veem apenas roteiros liberados para sua agência (multi-tenant por agência).

---

## Hospedagem (Hosting)

- Frontend e API: **Vercel** (região configurável; tipicamente Brasil / Leste dos EUA).
- Dados e processamento pesado: **Microsoft Azure** (SQL Server, Blob Storage, Databricks quando aplicável), com serviços nas regiões Sul do Brasil e Leste dos EUA conforme necessidade.

---

## Evolução da arquitetura — da versão 1.0 para a 2.0

| Aspecto | Versão 1.0 | Versão 2.0 (atual) |
|--------|------------|---------------------|
| **Interface** | Power Apps | Aplicação proprietária em **React** (SPA), implantada na **Vercel** |
| **Backend / API** | Power Automate + integrações | **Node.js serverless** na Vercel: ~10 routers, ~70 handlers; APIs REST |
| **Autenticação** | Controle interno Power Platform | **Auth0**: login único; JWT validado na API; controle por domínio e cadastro |
| **Acesso e dados** | Uso interno | **Multi-tenant por agência**: filtro por `agencia_pk` e `liberadoAgencia_bl`; agências só veem roteiros liberados |
| **Processamento** | Databricks Job Cluster (Power Automate → scripts) | **Databricks** mantido para jobs de roteiro (scripts Python); orquestração via API Node.js |
| **Banco de dados** | Azure SQL Server | **SQL Server** (principal: roteiros, usuários, agências, plano de mídia, SPs) + **PostgreSQL** (Banco de Ativos) |
| **Escalabilidade** | Clusters sob demanda, latência de cold start | API serverless (escala automática); processamento Databricks mantido; evolução futura possível para containers (Docker) para reduzir tempo por plano |

Os principais componentes de dados são mantidos: modelo de dados, Azure SQL Server, stored procedures (PAESPM e demais), scripts Python de processamento e uso de Azure Storage. A mudança central está na **interface e orquestração**: de Power Apps / Power Automate para uma arquitetura desacoplada baseada em **React + APIs REST (Node.js)**, com **Auth0** e **segurança multi-tenant**.

---

## Serviços utilizados (Services used)

### Backend e processamento

| Componente | v1.0 | v2.0 |
|------------|------|------|
| Execução de jobs (roteiro) | Databricks Job Cluster (ex.: Standard_DS3_v2) | Databricks (mantido); orquestração via API Node.js na Vercel |
| API / Backend | Power Automate | **Node.js** (serverless na Vercel); auth middleware (JWT + enriquecimento de usuário) |
| Banco relacional principal | Azure SQL Server (Standard S4) | **Azure SQL Server** (roteiros, usuários, agências, plano de mídia, PAESPM) |
| Banco de ativos | — | **PostgreSQL** (dashboard, mapa, relatórios por praça/exibidor) |
| Armazenamento | Azure Blob Storage (LRS) | **Azure Blob Storage** (LRS) mantido |
| Segredos | Azure Key Vault | Azure Key Vault + variáveis de ambiente Vercel |

### Interface e frontend

| Componente | v1.0 | v2.0 |
|------------|------|------|
| UI | Power Apps | **React** (SPA), deploy na **Vercel** |
| Autenticação na UI | Integrada Power Platform | **Auth0** (loginWithRedirect, callback, token em memória/contexto) |
| Documentos / arquivos | SharePoint Online | **SharePoint Online** (mantido onde aplicável) |

### Scripts principais e pipeline de processamento

- **sampleMaxAll** (ex.: `be180_product_sampleMaxAllInbound.py`): amostragem estatística e espacial de pontos; randomização e balanceamento; saída para base calculadora máxima.
- **sampleFromMax**: filtragem por plano (`planoMidia_pk`) e estruturação de dados; validação de campos; saída para base calculadora do plano.
- **product_model**: clustering (ex.: AgglomerativeClustering), deflação populacional (lambda adaptativo), geração de hexágonos (ex.: H3 resolução 10), geração de mapas (ex.: Folium); saídas em tabelas e blob.

### Integrações e APIs

- **Geofusion:** v1.0 upload manual; v2.0 integração com banco de ativos (be180) via API onde aplicável.
- **Kantar:** segmentação por alvos demográficos e consumo de mídia.
- **IBGE:** limites geográficos e malha territorial.
- **JDBC:** conexão dos scripts (Databricks) com SQL Server.
- **Auth0:** emissão e validação de JWT; a API Node.js valida o token e enriquece o request com dados do usuário (SQL Server: `usuario_completo_vw` — email, `empresa_pk`, perfil) para filtro por agência.
- **Google Places API:** geocoding (Consulta Endereço: coordenadas ↔ endereço).

**Regiões:** Sul do Brasil / Leste dos EUA (conforme configuração dos serviços).

---

## Segurança e privacidade (Security & Data Privacy)

- **HTTPS** em toda a comunicação (Vercel + Auth0).
- **Auth0:** login único; frontend envia Bearer token nas chamadas à API; API valida JWT e consulta usuário no SQL Server.
- **Controle de acesso:** acesso permitido para domínio **@be180.com.br** ou usuários **cadastrados em `usuario_dm`**; demais recebem tela “Acesso não autorizado”.
- **Multi-tenant por agência:**
  - Usuários Be (`empresa_pk` nulo): veem todos os roteiros; podem liberar roteiros para agências (checkbox em Meus Roteiros).
  - Usuários de agência (`empresa_pk` = agência): veem apenas roteiros da própria agência com `liberadoAgencia_bl = 1`.
- **API:** listagens e detalhes filtrados por `agencia_pk` e `liberadoAgencia_bl`; rotas internas (Criar Roteiro, Admin, Banco de Ativos, Consulta Endereço) restritas a usuários Be.

---

## Fluxo completo do pipeline (product_model)

O processamento do roteiro segue o fluxo em estágios:

```
sampleMaxAll  →  sampleFromMax  →  product_model
```

### Estágio 1: sampleMaxAll

- Amostragem por subgrupo com filtros estatísticos (quartis) e grade geográfica.
- Randomização e balanceamento.
- **Saída:** base calculadora máxima (ex.: `baseCalculadoraMax_ft`).

### Estágio 2: sampleFromMax

- Filtragem e seleção de pontos por plano (`planoMidia_pk`) e estruturação de dados.
- Validação de campos obrigatórios.
- **Saída:** base calculadora do plano (ex.: `baseCalculadora_ft`).

### Estágio 3: product_model

- Clustering hierárquico (AgglomerativeClustering).
- Deflação populacional com lambda adaptativo.
- Geração de hexágonos (ex.: H3 resolução 10).
- Geração de mapas HTML (ex.: Folium).
- **Saídas:** tabelas de hexágonos e resultados (ex.: `baseCalculadoraHexagonos_dm`, `baseCalculadoraResult_ft`), mapas em blob.

---

## Desempenho e escalabilidade (Performance and scalability)

- **v1.0:** tempo médio de execução por plano na ordem de 4–6 minutos (com paralelismo); parte relevante do tempo na criação e alocação do Databricks Job Cluster.
- **v2.0:** API serverless escala automaticamente na Vercel; tempo de resposta da API tipicamente em centenas de ms; tempo total por plano ainda dominado pelo job Databricks. Evolução futura pode incluir execução dos scripts em containers (ex.: Docker / Azure Container Apps) para reduzir latência por plano (meta na ordem de 30–60 segundos, mantendo paralelismo).

---

## Resumo visual para slide

| Camada | v2.0 |
|--------|------|
| **Cliente** | Browser → React SPA (Vercel) |
| **Autenticação** | Auth0 (login, JWT); controle domínio + cadastro; multi-tenant por agência |
| **API** | Node.js serverless (Vercel); ~10 routers, ~70 handlers; filtro por agência |
| **Dados** | SQL Server (principal) + PostgreSQL (Banco de Ativos); PAESPM e SPs |
| **Processamento** | Databricks (sampleMaxAll → sampleFromMax → product_model) |
| **Integrações** | Geofusion, Kantar, IBGE, Google Places, SharePoint |

---

© 2026 Be Mediatech OOH — Colmeia. Documento de arquitetura e visão para apresentação (nova versão).
