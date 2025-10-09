/**
 * Teste da nova implementação: 1 conexão, 1 query para tudo
 */

const { buscarPassantesEmLote } = require('./api/banco-ativos-passantes');

async function testarLoteUnico() {
    console.log('🧪 ======================================');
    console.log('🧪 TESTE: Lote Único PostgreSQL');
    console.log('🧪 ======================================\n');

    // 10 coordenadas do Template
    const coordenadasTeste = [
        { latitude_vl: -7.114342, longitude_vl: -34.824542, tipoMidia_st: 'Painel de LED', ambiente_st: 'Via pública' },
        { latitude_vl: -7.119771, longitude_vl: -34.870685, tipoMidia_st: 'Abrigo de ônibus estático', ambiente_st: 'Via pública' },
        { latitude_vl: -7.104581, longitude_vl: -34.836145, tipoMidia_st: 'Abrigo de ônibus estático', ambiente_st: 'Via pública' },
        { latitude_vl: -7.097798, longitude_vl: -34.844722, tipoMidia_st: 'Abrigo de ônibus estático', ambiente_st: 'Via pública' },
        { latitude_vl: -7.097631, longitude_vl: -34.840043, tipoMidia_st: 'Painel de LED', ambiente_st: 'Via pública' },
        { latitude_vl: -1.40461, longitude_vl: -48.435321, tipoMidia_st: 'Relógio estático', ambiente_st: 'Via pública' },
        { latitude_vl: -1.376078, longitude_vl: -48.445146, tipoMidia_st: 'Relógio estático', ambiente_st: 'Via pública' },
        { latitude_vl: -1.4017, longitude_vl: -48.44212, tipoMidia_st: 'Relógio estático', ambiente_st: 'Via pública' },
        { latitude_vl: -1.37916, longitude_vl: -48.4491, tipoMidia_st: 'Relógio estático', ambiente_st: 'Via pública' },
        { latitude_vl: -1.37964, longitude_vl: -48.48144, tipoMidia_st: 'Relógio estático', ambiente_st: 'Via pública' },
    ];

    console.log(`📍 Testando ${coordenadasTeste.length} coordenadas com LOTE ÚNICO...\n`);

    try {
        const tempoInicio = Date.now();
        
        const resultado = await buscarPassantesEmLote(coordenadasTeste);
        
        const tempoTotal = (Date.now() - tempoInicio) / 1000;

        console.log('\n\n📊 ===== RESULTADOS =====\n');
        
        if (resultado.sucesso) {
            console.log(`✅ Processamento concluído!`);
            console.log(`⏱️  Tempo total: ${tempoTotal.toFixed(2)}s`);
            console.log(`⚡ Velocidade: ${(coordenadasTeste.length / tempoTotal).toFixed(1)} coords/segundo`);
            console.log(`\n📈 Resumo:`);
            console.log(`   Total:    ${resultado.resumo.total}`);
            console.log(`   Sucessos: ${resultado.resumo.sucessos}`);
            console.log(`   Falhas:   ${resultado.resumo.falhas}`);
            console.log(`   Taxa:     ${resultado.resumo.percentualSucesso}%`);
            console.log(`   Modo:     ${resultado.resumo.modo}`);
            
            console.log(`\n🎯 Amostra dos dados:\n`);
            
            resultado.dados.slice(0, 5).forEach((dado, index) => {
                console.log(`${index + 1}. ${dado.tipoMidia_st || 'N/A'}`);
                console.log(`   📍 Coords:  ${dado.latitude_vl}, ${dado.longitude_vl}`);
                console.log(`   🚶 Fluxo:   ${dado.fluxoPassantes_vl.toLocaleString('pt-BR')} passantes`);
                console.log(`   📊 Fonte:   ${dado.fonte}`);
                if (dado.codigo) console.log(`   🔖 Código:  ${dado.codigo}`);
                if (dado.cidade) console.log(`   🏙️  Cidade:  ${dado.cidade}`);
                console.log('');
            });

            // Estatísticas
            const fluxos = resultado.dados.map(d => d.fluxoPassantes_vl);
            const mediaFluxo = fluxos.reduce((a, b) => a + b, 0) / fluxos.length;
            const minFluxo = Math.min(...fluxos);
            const maxFluxo = Math.max(...fluxos);

            console.log(`📈 Estatísticas de Fluxo:`);
            console.log(`   Média: ${Math.round(mediaFluxo).toLocaleString('pt-BR')} passantes`);
            console.log(`   Mínimo: ${minFluxo.toLocaleString('pt-BR')} passantes`);
            console.log(`   Máximo: ${maxFluxo.toLocaleString('pt-BR')} passantes`);

            // Verificar quantos foram encontrados no banco
            const encontrados = resultado.dados.filter(d => d.codigo).length;
            const percentualEncontrado = (encontrados / resultado.dados.length) * 100;

            console.log(`\n📊 Cobertura do Banco:`);
            console.log(`   Encontrados: ${encontrados}/${resultado.dados.length} (${percentualEncontrado.toFixed(1)}%)`);
            console.log(`   Valor padrão: ${resultado.dados.length - encontrados}`);

            console.log('\n\n✅ TESTE CONCLUÍDO COM SUCESSO! 🎉');
            
            if (tempoTotal < 2) {
                console.log(`\n💡 EXCELENTE! Menos de 2 segundos para ${coordenadasTeste.length} coordenadas! ⚡⚡⚡`);
            } else if (tempoTotal < 5) {
                console.log(`\n💡 BOM! ${coordenadasTeste.length} coordenadas processadas em ${tempoTotal.toFixed(1)}s ⚡`);
            }
            
            if (percentualEncontrado >= 80) {
                console.log(`✅ Cobertura excelente (${percentualEncontrado.toFixed(1)}%)!`);
            } else if (percentualEncontrado >= 50) {
                console.log(`⚠️  Cobertura moderada (${percentualEncontrado.toFixed(1)}%)`);
            }

            console.log('\n🎯 Agora pode testar pela interface! Sistema otimizado para Vercel Dev!');

        } else {
            console.log(`❌ Erro no processamento: ${resultado.erro}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('\n\n❌ ERRO NO TESTE:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executar teste
console.log('🚀 Iniciando teste do lote único...\n');
testarLoteUnico()
    .then(() => {
        console.log('\n🏁 Teste finalizado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Teste falhou:', error.message);
        process.exit(1);
    });

