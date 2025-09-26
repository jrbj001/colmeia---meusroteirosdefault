// 🚀 ENDPOINT DE TESTE RÁPIDO - SEM API EXTERNA
async function testeRapido(req, res) {
    try {
        console.log('🚀 TESTE RÁPIDO iniciado - SEM API externa');
        
        const { planoMidiaGrupo_pk, date_dh } = req.body;
        
        // Simular processamento rápido sem API externa
        const pontosSimulados = [
            {
                ambiente_st: 'PAINEL',
                tipoMidia_st: 'LED', 
                latitude_vl: -23.5489,
                longitude_vl: -46.6388,
                fluxoPassantes_vl: 5000,
                fonte: 'simulado-teste'
            }
        ];
        
        console.log('✅ TESTE RÁPIDO concluído em <1 segundo');
        
        res.json({
            success: true,
            data: {
                pontosInseridos: pontosSimulados.length,
                relatorioDetalhado: {
                    comDados: 1,
                    fluxoZero: 0,
                    apiSemDados: 0,
                    valorPadrao: 0,
                    detalhes: {
                        pontosComDados: ['PAINEL-LED (-23.5489,-46.6388): simulado para teste'],
                        pontosFluxoZero: [],
                        pontosApiSemDados: [],
                        pontosValorPadrao: []
                    }
                }
            },
            message: 'Teste rápido sem API externa - dados simulados'
        });
        
    } catch (error) {
        console.error('❌ Erro no teste rápido:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = testeRapido;
