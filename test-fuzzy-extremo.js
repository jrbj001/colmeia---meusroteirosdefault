const { buscarPassantesPorCoordenadas } = require('./api/banco-ativos-passantes');
const fs = require('fs');

// 🎯 COORDENADAS EXTREMAS PARA FORÇAR FUZZY SEARCH
const coordenadasExtremas = [
  // 🌊 Coordenadas no mar (devem forçar busca por raio/fuzzy)
  { latitude_vl: -23.0000, longitude_vl: -43.0000, local: 'Oceano próximo ao RJ', tipo: 'água' },
  { latitude_vl: -7.0000, longitude_vl: -35.0000, local: 'Oceano próximo a João Pessoa', tipo: 'água' },
  
  // 🏞️ Coordenadas em áreas rurais/remotas
  { latitude_vl: -15.7801, longitude_vl: -47.9292, local: 'Brasília - área remota', tipo: 'rural' },
  { latitude_vl: -3.7319, longitude_vl: -38.5267, local: 'Fortaleza - periferia', tipo: 'periferia' },
  
  // 🎯 Coordenadas intencionalmente "quebradas" (decimais estranhos)
  { latitude_vl: -7.123456789, longitude_vl: -34.987654321, local: 'João Pessoa - coordenada fictícia', tipo: 'fictícia' },
  { latitude_vl: -22.999999, longitude_vl: -43.111111, local: 'RJ - coordenada fictícia', tipo: 'fictícia' },
  
  // 🏭 Coordenadas industriais/portuárias (podem ter pouco movimento)
  { latitude_vl: -23.9618, longitude_vl: -46.3322, local: 'Santos - área portuária', tipo: 'industrial' },
  { latitude_vl: -22.8305, longitude_vl: -43.2192, local: 'RJ - área industrial', tipo: 'industrial' },
  
  // 🎯 Coordenadas com precisão GPS baixa (simulando dados reais de campo)
  { latitude_vl: -7.1, longitude_vl: -34.8, local: 'João Pessoa - GPS baixa precisão', tipo: 'baixa-precisao' },
  { latitude_vl: -22.9, longitude_vl: -43.1, local: 'RJ - GPS baixa precisão', tipo: 'baixa-precisao' },
];

/**
 * Teste extremo para forçar todos os tipos de busca
 */
async function testeExtremo() {
  console.log('💥 TESTE EXTREMO - TODAS AS MODALIDADES DE BUSCA');
  console.log('================================================');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🎯 Coordenadas extremas: ${coordenadasExtremas.length}`);
  console.log('🎯 Objetivo: Demonstrar fuzzy search, raios e limites do sistema');
  console.log('');

  const resultados = [];
  let countBuscaExata = 0;
  let countBuscaRaio = 0;
  let countFuzzyCoordenadas = 0;
  let countSemDados = 0;
  let countErros = 0;

  for (let i = 0; i < coordenadasExtremas.length; i++) {
    const coord = coordenadasExtremas[i];
    const inicioTempo = Date.now();

    console.log(`\n🎯 [${i + 1}/${coordenadasExtremas.length}] ${coord.local}`);
    console.log(`   📌 Coordenadas: ${coord.latitude_vl}, ${coord.longitude_vl}`);
    console.log(`   🏷️ Tipo: ${coord.tipo}`);

    try {
      const resultado = await buscarPassantesPorCoordenadas(coord.latitude_vl, coord.longitude_vl);
      const tempoTotal = Date.now() - inicioTempo;

      if (resultado.sucesso && resultado.relatorioDetalhado) {
        const relatorio = resultado.relatorioDetalhado;
        const dados = resultado.dados;

        console.log(`   ✅ RESULTADO: ${relatorio.tipoEncontro.toUpperCase()}`);
        console.log(`   📊 Passantes: ${dados.fluxoPassantes_vl.toLocaleString()}`);
        console.log(`   🏷️ Classe: ${dados.classeSocial_st}`);
        console.log(`   📏 Distância: ${relatorio.distanciaCalculada}m`);
        console.log(`   📡 Raio: ${relatorio.raioUsado}m`);
        console.log(`   🎯 Fonte: ${dados.fonte}`);
        console.log(`   ⏱️ Tempo: ${tempoTotal}ms`);

        // 🎊 DESTACAR CASOS ESPECIAIS
        switch (relatorio.tipoEncontro) {
          case 'busca-exata':
            countBuscaExata++;
            console.log(`   🎯 EXATA: Coordenada existe exatamente na base!`);
            break;
          case 'busca-raio':
            countBuscaRaio++;
            console.log(`   📡 RAIO: Encontrado num raio de ${relatorio.raioUsado}m!`);
            break;
          case 'fuzzy-coordenadas':
            countFuzzyCoordenadas++;
            console.log(`   🔍 FUZZY: Variação ${relatorio.variacao}!`);
            console.log(`   📍 Original: ${relatorio.coordenadaOriginal}`);
            console.log(`   📍 Encontrada: ${relatorio.coordenadaEncontrada}`);
            console.log(`   📏 Distância real: ${relatorio.distanciaCalculada}m`);
            break;
          case 'sem-dados-raio':
            countSemDados++;
            console.log(`   ❌ SEM DADOS: Mesmo com raio ${relatorio.raioUsado}m`);
            break;
        }

        resultados.push({
          indice: i + 1,
          local: coord.local,
          tipo: coord.tipo,
          coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
          coordEncontrada: relatorio.coordenadaEncontrada,
          tipoEncontro: relatorio.tipoEncontro,
          distancia: relatorio.distanciaCalculada,
          raio: relatorio.raioUsado,
          variacao: relatorio.variacao || null,
          passantes: dados.fluxoPassantes_vl,
          classeSocial: dados.classeSocial_st,
          fonte: dados.fonte,
          tempo: tempoTotal,
          sucesso: true,
          // 💎 INDICADORES ESPECIAIS
          usouFuzzy: relatorio.tipoEncontro === 'fuzzy-coordenadas',
          usouRaio: relatorio.tipoEncontro === 'busca-raio',
          distanciaReal: relatorio.distanciaCalculada || 0
        });

      } else {
        countErros++;
        console.log(`   ❌ FALHA: ${resultado.erro || 'Erro desconhecido'}`);
        
        resultados.push({
          indice: i + 1,
          local: coord.local,
          tipo: coord.tipo,
          coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
          tipoEncontro: 'erro',
          erro: resultado.erro,
          tempo: Date.now() - inicioTempo,
          sucesso: false
        });
      }

    } catch (error) {
      countErros++;
      console.log(`   💥 EXCEÇÃO: ${error.message}`);
      
      resultados.push({
        indice: i + 1,
        local: coord.local,
        tipo: coord.tipo,
        coordOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
        tipoEncontro: 'excecao',
        erro: error.message,
        tempo: Date.now() - inicioTempo,
        sucesso: false
      });
    }

    // Delay entre requests
    if (i < coordenadasExtremas.length - 1) {
      console.log(`   ⏱️ Aguardando 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 📊 RELATÓRIO FINAL DETALHADO
  console.log('\n\n🎊 RELATÓRIO FINAL EXTREMO');
  console.log('===========================');

  const total = resultados.length;
  console.log(`📊 RESUMO GERAL:`);
  console.log(`   🎯 Total processado: ${total}`);
  console.log(`   ✅ Sucessos: ${total - countErros} (${((total - countErros)/total*100).toFixed(1)}%)`);
  console.log(`   ❌ Erros: ${countErros} (${(countErros/total*100).toFixed(1)}%)`);
  console.log('');

  console.log(`📡 DISTRIBUIÇÃO POR TIPO DE BUSCA:`);
  console.log(`   🎯 Busca exata: ${countBuscaExata} (${(countBuscaExata/total*100).toFixed(1)}%)`);
  console.log(`   📡 Busca com raio: ${countBuscaRaio} (${(countBuscaRaio/total*100).toFixed(1)}%)`);
  console.log(`   🔍 Fuzzy coordenadas: ${countFuzzyCoordenadas} (${(countFuzzyCoordenadas/total*100).toFixed(1)}%)`);
  console.log(`   ❌ Sem dados: ${countSemDados} (${(countSemDados/total*100).toFixed(1)}%)`);
  console.log('');

  // 🎯 ANÁLISE POR TIPO DE COORDENADA
  const tiposCoord = [...new Set(resultados.map(r => r.tipo))];
  console.log(`🏷️ ANÁLISE POR TIPO DE COORDENADA:`);
  tiposCoord.forEach(tipo => {
    const casosDoTipo = resultados.filter(r => r.tipo === tipo);
    const sucessosDoTipo = casosDoTipo.filter(r => r.sucesso);
    console.log(`   ${tipo}: ${sucessosDoTipo.length}/${casosDoTipo.length} sucessos`);
  });
  console.log('');

  // 🎯 CASOS COM FUZZY SEARCH
  const casosFuzzy = resultados.filter(r => r.usouFuzzy);
  if (casosFuzzy.length > 0) {
    console.log(`🔍 CASOS COM FUZZY SEARCH (${casosFuzzy.length}):`);
    casosFuzzy.forEach(caso => {
      console.log(`   ${caso.indice}. ${caso.local}`);
      console.log(`      📌 Original: ${caso.coordOriginal}`);
      console.log(`      📍 Encontrada: ${caso.coordEncontrada}`);
      console.log(`      🎯 Variação: ${caso.variacao}`);
      console.log(`      📏 Distância: ${caso.distancia}m`);
      console.log(`      📊 Passantes: ${caso.passantes.toLocaleString()}`);
    });
    console.log('');
  }

  // 📡 CASOS COM BUSCA POR RAIO
  const casosRaio = resultados.filter(r => r.usouRaio);
  if (casosRaio.length > 0) {
    console.log(`📡 CASOS COM BUSCA POR RAIO (${casosRaio.length}):`);
    casosRaio.forEach(caso => {
      console.log(`   ${caso.indice}. ${caso.local}`);
      console.log(`      📡 Raio usado: ${caso.raio}m`);
      console.log(`      📊 Passantes: ${caso.passantes.toLocaleString()}`);
    });
    console.log('');
  }

  // 📏 ESTATÍSTICAS DE DISTÂNCIA
  const casosComDistancia = resultados.filter(r => r.sucesso && r.distanciaReal > 0);
  if (casosComDistancia.length > 0) {
    const distancias = casosComDistancia.map(r => r.distanciaReal);
    const minDist = Math.min(...distancias);
    const maxDist = Math.max(...distancias);
    const mediaDist = distancias.reduce((a, b) => a + b, 0) / distancias.length;

    console.log(`📏 ESTATÍSTICAS DE DISTÂNCIA (${casosComDistancia.length} casos):`);
    console.log(`   📐 Distância mínima: ${minDist}m`);
    console.log(`   📐 Distância máxima: ${maxDist}m`);
    console.log(`   📐 Distância média: ${Math.round(mediaDist)}m`);
    console.log('');
  }

  // 💾 SALVAR RELATÓRIO COMPLETO
  const nomeArquivo = `relatorio-extremo-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`;
  const relatorioCompleto = {
    metadados: {
      dataGeracao: new Date().toISOString(),
      totalCoordenadas: total,
      objetivo: 'Teste extremo para demonstrar limites e capacidades do fuzzy search',
      versaoAlgoritmo: '2.0-fuzzy-enhanced',
      tiposTestados: tiposCoord
    },
    estatisticas: {
      total: total,
      sucessos: total - countErros,
      erros: countErros,
      buscaExata: countBuscaExata,
      buscaComRaio: countBuscaRaio,
      fuzzyCoordenadas: countFuzzyCoordenadas,
      semDados: countSemDados,
      percentualSucesso: ((total - countErros)/total*100).toFixed(1)
    },
    analiseDistancia: casosComDistancia.length > 0 ? {
      casosComDistancia: casosComDistancia.length,
      distanciaMinima: Math.min(...casosComDistancia.map(r => r.distanciaReal)),
      distanciaMaxima: Math.max(...casosComDistancia.map(r => r.distanciaReal)),
      distanciaMedia: Math.round(casosComDistancia.map(r => r.distanciaReal).reduce((a, b) => a + b, 0) / casosComDistancia.length)
    } : null,
    resultados: resultados
  };

  fs.writeFileSync(nomeArquivo, JSON.stringify(relatorioCompleto, null, 2));
  console.log(`📄 Relatório completo salvo: ${nomeArquivo}`);

  // 📊 GERAR CSV PARA ANÁLISE
  const csvFile = nomeArquivo.replace('.json', '.csv');
  const csvHeader = 'Indice,Local,Tipo,Coord_Original,Coord_Encontrada,Tipo_Encontro,Distancia_m,Raio_m,Variacao,Passantes,Classe_Social,Fonte,Tempo_ms,Sucesso,Usou_Fuzzy,Usou_Raio\n';
  const csvRows = resultados.map(r => 
    `${r.indice},"${r.local}","${r.tipo}","${r.coordOriginal}","${r.coordEncontrada || ''}","${r.tipoEncontro}",${r.distancia || 0},${r.raio || 0},"${r.variacao || ''}",${r.passantes || 0},"${r.classeSocial || ''}","${r.fonte || ''}",${r.tempo},${r.sucesso},${r.usouFuzzy || false},${r.usouRaio || false}`
  ).join('\n');
  fs.writeFileSync(csvFile, csvHeader + csvRows);
  console.log(`📊 CSV gerado: ${csvFile}`);

  return relatorioCompleto;
}

// Executar teste
if (require.main === module) {
  testeExtremo()
    .then((relatorio) => {
      console.log('\n🎉 TESTE EXTREMO CONCLUÍDO!');
      console.log('🎯 Este teste demonstra as capacidades completas do algoritmo fuzzy search.');
      console.log(`📊 Taxa de sucesso: ${relatorio.estatisticas.percentualSucesso}%`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 ERRO:', error);
      process.exit(1);
    });
}

module.exports = { testeExtremo };
