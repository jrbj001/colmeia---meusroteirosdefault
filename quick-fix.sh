#!/bin/bash

# Script de Diagnóstico Rápido - Download Excel SharePoint
# Execute: bash quick-fix.sh

echo "🔧 DIAGNÓSTICO RÁPIDO - Download Excel SharePoint"
echo "=================================================="
echo ""

# 1. Verificar se estamos na pasta correta
echo "📂 1. Verificando pasta do projeto..."
if [ -f "package.json" ]; then
  echo "   ✅ Pasta correta"
else
  echo "   ❌ Execute este script na pasta do projeto"
  exit 1
fi
echo ""

# 2. Verificar se API existe
echo "📁 2. Verificando arquivo da API..."
if [ -f "api/sharepoint-download.js" ]; then
  echo "   ✅ API existe"
  echo "   📊 Tamanho: $(wc -c < api/sharepoint-download.js) bytes"
else
  echo "   ❌ API não encontrada em api/sharepoint-download.js"
  exit 1
fi
echo ""

# 3. Verificar se .env existe
echo "🔐 3. Verificando arquivo .env..."
if [ -f ".env" ]; then
  echo "   ✅ .env existe"
  echo ""
  echo "   📋 Variáveis configuradas:"
  cat .env | grep -E "AZURE_|SHAREPOINT_" | grep -v "CLIENT_SECRET" || echo "   ⚠️ Nenhuma variável Azure/SharePoint encontrada"
  echo ""
  
  # Verificar se CLIENT_SECRET está configurado
  if grep -q "AZURE_CLIENT_SECRET=" .env && [ -n "$(grep "AZURE_CLIENT_SECRET=" .env | cut -d'=' -f2)" ]; then
    echo "   ✅ AZURE_CLIENT_SECRET está configurado"
  else
    echo "   ❌ AZURE_CLIENT_SECRET NÃO está configurado ou está vazio"
    echo "   💡 Configure no .env com a senha do 1Password"
  fi
else
  echo "   ❌ .env não encontrado"
  echo "   💡 Crie o arquivo .env com as variáveis necessárias"
  exit 1
fi
echo ""

# 4. Verificar dependências
echo "📦 4. Verificando dependências..."
if [ -d "node_modules/@azure/msal-node" ]; then
  echo "   ✅ @azure/msal-node instalado"
else
  echo "   ❌ @azure/msal-node NÃO instalado"
  echo "   💡 Execute: npm install"
  exit 1
fi
echo ""

# 5. Verificar se porta 3000 está livre
echo "🌐 5. Verificando porta 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "   ⚠️ Porta 3000 está em uso"
  echo "   📋 Processo na porta 3000:"
  lsof -Pi :3000 -sTCP:LISTEN || true
  echo ""
  echo "   💡 Se for o Vercel, está OK!"
  echo "   💡 Se não, mate o processo: kill -9 \$(lsof -ti:3000)"
else
  echo "   ✅ Porta 3000 está livre"
  echo "   💡 Execute: vercel dev"
fi
echo ""

# 6. Verificar se script de teste existe
echo "🧪 6. Verificando script de teste..."
if [ -f "test-sharepoint-api.js" ]; then
  echo "   ✅ Script de teste existe"
  echo "   💡 Execute: node test-sharepoint-api.js"
else
  echo "   ⚠️ Script de teste não encontrado"
fi
echo ""

# 7. Resumo
echo "=================================================="
echo "📊 RESUMO"
echo "=================================================="
echo ""
echo "✅ PRÓXIMOS PASSOS:"
echo ""
echo "1️⃣  Inicie o servidor:"
echo "    vercel dev"
echo ""
echo "2️⃣  Em outro terminal, teste a API:"
echo "    node test-sharepoint-api.js"
echo ""
echo "3️⃣  Abra o navegador:"
echo "    http://localhost:3000"
echo ""
echo "4️⃣  Vá para Meus Roteiros → Abrir um roteiro → Aba 6"
echo ""
echo "5️⃣  Clique em 'Download Excel' e veja o console (F12)"
echo ""
echo "=================================================="

