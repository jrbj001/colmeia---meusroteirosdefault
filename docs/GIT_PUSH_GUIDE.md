# Guia de Push - Colmeia Meus Roteiros

Este documento descreve o processo correto para fazer push de commits neste projeto, resolvendo problemas comuns de SSL/certificados.

## 🚀 Processo Recomendado

### 1. Verificar o Status do Repositório

```bash
cd /Users/jroberto/colmeia---meusroteirosdefault
git status -sb
```

### 2. Adicionar e Commitar Alterações

```bash
# Adicionar arquivos específicos
git add <arquivo1> <arquivo2>

# Ou adicionar todos os arquivos modificados
git add .

# Criar o commit
git commit -m "feat: descrição da funcionalidade"
```

### 3. Fazer o Push via HTTPS (Método Recomendado)

```bash
# 1. Garantir que o remoto está em HTTPS
git remote set-url origin https://github.com/jrbj001/colmeia---meusroteirosdefault.git

# 2. Remover configurações problemáticas de SSL (se existirem)
git config --unset http.sslCAinfo
git config --unset http.sslBackend

# 3. Fazer o push
git push origin <nome-da-branch>
```

## 🔧 Solução de Problemas Comuns

### Erro: "error setting certificate verify locations"

**Causa:** Configuração incorreta do caminho dos certificados SSL.

**Solução:**
```bash
# Limpar configurações de SSL
git config --unset http.sslCAinfo
git config --unset http.sslBackend

# Tentar push novamente
git push origin <nome-da-branch>
```

### Erro: "Permission denied (publickey)" com SSH

**Causa:** Chave SSH não está carregada ou não existe.

**Solução:** Use HTTPS em vez de SSH:
```bash
git remote set-url origin https://github.com/jrbj001/colmeia---meusroteirosdefault.git
git push origin <nome-da-branch>
```

### Erro: "SSL certificate problem"

**Causa:** Certificados SSL do sistema não estão acessíveis.

**Solução:**
```bash
# Opção 1: Usar configurações padrão do sistema
git config --unset http.sslCAinfo
git config --unset http.sslBackend
git push origin <nome-da-branch>

# Opção 2: Usar certificados do Python certifi (se disponível)
git config http.sslCAinfo $(python3 -c "import certifi; print(certifi.where())")
git push origin <nome-da-branch>
```

## 📋 Checklist Rápido

Antes de fazer push, execute estes comandos na ordem:

```bash
# 1. Verificar branch atual
git branch

# 2. Garantir que está usando HTTPS
git remote -v

# 3. Se não estiver em HTTPS, ajustar
git remote set-url origin https://github.com/jrbj001/colmeia---meusroteirosdefault.git

# 4. Limpar configurações problemáticas
git config --unset http.sslCAinfo 2>/dev/null || true
git config --unset http.sslBackend 2>/dev/null || true

# 5. Fazer o push
git push origin <nome-da-branch>
```

## 🔐 Autenticação

O GitHub via HTTPS pode solicitar credenciais:

- **Username:** seu usuário do GitHub
- **Password:** use um **Personal Access Token** (não a senha da conta)
  - Gere em: https://github.com/settings/tokens
  - Permissões necessárias: `repo` (acesso completo a repositórios)

## 📝 Convenções de Commit

Use mensagens descritivas seguindo o padrão:

```
tipo: descrição curta

Tipos comuns:
- feat: nova funcionalidade
- fix: correção de bug
- docs: alterações em documentação
- style: formatação, ponto e vírgula, etc
- refactor: refatoração de código
- test: adição ou correção de testes
- chore: tarefas de manutenção
```

**Exemplos:**
```bash
git commit -m "feat: adiciona consulta de endereço por coordenadas"
git commit -m "fix: corrige normalização de coordenadas em micrograus"
git commit -m "docs: atualiza README com instruções de deploy"
```

## 🆘 Comando de Emergência

Se nada funcionar, use este comando único que resolve 90% dos problemas:

```bash
cd /Users/jroberto/colmeia---meusroteirosdefault && \
git remote set-url origin https://github.com/jrbj001/colmeia---meusroteirosdefault.git && \
git config --unset http.sslCAinfo 2>/dev/null || true && \
git config --unset http.sslBackend 2>/dev/null || true && \
git push origin $(git branch --show-current)
```

## 📚 Recursos Adicionais

- [Documentação Git](https://git-scm.com/doc)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Troubleshooting SSL](https://docs.github.com/en/get-started/getting-started-with-git/troubleshooting-ssl-errors)

---

**Última atualização:** 10 de novembro de 2025

