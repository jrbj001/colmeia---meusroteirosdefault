# Estratégia: Sistema de Usuários com Controle de Acesso

## 📊 Análise da Estrutura Existente

### ✅ O que JÁ EXISTE:

**Tabela:** `serv_product_be180.usuario_dm`
- 9 usuários cadastrados (todos ativos)
- Campos: pk, nome_st, email_st, telefone_st, empresa_pk, senha_st, ativo_bl
- **Problema:** Apenas 3 têm email (gabriel, pedro, millena)
- **Problema:** Sistema de senha próprio (não integrado com Auth0)

**View:** `serv_product_be180.usuario_dm_vw`
- Espelho da tabela usuario_dm

**View:** `serv_product_be180.planoMidiaDescUsuario_dm_vw`
- Parece ser para outro sistema (usa UUIDs diferentes)
- Colunas: usuarioId_st (UUID), usuarioName_st, usuarioNameUpper_st

### ❌ O que NÃO EXISTE:

- ❌ Sistema de perfis/roles
- ❌ Tabela de permissões
- ❌ Controle de acesso por área
- ❌ Integração com Auth0

---

## 🎯 ESTRATÉGIA: Reaproveitar e Estender

### Fase 1: Criar Estrutura de Permissões

#### 1.1 Tabela de Perfis
```sql
CREATE TABLE [serv_product_be180].[perfil_dm] (
  perfil_pk INT PRIMARY KEY IDENTITY(1,1),
  nome_st NVARCHAR(100) NOT NULL UNIQUE,
  descricao_st NVARCHAR(500),
  ativo_bl BIT DEFAULT 1,
  dataCriacao_dh DATETIME DEFAULT GETDATE()
);

-- Perfis padrão
INSERT INTO [serv_product_be180].[perfil_dm] (nome_st, descricao_st) VALUES
('Admin', 'Acesso total ao sistema + gerenciar usuários'),
('Editor', 'Criar e editar roteiros + banco de ativos completo'),
('Visualizador', 'Apenas visualizar roteiros e relatórios'),
('Analista BI', 'Acesso aos relatórios e banco de ativos (somente leitura)');
```

#### 1.2 Tabela de Áreas do Sistema
```sql
CREATE TABLE [serv_product_be180].[area_sistema_dm] (
  area_pk INT PRIMARY KEY IDENTITY(1,1),
  codigo_st NVARCHAR(50) NOT NULL UNIQUE,
  nome_st NVARCHAR(100) NOT NULL,
  descricao_st NVARCHAR(500),
  area_pai_pk INT NULL,
  FOREIGN KEY (area_pai_pk) REFERENCES [serv_product_be180].[area_sistema_dm](area_pk)
);

-- Áreas do sistema
INSERT INTO [serv_product_be180].[area_sistema_dm] (codigo_st, nome_st, area_pai_pk) VALUES
-- Áreas principais
('meus_roteiros', 'Meus Roteiros', NULL),
('criar_roteiro', 'Criar Roteiro', NULL),
('banco_ativos', 'Banco de Ativos', NULL),
('consulta_endereco', 'Consulta de Endereço', NULL),
('mapa', 'Mapa', NULL),
('admin', 'Administração', NULL),

-- Subáreas de Banco de Ativos
('banco_ativos_dashboard', 'Dashboard', 3),
('banco_ativos_relatorio_praca', 'Relatório por Praça', 3),
('banco_ativos_relatorio_exibidor', 'Relatório por Exibidor', 3),
('banco_ativos_cadastrar_grupo', 'Cadastrar Grupo Mídia', 3),
('banco_ativos_cadastrar_tipo', 'Cadastrar Tipo Mídia', 3),
('banco_ativos_cadastrar_exibidor', 'Cadastrar Exibidor', 3),
('banco_ativos_importar', 'Importar Arquivo', 3);
```

#### 1.3 Tabela de Permissões por Perfil
```sql
CREATE TABLE [serv_product_be180].[perfil_permissao_ft] (
  perfilPermissao_pk INT PRIMARY KEY IDENTITY(1,1),
  perfil_pk INT NOT NULL,
  area_pk INT NOT NULL,
  ler_bl BIT DEFAULT 1,
  escrever_bl BIT DEFAULT 0,
  FOREIGN KEY (perfil_pk) REFERENCES [serv_product_be180].[perfil_dm](perfil_pk),
  FOREIGN KEY (area_pk) REFERENCES [serv_product_be180].[area_sistema_dm](area_pk),
  UNIQUE(perfil_pk, area_pk)
);
```

#### 1.4 Atualizar Tabela de Usuários
```sql
-- Adicionar coluna de perfil
ALTER TABLE [serv_product_be180].[usuario_dm]
ADD perfil_pk INT NULL;

ALTER TABLE [serv_product_be180].[usuario_dm]
ADD FOREIGN KEY (perfil_pk) REFERENCES [serv_product_be180].[perfil_dm](perfil_pk);

-- Adicionar coluna auth0_id para integração futura
ALTER TABLE [serv_product_be180].[usuario_dm]
ADD auth0_id_st NVARCHAR(255) NULL UNIQUE;
```

### Fase 2: Migração dos Usuários Existentes

```sql
-- Definir perfil padrão para usuários existentes baseado no email
UPDATE [serv_product_be180].[usuario_dm]
SET perfil_pk = 1  -- Admin
WHERE email_st IN ('gabriel.gama@be180.com.br', 'pedro.barbosa@be180.com.br', 'millena.santos@be180.com.br');

UPDATE [serv_product_be180].[usuario_dm]
SET perfil_pk = 2  -- Editor
WHERE email_st IS NULL;
```

### Fase 3: Criar Views Úteis

```sql
-- View de usuários com permissões
CREATE VIEW [serv_product_be180].[usuario_permissoes_vw] AS
SELECT 
  u.pk as usuario_pk,
  u.nome_st as usuario_nome,
  u.email_st as usuario_email,
  u.ativo_bl as usuario_ativo,
  p.perfil_pk,
  p.nome_st as perfil_nome,
  a.area_pk,
  a.codigo_st as area_codigo,
  a.nome_st as area_nome,
  pp.ler_bl,
  pp.escrever_bl
FROM [serv_product_be180].[usuario_dm] u
LEFT JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
LEFT JOIN [serv_product_be180].[perfil_permissao_ft] pp ON p.perfil_pk = pp.perfil_pk
LEFT JOIN [serv_product_be180].[area_sistema_dm] a ON pp.area_pk = a.area_pk
WHERE u.ativo_bl = 1;
```

---

## 🏗️ Implementação Frontend

### 1. Atualizar AuthContext

```typescript
interface User {
  id: number;  // pk da tabela usuario_dm
  nome: string;
  email: string;
  perfil: {
    id: number;
    nome: string;
  };
  permissoes: {
    [areaCode: string]: {
      ler: boolean;
      escrever: boolean;
    }
  };
}
```

### 2. Criar Hook usePermissoes

```typescript
const usePermissoes = () => {
  const { user } = useAuth();
  
  const podeAcessar = (areaCode: string) => {
    return user?.permissoes[areaCode]?.ler || false;
  };
  
  const podeEditar = (areaCode: string) => {
    return user?.permissoes[areaCode]?.escrever || false;
  };
  
  const isAdmin = () => {
    return user?.perfil?.nome === 'Admin';
  };
  
  return { podeAcessar, podeEditar, isAdmin };
};
```

### 3. Componente ProtectedRoute

```typescript
const ProtectedRoute = ({ children, areaCode }) => {
  const { podeAcessar } = usePermissoes();
  
  if (!podeAcessar(areaCode)) {
    return <Navigate to="/acesso-negado" />;
  }
  
  return children;
};
```

### 4. Tela de Gerenciamento de Usuários

- **Rota:** `/admin/usuarios`
- **Permissão:** Somente Admin
- **Funcionalidades:**
  - Listar usuários
  - Criar novo usuário
  - Editar usuário (nome, email, perfil)
  - Ativar/Desativar usuário
  - Resetar senha (futuro)

---

## 🔄 Fluxo de Implementação

### Sprint 1: Estrutura de Dados
- [ ] Criar tabelas (perfil_dm, area_sistema_dm, perfil_permissao_ft)
- [ ] Alterar usuario_dm (adicionar perfil_pk, auth0_id_st)
- [ ] Inserir dados iniciais (perfis, áreas, permissões padrão)
- [ ] Migrar usuários existentes

### Sprint 2: APIs Backend
- [ ] GET `/usuarios` - Listar usuários
- [ ] POST `/usuarios` - Criar usuário
- [ ] PUT `/usuarios/:id` - Atualizar usuário
- [ ] GET `/usuarios/:id/permissoes` - Buscar permissões
- [ ] GET `/perfis` - Listar perfis disponíveis
- [ ] GET `/areas-sistema` - Listar áreas

### Sprint 3: Frontend - AuthContext
- [ ] Atualizar interface User
- [ ] Criar hook usePermissoes
- [ ] Criar componente ProtectedRoute
- [ ] Implementar guards nas rotas existentes

### Sprint 4: Tela de Administração
- [ ] Criar /admin/usuarios
- [ ] Listar usuários com filtros
- [ ] Modal criar/editar usuário
- [ ] Toggle ativar/desativar
- [ ] Atribuir perfil

---

## ✅ Vantagens desta Estratégia

1. ✅ **Reaproveita** estrutura existente (usuario_dm)
2. ✅ **Mantém** os 9 usuários já cadastrados
3. ✅ **Extensível** - fácil adicionar novos perfis/áreas
4. ✅ **Flexível** - permissões por perfil customizáveis
5. ✅ **Compatível** com Auth0 (campo auth0_id_st)
6. ✅ **Backward compatible** - não quebra nada existente

## ⚠️ Pontos de Atenção

1. ⚠️ Usuários sem email precisarão ser atualizados
2. ⚠️ Sistema de senha próprio vs Auth0 (decidir estratégia)
3. ⚠️ Migração gradual dos usuários para Auth0 (opcional)

---

## 📋 Próximos Passos

1. ✅ Confirmar estratégia com stakeholders
2. ⏭️ Criar scripts SQL das tabelas
3. ⏭️ Executar no banco de desenvolvimento
4. ⏭️ Criar APIs backend
5. ⏭️ Implementar frontend

