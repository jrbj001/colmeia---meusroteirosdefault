require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Ajustar se necessário

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║          TESTES DAS APIs DE USUÁRIOS E PERMISSÕES        ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function testar() {
  try {
    
    // 1. Testar GET /perfis
    console.log('1️⃣ Testando GET /perfis...');
    const perfisRes = await axios.get(`${BASE_URL}/perfis`);
    console.log(`✅ ${perfisRes.data.total} perfis encontrados`);
    console.table(perfisRes.data.perfis.map(p => ({
      ID: p.perfil_pk,
      Nome: p.perfil_nome,
      Permissões: p.total_permissoes,
      Usuários: p.total_usuarios
    })));
    console.log('');
    
    // 2. Testar GET /areas
    console.log('2️⃣ Testando GET /areas...');
    const areasRes = await axios.get(`${BASE_URL}/areas`);
    console.log(`✅ ${areasRes.data.total} áreas encontradas`);
    console.log('');
    
    // 3. Testar GET /areas?hierarquia=true
    console.log('3️⃣ Testando GET /areas?hierarquia=true...');
    const areasHierRes = await axios.get(`${BASE_URL}/areas?hierarquia=true`);
    console.log(`✅ ${areasHierRes.data.total_principais} áreas principais`);
    console.log(`✅ ${areasHierRes.data.total_subareas} subáreas`);
    console.log('');
    
    // 4. Testar GET /usuarios
    console.log('4️⃣ Testando GET /usuarios...');
    const usuariosRes = await axios.get(`${BASE_URL}/usuarios?page=1&limit=5`);
    console.log(`✅ ${usuariosRes.data.pagination.total} usuários no total`);
    console.table(usuariosRes.data.usuarios.map(u => ({
      ID: u.usuario_pk,
      Nome: u.usuario_nome,
      Email: u.usuario_email || '(sem email)',
      Perfil: u.perfil_nome
    })));
    console.log('');
    
    // 5. Testar GET /usuarios/:id
    console.log('5️⃣ Testando GET /usuarios/7 (Gabriel Gama)...');
    const usuarioRes = await axios.get(`${BASE_URL}/usuarios?id=7`);
    console.log(`✅ Usuário: ${usuarioRes.data.usuario_nome}`);
    console.log(`   Email: ${usuarioRes.data.usuario_email}`);
    console.log(`   Perfil: ${usuarioRes.data.perfil_nome}`);
    console.log('');
    
    // 6. Testar GET /usuarios-permissoes
    console.log('6️⃣ Testando GET /usuarios-permissoes?usuario_pk=7...');
    const permissoesRes = await axios.get(`${BASE_URL}/usuarios-permissoes?usuario_pk=7`);
    console.log(`✅ ${permissoesRes.data.total_permissoes} permissões encontradas`);
    console.log(`   Usuário: ${permissoesRes.data.usuario.nome}`);
    console.log(`   Perfil: ${permissoesRes.data.usuario.perfil_nome}`);
    console.log(`   Áreas com acesso: ${permissoesRes.data.permissoes.length}`);
    console.log('');
    
    // 7. Testar GET /perfis/:id
    console.log('7️⃣ Testando GET /perfis?id=1 (Admin)...');
    const perfilRes = await axios.get(`${BASE_URL}/perfis?id=1`);
    console.log(`✅ Perfil: ${perfilRes.data.perfil_nome}`);
    console.log(`   Descrição: ${perfilRes.data.perfil_descricao}`);
    console.log(`   Total de permissões: ${perfilRes.data.total_permissoes}`);
    console.log(`   Total de usuários: ${perfilRes.data.total_usuarios}`);
    console.log('');
    
    // 8. Testar GET /perfis-permissoes
    console.log('8️⃣ Testando GET /perfis-permissoes?perfil_pk=1...');
    const perfilPermRes = await axios.get(`${BASE_URL}/perfis-permissoes?perfil_pk=1`);
    console.log(`✅ Perfil Admin possui ${perfilPermRes.data.total_permissoes_ativas} permissões ativas`);
    console.log(`   Total de áreas no sistema: ${perfilPermRes.data.total_areas}`);
    
    // Mostrar algumas áreas com permissões
    const areasComPermissao = perfilPermRes.data.areas.filter(a => a.permissoes.ler || a.permissoes.escrever).slice(0, 5);
    console.log('\n   Primeiras 5 áreas com permissão:');
    console.table(areasComPermissao.map(a => ({
      Código: a.codigo,
      Nome: a.nome,
      Ler: a.permissoes.ler ? '✓' : '✗',
      Escrever: a.permissoes.escrever ? '✓' : '✗'
    })));
    console.log('');
    
    // 9. Testar GET /verificar-acesso (leitura)
    console.log('9️⃣ Testando GET /verificar-acesso (leitura)...');
    const acessoLeituraRes = await axios.get(`${BASE_URL}/verificar-acesso?usuario_pk=7&area_codigo=meus_roteiros&tipo=leitura`);
    console.log(`✅ Usuário ${acessoLeituraRes.data.usuario.nome} ${acessoLeituraRes.data.tem_acesso ? 'TEM' : 'NÃO TEM'} acesso de leitura`);
    console.log(`   Área: ${acessoLeituraRes.data.area.nome}`);
    if (acessoLeituraRes.data.tem_acesso) {
      console.log(`   Permissões: Ler=${acessoLeituraRes.data.permissoes.ler}, Escrever=${acessoLeituraRes.data.permissoes.escrever}`);
    }
    console.log('');
    
    // 10. Testar GET /verificar-acesso (escrita)
    console.log('🔟 Testando GET /verificar-acesso (escrita)...');
    const acessoEscritaRes = await axios.get(`${BASE_URL}/verificar-acesso?usuario_pk=7&area_codigo=admin&tipo=escrita`);
    console.log(`✅ Usuário ${acessoEscritaRes.data.usuario.nome} ${acessoEscritaRes.data.tem_acesso ? 'TEM' : 'NÃO TEM'} acesso de escrita`);
    console.log(`   Área: ${acessoEscritaRes.data.area.nome}`);
    if (acessoEscritaRes.data.tem_acesso) {
      console.log(`   Permissões: Ler=${acessoEscritaRes.data.permissoes.ler}, Escrever=${acessoEscritaRes.data.permissoes.escrever}`);
    }
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📝 RESUMO DAS APIs DISPONÍVEIS:');
    console.log('');
    console.log('📌 Usuários:');
    console.log('   GET    /usuarios              - Listar usuários (com paginação)');
    console.log('   GET    /usuarios?id=X         - Detalhes de um usuário');
    console.log('   POST   /usuarios              - Criar novo usuário');
    console.log('   PUT    /usuarios?id=X         - Atualizar usuário');
    console.log('   DELETE /usuarios?id=X         - Desativar usuário');
    console.log('');
    console.log('📌 Permissões de Usuário:');
    console.log('   GET    /usuarios-permissoes?usuario_pk=X - Permissões do usuário');
    console.log('');
    console.log('📌 Perfis:');
    console.log('   GET    /perfis                - Listar perfis');
    console.log('   GET    /perfis?id=X           - Detalhes de um perfil');
    console.log('   POST   /perfis                - Criar novo perfil (Admin)');
    console.log('   PUT    /perfis?id=X           - Atualizar perfil (Admin)');
    console.log('   DELETE /perfis?id=X           - Desativar perfil (Admin)');
    console.log('');
    console.log('📌 Permissões de Perfil:');
    console.log('   GET    /perfis-permissoes?perfil_pk=X - Permissões do perfil');
    console.log('   PUT    /perfis-permissoes?perfil_pk=X - Atualizar permissões');
    console.log('');
    console.log('📌 Áreas do Sistema:');
    console.log('   GET    /areas                 - Listar áreas');
    console.log('   GET    /areas?hierarquia=true - Listar em estrutura hierárquica');
    console.log('');
    console.log('📌 Verificação de Acesso:');
    console.log('   GET    /verificar-acesso?usuario_pk=X&area_codigo=Y&tipo=leitura');
    console.log('   GET    /verificar-acesso?usuario_pk=X&area_codigo=Y&tipo=escrita');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Erro durante os testes:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensagem: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.log('\n⚠️  Certifique-se de que o servidor está rodando:');
    console.log('   npm run dev');
    
    process.exit(1);
  }
}

testar();
