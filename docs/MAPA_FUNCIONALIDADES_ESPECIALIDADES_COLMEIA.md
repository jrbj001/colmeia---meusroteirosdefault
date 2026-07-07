# Mapa de funcionalidades e especialidades por módulo — Colmeia

Documento para apresentação: visão por módulo com funcionalidades e especialidades (diferenciais).

---

## Visão geral

| Módulo | Uma linha |
|--------|------------|
| Meus Roteiros | Porta de entrada: listagem, busca, liberação para agências e ações sobre roteiros |
| Criar Roteiro | Criação e edição de planos (simulado e completo), com importação Excel OOH |
| Mapa | Visualização geográfica por grupo: hexágonos, pontos, inventário por cidade |
| Visualizar Resultados | Detalhamento do roteiro após processamento (Databricks) |
| Banco de Ativos | Dashboard, mapas e relatórios do inventário OOH (por praça e exibidor) |
| Consulta Endereço | Geocoding em lote: coordenadas ↔ endereço com entrada/saída em Excel |
| Administração | Usuários, perfis, permissões e vínculo usuário–agência |
| Acesso e segurança | Auth0, controle por domínio/cadastro e multi-tenant por agência (SaaS) |

---

## 1. Meus Roteiros

**Funcionalidades**
- Listagem paginada de roteiros (planos de mídia por grupo)
- Busca por nome do roteiro
- Indicador de status (processando / finalizado) com atualização automática
- Exclusão (soft delete) de roteiro
- Toggle “Agência”: liberar ou não o roteiro para a agência vinculada (visível só para usuários Be)
- Acesso rápido ao mapa do roteiro e à tela de visualização de resultados

**Especialidades**
- Única tela onde o usuário Be define o que cada agência pode ver (checkbox por roteiro)
- Integração direta com o modelo multi-tenant: só roteiros da agência e liberados aparecem para usuários de agência
- Refresh automático enquanto houver roteiros em processamento

---

## 2. Criar Roteiro

**Funcionalidades**
- Fluxo em abas: configuração (nome, agência, marca, etc.), target (gênero, classe, idade), praças, envio
- Roteiro simulado: configuração manual ou importação de plano OOH via Excel (aba OOH do template)
- Importação Excel: upload na Aba 1; dados refletem nas abas (ex.: praças na Aba 3); gravação no banco na Aba 4 via stored procedure
- Envio para processamento (Databricks) e acompanhamento de status

**Especialidades**
- Duas formas de preenchimento: manual ou importação do template padrão OOH
- Parser de Excel robusto (cabeçalhos na linha 2, colunas B–EL, detecção dinâmica de colunas)
- Associação explícita ao plano de mídia/grupo; dados importados alimentam target e praças antes do envio
- Exportação de linhas ignoradas na importação para o usuário corrigir a planilha

---

## 3. Mapa

**Funcionalidades**
- Mapa interativo (Leaflet) por grupo de roteiro
- Camadas: cidades, semanas, hexágonos, pontos de mídia
- Inventário por cidade para o grupo selecionado
- Navegação e filtros para análise espacial do plano

**Especialidades**
- Visualização geográfica integrada ao fluxo de roteirização e ao banco de ativos
- Dados servidos por API (hexágonos, cidades, semanas, pontos) com filtro por grupo/contexto
- Base para decisão de alocação e cobertura OOH

---

## 4. Visualizar Resultados

**Funcionalidades**
- Detalhamento do roteiro após o processamento (Databricks)
- Exibição de indicadores e resultados consolidados do plano

**Especialidades**
- Ponto de chegada do fluxo “Criar Roteiro”: resultado do job de processamento
- Acesso a partir de Meus Roteiros (ação por roteiro)
- Mesmo login e permissões: agências só veem resultados dos roteiros liberados para sua agência

---

## 5. Banco de Ativos

**Funcionalidades**
- Dashboard do inventário OOH
- Mapa de ativos (pontos de mídia)
- Busca de pontos
- Relatório por praça
- Relatório por exibidor
- Upload e processamento em lote (ex.: coordenadas para endereço; ver Consulta Endereço quando integrado)

**Especialidades**
- Fonte de verdade do inventário OOH; dados em PostgreSQL
- Relatórios estruturados por praça e por exibidor para planejamento e análise
- Integração com Consulta Endereço para enriquecimento de dados (geocoding)

---

## 6. Consulta Endereço

**Funcionalidades**
- Coordenadas → Endereço (reverse geocoding): upload de Excel com lat/long; retorno com endereço e bairro (Google Places)
- Endereço → Coordenadas (forward geocoding): upload de Excel com endereços; retorno com coordenadas e bairro; download do Excel enriquecido

**Especialidades**
- Geocoding em lote com entrada e saída em Excel, alinhado ao uso em Banco de Ativos e planos OOH
- Duas operações na mesma tela (abas ou fluxos distintos)
- Integração com Google Places API no backend

---

## 7. Administração

**Funcionalidades**
- CRUD de usuários (nome, email, telefone, perfil)
- Vínculo do usuário a uma agência (campo Agência no cadastro) para acesso externo
- CRUD de perfis
- Permissões por área do sistema (ler / escrever)
- Listagem e filtros (busca, perfil)

**Especialidades**
- Central de governança: quem acessa (usuários) e o que pode fazer (perfis e áreas)
- Campo Agência define se o usuário é Be (interno) ou de agência (multi-tenant)
- Restrito a usuários Be; usuários de agência não acessam esta área

---

## 8. Acesso e segurança

**Funcionalidades**
- Login único via Auth0 (mesma tela para Be e agências)
- Callback e gestão de token no frontend
- Validação de acesso: domínio @be180.com.br ou cadastro em usuario_dm; demais bloqueados (tela “Acesso não autorizado”)
- Multi-tenant por agência: listagens e detalhes filtrados por agencia_pk e liberadoAgencia_bl
- Sidebar e rotas restritas para agências (sem Criar Roteiro, Banco de Ativos, Consulta Endereço, Administração)

**Especialidades**
- Modelo SaaS: um único produto, dados segregados por agência
- Controle duplo: quem entra (Auth0 + domínio/cadastro) e o que vê (liberação por roteiro em Meus Roteiros)
- Perfil único de “visualização” para agências; mesma tela de login para todos

---

## Resumo para slide (uma linha por módulo)

| Módulo | Funcionalidades em uma linha | Especialidade em uma linha |
|--------|------------------------------|----------------------------|
| Meus Roteiros | Listar, buscar, excluir e liberar roteiros para agências; abrir mapa e resultados | Checkbox de liberação por roteiro = controle do que cada agência vê |
| Criar Roteiro | Configurar plano em abas; importar Excel OOH ou preencher manualmente; enviar para processamento | Importação Excel + SP + preenchimento de target e praças nas abas |
| Mapa | Mapa interativo com hexágonos, pontos e inventário por cidade (por grupo) | Visualização geográfica integrada ao plano e ao banco de ativos |
| Visualizar Resultados | Ver detalhes e indicadores do roteiro após processamento | Saída do fluxo Criar Roteiro; respeita filtro por agência |
| Banco de Ativos | Dashboard, mapa, relatórios por praça e exibidor; busca de pontos | Inventário OOH em PostgreSQL; base para planejamento |
| Consulta Endereço | Geocoding em lote: coordenadas→endereço e endereço→coordenadas com Excel | Entrada e saída em Excel; integração Google Places |
| Administração | Usuários, perfis, permissões; vínculo usuário–agência | Governança e definição de quem é Be x agência |
| Acesso e segurança | Auth0, bloqueio de não cadastrados, filtro por agência na API e na UI | SaaS: um login, dados segregados por agência e por liberação |

---

© 2026 Be Mediatech OOH — Colmeia. Mapa de funcionalidades e especialidades para apresentação.
