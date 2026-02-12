require('dotenv').config();
const handler = require('./api/executar-scripts-usuarios.js');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  INSTALAÇÃO DO SISTEMA DE USUÁRIOS E PERMISSÕES          ║');
console.log('║  Colmeia - Meus Roteiros Default                         ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('⚠️  ATENÇÃO: Este script vai modificar o banco de dados!');
console.log('');
console.log('📦 Scripts que serão executados:');
console.log('   1. 01_criar_tabelas.sql');
console.log('   2. 02_inserir_dados_iniciais.sql');
console.log('   3. 03_migrar_usuarios_existentes.sql');
console.log('   4. 04_criar_views.sql');
console.log('');
console.log('⏳ Iniciando execução em 3 segundos...');
console.log('');

setTimeout(async () => {
  const req = {
    method: 'POST',
    body: {
      confirmar: 'SIM_EXECUTAR_SCRIPTS_USUARIO'
    }
  };

  const res = {
    status: (code) => {
      return {
        json: (data) => {
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`📊 Status: ${code}`);
          console.log('═══════════════════════════════════════════════════════════');
          console.log('');
          
          if (code === 200) {
            console.log('✅ SUCESSO!\n');
            
            console.log('📋 Scripts Executados:');
            data.scripts_executados.forEach((s, i) => {
              console.log(`   ${i + 1}. ${s.script} - ${s.mensagem} (${s.batches} batches)`);
            });
            
            console.log('');
            console.log('📊 Verificação Final:');
            console.log(`   - Perfis cadastrados: ${data.verificacao.total_perfis}`);
            console.log(`   - Áreas do sistema: ${data.verificacao.total_areas}`);
            console.log(`   - Permissões configuradas: ${data.verificacao.total_permissoes}`);
            console.log(`   - Usuários com perfil: ${data.verificacao.usuarios_com_perfil}`);
            if (data.verificacao.usuarios_sem_perfil > 0) {
              console.log(`   ⚠️ Usuários sem perfil: ${data.verificacao.usuarios_sem_perfil}`);
            }
            
            console.log('');
            console.log('🎯 Próximos Passos:');
            data.proximos_passos.forEach((p, i) => {
              console.log(`   ${i + 1}. ${p}`);
            });
            
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('═══════════════════════════════════════════════════════════');
          } else {
            console.error('❌ ERRO:', JSON.stringify(data, null, 2));
          }
          
          process.exit(code === 200 ? 0 : 1);
        }
      };
    }
  };

  try {
    await handler(req, res);
  } catch (error) {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }
}, 3000);
