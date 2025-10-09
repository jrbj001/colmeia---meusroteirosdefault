const { Client } = require('pg');

async function testarConexao() {
    console.log('🧪 Testando conexão PostgreSQL...\n');
    
    const config = {
        host: '35.247.196.233',
        port: 5432,
        database: 'colmeia_dev',
        user: 'readonly_user',
        password: '_e2Jy9r9kOo(',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    };
    
    console.log('📡 Conectando...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);
    
    const client = new Client(config);
    
    try {
        const inicio = Date.now();
        await client.connect();
        const tempoConexao = Date.now() - inicio;
        
        console.log(`✅ Conexão estabelecida em ${tempoConexao}ms!\n`);
        
        // Teste 1: Query simples
        console.log('📊 Teste 1: SELECT 1');
        const result1 = await client.query('SELECT 1 as test');
        console.log(`   ✅ Resultado: ${JSON.stringify(result1.rows[0])}\n`);
        
        // Teste 2: Contar registros na tabela media_points
        console.log('📊 Teste 2: Contando registros em media_points');
        const result2 = await client.query(`
            SELECT COUNT(*) as total 
            FROM media_points 
            WHERE is_deleted = false AND is_active = true
        `);
        console.log(`   ✅ Total de pontos ativos: ${result2.rows[0].total}\n`);
        
        // Teste 3: Buscar um ponto específico (João Pessoa)
        console.log('📊 Teste 3: Buscando ponto específico');
        const result3 = await client.query(`
            SELECT code, latitude, longitude, pedestrian_flow, city_id
            FROM media_points
            WHERE latitude::decimal = -7.119771
              AND longitude::decimal = -34.870685
              AND is_deleted = false
            LIMIT 1
        `);
        
        if (result3.rows.length > 0) {
            const ponto = result3.rows[0];
            console.log(`   ✅ Ponto encontrado:`);
            console.log(`      Código: ${ponto.code}`);
            console.log(`      Coords: ${ponto.latitude}, ${ponto.longitude}`);
            console.log(`      Fluxo: ${ponto.pedestrian_flow} passantes`);
            console.log(`      Cidade ID: ${ponto.city_id}\n`);
        } else {
            console.log(`   ⚠️  Ponto não encontrado\n`);
        }
        
        // Teste 4: Query com LATERAL JOIN (mesma do sistema)
        console.log('📊 Teste 4: Query otimizada (LATERAL JOIN)');
        const coords = [
            { lat: -7.119771, lng: -34.870685 },
            { lat: -7.114342, lng: -34.824542 },
            { lat: -1.444661, lng: -48.46381 }
        ];
        
        const lats = coords.map(c => c.lat);
        const lngs = coords.map(c => c.lng);
        
        const inicioQuery = Date.now();
        const result4 = await client.query(`
            WITH coordenadas_input AS (
                SELECT 
                    unnest($1::decimal[]) AS lat_input,
                    unnest($2::decimal[]) AS lng_input,
                    generate_series(1, $3) AS idx
            )
            SELECT DISTINCT ON (ci.idx)
                ci.idx,
                ci.lat_input,
                ci.lng_input,
                mp.code,
                mp.latitude,
                mp.longitude,
                mp.pedestrian_flow
            FROM coordenadas_input ci
            LEFT JOIN LATERAL (
                SELECT *
                FROM media_points mp
                WHERE mp.is_deleted = false
                  AND mp.is_active = true
                  AND mp.pedestrian_flow IS NOT NULL
                  AND ABS(CAST(mp.latitude AS DECIMAL) - ci.lat_input) < 0.001
                  AND ABS(CAST(mp.longitude AS DECIMAL) - ci.lng_input) < 0.001
                ORDER BY 
                  ABS(CAST(mp.latitude AS DECIMAL) - ci.lat_input) + 
                  ABS(CAST(mp.longitude AS DECIMAL) - ci.lng_input)
                LIMIT 1
            ) mp ON true
            ORDER BY ci.idx
        `, [lats, lngs, coords.length]);
        
        const tempoQuery = Date.now() - inicioQuery;
        
        console.log(`   ✅ Query executada em ${tempoQuery}ms`);
        console.log(`   ✅ ${result4.rows.length} coordenadas processadas:`);
        result4.rows.forEach((row, i) => {
            if (row.code) {
                console.log(`      ${i+1}. ${row.code} - ${Math.round(row.pedestrian_flow)} passantes`);
            } else {
                console.log(`      ${i+1}. Não encontrado`);
            }
        });
        
        console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
        
        await client.end();
        console.log('✅ Conexão fechada.');
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
        if (error.code) {
            console.error(`   Código: ${error.code}`);
        }
        if (error.detail) {
            console.error(`   Detalhe: ${error.detail}`);
        }
        process.exit(1);
    }
}

testarConexao();
