const { 
  User, 
  Cliente, 
  Processo, 
  Tarefa, 
  Financeiro, 
  Andamento,
  sequelize 
} = require('./models');

async function criarDadosExemplo() {
  try {
    console.log('🌱 Criando dados de exemplo...');
    
    // Criar apenas o usuário admin para testes
    const usuario = await User.create({
      name: 'Admin Teste',
      email: 'admin@teste.com',
      password: 'admin123', // será criptografada pelo hook
      phone: '(11) 99999-9999',
      oab: 'SP123456',
      uf: 'SP',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      planType: 'enterprise', // acesso total
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano de trial
    });

    console.log(`👤 Usuário admin criado: ${usuario.name}`);
    console.log('✅ Dados de exemplo criados com sucesso!');
    console.log('📧 Email admin: admin@teste.com');
    console.log('🔑 Senha admin: admin123');

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  // Sincronizar banco antes de rodar o seed
  if (require.main === module) {
    (async () => {
      try {
        await sequelize.sync({ force: true });
        console.log('✅ Banco de dados sincronizado.');
        await criarDadosExemplo();
        process.exit(0);
      } catch (err) {
        console.error('❌ Erro ao sincronizar banco:', err);
        process.exit(1);
      }
    })();
  }
}

module.exports = { criarDadosExemplo };