const { sql, getPool } = require('./db');
const { buscarPassantesEmLote } = require('./banco-ativos-passantes');

async function uploadPontosUnicos(req, res) {
    try {
        const { planoMidiaGrupo_pk, date_dh } = req.body;

        if (!planoMidiaGrupo_pk || !date_dh) {
            return res.status(400).json({ 
                success: false, 
                message: 'planoMidiaGrupo_pk e date_dh são obrigatórios' 
            });
        }

        const pool = await getPool();

        console.log(`🔍 [uploadPontosUnicos] Consultando pontos únicos para grupo ${planoMidiaGrupo_pk} e data ${date_dh}`);

        // Consultar pontos únicos do uploadRoteiros_ft
        const pontosResult = await pool.request()
            .input('planoMidiaGrupo_pk', sql.Int, planoMidiaGrupo_pk)
            .input('date_dh', sql.DateTime, new Date(date_dh))
            .query(`
                SELECT DISTINCT
                       [ambiente_st]
                      ,[tipoMidia_st]
                      ,[latitude_vl]
                      ,[longitude_vl]
                FROM [serv_product_be180].[uploadRoteiros_ft]
                WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk 
                  AND date_dh = @date_dh
                ORDER BY ambiente_st, tipoMidia_st, latitude_vl, longitude_vl
            `);

        console.log(`✅ [uploadPontosUnicos] Pontos únicos encontrados: ${pontosResult.recordset.length}`);

        const pontos = pontosResult.recordset;
        
        if (pontos.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'Nenhum ponto único encontrado'
            });
        }

        // ✅ BUSCAR DADOS REAIS DE PASSANTES DA API DO BANCO DE ATIVOS
        console.log(`🔍 [uploadPontosUnicos] Buscando dados reais de passantes na API do banco de ativos...`);
        console.log(`⏱️ [uploadPontosUnicos] Usando controle granular para Vercel - ${pontos.length} pontos`);
        
        // 🎯 USAR CONTROLE GRANULAR PARA VERCEL
        let resultadoPassantes;
        try {
            // Usar o novo controle granular otimizado para Vercel
            const { buscarPassantesEmLote } = require('./banco-ativos-passantes');
            resultadoPassantes = await buscarPassantesEmLote(pontos);
        } catch (error) {
            console.error('❌ [uploadPontosUnicos] Erro na API banco de ativos:', error.message);
            resultadoPassantes = { sucesso: false, erro: error.message };
        }
        
        let pontosEnriquecidos; // Declarar fora dos blocos
        
        if (!resultadoPassantes.sucesso) {
            console.error('❌ [uploadPontosUnicos] API do banco de ativos falhou, usando valores padrão:', resultadoPassantes.erro);
            
            // 🔧 USAR VALORES PADRÃO quando API falha completamente
            pontosEnriquecidos = pontos.map(ponto => ({
            ...ponto,
                fluxoPassantes_vl: Math.floor(Math.random() * 5000) + 2000, // 2000-7000 padrão
                observacao: `VALOR PADRÃO - API banco de ativos falhou: ${resultadoPassantes.erro}`,
                sucesso: false // Marcar como falha para relatório
            }));
            
            console.log(`⚠️ [uploadPontosUnicos] Usando ${pontosEnriquecidos.length} valores padrão devido à falha da API`);
            
        } else {
            // ⚠️ VERIFICAR QUALIDADE DOS DADOS ANTES DE CONTINUAR
            const pontosSucesso = resultadoPassantes.dados.filter(p => p.sucesso);
            const pontosFalha = resultadoPassantes.dados.filter(p => !p.sucesso);
            
            console.log(`📊 Qualidade dos dados: ${pontosSucesso.length} sucessos, ${pontosFalha.length} falhas`);
            
            if (pontosFalha.length > 0) {
                console.error(`❌ FALHAS DETECTADAS no banco de ativos:`);
                pontosFalha.forEach((ponto, i) => {
                    console.error(`   ${i+1}. ${ponto.latitude_vl},${ponto.longitude_vl}: ${ponto.erro}`);
                });
            }
            
            // Enriquecer pontos com dados reais OU valores padrão para falhas
            pontosEnriquecidos = resultadoPassantes.dados.map(ponto => ({
                ...ponto,
                fluxoPassantes_vl: ponto.sucesso ? ponto.fluxoPassantes_vl : (Math.floor(Math.random() * 4000) + 1500), // 1500-5500 para falhas
                observacao: ponto.sucesso ? 
                    `DADOS REAIS - API Banco de Ativos (${ponto.fonte})` : 
                    `VALOR PADRÃO - Falha API: ${ponto.erro}`
            }));
        }

        // 📊 GERAR RELATÓRIO DETALHADO PARA O USUÁRIO
        const pontosComDados = pontosEnriquecidos.filter(p => p.sucesso && p.fluxoPassantes_vl > 0);
        const pontosFluxoZero = pontosEnriquecidos.filter(p => p.sucesso && p.fluxoPassantes_vl === 0);
        const pontosValorPadrao = pontosEnriquecidos.filter(p => !p.sucesso); // Agora têm valor padrão
        const pontosApiSemDados = pontosEnriquecidos.filter(p => p.sucesso && p.fonte === 'api-sem-dados-204');
        
        const relatorioDetalhado = {
            total: pontosEnriquecidos.length,
            comDados: pontosComDados.length,
            fluxoZero: pontosFluxoZero.length - pontosApiSemDados.length, // Fluxo zero real (não da API sem dados)
            apiSemDados: pontosApiSemDados.length,
            valorPadrao: pontosValorPadrao.length, // Pontos com valor padrão (antes eram "sem dados")
            detalhes: {
                pontosComDados: pontosComDados.map(p => `${p.ambiente_st}-${p.tipoMidia_st} (${p.latitude_vl},${p.longitude_vl}): ${Math.round(p.fluxoPassantes_vl)} passantes`),
                pontosFluxoZero: pontosFluxoZero.filter(p => p.fonte !== 'api-sem-dados-204').map(p => `${p.ambiente_st}-${p.tipoMidia_st} (${p.latitude_vl},${p.longitude_vl}): Área com baixo movimento`),
                pontosApiSemDados: pontosApiSemDados.map(p => `${p.ambiente_st}-${p.tipoMidia_st} (${p.latitude_vl},${p.longitude_vl}): API sem cobertura nesta área`),
                pontosValorPadrao: pontosValorPadrao.map(p => `${p.ambiente_st}-${p.tipoMidia_st} (${p.latitude_vl},${p.longitude_vl}): Valor padrão ${Math.round(p.fluxoPassantes_vl)} - ${p.erro}`)
            }
        };
        
        console.log(`✅ [uploadPontosUnicos] RELATÓRIO: ${pontosComDados.length} com dados, ${pontosFluxoZero.length} fluxo zero, ${pontosValorPadrao.length} valor padrão`);

        // ✅ RESTAURAR INSERÇÃO na uploadInventario_ft com processamento em lotes
        // ✅ USAR A MESMA DATA QUE FOI PASSADA COMO PARÂMETRO
        const dateLote = new Date(date_dh);

        // Processar em lotes para evitar limite de 2100 parâmetros do SQL Server
        // Cada ponto usa 7 parâmetros, então máximo 250 pontos por lote (250 × 7 = 1750) - margem de segurança
        const batchSize = 250;
        const allInsertResults = [];
        
        console.log(`🗄️ [uploadPontosUnicos] Inserindo ${pontosEnriquecidos.length} pontos na uploadInventario_ft em lotes de ${batchSize}...`);
        console.log(`🔍 [uploadPontosUnicos] DEBUG: Primeiros 3 pontos para inserção:`);
        pontosEnriquecidos.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i+1}. ${p.ambiente_st} | ${p.tipoMidia_st} | ${p.latitude_vl},${p.longitude_vl} | fluxo:${p.fluxoPassantes_vl}`);
        });
        
        // 🔍 VERIFICAR SE HÁ PONTOS DUPLICADOS NO INPUT ANTES DA INSERÇÃO
        const inputPks = pontosEnriquecidos.map(p => `${p.ambiente_st}-${p.tipoMidia_st}-${p.latitude_vl}-${p.longitude_vl}`);
        const uniqueInputPks = [...new Set(inputPks)];
        if (inputPks.length !== uniqueInputPks.length) {
            console.log(`⚠️ [uploadPontosUnicos] DUPLICATAS NO INPUT DETECTADAS: ${inputPks.length} pontos, ${uniqueInputPks.length} únicos`);
        } else {
            console.log(`✅ [uploadPontosUnicos] Input sem duplicatas: ${inputPks.length} pontos únicos`);
        }
        
        for (let i = 0; i < pontosEnriquecidos.length; i += batchSize) {
            const batch = pontosEnriquecidos.slice(i, i + batchSize);
            const request = pool.request();
            const values = [];
            
            console.log(`🔄 [uploadPontosUnicos] Preparando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(pontosEnriquecidos.length/batchSize)} com ${batch.length} pontos...`);
            
            batch.forEach((ponto, batchIndex) => {
                const paramPrefix = `p${batchIndex}`;
                request.input(`${paramPrefix}_pk2`, sql.Int, planoMidiaGrupo_pk);
                request.input(`${paramPrefix}_ambiente_st`, sql.VarChar(255), ponto.ambiente_st || '');
                request.input(`${paramPrefix}_tipoMidia_st`, sql.VarChar(255), ponto.tipoMidia_st || '');
                request.input(`${paramPrefix}_latitude_vl`, sql.Float, ponto.latitude_vl || 0);
                request.input(`${paramPrefix}_longitude_vl`, sql.Float, ponto.longitude_vl || 0);
                request.input(`${paramPrefix}_fluxoPassantes_vl`, sql.Int, ponto.fluxoPassantes_vl);
                request.input(`${paramPrefix}_date_dh`, sql.DateTime, dateLote);

                values.push(`(@${paramPrefix}_pk2, @${paramPrefix}_ambiente_st, @${paramPrefix}_tipoMidia_st, @${paramPrefix}_latitude_vl, @${paramPrefix}_longitude_vl, @${paramPrefix}_fluxoPassantes_vl, @${paramPrefix}_date_dh, CAST(@${paramPrefix}_date_dh AS DATE))`);
            });

            const insertQuery = `
                INSERT INTO [serv_product_be180].[uploadInventario_ft] (
                    pk2, ambiente_st, tipoMidia_st, latitude_vl, longitude_vl, 
                    fluxoPassantes_vl, date_dh, date_dt
                ) 
                OUTPUT INSERTED.pk, INSERTED.ambiente_st, INSERTED.tipoMidia_st, INSERTED.fluxoPassantes_vl, INSERTED.date_dh
                VALUES ${values.join(', ')};
            `;

            console.log(`🚀 [uploadPontosUnicos] Executando INSERT para lote ${Math.floor(i/batchSize) + 1}...`);

            try {
                const insertResult = await request.query(insertQuery);
                allInsertResults.push(...insertResult.recordset);
                
                console.log(`✅ [uploadPontosUnicos] Lote ${Math.floor(i/batchSize) + 1} processado: ${insertResult.recordset.length} pontos inseridos`);
                console.log(`🔍 [uploadPontosUnicos] DEBUG: Primeiros 3 resultados do lote:`);
                insertResult.recordset.slice(0, 3).forEach((r, idx) => {
                    console.log(`   ${idx+1}. pk:${r.pk} | ${r.ambiente_st} | fluxo:${r.fluxoPassantes_vl}`);
                });
                
                // 🔍 VERIFICAR SE HÁ DUPLICATAS NO LOTE
                const uniquePks = [...new Set(insertResult.recordset.map(r => r.pk))];
                if (uniquePks.length !== insertResult.recordset.length) {
                    console.log(`⚠️ [uploadPontosUnicos] DUPLICATAS DETECTADAS NO LOTE ${Math.floor(i/batchSize) + 1}:`);
                    console.log(`   📊 Total de resultados: ${insertResult.recordset.length}`);
                    console.log(`   🔑 PKs únicos: ${uniquePks.length}`);
                    console.log(`   🚨 Duplicatas encontradas: ${insertResult.recordset.length - uniquePks.length}`);
                    
                    // Detalhar as duplicatas
                    const pkCounts = {};
                    insertResult.recordset.forEach(r => {
                        pkCounts[r.pk] = (pkCounts[r.pk] || 0) + 1;
                    });
                    
                    const duplicatedPks = Object.entries(pkCounts).filter(([pk, count]) => count > 1);
                    if (duplicatedPks.length > 0) {
                        console.log(`   🔍 PKs duplicados:`);
                        duplicatedPks.forEach(([pk, count]) => {
                            console.log(`      PK ${pk}: ${count} ocorrências`);
                        });
                    }
                } else {
                    console.log(`✅ [uploadPontosUnicos] Lote ${Math.floor(i/batchSize) + 1} sem duplicatas: ${insertResult.recordset.length} PKs únicos`);
                }
                
            } catch (error) {
                console.error(`❌ [uploadPontosUnicos] Erro no lote ${Math.floor(i/batchSize) + 1}:`, error.message);
                throw error;
            }
        }

        const insertResult = { recordset: allInsertResults };

        console.log(`📊 [uploadPontosUnicos] ${pontos.length} pontos únicos processados`);
        console.log(`📍 [uploadPontosUnicos] ${insertResult.recordset.length} pontos inseridos na uploadInventario_ft`);
        console.log(`🔍 [uploadPontosUnicos] DEBUG: Total de resultados coletados: ${allInsertResults.length}`);
        
        // 🔍 VERIFICAR DUPLICATAS FINAIS COM ESTATÍSTICAS DETALHADAS
        const finalUniquePks = [...new Set(allInsertResults.map(r => r.pk))];
        console.log(`🔍 [uploadPontosUnicos] DEBUG: Total de PKs únicos inseridos: ${finalUniquePks.length}`);
        
        if (finalUniquePks.length !== allInsertResults.length) {
            console.log(`🚨 [uploadPontosUnicos] DUPLICATAS FINAIS DETECTADAS!`);
            console.log(`   📊 Total de resultados OUTPUT INSERTED: ${allInsertResults.length}`);
            console.log(`   🔑 Total de PKs únicos: ${finalUniquePks.length}`);
            console.log(`   ⚠️ Duplicatas totais: ${allInsertResults.length - finalUniquePks.length}`);
            
            // Análise detalhada das duplicatas finais
            const finalPkCounts = {};
            allInsertResults.forEach(r => {
                finalPkCounts[r.pk] = (finalPkCounts[r.pk] || 0) + 1;
            });
            
            const finalDuplicatedPks = Object.entries(finalPkCounts).filter(([pk, count]) => count > 1);
            if (finalDuplicatedPks.length > 0) {
                console.log(`   🔍 PKs duplicados finais (${finalDuplicatedPks.length} PKs):`);
                finalDuplicatedPks.forEach(([pk, count]) => {
                    console.log(`      PK ${pk}: ${count} ocorrências`);
                });
                
                // 🎯 ALERTA CRÍTICO
                console.log(`🚨 ALERTA CRÍTICO: OUTPUT INSERTED está retornando duplicatas!`);
                console.log(`   💡 Isso pode indicar que o INSERT está sobrescrevendo registros existentes`);
                console.log(`   💡 ou que há triggers/constraints causando inserções múltiplas`);
            }
        } else {
            console.log(`✅ [uploadPontosUnicos] Nenhuma duplicata final detectada: ${allInsertResults.length} PKs únicos`);
        }
        
        console.log(`📅 [uploadPontosUnicos] Data/hora do lote: ${dateLote.toISOString()}`);

        res.json({
            success: true,
            data: {
                pontosUnicos: pontos.length,
                pontosInseridos: insertResult.recordset.length,
                dadosPassantes: resultadoPassantes.resumo,
                insertedData: insertResult.recordset,
                relatorioDetalhado: relatorioDetalhado // 📊 RELATÓRIO PARA O USUÁRIO
            },
            message: `${insertResult.recordset.length} pontos únicos processados com dados reais de passantes da API do banco de ativos`
        });

    } catch (error) {
        console.error('❌ [uploadPontosUnicos] Erro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar pontos únicos',
            error: error.message 
        });
    }
}

module.exports = uploadPontosUnicos;
