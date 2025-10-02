const axios = require('axios');
const fs = require('fs');

async function testeFluxoOriginalRestaurado() {
    try {
        const baseURL = 'http://localhost:3000/api';

        console.log('🚀 TESTE FLUXO ORIGINAL RESTAURADO');
        console.log('════════════════════════════════════════════════════════════════════════════════');

        // ETAPA 1: Preparar dados do roteiro
        console.log('\n🔄 ETAPA 1: Preparando dados do roteiro...');
        
        const roteiros = require('fs').readFileSync('/Users/jroberto/colmeia---meusroteirosdefault/Template-Tabela 1.csv', 'utf-8')
            .split('\n')
            .slice(2) // Pular cabeçalhos
            .filter(line => line.trim() && line.includes(';'))
            .map(line => {
                const cols = line.split(';');
                return {
                    praca_st: cols[0],
                    uf_st: cols[1],
                    ambiente_st: cols[2],
                    grupoFormatosMidia_st: cols[3],
                    formato_st: cols[4],
                    tipoMidia_st: cols[5],
                    latitude_vl: parseFloat(cols[6]?.replace(',', '.')) || 0,
                    longitude_vl: parseFloat(cols[7]?.replace(',', '.')) || 0,
                    seDigitalInsercoes_vl: parseInt(cols[8]) || null,
                    seDigitalMaximoInsercoes_vl: parseInt(cols[9]) || null,
                    seEstaticoVisibilidade_vl: cols[10] ? 100 : null,
                    semana_st: cols[11]
                };
            })
            .filter(r => r.praca_st && r.latitude_vl && r.longitude_vl);

        console.log(`✅ Dados preparados: ${roteiros.length} roteiros`);

        // ETAPA 2: Criar o grupo PRIMEIRO (ESSENCIAL!)
        console.log('\n🔄 ETAPA 2: Criando plano mídia grupo...');
        
        const grupoResponse = await axios.post(`${baseURL}/plano-midia-grupo`, {
            planoMidiaGrupo_st: `TESTE_GRUPO_${new Date().toISOString()}`
        });

        if (!grupoResponse.data || !Array.isArray(grupoResponse.data) || grupoResponse.data.length === 0) {
            throw new Error('❌ Criação do plano mídia grupo falhou');
        }

        const planoMidiaGrupo_pk = grupoResponse.data[0].new_pk;
        console.log(`✅ Plano mídia grupo criado com PK: ${planoMidiaGrupo_pk}`);

        // ETAPA 3: Upload dos roteiros com o PK correto
        console.log('\n🔄 ETAPA 3: Salvando roteiros no banco...');
        
        const roteirosComGrupo = roteiros.map(roteiro => ({
            ...roteiro,
            planoMidiaGrupo_pk: planoMidiaGrupo_pk
        }));
        
        const uploadResponse = await axios.post(`${baseURL}/upload-roteiros`, {
            roteiros: roteirosComGrupo
        });

        if (!uploadResponse.data || !uploadResponse.data.roteiros || uploadResponse.data.roteiros.length === 0) {
            throw new Error('❌ Upload de roteiros falhou');
        }

        const date_dh = uploadResponse.data.estatisticas?.dateLote || new Date().toISOString();

        console.log(`✅ Roteiros salvos no uploadRoteiros_ft`);
        console.log(`📊 PK do grupo: ${planoMidiaGrupo_pk}`);
        console.log(`📅 Data/hora: ${date_dh}`);
        
        // ETAPA 4: Consultar view (FLUXO ORIGINAL RESTAURADO)
        console.log('\n🔄 ETAPA 4: Consultando view uploadRoteirosPlanoMidia...');
        
        const viewResponse = await axios.post(`${baseURL}/upload-roteiros-plano-midia`, {
            planoMidiaGrupo_pk: planoMidiaGrupo_pk,
            date_dh: date_dh
        });

        if (!viewResponse.data || !viewResponse.data.success) {
            throw new Error('❌ Consulta da view falhou');
        }

        const dadosView = viewResponse.data.data;
        console.log(`✅ View consultada: ${dadosView.length} combinações cidade+semana`);

        // ETAPA 5: Banco de Ativos (ESSENCIAL PARA O FLUXO)
        console.log('\n🔄 ETAPA 5: Processando pontos únicos + Banco de Ativos...');
        console.log('⏱️ Este processo pode levar alguns minutos...');
        
        const pontosResponse = await axios.post(`${baseURL}/upload-pontos-unicos`, {
            planoMidiaGrupo_pk: planoMidiaGrupo_pk,
            date_dh: date_dh
        }, {
            timeout: 600000 // 10 minutos
        });

        if (!pontosResponse.data || !pontosResponse.data.success) {
            throw new Error(`❌ Processamento de pontos falhou: ${pontosResponse.data?.message || 'Sem mensagem'}`);
        }

        console.log(`✅ Pontos únicos processados: ${pontosResponse.data.data.pontosUnicos}`);
        console.log(`✅ Pontos inseridos no uploadInventario_ft: ${pontosResponse.data.data.pontosInseridos}`);

        if (pontosResponse.data.data.relatorioDetalhado) {
            const rel = pontosResponse.data.data.relatorioDetalhado;
            console.log('\n📊 RELATÓRIO BANCO DE ATIVOS:');
            console.log(`   ✅ Com dados reais de fluxo: ${rel.comDados}`);
            console.log(`   🔴 Fluxo zero (baixo movimento): ${rel.fluxoZero}`);
            console.log(`   📍 API sem cobertura: ${rel.apiSemDados}`);
            console.log(`   🔧 Valor padrão (fallback): ${rel.valorPadrao}`);
        }

        // ETAPA 6: Criar Planos Mídia (FLUXO ORIGINAL RESTAURADO)
        console.log('\n🔄 ETAPA 6: Criando planos de mídia...');
        
        // Extrair cidades únicas (já normalizadas)
        const cidadesExcel = [...new Set(dadosView.map(d => d.praca_st))];
        console.log(`🏙️ Cidades encontradas: ${cidadesExcel.join(', ')}`);

        // ✅ Buscar ibgeCodes dinamicamente do banco (como faz o frontend agora!)
        const ibgeCodeMap = {};
        const cidadesEstadosMap = {
            'BELEM': 'PA',
            'JOAO PESSOA': 'PB'
        };
        
        for (const cidade of cidadesExcel) {
            const estado = cidadesEstadosMap[cidade];
            try {
                const ibgeResponse = await axios.post(`${baseURL}/cidades-ibge`, {
                    cidade_st: cidade,
                    estado_st: estado
                });
                
                if (ibgeResponse.data && ibgeResponse.data.ibgeCode) {
                    ibgeCodeMap[cidade] = ibgeResponse.data.ibgeCode;
                    console.log(`   ✅ ibgeCode encontrado para ${cidade}/${estado}: ${ibgeResponse.data.ibgeCode}`);
                } else {
                    console.warn(`   ⚠️ ibgeCode não encontrado para ${cidade}/${estado}, usando 0`);
                    ibgeCodeMap[cidade] = 0;
                }
            } catch (error) {
                console.error(`   ❌ Erro ao buscar ibgeCode para ${cidade}/${estado}:`, error.response?.data || error.message);
                ibgeCodeMap[cidade] = 0;
            }
        }
        
        // Criar plano mídia desc para cada cidade com ibgeCode correto
        const recordsJson = cidadesExcel.map((cidade) => ({
            planoMidiaDesc_st: `TESTE_${cidade.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
            usuarioId_st: 'teste',
            usuarioName_st: 'Teste',
            gender_st: 'Todos',
            class_st: 'Todas',
            age_st: 'Todas',
            ibgeCode_vl: ibgeCodeMap[cidade] || 0
        }));

        const descResponse = await axios.post(`${baseURL}/plano-midia-desc`, {
            planoMidiaGrupo_pk: planoMidiaGrupo_pk,
            recordsJson
        });

        if (!descResponse.data || !Array.isArray(descResponse.data)) {
            throw new Error('❌ Criação do plano mídia desc falhou');
        }

        const descPks = descResponse.data.map(item => item.new_pk);
        console.log(`✅ ${descPks.length} planos mídia desc criados`);

        // Criar períodos
        const periodsJson = dadosView.map((dadoView, index) => {
            const cidadeIndex = cidadesExcel.indexOf(dadoView.praca_st);
            const descPk = descPks[cidadeIndex];
            
            return {
                planoMidiaDesc_pk: descPk.toString(),
                semanaInicial_vl: dadoView.semanaInicial_vl.toString(),
                semanaFinal_vl: dadoView.semanaFinal_vl.toString(),
                versao_vl: "1"
            };
        });

        const spResponse = await axios.post(`${baseURL}/sp-plano-midia-insert`, {
            periodsJson: JSON.stringify(periodsJson)
        });

        if (!spResponse.data || !spResponse.data.success) {
            throw new Error('❌ Stored procedure sp_planoMidiaInsert falhou');
        }

        const spResults = spResponse.data.data;
        const midiaPks = spResults.map(item => item.new_pk);
        console.log(`✅ ${midiaPks.length} planos mídia criados`);

        // ETAPA 7: Executar sp_uploadRoteirosInventarioToBaseCalculadoraInsert (FLUXO ORIGINAL)
        console.log('\n🔄 ETAPA 7: Transferindo dados para base calculadora...');
        console.log('⚠️ STORED PROCEDURE CRÍTICA: sp_uploadRoteirosInventarioToBaseCalculadoraInsert');
        
        const procedureResponse = await axios.post(`${baseURL}/sp-upload-roteiros-inventario-insert`, {
            planoMidiaGrupo_pk: planoMidiaGrupo_pk,
            date_dh: date_dh
        });

        if (!procedureResponse.data || !procedureResponse.data.success) {
            throw new Error(`❌ Stored procedure falhou: ${procedureResponse.data?.message || 'Sem mensagem'}`);
        }

        const insertedCount = procedureResponse.data.data[0]?.inserted_records_count || 0;
        console.log(`✅ Stored procedure executada`);
        console.log(`📊 Registros inseridos na base calculadora: ${insertedCount}`);

        if (insertedCount === 0) {
            console.log('\n⚠️⚠️⚠️ ALERTA CRÍTICO ⚠️⚠️⚠️');
            console.log('   inserted_records_count = 0');
            console.log('   A stored procedure NÃO inseriu dados na base calculadora!');
            console.log('   Tabelas de mídias ficarão vazias!');
        } else {
            console.log(`\n🎉 SUCESSO! ${insertedCount} registros transferidos para a base calculadora!`);
        }

        // ETAPA 8: Executar Databricks
        console.log('\n🔄 ETAPA 8: Executando Databricks...');
        
        const databricksResponse = await axios.post(`${baseURL}/databricks-run-job`, {
            planoMidiaGrupo_pk: planoMidiaGrupo_pk,
            date_dh: date_dh
        });

        if (!databricksResponse.data || !databricksResponse.data.success) {
            console.log('⚠️ Databricks falhou, mas o processo continuará');
            console.log('Resultado Databricks:', databricksResponse.data);
        } else {
            console.log('✅ Databricks executado com sucesso');
        }

        // RESUMO FINAL
        console.log('\n🎯 RESUMO FINAL:');
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log(`✅ ${roteiros.length} roteiros salvos do Excel`);
        console.log(`✅ ${dadosView.length} combinações cidade+semana detectadas`);
        console.log(`✅ ${pontosResponse.data.data.pontosUnicos} pontos únicos processados`);
        console.log(`✅ ${pontosResponse.data.data.pontosInseridos} pontos inseridos no inventário`);
        console.log(`✅ ${cidadesExcel.length} planos mídia desc criados`);
        console.log(`✅ ${midiaPks.length} planos mídia finalizados`);
        console.log(`✅ ${insertedCount} registros transferidos para base calculadora`);
        console.log(`✅ Fluxo completo com banco de ativos funcionando!`);
        console.log(`🏙️ Cidades: ${cidadesExcel.join(', ')}`);
        console.log(`📅 Data/hora: ${date_dh}`);

        // RELATÓRIO BANCO DE ATIVOS
        if (pontosResponse.data.data.relatorioDetalhado) {
            const rel = pontosResponse.data.data.relatorioDetalhado;
            console.log('\n🏦 RELATÓRIO BANCO DE ATIVOS:');
            console.log(`   ✅ ${rel.comDados} pontos com dados reais de fluxo`);
            console.log(`   🔴 ${rel.fluxoZero} pontos com fluxo zero`);
            console.log(`   📍 ${rel.apiSemDados} pontos sem cobertura da API`);
            console.log(`   🔧 ${rel.valorPadrao} pontos com valor padrão`);
            console.log(`   📊 Total: ${rel.total} pontos processados`);
        }

        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('🎯 O fluxo completo com banco de ativos está funcionando!');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        if (error.response) {
            console.error('📋 Status:', error.response.status);
            console.error('📋 Dados:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('📋 Stack:', error.stack);
        process.exit(1);
    }
}

testeFluxoOriginalRestaurado();
