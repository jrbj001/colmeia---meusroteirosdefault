require('dotenv').config();
const handler = require('./api/investigar-usuarios-db.js');

// Simular request e response do Express/Vercel
const req = {
  method: 'GET'
};

const res = {
  status: (code) => {
    console.log(`\n📊 Status: ${code}\n`);
    return {
      json: (data) => {
        if (code === 200) {
          console.log('✅ INVESTIGAÇÃO DO BANCO DE DADOS\n');
          console.log('═══════════════════════════════════════════════════════════\n');
          
          console.log('📈 RESUMO:');
          console.log(JSON.stringify(data.resumo, null, 2));
          
          console.log('\n\n🔍 TABELAS RELACIONADAS A USUÁRIOS:');
          if (data.tabelas_relacionadas_usuarios.length > 0) {
            data.tabelas_relacionadas_usuarios.forEach(tabela => {
              console.log(`\n  📋 ${tabela.schema}.${tabela.nome}`);
              console.log(`  📊 Total de registros: ${tabela.total_registros}`);
              console.log('  📝 Colunas:');
              tabela.colunas.forEach(col => {
                console.log(`     - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
              });
            });
          } else {
            console.log('  ❌ Nenhuma tabela de usuários encontrada');
          }
          
          console.log('\n\n👁️ VIEWS RELACIONADAS A USUÁRIOS:');
          if (data.views_usuarios.length > 0) {
            data.views_usuarios.forEach(view => {
              console.log(`  - ${view.TABLE_SCHEMA}.${view.TABLE_NAME}`);
            });
          } else {
            console.log('  ❌ Nenhuma view de usuários encontrada');
          }
          
          console.log('\n\n📦 ALGUMAS TABELAS DO SCHEMA serv_product_be180:');
          console.log('  ' + data.todas_tabelas_serv_product.slice(0, 10).join('\n  '));
          console.log(`  ... e mais ${data.todas_tabelas_serv_product.length - 10} tabelas`);
          
          console.log('\n\n💡 SUGESTÃO DE ESTRATÉGIA:');
          console.log(`  ${data.sugestao_estrategia}`);
          
          console.log('\n═══════════════════════════════════════════════════════════\n');
        } else {
          console.error('❌ ERRO:', JSON.stringify(data, null, 2));
        }
      }
    };
  }
};

handler(req, res).catch(err => {
  console.error('💥 Erro ao executar investigação:', err);
  process.exit(1);
});
