require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 3,
});

function hr(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function table(rows) {
  if (!rows || rows.length === 0) { console.log('  (sem dados)'); return; }
  console.table(rows);
}

async function q(sql) {
  const r = await pool.query(sql);
  return r.rows;
}

// ─────────────────────────────────────────────────────────────────────
// 1. MAPEAMENTO DE SCHEMA
// ─────────────────────────────────────────────────────────────────────
async function verificacao1() {
  hr('1. MAPEAMENTO DE SCHEMA');

  console.log('\n--- Todas as tabelas do banco ---');
  const tabelas = await q(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  table(tabelas);

  const tabelasAlvo = ['media_points', 'media_types', 'media_groups', 'media_exhibitors', 'cities'];
  for (const t of tabelasAlvo) {
    console.log(`\n--- Colunas de "${t}" ---`);
    const colunas = await q(`
      SELECT column_name, data_type, is_nullable,
             character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position
    `);
    table(colunas);

    console.log(`  Exemplo de registro:`);
    const exemplo = await q(`SELECT * FROM ${t} LIMIT 1`);
    if (exemplo.length > 0) {
      for (const [k, v] of Object.entries(exemplo[0])) {
        const val = v === null ? 'NULL' : typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '...' : v;
        console.log(`    ${k}: ${val}`);
      }
    } else {
      console.log('    (tabela vazia)');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// 2. VOLUMES E CONTAGENS
// ─────────────────────────────────────────────────────────────────────
async function verificacao2() {
  hr('2. VOLUMES E CONTAGENS');

  const volumes = await q(`
    SELECT
      (SELECT COUNT(*) FROM media_points)                                          AS total_media_points,
      (SELECT COUNT(*) FROM media_points WHERE is_active = true AND is_deleted = false)  AS ativos,
      (SELECT COUNT(*) FROM media_points WHERE is_active = false)                  AS inativos,
      (SELECT COUNT(*) FROM media_points WHERE is_deleted = true)                  AS deletados,
      (SELECT COUNT(*) FROM cities)                                                AS total_cities,
      (SELECT COUNT(*) FROM media_exhibitors)                                      AS total_media_exhibitors,
      (SELECT COUNT(*) FROM media_types)                                           AS total_media_types,
      (SELECT COUNT(*) FROM media_groups)                                          AS total_media_groups
  `);
  table(volumes);
}

// ─────────────────────────────────────────────────────────────────────
// 3. CLASSIFICACAO INDOOR vs VIAS PUBLICAS
// ─────────────────────────────────────────────────────────────────────
async function verificacao3() {
  hr('3. CLASSIFICACAO INDOOR vs VIAS PUBLICAS');

  console.log('\n--- Todos os media_types.name distintos com contagem de pontos ---');
  const tipos = await q(`
    SELECT mt.id, mt.name AS tipo_midia,
           COUNT(mp.id) AS total_pontos
    FROM media_types mt
    LEFT JOIN media_points mp ON mp.media_type_id = mt.id
      AND mp.is_deleted = false AND mp.is_active = true
    GROUP BY mt.id, mt.name
    ORDER BY total_pontos DESC
  `);
  table(tipos);

  console.log('\n--- Campo "environment" em media_types? ---');
  const envCol = await q(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'media_types' AND column_name = 'environment'
  `);
  if (envCol.length > 0) {
    console.log('  SIM - campo "environment" existe!');
    const envValues = await q(`
      SELECT mt.environment, COUNT(mp.id) AS total_pontos
      FROM media_types mt
      LEFT JOIN media_points mp ON mp.media_type_id = mt.id
        AND mp.is_deleted = false AND mp.is_active = true
      GROUP BY mt.environment
      ORDER BY total_pontos DESC
    `);
    table(envValues);
  } else {
    console.log('  NAO - campo "environment" nao existe.');
  }

  console.log('\n--- Pontos SEM tipo de midia associado ---');
  const semTipo = await q(`
    SELECT COUNT(*) AS pontos_sem_tipo
    FROM media_points mp
    WHERE mp.is_deleted = false AND mp.is_active = true
      AND mp.media_type_id IS NULL
  `);
  table(semTipo);

  console.log('\n--- media_groups distintos com contagem ---');
  const grupos = await q(`
    SELECT mg.id, mg.name AS grupo_midia,
           COUNT(DISTINCT mt.id) AS tipos_midia,
           COUNT(mp.id) AS total_pontos
    FROM media_groups mg
    LEFT JOIN media_types mt ON mt.media_group_id = mg.id
    LEFT JOIN media_points mp ON mp.media_type_id = mt.id
      AND mp.is_deleted = false AND mp.is_active = true
    GROUP BY mg.id, mg.name
    ORDER BY total_pontos DESC
  `);
  table(grupos);
}

// ─────────────────────────────────────────────────────────────────────
// 4. VALIDACAO DE "PRACAS"
// ─────────────────────────────────────────────────────────────────────
async function verificacao4() {
  hr('4. VALIDACAO DE PRACAS');

  console.log('\n--- Contagem: cidades vs districts ---');
  const contagem = await q(`
    SELECT
      COUNT(DISTINCT c.name) AS distinct_city_names,
      COUNT(DISTINCT mp.district) FILTER (WHERE mp.district IS NOT NULL AND mp.district != '') AS distinct_districts
    FROM media_points mp
    LEFT JOIN cities c ON mp.city_id = c.id
    WHERE mp.is_deleted = false AND mp.is_active = true
  `);
  table(contagem);

  console.log('\n--- Top 20 cidades por volume de pontos ---');
  const topCidades = await q(`
    SELECT c.name AS cidade, COUNT(mp.id) AS total_pontos
    FROM media_points mp
    LEFT JOIN cities c ON mp.city_id = c.id
    WHERE mp.is_deleted = false AND mp.is_active = true
    GROUP BY c.name
    ORDER BY total_pontos DESC
    LIMIT 20
  `);
  table(topCidades);

  console.log('\n--- Pontos SEM cidade associada ---');
  const semCidade = await q(`
    SELECT COUNT(*) AS pontos_sem_cidade
    FROM media_points mp
    WHERE mp.is_deleted = false AND mp.is_active = true
      AND mp.city_id IS NULL
  `);
  table(semCidade);

  console.log('\n--- Total de districts por cidade (top 10) ---');
  const distPorCidade = await q(`
    SELECT c.name AS cidade,
           COUNT(DISTINCT mp.district) AS districts_unicos,
           COUNT(mp.id) AS total_pontos
    FROM media_points mp
    LEFT JOIN cities c ON mp.city_id = c.id
    WHERE mp.is_deleted = false AND mp.is_active = true
      AND mp.district IS NOT NULL AND mp.district != ''
    GROUP BY c.name
    ORDER BY total_pontos DESC
    LIMIT 10
  `);
  table(distPorCidade);
}

// ─────────────────────────────────────────────────────────────────────
// 5. VALIDACAO DE "EXIBIDORES"
// ─────────────────────────────────────────────────────────────────────
async function verificacao5() {
  hr('5. VALIDACAO DE EXIBIDORES');

  console.log('\n--- Contagem: media_exhibitors.name vs media_points.code ---');
  const contagem = await q(`
    SELECT
      COUNT(DISTINCT me.name) AS distinct_exhibitor_names,
      COUNT(DISTINCT mp.code) FILTER (WHERE mp.code IS NOT NULL AND mp.code != '') AS distinct_point_codes,
      COUNT(DISTINCT mp.media_exhibitor_id) FILTER (WHERE mp.media_exhibitor_id IS NOT NULL) AS distinct_exhibitor_ids
    FROM media_points mp
    LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id
    WHERE mp.is_deleted = false AND mp.is_active = true
  `);
  table(contagem);

  console.log('\n--- Top 20 exibidores por volume de pontos ---');
  const topExibidores = await q(`
    SELECT me.name AS exibidor, COUNT(mp.id) AS total_pontos
    FROM media_points mp
    LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id
    WHERE mp.is_deleted = false AND mp.is_active = true
    GROUP BY me.name
    ORDER BY total_pontos DESC
    LIMIT 20
  `);
  table(topExibidores);

  console.log('\n--- Pontos SEM exibidor associado ---');
  const semExibidor = await q(`
    SELECT COUNT(*) AS pontos_sem_exibidor
    FROM media_points mp
    WHERE mp.is_deleted = false AND mp.is_active = true
      AND mp.media_exhibitor_id IS NULL
  `);
  table(semExibidor);

  console.log('\n--- Exemplo: code vs media_exhibitor (10 primeiros) ---');
  const exemploCode = await q(`
    SELECT mp.code, me.name AS exibidor_nome, mp.media_exhibitor_id
    FROM media_points mp
    LEFT JOIN media_exhibitors me ON mp.media_exhibitor_id = me.id
    WHERE mp.is_deleted = false AND mp.is_active = true
      AND mp.code IS NOT NULL
    LIMIT 10
  `);
  table(exemploCode);
}

// ─────────────────────────────────────────────────────────────────────
// 6. DADOS DE FLUXO E IMPACTO
// ─────────────────────────────────────────────────────────────────────
async function verificacao6() {
  hr('6. DADOS DE FLUXO E IMPACTO');

  console.log('\n--- pedestrian_flow ---');
  const fluxo = await q(`
    SELECT
      COUNT(*) AS total_ativos,
      COUNT(pedestrian_flow) AS com_fluxo,
      COUNT(*) - COUNT(pedestrian_flow) AS sem_fluxo_null,
      COUNT(*) FILTER (WHERE pedestrian_flow = 0) AS fluxo_zero,
      ROUND(MIN(pedestrian_flow)::numeric, 2) AS min_fluxo,
      ROUND(MAX(pedestrian_flow)::numeric, 2) AS max_fluxo,
      ROUND(AVG(pedestrian_flow)::numeric, 2) AS avg_fluxo,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pedestrian_flow)::numeric, 2) AS mediana_fluxo
    FROM media_points
    WHERE is_deleted = false AND is_active = true
  `);
  table(fluxo);

  console.log('\n--- total_ipv_impact ---');
  const ipv = await q(`
    SELECT
      COUNT(*) AS total_ativos,
      COUNT(total_ipv_impact) AS com_ipv,
      COUNT(*) - COUNT(total_ipv_impact) AS sem_ipv_null,
      COUNT(*) FILTER (WHERE total_ipv_impact = 0) AS ipv_zero,
      ROUND(MIN(total_ipv_impact)::numeric, 2) AS min_ipv,
      ROUND(MAX(total_ipv_impact)::numeric, 2) AS max_ipv,
      ROUND(AVG(total_ipv_impact)::numeric, 2) AS avg_ipv
    FROM media_points
    WHERE is_deleted = false AND is_active = true
  `);
  table(ipv);

  console.log('\n--- social_class_geo (distribuicao) ---');
  const classe = await q(`
    SELECT social_class_geo, COUNT(*) AS total
    FROM media_points
    WHERE is_deleted = false AND is_active = true
    GROUP BY social_class_geo
    ORDER BY total DESC
  `);
  table(classe);
}

// ─────────────────────────────────────────────────────────────────────
// 7. COORDENADAS
// ─────────────────────────────────────────────────────────────────────
async function verificacao7() {
  hr('7. COORDENADAS');

  console.log('\n--- Pontos com lat/lon nulo ou zero ---');
  const coords = await q(`
    SELECT
      COUNT(*) AS total_ativos,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS lat_lon_null,
      COUNT(*) FILTER (WHERE latitude = 0 OR longitude = 0) AS lat_lon_zero,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND latitude != 0 AND longitude != 0) AS com_coordenadas_validas
    FROM media_points
    WHERE is_deleted = false AND is_active = true
  `);
  table(coords);

  console.log('\n--- Distribuicao por estado (campo state em cities?) ---');
  const stateCol = await q(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'cities'
      AND (column_name ILIKE '%state%' OR column_name ILIKE '%estado%' OR column_name ILIKE '%uf%')
  `);
  if (stateCol.length > 0) {
    const colName = stateCol[0].column_name;
    console.log(`  Usando coluna: cities.${colName}`);
    const dist = await q(`
      SELECT c.${colName} AS estado, COUNT(mp.id) AS total_pontos,
             COUNT(DISTINCT c.name) AS cidades
      FROM media_points mp
      LEFT JOIN cities c ON mp.city_id = c.id
      WHERE mp.is_deleted = false AND mp.is_active = true
      GROUP BY c.${colName}
      ORDER BY total_pontos DESC
      LIMIT 30
    `);
    table(dist);
  } else {
    console.log('  Nenhuma coluna de estado encontrada em cities. Verificando...');
    const cidadeCols = await q(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cities' ORDER BY ordinal_position
    `);
    console.log('  Colunas em cities:', cidadeCols.map(r => r.column_name).join(', '));
  }

  console.log('\n--- Bounding box dos pontos ---');
  const bbox = await q(`
    SELECT
      ROUND(MIN(latitude)::numeric, 4) AS min_lat,
      ROUND(MAX(latitude)::numeric, 4) AS max_lat,
      ROUND(MIN(longitude)::numeric, 4) AS min_lon,
      ROUND(MAX(longitude)::numeric, 4) AS max_lon
    FROM media_points
    WHERE is_deleted = false AND is_active = true
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND latitude != 0 AND longitude != 0
  `);
  table(bbox);
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Conectando ao PostgreSQL do Banco de Ativos...');
  console.log(`Host: ${process.env.POSTGRES_HOST}`);
  console.log(`Database: ${process.env.POSTGRES_DATABASE}`);

  try {
    await pool.query('SELECT 1');
    console.log('Conexao OK!\n');
  } catch (err) {
    console.error('ERRO DE CONEXAO:', err.message);
    process.exit(1);
  }

  await verificacao1();
  await verificacao2();
  await verificacao3();
  await verificacao4();
  await verificacao5();
  await verificacao6();
  await verificacao7();

  hr('FIM DA VERIFICACAO');
  await pool.end();
}

main().catch(err => {
  console.error('Erro fatal:', err);
  pool.end();
  process.exit(1);
});
