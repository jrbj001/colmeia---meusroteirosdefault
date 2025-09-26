const axios = require('axios');
const { buscarPassantesEmLote, buscarPassantesPorCoordenadas } = require('./api/banco-ativos-passantes');

// 📊 COORDENADAS REAIS EXTRAÍDAS DO EXCEL - VERIFICADAS MANUALMENTE
const coordenadasReais = [
  // 🏙️ NITERÓI - RJ (Via pública, Estático) - Linhas 1-84 do Excel
  { latitude_vl: -22.90277, longitude_vl: -43.13272, cidade: 'Niterói', uf: 'RJ', ambiente: 'Via pública', formato: 'Estático' },
  { latitude_vl: -22.90277, longitude_vl: -43.13272, cidade: 'Niterói', uf: 'RJ', ambiente: 'Via pública', formato: 'Estático' },
  { latitude_vl: -22.90277, longitude_vl: -43.13272, cidade: 'Niterói', uf: 'RJ', ambiente: 'Via pública', formato: 'Estático' },
  
  // 🏙️ JOÃO PESSOA - PB (Via pública, Outdoor/Estático) - Linhas 168-274 do Excel
  { latitude_vl: -7.12509, longitude_vl: -34.838783, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.085717, longitude_vl: -34.833532, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.11358, longitude_vl: -34.838498, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.108251, longitude_vl: -34.836368, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.126845, longitude_vl: -34.841037, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.104088, longitude_vl: -34.835392, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.17739, longitude_vl: -34.84016, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.085717, longitude_vl: -34.833532, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.146601, longitude_vl: -34.835489, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.181063, longitude_vl: -34.864022, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.138134, longitude_vl: -34.878531, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.149721, longitude_vl: -34.839092, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.138746, longitude_vl: -34.850586, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  
  // 🏙️ Coordenadas adicionais (diferentes formatos)
  { latitude_vl: -7.124453, longitude_vl: -34.851318, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Frontlight' },
  { latitude_vl: -7.083701, longitude_vl: -34.839066, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Frontlight' },
];

async function testarCoordenadasReais() {
  console.log('🔍 TESTANDO COORDENADAS REAIS DO BANCO DE ATIVOS');
  console.log('===============================================');
  
  for (let i = 0; i < coordenadasReais.length; i++) {
    const coord = coordenadasReais[i];
    console.log(`\n📍 Teste ${i + 1}/${coordenadasReais.length}: ${coord.cidade} - ${coord.uf}`);
    console.log(`   Coordenadas: ${coord.latitude_vl}, ${coord.longitude_vl}`);
    
    try {
      const resultado = await buscarPassantesPorCoordenadas(coord.latitude_vl, coord.longitude_vl);
      
      if (resultado.sucesso) {
        console.log(`   ✅ SUCESSO: ${resultado.dados.fluxoPassantes_vl} passantes`);
        console.log(`   📊 Fonte: ${resultado.dados.fonte}`);
      } else {
        console.log(`   ❌ FALHA: ${resultado.erro}`);
      }
      
      // Aguardar 1 segundo entre requests para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   💥 ERRO: ${error.message}`);
    }
  }
  
  console.log('\n==============================================');
  console.log('🔍 TESTANDO EM LOTE (BATCH)');
  console.log('==============================================');
  
  try {
    const resultadoLote = await buscarPassantesEmLote(coordenadasReais);
    
    console.log(`📊 Resumo do lote:`);
    console.log(`   Total: ${resultadoLote.resumo.total}`);
    console.log(`   Sucessos: ${resultadoLote.resumo.sucessos}`);
    console.log(`   Falhas: ${resultadoLote.resumo.falhas}`);
    console.log(`   Taxa de sucesso: ${resultadoLote.resumo.percentualSucesso}%`);
    
    console.log('\n📝 Detalhes por coordenada:');
    resultadoLote.dados.forEach((resultado, index) => {
      const coord = coordenadasReais[index];
      if (resultado.sucesso) {
        console.log(`   ✅ ${coord.cidade}: ${resultado.fluxoPassantes_vl} passantes (${resultado.fonte})`);
      } else {
        console.log(`   ❌ ${coord.cidade}: ${resultado.erro}`);
      }
    });
    
  } catch (error) {
    console.log(`💥 ERRO NO LOTE: ${error.message}`);
  }
}

// 🧪 FUNÇÃO PARA TESTAR COORDENADAS APROXIMADAS
async function testarCoordenadaAproximada(lat, lng, cidade) {
  console.log(`\n🔍 TESTE COORDENADA APROXIMADA: ${cidade}`);
  console.log(`📍 Original: ${lat}, ${lng}`);
  
  // Testar com variações pequenas
  const variacoes = [
    { lat, lng, nome: 'Exata' },
    { lat: lat + 0.001, lng, nome: '+0.001 lat' },
    { lat, lng: lng + 0.001, nome: '+0.001 lng' },
    { lat: lat - 0.001, lng, nome: '-0.001 lat' },
    { lat, lng: lng - 0.001, nome: '-0.001 lng' },
  ];
  
  for (const variacao of variacoes) {
    try {
      console.log(`   🔍 Testando ${variacao.nome}: ${variacao.lat}, ${variacao.lng}`);
      const resultado = await buscarPassantesPorCoordenadas(variacao.lat, variacao.lng);
      
      if (resultado.sucesso) {
        console.log(`     ✅ SUCESSO: ${resultado.dados.fluxoPassantes_vl} passantes`);
      } else {
        console.log(`     ❌ FALHA: ${resultado.erro}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`     💥 ERRO: ${error.message}`);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  console.log('🚀 INICIANDO TESTE DAS COORDENADAS REAIS DO BANCO DE ATIVOS');
  console.log('📅 Data:', new Date().toISOString());
  
  testarCoordenadasReais()
    .then(() => {
      console.log('\n✅ TESTES CONCLUÍDOS');
      return testarCoordenadaAproximada(-22.9027714, -43.1327214, 'Niterói');
    })
    .then(() => {
      return testarCoordenadaAproximada(-7.12509, -34.838783, 'João Pessoa');
    })
    .then(() => {
      console.log('\n🎯 TODOS OS TESTES FINALIZADOS');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 ERRO GERAL:', error);
      process.exit(1);
    });
}

module.exports = {
  coordenadasReais,
  testarCoordenadasReais,
  testarCoordenadaAproximada
};
