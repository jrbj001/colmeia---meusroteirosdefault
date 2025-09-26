const axios = require('axios');
const fs = require('fs');
const { buscarPassantesEmLote, buscarPassantesPorCoordenadas } = require('./api/banco-ativos-passantes');

// 📊 COORDENADAS DE TESTE (incluindo casos conhecidos que usam fuzzy)
const coordenadasTeste = [
  // 🏙️ NITERÓI - RJ (casos que sabemos usar fuzzy)
  { latitude_vl: -22.90277, longitude_vl: -43.13272, cidade: 'Niterói', uf: 'RJ', ambiente: 'Via pública', formato: 'Estático' },
  { latitude_vl: -22.902771, longitude_vl: -43.133721, cidade: 'Niterói', uf: 'RJ', ambiente: 'Via pública', formato: 'Estático' },
  
  // 🏙️ JOÃO PESSOA - PB (casos reais com dados)
  { latitude_vl: -7.12509, longitude_vl: -34.838783, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.085717, longitude_vl: -34.833532, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.11358, longitude_vl: -34.838498, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.108251, longitude_vl: -34.836368, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor totem simples' },
  { latitude_vl: -7.126845, longitude_vl: -34.841037, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  { latitude_vl: -7.104088, longitude_vl: -34.835392, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Outdoor painel simples' },
  
  // 🎯 COORDENADAS ESPECÍFICAS PARA TESTE DE FUZZY (sabemos que dão resultados diferentes)
  { latitude_vl: -7.12509, longitude_vl: -34.837783, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Teste Fuzzy +0.001 lng' },
  { latitude_vl: -7.12609, longitude_vl: -34.838783, cidade: 'João Pessoa', uf: 'PB', ambiente: 'Via pública', formato: 'Teste Fuzzy -0.001 lat' },
];

/**
 * Gera relatório completo de uso do fuzzy search
 */
async function gerarRelatorioCompleto() {
  console.log('📊 GERANDO RELATÓRIO COMPLETO - FUZZY SEARCH BANCO DE ATIVOS');
  console.log('================================================================');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🎯 Total de coordenadas: ${coordenadasTeste.length}`);
  console.log('');

  const relatorioFinal = {
    metadados: {
      dataGeracao: new Date().toISOString(),
      totalCoordenadas: coordenadasTeste.length,
      versaoAlgoritmo: '2.0-fuzzy-enhanced'
    },
    resumoGeral: {
      buscaExata: 0,
      buscaComRaio: 0,
      buscaFuzzyCoordenadas: 0,
      semDados: 0,
      erros: 0
    },
    detalhesCoordenda: [],
    estatisticasDistancia: {
      distanciaMinima: Number.MAX_VALUE,
      distanciaMaxima: 0,
      distanciaMedia: 0,
      raiosUsados: {}
    },
    descobertasCriticas: []
  };

  // 🔍 PROCESSAR CADA COORDENADA INDIVIDUALMENTE PARA RELATÓRIO DETALHADO
  for (let i = 0; i < coordenadasTeste.length; i++) {
    const coord = coordenadasTeste[i];
    const inicioProcessamento = Date.now();

    console.log(`\n📍 [${i + 1}/${coordenadasTeste.length}] Processando: ${coord.cidade} - ${coord.uf}`);
    console.log(`   📌 Coordenadas: ${coord.latitude_vl}, ${coord.longitude_vl}`);
    console.log(`   🏢 Ambiente: ${coord.ambiente} | Formato: ${coord.formato}`);

    try {
      const resultado = await buscarPassantesPorCoordenadas(coord.latitude_vl, coord.longitude_vl);
      const tempoTotal = Date.now() - inicioProcessamento;

      if (resultado.sucesso && resultado.relatorioDetalhado) {
        const relatorio = resultado.relatorioDetalhado;
        const dados = resultado.dados;

        // 📊 CLASSIFICAR TIPO DE BUSCA
        switch (relatorio.tipoEncontro) {
          case 'busca-exata':
            relatorioFinal.resumoGeral.buscaExata++;
            break;
          case 'busca-raio':
            relatorioFinal.resumoGeral.buscaComRaio++;
            // Contar raios usados
            const raio = relatorio.raioUsado;
            relatorioFinal.estatisticasDistancia.raiosUsados[`${raio}m`] = 
              (relatorioFinal.estatisticasDistancia.raiosUsados[`${raio}m`] || 0) + 1;
            break;
          case 'fuzzy-coordenadas':
            relatorioFinal.resumoGeral.buscaFuzzyCoordenadas++;
            break;
          case 'sem-dados-raio':
            relatorioFinal.resumoGeral.semDados++;
            break;
          default:
            console.warn(`⚠️ Tipo de encontro desconhecido: ${relatorio.tipoEncontro}`);
        }

        // 📏 ESTATÍSTICAS DE DISTÂNCIA
        const distancia = relatorio.distanciaCalculada || 0;
        if (distancia > 0) {
          relatorioFinal.estatisticasDistancia.distanciaMinima = 
            Math.min(relatorioFinal.estatisticasDistancia.distanciaMinima, distancia);
          relatorioFinal.estatisticasDistancia.distanciaMaxima = 
            Math.max(relatorioFinal.estatisticasDistancia.distanciaMaxima, distancia);
        }

        // 🎯 DESCOBERTAS CRÍTICAS (diferenças significativas)
        if (relatorio.tipoEncontro === 'fuzzy-coordenadas' && dados.fluxoPassantes_vl > 50000) {
          relatorioFinal.descobertasCriticas.push({
            coordenadaOriginal: relatorio.coordenadaOriginal,
            coordenadaEncontrada: relatorio.coordenadaEncontrada,
            variacao: relatorio.variacao,
            distanciaMetros: relatorio.distanciaCalculada,
            fluxoPassantes: dados.fluxoPassantes_vl,
            impactoComercial: 'ALTO',
            observacao: `Fuzzy search descobriu ${dados.fluxoPassantes_vl.toLocaleString()} passantes a ${distancia}m da coordenada original`
          });
        }

        // 📝 DETALHES DA COORDENADA
        const detalheCoord = {
          indice: i + 1,
          cidade: coord.cidade,
          uf: coord.uf,
          ambiente: coord.ambiente,
          formato: coord.formato,
          coordenadaOriginal: relatorio.coordenadaOriginal,
          coordenadaEncontrada: relatorio.coordenadaEncontrada,
          tipoEncontro: relatorio.tipoEncontro,
          distanciaMetros: relatorio.distanciaCalculada,
          raioUsado: relatorio.raioUsado,
          variacao: relatorio.variacao,
          fluxoPassantes: dados.fluxoPassantes_vl,
          classeSocial: dados.classeSocial_st,
          fonte: dados.fonte,
          tempoProcessamento: relatorio.tempoProcessamento,
          tempoTotal: tempoTotal,
          sucesso: true
        };

        relatorioFinal.detalhesCoordenda.push(detalheCoord);

        console.log(`   ✅ ${relatorio.tipoEncontro.toUpperCase()}: ${dados.fluxoPassantes_vl.toLocaleString()} passantes`);
        console.log(`   📏 Distância: ${relatorio.distanciaCalculada}m | Raio: ${relatorio.raioUsado}m`);
        console.log(`   ⏱️ Tempo: ${tempoTotal}ms | Fonte: ${dados.fonte}`);
        
        if (relatorio.variacao) {
          console.log(`   🎯 Variação: ${relatorio.variacao} | Coordenada encontrada: ${relatorio.coordenadaEncontrada}`);
        }

      } else {
        relatorioFinal.resumoGeral.erros++;
        
        relatorioFinal.detalhesCoordenda.push({
          indice: i + 1,
          cidade: coord.cidade,
          uf: coord.uf,
          coordenadaOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
          tipoEncontro: 'erro',
          erro: resultado.erro || 'Erro desconhecido',
          tempoTotal: tempoTotal,
          sucesso: false
        });

        console.log(`   ❌ ERRO: ${resultado.erro || 'Erro desconhecido'}`);
      }

    } catch (error) {
      relatorioFinal.resumoGeral.erros++;
      console.log(`   💥 EXCEÇÃO: ${error.message}`);
      
      relatorioFinal.detalhesCoordenda.push({
        indice: i + 1,
        cidade: coord.cidade,
        uf: coord.uf,
        coordenadaOriginal: `${coord.latitude_vl}, ${coord.longitude_vl}`,
        tipoEncontro: 'excecao',
        erro: error.message,
        tempoTotal: Date.now() - inicioProcessamento,
        sucesso: false
      });
    }

    // ⏳ Delay entre requisições
    if (i < coordenadasTeste.length - 1) {
      console.log(`   ⏱️ Aguardando 2s antes da próxima...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 📊 CALCULAR ESTATÍSTICAS FINAIS
  const coordenadasComDistancia = relatorioFinal.detalhesCoordenda.filter(c => c.distanciaMetros > 0);
  if (coordenadasComDistancia.length > 0) {
    const somaDistancias = coordenadasComDistancia.reduce((soma, c) => soma + c.distanciaMetros, 0);
    relatorioFinal.estatisticasDistancia.distanciaMedia = Math.round(somaDistancias / coordenadasComDistancia.length);
  }

  // Corrigir distância mínima se não foi alterada
  if (relatorioFinal.estatisticasDistancia.distanciaMinima === Number.MAX_VALUE) {
    relatorioFinal.estatisticasDistancia.distanciaMinima = 0;
  }

  return relatorioFinal;
}

/**
 * Gera relatório em diferentes formatos
 */
async function gerarRelatorios() {
  try {
    console.log('🚀 INICIANDO GERAÇÃO DE RELATÓRIO COMPLETO');
    console.log('==========================================');
    
    const relatorio = await gerarRelatorioCompleto();
    
    // 📄 SALVAR RELATÓRIO JSON
    const nomeArquivoJson = `relatorio-fuzzy-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`;
    fs.writeFileSync(nomeArquivoJson, JSON.stringify(relatorio, null, 2));
    
    // 📊 SALVAR RELATÓRIO CSV
    const nomeArquivoCsv = `relatorio-fuzzy-${new Date().toISOString().slice(0, 16).replace(':', '-')}.csv`;
    const csvHeader = 'Indice,Cidade,UF,Ambiente,Formato,Coord_Original,Coord_Encontrada,Tipo_Encontro,Distancia_m,Raio_m,Variacao,Fluxo_Passantes,Classe_Social,Fonte,Tempo_ms,Sucesso\n';
    const csvLinhas = relatorio.detalhesCoordenda.map(c => 
      `${c.indice},"${c.cidade}","${c.uf}","${c.ambiente}","${c.formato}","${c.coordenadaOriginal}","${c.coordenadaEncontrada || ''}","${c.tipoEncontro}",${c.distanciaMetros || 0},${c.raioUsado || 0},"${c.variacao || ''}",${c.fluxoPassantes || 0},"${c.classeSocial || ''}","${c.fonte || ''}",${c.tempoTotal},${c.sucesso}`
    ).join('\n');
    fs.writeFileSync(nomeArquivoCsv, csvHeader + csvLinhas);
    
    // 📋 EXIBIR RESUMO FINAL
    console.log('\n\n📊 RELATÓRIO FINAL - FUZZY SEARCH');
    console.log('==================================');
    console.log(`📅 Data: ${relatorio.metadados.dataGeracao}`);
    console.log(`📊 Total processado: ${relatorio.metadados.totalCoordenadas} coordenadas`);
    console.log('');
    
    console.log('🎯 RESUMO POR TIPO DE BUSCA:');
    console.log(`   🎯 Busca Exata: ${relatorio.resumoGeral.buscaExata} (${(relatorio.resumoGeral.buscaExata/relatorio.metadados.totalCoordenadas*100).toFixed(1)}%)`);
    console.log(`   📡 Busca com Raio: ${relatorio.resumoGeral.buscaComRaio} (${(relatorio.resumoGeral.buscaComRaio/relatorio.metadados.totalCoordenadas*100).toFixed(1)}%)`);
    console.log(`   🔍 Fuzzy Coordenadas: ${relatorio.resumoGeral.buscaFuzzyCoordenadas} (${(relatorio.resumoGeral.buscaFuzzyCoordenadas/relatorio.metadados.totalCoordenadas*100).toFixed(1)}%)`);
    console.log(`   ❌ Sem Dados: ${relatorio.resumoGeral.semDados} (${(relatorio.resumoGeral.semDados/relatorio.metadados.totalCoordenadas*100).toFixed(1)}%)`);
    console.log(`   💥 Erros: ${relatorio.resumoGeral.erros} (${(relatorio.resumoGeral.erros/relatorio.metadados.totalCoordenadas*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('📏 ESTATÍSTICAS DE DISTÂNCIA:');
    console.log(`   📐 Distância mínima: ${relatorio.estatisticasDistancia.distanciaMinima}m`);
    console.log(`   📐 Distância máxima: ${relatorio.estatisticasDistancia.distanciaMaxima}m`);
    console.log(`   📐 Distância média: ${relatorio.estatisticasDistancia.distanciaMedia}m`);
    console.log('');
    
    console.log('🎯 RAIOS MAIS UTILIZADOS:');
    Object.entries(relatorio.estatisticasDistancia.raiosUsados)
      .sort(([,a], [,b]) => b - a)
      .forEach(([raio, count]) => {
        console.log(`   📡 ${raio}: ${count} vezes`);
      });
    console.log('');
    
    if (relatorio.descobertasCriticas.length > 0) {
      console.log('🎯 DESCOBERTAS CRÍTICAS:');
      relatorio.descobertasCriticas.forEach((descoberta, i) => {
        console.log(`   ${i + 1}. ${descoberta.variacao}: ${descoberta.fluxoPassantes.toLocaleString()} passantes (${descoberta.distanciaMetros}m)`);
        console.log(`      Original: ${descoberta.coordenadaOriginal}`);
        console.log(`      Encontrada: ${descoberta.coordenadaEncontrada}`);
      });
    }
    
    console.log('\n📄 ARQUIVOS GERADOS:');
    console.log(`   📄 JSON: ${nomeArquivoJson}`);
    console.log(`   📊 CSV: ${nomeArquivoCsv}`);
    
    console.log('\n✅ RELATÓRIO COMPLETO GERADO COM SUCESSO!');
    
  } catch (error) {
    console.error('💥 ERRO AO GERAR RELATÓRIO:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  gerarRelatorios()
    .then(() => {
      console.log('\n🎉 PROCESSO FINALIZADO!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 ERRO GERAL:', error);
      process.exit(1);
    });
}

module.exports = {
  gerarRelatorioCompleto,
  gerarRelatorios,
  coordenadasTeste
};
