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
    
    // Criar usuário de teste
    const usuario = await User.create({
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      senha: '$2b$10$K7L/8Y6C4HvGy/8Jv6K2GeLz9kxVjQp4CqGbzV8Z.Wz5Yz9Jz9Jz9', // senha123
      telefone: '(11) 99999-9999',
      oab: 'SP123456',
      escritorio: 'Silva & Associados',
      status: 'ativo',
      plano: 'premium',
      emailVerificado: true
    });

    console.log(`👤 Usuário criado: ${usuario.nome}`);

    // Criar clientes
    const clientes = await Cliente.bulkCreate([
      {
        nome: 'Maria Santos',
        email: 'maria@email.com',
        telefone: '(11) 98888-8888',
        cpfCnpj: '12345678901',
        tipoDocumento: 'CPF',
        endereco: 'Rua das Flores, 123',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        status: 'ativo',
        userId: usuario.id
      },
      {
        nome: 'Empresa ABC Ltda',
        email: 'contato@empresaabc.com',
        telefone: '(11) 97777-7777',
        cpfCnpj: '12345678000199',
        tipoDocumento: 'CNPJ',
        endereco: 'Av. Paulista, 1000',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310-100',
        status: 'ativo',
        userId: usuario.id
      },
      {
        nome: 'Pedro Oliveira',
        email: 'pedro@email.com',
        telefone: '(11) 96666-6666',
        cpfCnpj: '98765432100',
        tipoDocumento: 'CPF',
        endereco: 'Rua da Paz, 456',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '02345-678',
        status: 'ativo',
        userId: usuario.id
      }
    ]);

    console.log(`👥 ${clientes.length} clientes criados`);

    // Criar processos
    const processos = await Processo.bulkCreate([
      {
        numero: '1000123-45.2024.8.26.0100',
        assunto: 'Ação de Cobrança',
        descricao: 'Cobrança de valores devidos por prestação de serviços',
        tribunal: 'TJSP',
        instancia: '1ª instância',
        vara: '1ª Vara Cível',
        status: 'ativo',
        valor: 15000.00,
        dataDistribuicao: new Date('2024-01-15'),
        dataUltimoAndamento: new Date('2024-09-20'),
        clienteId: clientes[0].id,
        userId: usuario.id
      },
      {
        numero: '2000456-78.2024.8.26.0200',
        assunto: 'Divórcio Consensual',
        descricao: 'Ação de divórcio consensual com partilha de bens',
        tribunal: 'TJSP',
        instancia: '1ª instância',
        vara: '2ª Vara de Família',
        status: 'ativo',
        valor: 8000.00,
        dataDistribuicao: new Date('2024-02-10'),
        dataUltimoAndamento: new Date('2024-09-22'),
        clienteId: clientes[1].id,
        userId: usuario.id
      },
      {
        numero: '3000789-12.2024.8.26.0300',
        assunto: 'Revisional de Aluguel',
        descricao: 'Ação revisional para redução do valor do aluguel',
        tribunal: 'TJSP',
        instancia: '1ª instância',
        vara: '3ª Vara Cível',
        status: 'ativo',
        valor: 25000.00,
        dataDistribuicao: new Date('2024-03-05'),
        dataUltimoAndamento: new Date('2024-09-21'),
        clienteId: clientes[2].id,
        userId: usuario.id
      }
    ]);

    console.log(`⚖️ ${processos.length} processos criados`);

    // Criar tarefas
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const proximaSemana = new Date(hoje);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    const tarefas = await Tarefa.bulkCreate([
      {
        titulo: 'Revisar petição inicial',
        descricao: 'Revisar e finalizar petição inicial para protocolo',
        tipo: 'geral',
        prioridade: 'alta',
        status: 'pendente',
        dataVencimento: hoje,
        processoId: processos[0].id,
        clienteId: clientes[0].id,
        userId: usuario.id
      },
      {
        titulo: 'Audiência de Conciliação',
        descricao: 'Audiência de conciliação agendada para às 14:00',
        tipo: 'audiencia',
        prioridade: 'alta',
        status: 'pendente',
        dataVencimento: amanha,
        observacoes: 'Fórum Central - Sala 205',
        processoId: processos[1].id,
        clienteId: clientes[1].id,
        userId: usuario.id
      },
      {
        titulo: 'Preparar documentos',
        descricao: 'Preparar documentos para juntada aos autos',
        tipo: 'geral',
        prioridade: 'media',
        status: 'pendente',
        dataVencimento: proximaSemana,
        processoId: processos[2].id,
        clienteId: clientes[2].id,
        userId: usuario.id
      },
      {
        titulo: 'Contestação - Prazo Final',
        descricao: 'Protocolar contestação - último dia de prazo',
        tipo: 'prazo',
        prioridade: 'alta',
        status: 'pendente',
        dataVencimento: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), // Ontem (vencida)
        processoId: processos[0].id,
        clienteId: clientes[0].id,
        userId: usuario.id
      }
    ]);

    console.log(`📋 ${tarefas.length} tarefas criadas`);

    // Criar movimentações financeiras
    const financeiro = await Financeiro.bulkCreate([
      {
        descricao: 'Honorários - Ação de Cobrança',
        tipo: 'receita',
        valor: 5000.00,
        dataVencimento: new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000),
        status: 'pendente',
        clienteId: clientes[0].id,
        processoId: processos[0].id,
        userId: usuario.id
      },
      {
        descricao: 'Taxa do Tribunal',
        tipo: 'despesa',
        valor: 200.00,
        dataVencimento: new Date(hoje.getTime() - 5 * 24 * 60 * 60 * 1000), // Vencida
        status: 'pendente',
        processoId: processos[1].id,
        userId: usuario.id
      },
      {
        descricao: 'Honorários - Divórcio',
        tipo: 'receita',
        valor: 3000.00,
        dataVencimento: new Date(),
        dataPagamento: new Date(),
        status: 'pago',
        clienteId: clientes[1].id,
        processoId: processos[1].id,
        userId: usuario.id
      },
      {
        descricao: 'Custas processuais',
        tipo: 'despesa',
        valor: 150.00,
        dataVencimento: new Date(hoje.getTime() + 10 * 24 * 60 * 60 * 1000),
        status: 'pendente',
        processoId: processos[2].id,
        userId: usuario.id
      }
    ]);

    console.log(`💰 ${financeiro.length} movimentações financeiras criadas`);

    // Criar andamentos
    const andamentos = await Andamento.bulkCreate([
      {
        descricao: 'Processo distribuído',
        tipo: 'distributição',
        dataAndamento: new Date('2024-01-15'),
        processoId: processos[0].id,
        userId: usuario.id
      },
      {
        descricao: 'Citação realizada',
        tipo: 'citacao',
        dataAndamento: new Date('2024-09-20'),
        processoId: processos[0].id,
        userId: usuario.id
      },
      {
        descricao: 'Audiência de conciliação designada',
        tipo: 'despacho',
        dataAndamento: new Date('2024-09-22'),
        processoId: processos[1].id,
        userId: usuario.id
      },
      {
        descricao: 'Contestação protocolada',
        tipo: 'peticao',
        dataAndamento: new Date('2024-09-21'),
        processoId: processos[2].id,
        userId: usuario.id
      }
    ]);

    console.log(`📄 ${andamentos.length} andamentos criados`);

    console.log('✅ Dados de exemplo criados com sucesso!');
    console.log('📧 Email de teste: joao@exemplo.com');
    console.log('🔑 Senha de teste: senha123');

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  sequelize.sync({ force: true }).then(() => {
    criarDadosExemplo().then(() => {
      process.exit(0);
    });
  });
}

module.exports = { criarDadosExemplo };