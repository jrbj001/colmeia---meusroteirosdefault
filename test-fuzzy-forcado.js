const axios = require('axios');
const fs = require('fs');
const { buscarPassantesPorCoordenadas } = require('./api/banco-ativos-passantes');

// 🎯 COORDENADAS ESTRATÉGICAS PARA FORÇAR USO DO FUZZY SEARCH
const coordenadasDesafiadoras = [
  // 🏙️ Coordenadas ligeiramente modificadas das que sabemos que funcionam
  { latitude_vl: -7.12508, longitude_vl: -34.838784, cidade: 'João Pessoa', teste: 'Micro variação da original' },
  { latitude_vl: -7.12507, longitude_vl: -34.838785, cidade: 'João Pessoa', teste: 'Variação menor ainda' },
  
  // 🎯 Coordenadas com precisão diferente
  { latitude_vl: -7.1251, longitude_vl: -34.8388, cidade: 'João Pessoa', teste: 'Menos casas decimais' },
  { latitude_vl: -7.12511, longitude_vl: -34.83879, cidade: 'João Pessoa', teste: 'Ligeiramente diferente' },
  
  // 🏙️ Niterói com variações pequenas
  { latitude_vl: -22.90278, longitude_vl: -43.13273, cidade: 'Niterói', teste: 'Micro variação Niterói' },
  { latitude_vl: -22.90276, longitude_vl: -43.13271, cidade: 'Niterói', teste: 'Variação oposta Niterói' },
  
  // 🌍 Coordenadas completamente aleatórias (devem falhar ou usar raios grandes)
  { latitude_vl: -23.5505, longitude_vl: -46.6333, cidade: 'São Paulo', teste: 'Centro SP (genérico)' },
  { latitude_vl: -22.9068, longitude_vl: -43.1729, cidade: 'Rio de Janeiro', teste: 'Centro RJ (genérico)' },
  
  // 🎯 Coordenadas propositalmente "erradas" mas próximas
  { latitude_vl: -7.125, longitude_vl: -34.839, cidade: 'João Pessoa', teste: 'Arredondada para forçar fuzzy' },
  { latitude_vl: -22.903, longitude_vl: -43.133, cidade: 'Niterói', teste: 'Arredondada para forçar fuzzy' },
];

/**
 * Teste focado em forçar o uso do fuzzy search
 */
async function testeFuzzyForcado() {
  console.log('🎯 TESTE FORCADO - FUZZY SEARCH & DISTÂNCIAS');
  console.log('=============================================');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🎯 Total de coordenadas: ${coordenadasDesafiadoras.length}`);
  console.log('🎯 Objetivo: Forçar uso de fuzzy search, raios e variações');
  console.log('');

  const resultados = [];

  for (let i = 0; i < coordenadasDesafiadoras.length; i++) {
    const coord = coordenadasDesafiadoras[i];
    const inicioTempo = Date.now();

    console.log(`\n📍 [${i + 1}/${coordenadasDesafiadoras.length}] ${coord.cidade} - ${coord.teste}`);
    console.log(`   📌 Coordenadas: ${coord.latitude_vl}, ${coord.longitude_vl}`);

    try {
      const resultado = await buscarPassantesPorCoordenadas(coord.latitude_vl, coord.longitude_vl);
      const tempoTotal = Date.now() - inicioTempo;

      if (resultado.sucesso && resultado.relatorioDetalhado) {
        const relatorio = resultado.relatorioDetalhado;
        const dados = resultado.dados;

        console.log(`   ✅ TIPO: ${relatorio.tipoEncontro.toUpperCase()}`);
        console.log(`   📊 Passantes: ${dados.fluxoPassantes_vl.toLocaleString()}`);
        console.log(`   📏 Distância: ${relatorio.distanciaCalculada}m`);
        console.log(`   📡 Raio usado: ${relatorio.raioUsado}m`);
        console.log(`   🎯 Fonte: ${dados.fonte}`);
        console.log(`   ⏱️ Tempo: ${tempoTotal}ms`);
        
        if (relatorio.variacao) {
          console.log(`   🔍 Variação fuzzy: ${relatorio.variacao}`);
          console.log(`   📍 Original: ${relatorio.coordenadaOriginal}`);
          console.log(`   📍 Encontrada: ${relatorio.coordenadaEncontrada}`);
        }

        // 💎 DESTACAR CASOS INTERESSANTES
        if (relatorio.tipoEncontro === 'fuzzy-coordenadas') {
          console.log(`   🎉 FUZZY SEARCH ATIVO! Variação: ${relatorio.variacao}`);
        } else if (relatorio.tipoEncontro === 'busca-raio' && relatorio.raioUsado > 0) {
          console.log(`   📡 BUSCA COM RAIO ATIVO! Raio: ${relatorio.raioUsado}m`);
        } else if (relatorio.tipoEncontro === 'busca-exata') {
          console.log(`   🎯 BUSCA EXATA (coordenada existe na base!)`);
        }

        resultados.push({
          indice: i + 1,
          cidade: coord.cidade,
          teste: coord.teste,
          coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
          coordEncontrada: relatorio.coordenadaEncontrada,
          tipoEncontro: relatorio.tipoEncontro,
          distancia: relatorio.distanciaCalculada,
          raio: relatorio.raioUsado,
          variacao: relatorio.variacao,
          passantes: dados.fluxoPassantes_vl,
          classeSocial: dados.classeSocial_st,
          fonte: dados.fonte,
          tempo: tempoTotal,
          sucesso: true
        });

      } else {
        console.log(`   ❌ FALHA: ${resultado.erro || 'Erro desconhecido'}`);
        
        resultados.push({
          indice: i + 1,
          cidade: coord.cidade,
          teste: coord.teste,
          coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
          tipoEncontro: 'erro',
          erro: resultado.erro,
          tempo: Date.now() - inicioTempo,
          sucesso: false
        });
      }

    } catch (error) {
      console.log(`   💥 EXCEÇÃO: ${error.message}`);
      
      resultados.push({
        indice: i + 1,
        cidade: coord.cidade,
        teste: coord.teste,
        coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
        tipoEncontro: 'excecao',
        erro: error.message,
        tempo: Date.now() - inicioTempo,
        sucesso: false
      });
    }

    // Delay entre requests
    if (i < coordenadasDesafiadoras.length - 1) {
      console.log(`   ⏱️ Aguardando 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 📊 ANÁLISE DOS RESULTADOS
  console.log('\n\n📊 ANÁLISE FINAL DOS RESULTADOS');
  console.log('================================');

  const sucessos = resultados.filter(r => r.sucesso);
  const fuzzyUsados = sucessos.filter(r => r.tipoEncontro === 'fuzzy-coordenadas');
  const raioUsados = sucessos.filter(r => r.tipoEncontro === 'busca-raio');
  const exatos = sucessos.filter(r => r.tipoEncontro === 'busca-exata');
  const erros = resultados.filter(r => !r.sucesso);

  console.log(`📊 Total processado: ${resultados.length}`);
  console.log(`✅ Sucessos: ${sucessos.length} (${(sucessos.length/resultados.length*100).toFixed(1)}%)`);
  console.log(`🎯 Busca exata: ${exatos.length} (${(exatos.length/resultados.length*100).toFixed(1)}%)`);
  console.log(`📡 Busca com raio: ${raioUsados.length} (${(raioUsados.length/resultados.length*100).toFixed(1)}%)`);
  console.log(`🔍 Fuzzy coordenadas: ${fuzzyUsados.length} (${(fuzzyUsados.length/resultados.length*100).toFixed(1)}%)`);
  console.log(`❌ Erros/Falhas: ${erros.length} (${(erros.length/resultados.length*100).toFixed(1)}%)`);

  if (fuzzyUsados.length > 0) {
    console.log('\n🎯 CASOS COM FUZZY SEARCH:');
    fuzzyUsados.forEach(caso => {
      console.log(`   ${caso.indice}. ${caso.cidade} - ${caso.teste}`);
      console.log(`      Variação: ${caso.variacao} | Distância: ${caso.distancia}m`);
      console.log(`      Passantes: ${caso.passantes.toLocaleString()}`);
      console.log(`      Original: ${caso.coordOriginal}`);
      console.log(`      Encontrada: ${caso.coordEncontrada}`);
    });
  }

  if (raioUsados.length > 0) {
    console.log('\n📡 CASOS COM BUSCA POR RAIO:');
    raioUsados.forEach(caso => {
      console.log(`   ${caso.indice}. ${caso.cidade} - ${caso.teste}`);
      console.log(`      Raio: ${caso.raio}m | Passantes: ${caso.passantes.toLocaleString()}`);
    });
  }

  // 📏 ESTATÍSTICAS DE DISTÂNCIA
  const casosComDistancia = sucessos.filter(r => r.distancia > 0);
  if (casosComDistancia.length > 0) {
    const distancias = casosComDistancia.map(r => r.distancia);
    const minDist = Math.min(...distancias);
    const maxDist = Math.max(...distancias);
    const mediaDist = distancias.reduce((a, b) => a + b, 0) / distancias.length;

    console.log('\n📏 ESTATÍSTICAS DE DISTÂNCIA:');
    console.log(`   📐 Mínima: ${minDist}m`);
    console.log(`   📐 Máxima: ${maxDist}m`);
    console.log(`   📐 Média: ${Math.round(mediaDist)}m`);
  }

  // 💾 SALVAR RELATÓRIO DETALHADO
  const nomeArquivo = `relatorio-fuzzy-forcado-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`;
  const relatorioFinal = {
    metadados: {
      dataGeracao: new Date().toISOString(),
      totalCoordenadas: resultados.length,
      objetivo: 'Teste forçado para validar fuzzy search e distâncias',
      versaoAlgoritmo: '2.0-fuzzy-enhanced'
    },
    estatisticas: {
      sucessos: sucessos.length,
      buscaExata: exatos.length,
      buscaComRaio: raioUsados.length,
      fuzzyCoordenadas: fuzzyUsados.length,
      erros: erros.length
    },
    resultados: resultados
  };

  fs.writeFileSync(nomeArquivo, JSON.stringify(relatorioFinal, null, 2));
  console.log(`\n📄 Relatório salvo: ${nomeArquivo}`);
  
  return relatorioFinal;
}

// Executar teste
if (require.main === module) {
  testeFuzzyForcado()
    .then(() => {
      console.log('\n✅ TESTE FORCADO CONCLUÍDO!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 ERRO:', error);
      process.exit(1);
    });
}

module.exports = { testeFuzzyForcado };
