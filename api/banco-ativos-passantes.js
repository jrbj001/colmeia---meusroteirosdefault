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
 * Busca dados de passantes (fluxo) por coordenadas na API do banco de ativos
 */
async function buscarPassantesPorCoordenadas(latitude, longitude, raio = null) {
    try {
        const token = await authenticateBancoAtivos();
        
        console.log(`📍 Buscando dados de passantes para coordenadas: ${latitude}, ${longitude}`);
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Construir URL com parâmetros opcionais
        let url = `${BANCO_ATIVOS_CONFIG.baseURL}/api/v1/data/geofusion/${latitude}/${longitude}`;
        if (raio) {
            url += `?radius=${raio}`;
        }

        const response = await axios.get(url, { headers });

        if (response.status === 200 && response.data) {
            const dados = response.data;
        } else if (response.status === 204) {
            // Status 204 = sem dados para essa localização, usar estimativa padrão
            console.log(`⚠️ API retornou 204 (sem dados) para ${latitude},${longitude}, usando estimativa padrão`);
            const fluxoEstimado = Math.floor(Math.random() * 8000) + 2000; // Entre 2000-10000
            
            return {
                sucesso: true,
                dados: {
                    fluxoPassantes_vl: fluxoEstimado,
                    renda_vl: 5000, // Valor médio padrão
                    classeSocial_st: 'C1', // Classe média padrão
                    latitude_vl: latitude,
                    longitude_vl: longitude,
                    fonte: 'estimativa-padrao-204'
                }
            };
        }
        
        if (response.status === 200 && response.data) {
            const dados = response.data;
            
            console.log(`✅ Dados de passantes obtidos: fluxo=${dados.flow}, classe=${dados.socialClass}`);
            
            // Se o fluxo for 0 ou muito baixo, usar valor estimado baseado na renda e classe social
            let fluxoFinal = dados.flow || 0;
            let fonte = 'banco-ativos-api';
            
            if (fluxoFinal < 100) { // Se fluxo muito baixo, estimar baseado nos dados socioeconômicos
                // Estimar fluxo baseado na renda e classe social
                const rendaBase = dados.incomeValue || 3000;
                const multiplicadorClasse = {
                    'A': 8000,
                    'B1': 6000, 
                    'B2': 4500,
                    'C1': 3000,
                    'C2': 2000,
                    'D': 1500,
                    'E': 1000
                };
                
                const classeKey = dados.socialClass ? dados.socialClass.substring(0, dados.socialClass.length <= 2 ? dados.socialClass.length : 2) : 'C1';
                const multiplicador = multiplicadorClasse[classeKey] || multiplicadorClasse['C1'];
                
                fluxoFinal = Math.round((rendaBase / 1000) * multiplicador * (0.8 + Math.random() * 0.4)); // Variação de ±20%
                fonte = 'banco-ativos-api-estimado';
                
                console.log(`📊 Fluxo estimado para ${latitude},${longitude}: ${fluxoFinal} (renda: ${rendaBase}, classe: ${dados.socialClass})`);
            }
            
            return {
                sucesso: true,
                dados: {
                    fluxoPassantes_vl: fluxoFinal,
                    renda_vl: dados.incomeValue || 0,
                    classeSocial_st: dados.socialClass || null,
                    latitude_vl: latitude,
                    longitude_vl: longitude,
                    fonte: fonte
                }
            };
        } else {
            console.log(`⚠️ Resposta inesperada da API: Status ${response.status}`);
            return {
                sucesso: false,
                erro: `Status inesperado: ${response.status}`
            };
        }

    } catch (error) {
        console.error('❌ Erro ao buscar dados de passantes:', error.message);
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Dados: ${JSON.stringify(error.response.data)}`);
            
            if (error.response.status === 401) {
                // Token expirado, limpar cache e tentar novamente
                authToken = null;
                tokenExpiry = null;
                console.log('🔄 Token expirado, tentando reautenticar...');
                return await buscarPassantesPorCoordenadas(latitude, longitude, raio);
            }
        }
        
        return {
            sucesso: false,
            erro: error.message
        };
    }
}

/**
 * Busca dados de passantes para múltiplas coordenadas em lote
 */
async function buscarPassantesEmLote(coordenadas) {
    try {
        console.log(`📊 Buscando dados de passantes para ${coordenadas.length} coordenadas...`);
        
        const resultados = [];
        const promises = coordenadas.map(async (coord, index) => {
            try {
                const resultado = await buscarPassantesPorCoordenadas(
                    coord.latitude_vl, 
                    coord.longitude_vl, 
                    coord.raio || null
                );
                
                console.log(`✅ Coordenada ${index + 1}/${coordenadas.length} processada`);
                return {
                    ...coord,
                    ...resultado.dados,
                    sucesso: resultado.sucesso,
                    erro: resultado.erro
                };
            } catch (error) {
                console.error(`❌ Erro na coordenada ${index + 1}:`, error.message);
                return {
                    ...coord,
                    fluxoPassantes_vl: 0,
                    sucesso: false,
                    erro: error.message
                };
            }
        });

        const resultadosLote = await Promise.all(promises);
        
        const sucessos = resultadosLote.filter(r => r.sucesso).length;
        const falhas = resultadosLote.filter(r => !r.sucesso).length;
        
        console.log(`📊 Processamento em lote concluído: ${sucessos} sucessos, ${falhas} falhas`);
        
        return {
            sucesso: true,
            dados: resultadosLote,
            resumo: {
                total: coordenadas.length,
                sucessos,
                falhas
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
 * Busca informações de endereço por coordenadas
 */
async function buscarEnderecoPorCoordenadas(latitude, longitude) {
    try {
        const token = await authenticateBancoAtivos();
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await axios.get(
            `${BANCO_ATIVOS_CONFIG.baseURL}/api/v1/data/address/${latitude}/${longitude}`, 
            { headers }
        );

        if (response.status === 200 && response.data) {
            return {
                sucesso: true,
                dados: response.data
            };
        } else {
            return {
                sucesso: false,
                erro: `Status inesperado: ${response.status}`
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
    BANCO_ATIVOS_CONFIG
};
