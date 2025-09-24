const axios = require('axios');

// Configurações da API de banco de ativos
const BANCO_ATIVOS_CONFIG = {
    baseURL: 'https://api-dev-jsw22fxxdq-rj.a.run.app',
    credentials: {
        username: 'admin',
        password: '123qwe'
    }
};

let authToken = null;
let tokenExpiry = null;

/**
 * Autentica na API do banco de ativos e retorna o token
 */
async function authenticateBancoAtivos() {
    try {
        // Verificar se o token ainda é válido
        if (authToken && tokenExpiry && new Date() < tokenExpiry) {
            console.log('🔐 Usando token existente válido');
            return authToken;
        }

        console.log('🔐 Autenticando na API do banco de ativos...');
        
        const response = await axios.post(`${BANCO_ATIVOS_CONFIG.baseURL}/api/v1/auth/authenticate`, {
            username: BANCO_ATIVOS_CONFIG.credentials.username,
            password: BANCO_ATIVOS_CONFIG.credentials.password,
            rememberMe: true
        });

        authToken = response.data.accessToken;
        
        // Definir expiração do token (30 minutos antes da expiração real para segurança)
        const expiresIn = response.data.expiresIn || 1800; // 30 minutos por padrão
        tokenExpiry = new Date(Date.now() + (expiresIn - 1800) * 1000); // -30 min de segurança

        console.log('✅ Autenticação na API do banco de ativos bem-sucedida!');
        return authToken;

    } catch (error) {
        console.error('❌ Erro na autenticação da API do banco de ativos:', error.message);
        throw new Error(`Falha na autenticação: ${error.message}`);
    }
}

/**
 * Padroniza coordenadas para melhor match na API
 */
function padronizarCoordenadas(latitude, longitude) {
    // Remover caracteres não numéricos (exceto ponto e sinal negativo)
    const latStr = String(latitude).replace(/[^\d.-]/g, '');
    const lngStr = String(longitude).replace(/[^\d.-]/g, '');
    
    // Converter para número e arredondar para 6 casas decimais (precisão GPS padrão)
    const latPadronizada = Math.round(parseFloat(latStr) * 1000000) / 1000000;
    const lngPadronizada = Math.round(parseFloat(lngStr) * 1000000) / 1000000;
    
    console.log(`📍 Coordenadas padronizadas: ${latitude},${longitude} → ${latPadronizada},${lngPadronizada}`);
    
    return {
        latitude: latPadronizada,
        longitude: lngPadronizada
    };
}

/**
 * Busca com coordenadas aproximadas (fuzzy matching)
 */
async function buscarComCoordenadaAproximada(latPadronizada, lngPadronizada, token, tentativa) {
    const raiosBusca = [0, 100, 500, 1000]; // metros de raio para busca aproximada
    
    for (const raio of raiosBusca) {
        try {
            let url = `${BANCO_ATIVOS_CONFIG.baseURL}/api/v1/data/geofusion/${latPadronizada}/${lngPadronizada}`;
            if (raio > 0) {
                url += `?radius=${raio}`;
                console.log(`🔍 [Tentativa ${tentativa}] Buscando com raio ${raio}m: ${latPadronizada}, ${lngPadronizada}`);
            }

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos
            });

            if (response.status === 200 && response.data) {
                const dados = response.data;
                console.log(`✅ [Raio ${raio}m] Dados encontrados: fluxo=${dados.flow}, classe=${dados.socialClass}`);
                
                return {
                    sucesso: true,
                    dados: dados,
                    raioUsado: raio
                };
            } else if (response.status === 204) {
                console.log(`⚠️ [Raio ${raio}m] Sem dados (204)`);
                if (raio === 0) continue; // Tentar próximo raio
                
                // Com raio > 0 e 204, consideramos sem dados na região
                return {
                    sucesso: true,
                    dados: null,
                    raioUsado: raio,
                    semDados: true
                };
            }
            
        } catch (error) {
            console.log(`❌ [Raio ${raio}m] Erro: ${error.message}`);
            if (raio === raiosBusca[raiosBusca.length - 1]) {
                throw error; // Relançar erro no último raio
            }
            continue; // Tentar próximo raio
        }
    }
    
    throw new Error('Nenhum dado encontrado em todos os raios de busca');
}

/**
 * Busca dados de passantes (fluxo) por coordenadas na API do banco de ativos
 * COM CONTROLE ROBUSTO para API externa
 */
async function buscarPassantesPorCoordenadas(latitude, longitude, raio = null, tentativas = 3) {
    // 🎯 PADRONIZAR COORDENADAS PRIMEIRO
    const { latitude: latPadronizada, longitude: lngPadronizada } = padronizarCoordenadas(latitude, longitude);
    
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        try {
            const token = await authenticateBancoAtivos();
            
            console.log(`📍 [Tentativa ${tentativa}/${tentativas}] Buscando dados para: ${latPadronizada}, ${lngPadronizada}`);
            
            // 🔍 BUSCA COM FUZZY MATCHING (coordenadas aproximadas)
            const resultado = await buscarComCoordenadaAproximada(latPadronizada, lngPadronizada, token, tentativa);
            
            if (resultado.sucesso && resultado.dados) {
                const dados = resultado.dados;
                const fluxoFinal = dados.flow || 0;
                const fonte = resultado.raioUsado > 0 ? 
                    `banco-ativos-api-real-raio-${resultado.raioUsado}m` : 
                    'banco-ativos-api-real';
                
                if (fluxoFinal === 0) {
                    console.log(`📊 Fluxo REAL = 0 para ${latPadronizada},${lngPadronizada} (área com baixo movimento)`);
                }
                
                return {
                    sucesso: true,
                    dados: {
                        fluxoPassantes_vl: fluxoFinal,
                        renda_vl: dados.incomeValue || 0,
                        classeSocial_st: dados.socialClass || null,
                        latitude_vl: latitude, // Retornar coordenada original
                        longitude_vl: longitude, // Retornar coordenada original
                        fonte: fonte
                    }
                };
            } else if (resultado.sucesso && resultado.semDados) {
                // Sem dados mesmo com busca aproximada
                console.warn(`⚠️ [Tentativa ${tentativa}] Sem dados mesmo com raio ${resultado.raioUsado}m`);
                
                return {
                    sucesso: true,
                    dados: {
                        fluxoPassantes_vl: 0,
                        renda_vl: 0,
                        classeSocial_st: 'N/A',
                        latitude_vl: latitude,
                        longitude_vl: longitude,
                        fonte: `api-sem-dados-raio-${resultado.raioUsado}m`
                    }
                };
            }
            
        } catch (error) {
            console.error(`❌ [Tentativa ${tentativa}/${tentativas}] Erro para ${latPadronizada},${lngPadronizada}:`, error.message);
            
            // 🔄 RETRY: Se não é a última tentativa, tenta novamente
            if (tentativa < tentativas) {
                const delayMs = tentativa * 2000; // Delay progressivo: 2s, 4s, 6s...
                console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue; // Próxima tentativa
            }
            
            // 🚨 ÚLTIMA TENTATIVA FALHOU - tratar token expirado
            if (error.response?.status === 401) {
                console.warn('🔑 Token expirado detectado - limpando cache...');
                authToken = null;
                tokenExpiry = null;
                
                // Tentar uma vez mais com novo token
                if (tentativas === 3) { // Só se não foi uma retry manual
                    console.log('🔄 Tentando uma última vez com novo token...');
                    return await buscarPassantesPorCoordenadas(latitude, longitude, raio, 1);
                }
            }
            
            // ❌ FALHA DEFINITIVA após todas as tentativas
            return {
                sucesso: false,
                erro: `Falha após ${tentativas} tentativas: ${error.message}`,
                latitude_vl: latitude,
                longitude_vl: longitude
            };
        }
    }
    
    // Este ponto nunca deveria ser alcançado
    return {
        sucesso: false,
        erro: `Erro inesperado no loop de tentativas`,
        latitude_vl: latitude,
        longitude_vl: longitude
    };
}

/**
 * Busca dados de passantes em lote (múltiplas coordenadas)
 */
async function buscarPassantesEmLote(coordenadas) {
    try {
        console.log(`🔄 Iniciando busca em lote para ${coordenadas.length} coordenadas...`);

        // Mapear todas as coordenadas para promises
        const promises = coordenadas.map(coord => 
            buscarPassantesPorCoordenadas(coord.latitude_vl, coord.longitude_vl)
                .then(resultado => ({
                    ...coord, // Preservar dados originais
                    ...resultado.dados, // Adicionar dados da API
                    sucesso: resultado.sucesso,
                    erro: resultado.erro
                }))
        );

        const resultadosLote = await Promise.all(promises);
        
        const sucessos = resultadosLote.filter(r => r.sucesso).length;
        const falhas = resultadosLote.filter(r => !r.sucesso).length;
        const percentualSucesso = (sucessos / coordenadas.length) * 100;
        
        console.log(`📊 Processamento em lote: ${sucessos} sucessos, ${falhas} falhas (${percentualSucesso.toFixed(1)}% sucesso)`);
        
        // ✅ SEMPRE CONTINUAR - Não falhar por limite de coordenadas
        if (percentualSucesso < 20) { // Log warning if less than 20% success, but still continue
            console.warn(`⚠️ ATENÇÃO: ${falhas} de ${coordenadas.length} coordenadas falharam (${percentualSucesso.toFixed(1)}% sucesso) - CONTINUANDO PROCESSAMENTO`);
            
            // Listar algumas falhas para logs
            const detalhesFailhas = resultadosLote
                .filter(r => !r.sucesso)
                .slice(0, 5)
                .map(r => `${r.latitude_vl},${r.longitude_vl}: ${r.erro}`)
                .join('; ');
            
            console.warn(`⚠️ Exemplos de falhas: ${detalhesFailhas}`);
        }
        
        return {
            sucesso: true,
            dados: resultadosLote,
            resumo: {
                total: coordenadas.length,
                sucessos,
                falhas,
                percentualSucesso: percentualSucesso.toFixed(1)
            }
        };
    } catch (error) {
        console.error('❌ Erro no processamento em lote:', error.message);
        return {
            sucesso: false,
            erro: error.message
        };
    }
}

/**
 * Busca endereço por coordenadas (geocoding reverso)
 */
async function buscarEnderecoPorCoordenadas(latitude, longitude) {
    try {
        const token = await authenticateBancoAtivos();
        
        const response = await axios.get(
            `${BANCO_ATIVOS_CONFIG.baseURL}/api/v1/geocoding/reverse/${latitude}/${longitude}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200 && response.data) {
            return {
                sucesso: true,
                endereco: response.data
            };
        } else {
            return {
                sucesso: false,
                erro: 'Endereço não encontrado'
            };
        }

    } catch (error) {
        console.error('❌ Erro ao buscar endereço:', error.message);
        return {
            sucesso: false,
            erro: error.message
        };
    }
}

module.exports = {
    authenticateBancoAtivos,
    buscarPassantesPorCoordenadas,
    buscarPassantesEmLote,
    buscarEnderecoPorCoordenadas,
    padronizarCoordenadas
};