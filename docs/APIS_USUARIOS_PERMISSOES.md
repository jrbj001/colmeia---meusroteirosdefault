# 📚 Documentação das APIs - Sistema de Usuários e Permissões

**Data:** 05/02/2026  
**Versão:** 1.0  
**Sprint:** 2 - Backend APIs

---

## 📋 Índice

1. [APIs de Usuários](#-apis-de-usuários)
2. [APIs de Perfis](#-apis-de-perfis)
3. [APIs de Permissões](#-apis-de-permissões)
4. [APIs de Áreas](#-apis-de-áreas)
5. [API de Verificação de Acesso](#-api-de-verificação-de-acesso)
6. [Códigos de Status HTTP](#-códigos-de-status-http)
7. [Exemplos de Uso](#-exemplos-de-uso)

---

## 👥 APIs de Usuários

### `GET /usuarios`
Lista todos os usuários com paginação e filtros.

**Query Parameters:**
- `page` (opcional): Número da página (default: 1)
- `limit` (opcional): Itens por página (default: 10)
- `search` (opcional): Busca por nome ou email
- `perfil` (opcional): Filtrar por nome do perfil

**Resposta de Sucesso (200):**
```json
{
  "usuarios": [
    {
      "usuario_pk": 7,
      "usuario_nome": "Gabriel Gama",
      "usuario_email": "gabriel.gama@be180.com.br",
      "usuario_telefone": null,
      "usuario_ativo": true,
      "perfil_pk": 1,
      "perfil_nome": "Admin",
      "perfil_descricao": "Acesso total ao sistema"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 9,
    "totalPages": 1
  }
}
```

---

### `GET /usuarios?id=X`
Retorna detalhes de um usuário específico.

**Query Parameters:**
- `id` (obrigatório): ID do usuário

**Resposta de Sucesso (200):**
```json
{
  "usuario_pk": 7,
  "usuario_nome": "Gabriel Gama",
  "usuario_email": "gabriel.gama@be180.com.br",
  "perfil_pk": 1,
  "perfil_nome": "Admin",
  "perfil_descricao": "Acesso total ao sistema",
  "usuario_ativo": true
}
```

**Resposta de Erro (404):**
```json
{
  "error": "Usuário não encontrado"
}
```

---

### `POST /usuarios`
Cria um novo usuário.

**Body (JSON):**
```json
{
  "nome_st": "João Silva",
  "email_st": "joao.silva@exemplo.com",
  "telefone_st": "(11) 98765-4321",
  "perfil_pk": 2,
  "empresa_pk": null
}
```

**Campos Obrigatórios:**
- `nome_st`: Nome do usuário
- `perfil_pk`: ID do perfil

**Resposta de Sucesso (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "usuario": {
    "usuario_pk": 10,
    "usuario_nome": "João Silva",
    "usuario_email": "joao.silva@exemplo.com",
    "perfil_nome": "Editor"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "error": "Email já cadastrado"
}
```

---

### `PUT /usuarios?id=X`
Atualiza um usuário existente.

**Query Parameters:**
- `id` (obrigatório): ID do usuário

**Body (JSON):**
```json
{
  "nome_st": "João Silva Atualizado",
  "email_st": "joao.novo@exemplo.com",
  "telefone_st": "(11) 99999-9999",
  "perfil_pk": 1,
  "empresa_pk": null
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Usuário atualizado com sucesso",
  "usuario": { ... }
}
```

---

### `DELETE /usuarios?id=X`
Desativa um usuário (soft delete).

**Query Parameters:**
- `id` (obrigatório): ID do usuário

**Resposta de Sucesso (200):**
```json
{
  "message": "Usuário desativado com sucesso"
}
```

---

## 🔐 APIs de Perfis

### `GET /perfis`
Lista todos os perfis com resumo de permissões.

**Resposta de Sucesso (200):**
```json
{
  "perfis": [
    {
      "perfil_pk": 1,
      "perfil_nome": "Admin",
      "perfil_descricao": "Acesso total ao sistema",
      "total_permissoes": 13,
      "total_leitura": 13,
      "total_escrita": 13,
      "total_usuarios": 3
    }
  ],
  "total": 4
}
```

---

### `GET /perfis?id=X`
Retorna detalhes de um perfil específico.

**Query Parameters:**
- `id` (obrigatório): ID do perfil

**Resposta de Sucesso (200):**
```json
{
  "perfil_pk": 1,
  "perfil_nome": "Admin",
  "perfil_descricao": "Acesso total ao sistema",
  "total_permissoes": 13,
  "total_leitura": 13,
  "total_escrita": 13,
  "total_usuarios": 3
}
```

---

### `POST /perfis`
Cria um novo perfil. **⚠️ Apenas Admin**

**Body (JSON):**
```json
{
  "nome_st": "Moderador",
  "descricao_st": "Acesso limitado com moderação"
}
```

**Campos Obrigatórios:**
- `nome_st`: Nome do perfil

**Resposta de Sucesso (201):**
```json
{
  "message": "Perfil criado com sucesso",
  "perfil": {
    "perfil_pk": 5,
    "nome_st": "Moderador",
    "descricao_st": "Acesso limitado com moderação",
    "ativo_bl": true
  }
}
```

---

### `PUT /perfis?id=X`
Atualiza um perfil existente. **⚠️ Apenas Admin**

**Query Parameters:**
- `id` (obrigatório): ID do perfil

**Body (JSON):**
```json
{
  "nome_st": "Moderador Sênior",
  "descricao_st": "Acesso com moderação avançada"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Perfil atualizado com sucesso",
  "perfil": { ... }
}
```

---

### `DELETE /perfis?id=X`
Desativa um perfil. **⚠️ Apenas Admin**

**Query Parameters:**
- `id` (obrigatório): ID do perfil

**Resposta de Erro (400) - Se houver usuários:**
```json
{
  "error": "Não é possível desativar este perfil",
  "mensagem": "Existem 5 usuário(s) usando este perfil"
}
```

---

## 🔑 APIs de Permissões

### `GET /usuarios-permissoes?usuario_pk=X`
Retorna todas as permissões de um usuário.

**Query Parameters:**
- `usuario_pk` (obrigatório): ID do usuário

**Resposta de Sucesso (200):**
```json
{
  "usuario": {
    "pk": 7,
    "nome": "Gabriel Gama",
    "email": "gabriel.gama@be180.com.br",
    "perfil_pk": 1,
    "perfil_nome": "Admin"
  },
  "permissoes": [
    {
      "area_nome": "Meus Roteiros",
      "area_pk": 1,
      "area_codigo": "meus_roteiros",
      "area_descricao": "Visualizar lista de roteiros criados",
      "ler": true,
      "escrever": true,
      "subareas": []
    },
    {
      "area_nome": "Banco de Ativos",
      "area_pk": 3,
      "area_codigo": "banco_ativos",
      "ler": true,
      "escrever": true,
      "subareas": [
        {
          "area_pk": 7,
          "area_codigo": "banco_ativos_dashboard",
          "area_nome": "Dashboard",
          "ler": true,
          "escrever": true
        }
      ]
    }
  ],
  "total_permissoes": 13
}
```

---

### `GET /perfis-permissoes?perfil_pk=X`
Retorna todas as permissões de um perfil.

**Query Parameters:**
- `perfil_pk` (obrigatório): ID do perfil

**Resposta de Sucesso (200):**
```json
{
  "perfil": {
    "perfil_pk": 1,
    "nome_st": "Admin",
    "descricao_st": "Acesso total ao sistema",
    "ativo_bl": true
  },
  "areas": [
    {
      "area_pk": 1,
      "codigo": "meus_roteiros",
      "nome": "Meus Roteiros",
      "descricao": "Visualizar lista de roteiros criados",
      "nivel": 1,
      "ordem": 1,
      "permissoes": {
        "ler": true,
        "escrever": true
      }
    }
  ],
  "total_areas": 13,
  "total_permissoes_ativas": 13
}
```

---

### `PUT /perfis-permissoes?perfil_pk=X`
Atualiza as permissões de um perfil. **⚠️ Apenas Admin**

**Query Parameters:**
- `perfil_pk` (obrigatório): ID do perfil

**Body (JSON):**
```json
{
  "permissoes": [
    {
      "area_pk": 1,
      "ler": true,
      "escrever": true
    },
    {
      "area_pk": 2,
      "ler": true,
      "escrever": false
    }
  ]
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Permissões atualizadas com sucesso",
  "total_permissoes": 2,
  "permissoes": [
    {
      "area_pk": 1,
      "area_codigo": "meus_roteiros",
      "area_nome": "Meus Roteiros",
      "ler_bl": true,
      "escrever_bl": true
    }
  ]
}
```

---

## 🗺️ APIs de Áreas

### `GET /areas`
Lista todas as áreas do sistema.

**Resposta de Sucesso (200):**
```json
{
  "areas": [
    {
      "area_pk": 1,
      "codigo_st": "meus_roteiros",
      "nome_st": "Meus Roteiros",
      "descricao_st": "Visualizar lista de roteiros criados",
      "area_pai_pk": null,
      "nivel_hierarquia": 1,
      "ordem_vl": 1
    }
  ],
  "total": 13
}
```

---

### `GET /areas?hierarquia=true`
Lista áreas em estrutura hierárquica.

**Query Parameters:**
- `hierarquia` (opcional): Se `true`, retorna estrutura hierárquica

**Resposta de Sucesso (200):**
```json
{
  "areas": [
    {
      "area_pk": 3,
      "codigo": "banco_ativos",
      "nome": "Banco de Ativos",
      "descricao": "Gerenciar banco de ativos de mídia",
      "ordem": 3,
      "subareas": [
        {
          "area_pk": 7,
          "codigo": "banco_ativos_dashboard",
          "nome": "Dashboard",
          "descricao": "Painel principal",
          "ordem": 1
        }
      ]
    }
  ],
  "total_principais": 6,
  "total_subareas": 7,
  "total_geral": 13
}
```

---

## ✅ API de Verificação de Acesso

### `GET /verificar-acesso`
Verifica se um usuário tem acesso a uma área específica.

**Query Parameters:**
- `usuario_pk` (obrigatório): ID do usuário
- `area_codigo` (obrigatório): Código da área (ex: "meus_roteiros")
- `tipo` (opcional): "leitura" ou "escrita" (default: "leitura")

**Resposta de Sucesso (200) - TEM ACESSO:**
```json
{
  "tem_acesso": true,
  "usuario": {
    "pk": 7,
    "nome": "Gabriel Gama",
    "email": "gabriel.gama@be180.com.br",
    "perfil_pk": 1,
    "perfil_nome": "Admin"
  },
  "area": {
    "pk": 1,
    "codigo": "meus_roteiros",
    "nome": "Meus Roteiros"
  },
  "permissoes": {
    "ler": true,
    "escrever": true
  },
  "tipo_verificado": "leitura"
}
```

**Resposta de Sucesso (200) - NÃO TEM ACESSO:**
```json
{
  "tem_acesso": false,
  "usuario_pk": 10,
  "area_codigo": "admin",
  "tipo_verificado": "escrita",
  "mensagem": "Usuário não possui permissão para esta área"
}
```

---

## 📊 Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso (GET, PUT, DELETE) |
| 201 | Criado com sucesso (POST) |
| 400 | Requisição inválida ou dados incorretos |
| 404 | Recurso não encontrado |
| 405 | Método HTTP não permitido |
| 500 | Erro interno do servidor |

---

## 💡 Exemplos de Uso

### Exemplo 1: Criar Usuário e Verificar Acesso

```javascript
// 1. Criar usuário
const novoUsuario = await axios.post('/usuarios', {
  nome_st: 'Maria Silva',
  email_st: 'maria@exemplo.com',
  perfil_pk: 2 // Editor
});

const usuarioId = novoUsuario.data.usuario.usuario_pk;

// 2. Verificar se pode criar roteiro
const podecriar = await axios.get(`/verificar-acesso`, {
  params: {
    usuario_pk: usuarioId,
    area_codigo: 'criar_roteiro',
    tipo: 'escrita'
  }
});

if (podecriar.data.tem_acesso) {
  console.log('Usuário pode criar roteiros!');
}
```

---

### Exemplo 2: Atualizar Permissões de um Perfil

```javascript
// 1. Buscar perfil
const perfil = await axios.get('/perfis?id=2');
console.log(`Perfil: ${perfil.data.perfil_nome}`);

// 2. Buscar permissões atuais
const permissoesAtuais = await axios.get('/perfis-permissoes?perfil_pk=2');
console.log(`Total de permissões: ${permissoesAtuais.data.total_permissoes_ativas}`);

// 3. Atualizar permissões (remover acesso à administração)
await axios.put('/perfis-permissoes?perfil_pk=2', {
  permissoes: [
    { area_pk: 1, ler: true, escrever: true },
    { area_pk: 2, ler: true, escrever: true },
    { area_pk: 3, ler: true, escrever: true }
    // Não incluir área 6 (admin) = sem acesso
  ]
});

console.log('Permissões atualizadas!');
```

---

### Exemplo 3: Buscar Usuários de um Perfil Específico

```javascript
// Buscar todos os usuários Admin
const admins = await axios.get('/usuarios', {
  params: {
    perfil: 'Admin',
    limit: 100
  }
});

console.log(`Total de Admins: ${admins.data.pagination.total}`);
admins.data.usuarios.forEach(u => {
  console.log(`- ${u.usuario_nome} (${u.usuario_email})`);
});
```

---

## 🔒 Segurança e Boas Práticas

1. **Autenticação:** Todas as APIs devem ser protegidas por autenticação (implementar no Sprint 3)
2. **Autorização:** Operações de Admin (POST/PUT/DELETE perfis) devem verificar perfil do usuário
3. **Validação:** Sempre validar dados de entrada no backend
4. **Soft Delete:** Usuários e perfis são desativados, não deletados do banco
5. **Logs:** Registrar todas as alterações críticas (criação/atualização de usuários e permissões)

---

## 🧪 Testes

Execute o script de testes:

```bash
# Certifique-se de que o servidor está rodando
npm run dev

# Em outro terminal, execute os testes
node testar-apis-usuarios.js
```

---

**Documentação gerada em:** 05/02/2026  
**Próximo Sprint:** Frontend - Telas de administração
