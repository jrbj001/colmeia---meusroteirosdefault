require('dotenv').config();
const handler = require('./api/investigar-usuarios-detalhes.js');

const req = { method: 'GET' };

const res = {
  status: (code) => {
    console.log(`\n📊 Status: ${code}\n`);
    return {
      json: (data) => {
        if (code === 200) {
          console.log('✅ DETALHES DA ESTRUTURA DE USUÁRIOS\n');
          console.log('═══════════════════════════════════════════════════════════\n');
          
          console.log('👥 USUÁRIOS CADASTRADOS:');
          data.usuarios.forEach(u => {
            console.log(`\n  🔑 ID: ${u.pk} | Nome: ${u.nome_st}`);
            console.log(`     📧 Email: ${u.email_st}`);
            console.log(`     📞 Telefone: ${u.telefone_st || 'N/A'}`);
            console.log(`     🏢 Empresa: ${u.empresa_pk || 'N/A'}`);
            console.log(`     🔒 Senha: ${u.tem_senha ? 'Sim' : 'Não'}`);
            console.log(`     ✓ Ativo: ${u.ativo_bl === 1 ? 'Sim' : 'Não'}`);
          });
          
          console.log('\n\n📊 ANÁLISE:');
          console.log(`  Total de usuários: ${data.analise.total_usuarios}`);
          console.log(`  Usuários ativos: ${data.analise.usuarios_ativos}`);
          console.log(`  Com empresa: ${data.analise.usuarios_com_empresa}`);
          console.log(`  Com senha: ${data.analise.usuarios_com_senha}`);
          console.log(`  Tem tabela empresa: ${data.analise.tem_tabela_empresa ? 'Sim' : 'Não'}`);
          console.log(`  Tem tabela perfil: ${data.analise.tem_tabela_perfil ? 'Sim' : 'Não'}`);
          
          console.log('\n\n👁️ VIEW usuario_dm_vw:');
          console.log('  Colunas:', data.view_usuario.colunas.join(', '));
          
          console.log('\n\n👁️ VIEW planoMidiaDescUsuario_dm_vw:');
          console.log('  Colunas:', data.view_plano_midia_usuario.colunas.join(', '));
          if (data.view_plano_midia_usuario.amostra.length > 0) {
            console.log('  Amostra (primeira linha):');
            console.log('  ', JSON.stringify(data.view_plano_midia_usuario.amostra[0], null, 2));
          }
          
          if (data.tabelas_empresa.length > 0) {
            console.log('\n\n🏢 TABELAS DE EMPRESA:');
            data.tabelas_empresa.forEach(t => console.log(`  - ${t}`));
          }
          
          if (data.tabelas_perfil.length > 0) {
            console.log('\n\n🎭 TABELAS DE PERFIL/PERMISSÃO:');
            data.tabelas_perfil.forEach(t => console.log(`  - ${t}`));
          }
          
          console.log('\n═══════════════════════════════════════════════════════════\n');
        } else {
          console.error('❌ ERRO:', JSON.stringify(data, null, 2));
        }
      }
    };
  }
};

handler(req, res).catch(err => {
  console.error('💥 Erro:', err);
  process.exit(1);
});
