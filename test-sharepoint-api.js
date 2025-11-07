/**
 * Script de Teste - API SharePoint Download
 * 
 * Execute: node test-sharepoint-api.js
 */

const axios = require('axios');

// Teste local
const API_URL = 'http://localhost:3000/api/sharepoint-download';
const TEST_PK = 6406; // PK de teste

async function testarAPI() {
  console.log('🧪 Iniciando teste da API SharePoint...\n');
  console.log(`📊 URL: ${API_URL}`);
  console.log(`🔑 planoMidiaGrupo_pk: ${TEST_PK}\n`);
  
  try {
    console.log('📤 Enviando requisição...');
    
    const response = await axios.post(API_URL, {
      planoMidiaGrupo_pk: TEST_PK
    }, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 segundos
    });
    
    console.log('\n✅ SUCESSO!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Tamanho do arquivo: ${response.data.length} bytes`);
    
    if (response.headers['content-disposition']) {
      console.log(`📝 Nome do arquivo: ${response.headers['content-disposition']}`);
    }
    
    console.log('\n🎉 API está funcionando corretamente!');
    
  } catch (error) {
    console.error('\n❌ ERRO:');
    
    if (error.response) {
      // Servidor respondeu com erro
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📝 Mensagem:`, error.response.data?.toString() || error.response.data);
      
      if (error.response.status === 404) {
        console.error('\n💡 Dica: Arquivo não encontrado no SharePoint');
        console.error('   - Verifique se existe arquivo com planoMidiaGrupo_pk = ' + TEST_PK);
        console.error('   - Confirme se a coluna está preenchida corretamente');
      } else if (error.response.status === 500) {
        console.error('\n💡 Dica: Erro no servidor');
        console.error('   - Verifique se AZURE_CLIENT_SECRET está no .env');
        console.error('   - Confirme as credenciais no 1Password');
      }
    } else if (error.request) {
      // Requisição foi enviada mas não houve resposta
      console.error('📡 Servidor não respondeu');
      console.error('💡 Dica: Verifique se "vercel dev" está rodando');
    } else {
      // Erro na configuração da requisição
      console.error('⚙️ Erro na configuração:', error.message);
    }
    
    console.error('\n📋 Detalhes completos:');
    console.error(error.message);
  }
}

// Executar teste
testarAPI();

