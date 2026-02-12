# Scripts SQL - Sistema de Usuários e Permissões

## 📋 Ordem de Execução

Execute os scripts na seguinte ordem:

### ✅ Instalação Completa

**Opção 1: Executar todos de uma vez**
```sql
-- Execute este arquivo no SQL Server Management Studio
:r 00_executar_todos.sql
```

**Opção 2: Executar individualmente**
```sql
1. :r 01_criar_tabelas.sql
2. :r 02_inserir_dados_iniciais.sql
3. :r 03_migrar_usuarios_existentes.sql
4. :r 04_criar_views.sql
```

### ❌ Reverter Alterações (Rollback)

**⚠️ USE COM CUIDADO!** Remove todas as estruturas criadas:
```sql
:r 99_rollback.sql
```

---

## 📦 O que cada script faz

### `01_criar_tabelas.sql`
- ✅ Cria tabela `perfil_dm`
- ✅ Cria tabela `area_sistema_dm`
- ✅ Cria tabela `perfil_permissao_ft`
- ✅ Adiciona colunas `perfil_pk` e `auth0_id_st` em `usuario_dm`
- ✅ Cria índices para performance

### `02_inserir_dados_iniciais.sql`
- ✅ Insere 4 perfis padrão (Admin, Editor, Visualizador, Analista BI)
- ✅ Insere 13 áreas do sistema
- ✅ Configura permissões padrão para cada perfil

### `03_migrar_usuarios_existentes.sql`
- ✅ Atribui perfil Admin aos 3 usuários com email @be180.com.br
- ✅ Atribui perfil Editor aos 6 usuários sem email
- ✅ Verifica se ficou algum usuário sem perfil

### `04_criar_views.sql`
- ✅ `usuario_completo_vw` - Usuários com perfil
- ✅ `usuario_permissoes_vw` - Permissões detalhadas por usuário
- ✅ `area_sistema_hierarquia_vw` - Hierarquia das áreas
- ✅ `perfil_permissoes_resumo_vw` - Resumo de permissões por perfil

---

## 🚀 Executar via Node.js

Se preferir executar via API:

```bash
# Testar localmente
node executar-scripts-usuario.js

# Ou acessar via API
GET http://localhost:3000/executar-scripts-usuarios
```

---

## 📊 Estrutura Final

### Tabelas Criadas:
1. `perfil_dm` (4 perfis)
2. `area_sistema_dm` (13 áreas)
3. `perfil_permissao_ft` (permissões)
4. `usuario_dm` ✨ (atualizada com perfil_pk)

### Views Criadas:
1. `usuario_completo_vw`
2. `usuario_permissoes_vw`
3. `area_sistema_hierarquia_vw`
4. `perfil_permissoes_resumo_vw`

---

## 🔍 Consultas Úteis Após Instalação

```sql
-- Ver todos os usuários com seus perfis
SELECT * FROM [serv_product_be180].[usuario_completo_vw]
ORDER BY usuario_pk;

-- Ver permissões do usuário Gabriel (ID 7)
SELECT * FROM [serv_product_be180].[usuario_permissoes_vw]
WHERE usuario_pk = 7;

-- Ver hierarquia de áreas
SELECT * FROM [serv_product_be180].[area_sistema_hierarquia_vw]
ORDER BY nivel_hierarquia, ordem_vl;

-- Ver resumo de perfis
SELECT * FROM [serv_product_be180].[perfil_permissoes_resumo_vw];

-- Ver todos os usuários Admin
SELECT u.*, p.nome_st as perfil
FROM [serv_product_be180].[usuario_dm] u
JOIN [serv_product_be180].[perfil_dm] p ON u.perfil_pk = p.perfil_pk
WHERE p.nome_st = 'Admin' AND u.ativo_bl = 1;
```

---

## ⚠️ IMPORTANTE

- ✅ Scripts são **idempotentes** (podem ser executados múltiplas vezes sem erro)
- ✅ Usam transações para garantir consistência
- ✅ Verificam existência antes de criar
- ⚠️ Backup do banco recomendado antes da execução
- ⚠️ Testar em ambiente de desenvolvimento primeiro

---

## 🆘 Em caso de problemas

Se algo der errado durante a execução:

1. Execute o script `99_rollback.sql` para reverter
2. Verifique os logs de erro
3. Corrija o problema
4. Execute novamente

