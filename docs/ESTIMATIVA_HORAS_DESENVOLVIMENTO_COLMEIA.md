# Estimativa de horas de desenvolvimento — Colmeia

Estimativa do total de horas de desenvolvimento do Colmeia até o estado atual do repositório. Baseada em volume de código, escopo de funcionalidades e heurísticas de mercado.

---

## Base medida (repositório atual)

| Área | Linhas (aprox.) | Arquivos |
|------|------------------|----------|
| **Frontend** (React/TS em `src/`) | ~20.000 | 131 (tsx/ts) |
| **Backend** (API + handlers, Node.js) | ~5.600 | 81 (10 api + 71 handlers) |
| **SQL** (scripts, views, SPs) | ~1.150 | 20+ |
| **Documentação** (`docs/`, `sql/*.md`) | ~5.300 | — |
| **Config / scripts** (vite, tailwind, scripts) | ~600 | — |
| **Total código (TS/TSX/JS)** | **~25.600** | — |

Escopo funcional considerado: 8 módulos (Meus Roteiros, Criar Roteiro, Mapa, Visualizar Resultados, Banco de Ativos, Consulta Endereço, Administração, Auth/SaaS), Auth0, multi-tenant por agência, integrações (Databricks, Google Places, SharePoint, Geofusion, Kantar, IBGE), dois bancos (SQL Server + PostgreSQL), ~70 endpoints.

---

## Metodologia da estimativa

1. **Linhas de código × taxa média (LOC/h)**  
   Taxas típicas para código em produção (incluindo testes implícitos, revisão e ajustes):  
   - Frontend (React/TS): 12–18 LOC/h  
   - Backend (Node.js): 15–22 LOC/h  
   - SQL/scripts: 25–40 LOC/h  
   - Documentação: 30–50 linhas/h  

2. **Ajuste por complexidade**  
   O Colmeia inclui: fluxos longos (Criar Roteiro em abas), importação Excel, integração Databricks, mapas, geocoding, permissões e multi-tenant. Isso tende a reduzir LOC/h (mais tempo de análise e integração). Ajuste de **+15% a +25%** sobre a estimativa pura por LOC.

3. **Atividades além de “código”**  
   Não contabilizadas na LOC: desenho de UX/UI, reuniões de requisitos, deploy (Vercel/Azure), configuração de Auth0, troubleshooting de ambiente. Em projetos desse porte costuma ser **20–35%** do tempo total de “desenvolvimento” (em sentido amplo).

---

## Cálculo sugerido

| Item | Cálculo | Horas (arred.) |
|------|---------|-----------------|
| Frontend | 20.000 / 15 LOC/h × 1,2 (complexidade) | 1.600 |
| Backend | 5.600 / 18 LOC/h × 1,2 | 375 |
| SQL | 1.150 / 32 LOC/h | 36 |
| Documentação | 5.300 / 40 linhas/h | 130 |
| Config/scripts | 600 / 25 LOC/h | 24 |
| **Subtotal (só código/doc)** | | **~2.165** |
| Ajuste atividades não-LOC (25%) | 2.165 × 0,25 | 540 |
| **Total estimado** | | **~2.700 h** |

---

## Faixa recomendada para apresentação

| Cenário | Horas | Observação |
|---------|--------|------------|
| **Conservador (só código)** | **2.000 – 2.200** | Apenas desenvolvimento direto (front + back + SQL + docs), sem overhead. |
| **Realista (recomendado)** | **2.500 – 3.200** | Inclui complexidade, integrações, revisões e parte do trabalho de análise/config. |
| **Amplo (projeto completo)** | **3.200 – 4.000** | Inclui desenho de produto, QA manual, DevOps, suporte e iterações. |

**Sugestão para slide ou relatório:**  
**“Estimativa de esforço de desenvolvimento: da ordem de 2.500 a 3.200 horas (cenário realista), considerando frontend, backend, integrações, segurança multi-tenant e documentação.”**

Se quiser um único número: **~2.800 horas**.

---

## Conversão em “pessoa-mês” (opcional)

- 1 pessoa-mês ≈ 160 h (1 mês útil).  
- **2.800 h ≈ 17,5 pessoa-mês** (ex.: ~1 ano e meio com 1 dev full-time, ou ~9 meses com 2 devs).  
- **3.000 h ≈ 19 pessoa-mês** (ex.: ~1 ano com 2 devs ou ~6 meses com 3 devs).

---

## Resumo

- **Número para usar:** **2.500 – 3.200 h** (ou **~2.800 h** como ponto único).  
- **Base:** ~25.600 linhas de código (TS/JS/TSX), ~1.150 linhas SQL, ~5.300 linhas de documentação, 8 módulos e ~70 handlers/endpoints.  
- **Inclui:** desenvolvimento (front, back, SQL, docs) e parcela de complexidade e atividades adjacentes; **não** inclui produto/UX dedicado, QA formal nem DevOps em separado, que aumentariam a faixa.

© 2026 Be Mediatech OOH — Colmeia. Estimativa de horas de desenvolvimento.
