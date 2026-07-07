# Colmeia — Detalhes técnicos (slide)

Resumo em formato de slide: copie os blocos abaixo para PowerPoint, Google Slides ou Figma.

---

## Título sugerido do slide
**Colmeia · Stack e arquitetura em uma página**

---

## Bloco 1 — Stack em uma linha
**Front** · React (SPA) na Vercel  
**API** · Node.js serverless, ~10 routers, ~70 handlers  
**Auth** · Auth0 (JWT) + controle por domínio e cadastro  
**Dados** · SQL Server (core) + PostgreSQL (Banco de Ativos)  
**Processamento** · Databricks (Python) — amostragem → filtro → clustering → hexágonos → mapas  
**Integrações** · Geofusion, Kantar, IBGE, Google Places, SharePoint  

---

## Bloco 2 — Pipeline (3 estágios)
**1** sampleMaxAll → amostragem estatística e espacial, randomização  
**2** sampleFromMax → filtro por plano, estruturação e validação  
**3** product_model → clustering, deflação populacional, H3 hexágonos, mapas Folium  

---

## Bloco 3 — Segurança e multi-tenant
**HTTPS** em tudo · **Auth0** no login e em toda chamada à API  
**Acesso** · @be180.com.br ou cadastro no banco; resto bloqueado  
**Multi-tenant** · Be vê tudo; agências só roteiros liberados (agencia_pk + liberadoAgencia_bl)  

---

## Bloco 4 — Hosting e escala
**Vercel** · front + API (serverless, escala automática)  
**Azure** · SQL Server, Blob Storage, Databricks (Sul BR / Leste EUA)  
**Evolução** · v1 Power Apps → v2 React + Node; processamento pesado continua no Databricks  

---

## Versão ultra-compacta (1 caixa no slide)

| Camada | Tecnologia |
|--------|------------|
| **UI** | React · Vercel |
| **API** | Node.js serverless · Auth0 JWT |
| **Dados** | SQL Server + PostgreSQL |
| **Jobs** | Databricks · Python (sampleMaxAll → sampleFromMax → product_model) |
| **Segurança** | HTTPS · domínio/cadastro · multi-tenant por agência |
| **Cloud** | Vercel + Azure (BR / US) |

---

## Frase de impacto (opcional para fechar o slide)
*"Uma stack serverless, um login, dados segregados por agência — planejamento OOH com controle total."*

---

# Colmeia — Technical details (slide) — English

Slide-ready copy for PowerPoint, Google Slides, or Figma.

---

## Suggested slide title
**Colmeia · Stack and architecture at a glance**

---

## Block 1 — Stack in one line
**Front** · React (SPA) on Vercel  
**API** · Node.js serverless, ~10 routers, ~70 handlers  
**Auth** · Auth0 (JWT) + domain and whitelist control  
**Data** · SQL Server (core) + PostgreSQL (Asset DB)  
**Processing** · Databricks (Python) — sampling → filter → clustering → hexagons → maps  
**Integrations** · Geofusion, Kantar, IBGE, Google Places, SharePoint  

---

## Block 2 — Pipeline (3 stages)
**1** sampleMaxAll → statistical and spatial sampling, randomization  
**2** sampleFromMax → filter by plan, structuring and validation  
**3** product_model → clustering, population deflation, H3 hexagons, Folium maps  

---

## Block 3 — Security and multi-tenant
**HTTPS** everywhere · **Auth0** on login and on every API call  
**Access** · @be180.com.br or whitelisted in DB; others blocked  
**Multi-tenant** · Be sees all; agencies see only released routes (agencia_pk + liberadoAgencia_bl)  

---

## Block 4 — Hosting and scale
**Vercel** · front + API (serverless, auto-scale)  
**Azure** · SQL Server, Blob Storage, Databricks (Brazil South / East US)  
**Evolution** · v1 Power Apps → v2 React + Node; heavy processing stays on Databricks  

---

## Ultra-compact version (one box on the slide)

| Layer | Technology |
|-------|------------|
| **UI** | React · Vercel |
| **API** | Node.js serverless · Auth0 JWT |
| **Data** | SQL Server + PostgreSQL |
| **Jobs** | Databricks · Python (sampleMaxAll → sampleFromMax → product_model) |
| **Security** | HTTPS · domain/whitelist · multi-tenant by agency |
| **Cloud** | Vercel + Azure (BR / US) |

---

## Tagline (optional closing line)
*"One serverless stack, one login, data segregated by agency — OOH planning with full control."*

---

## Services Used (updated — English)

**Backend and Processing**
- **v1.0:** Databricks Job Cluster (e.g. Standard_DS3_v2).
- **v2.0:** Databricks (retained) for route processing; orchestration via Node.js API on Vercel. No Azure Container Apps/Docker in current production.
- **REST APIs:** Node.js serverless on Vercel (~10 routers, ~70 handlers); auth middleware (JWT validation + user enrichment from SQL Server).
- **Relational database:** Azure SQL Server (Standard S4) for core data (routes, users, agencies, media plans, PAESPM); **PostgreSQL** for Asset Database (dashboard, map, reports by market/exhibitor).
- **Storage:** Azure Blob Storage (LRS).
- **Secrets:** Azure Key Vault + Vercel environment variables.

**Interface and Frontend**
- **v1.0:** Power Apps.
- **v2.0:** Proprietary React SPA deployed via Vercel; Auth0 for login (JWT, redirect/callback).
- **Integration:** SharePoint Online (maintained where applicable).

**Key Scripts and Processing Pipeline**
- **sampleMaxAll.py** (e.g. be180_product_sampleMaxAllInbound.py): statistical and spatial sampling of points; randomization and balancing; output to max calculator base.
- **sampleFromMax.py:** filtering by plan (planoMidia_pk), data structuring, validation; output to plan calculator base.
- **product_model.py:** clustering (e.g. AgglomerativeClustering), population deflation (adaptive lambda), H3 hexagon generation, Folium HTML maps; outputs to tables and blob.

**Integrations and APIs**
- **Geofusion:** v1.0 manual upload; v2.0 integration with asset database (be180) via API where applicable.
- **Kantar API:** segmentation by demographic targets and media consumption.
- **IBGE API:** geographic boundaries and territorial mesh.
- **JDBC:** connection between Databricks scripts and SQL Server.
- **Auth0:** JWT issuance and validation; Node.js API validates token and enriches request with user data (usuario_completo_vw) for agency filtering.
- **Google Places API:** geocoding (Address lookup: coordinates ↔ address, Excel in/out).
- **REST APIs (Node.js):** integration between frontend, backend, and databases.

**Regions Used:** Brazil South / East US.

---

## Functionalities (by module — English)

**My Routes**
- Paginated list, search by name, status (processing/finished), soft delete, “Agency” toggle (Be only: release route to linked agency), link to map and view results.

**Create Route**
- Tab flow: configuration, target, markets, submit; simulated route; OOH plan import via Excel (tabs 1 & 4); data reflected in target and markets; submission to Databricks and status tracking.

**Map**
- Interactive map (Leaflet) by route group: cities, weeks, hexagons, media points; inventory by city.

**View Results**
- Route detail after processing (Databricks); access restricted to allowed routes (Be: all; agencies: released routes only).

**Asset Database**
- Dashboard, map, point search, report by market, report by exhibitor; PostgreSQL; coordinate/address enrichment (see Address lookup).

**Address Lookup**
- Two modes: coordinates → address (reverse) and address → coordinates (forward) with Excel upload; Google Places geocoding; Excel download with enriched data.

**Administration**
- User CRUD (with optional agency link), profile CRUD, permissions by area (read/write); Be-only access.

**Authentication and Access**
- Auth0 login, callback, protected routes; access allowed for @be180.com.br or users in usuario_dm; others see “Access not authorized”; multi-tenant by agency (agencia_pk + liberadoAgencia_bl).

---

© 2026 Be Mediatech OOH — Colmeia. Technical details slide (EN).
