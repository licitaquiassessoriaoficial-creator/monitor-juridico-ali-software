const cron = require('node-cron');
const { Op } = require('sequelize');
const { Tarefa, Financeiro, User } = require('../models');
const { enviarLembreteTarefa, enviarEmail } = require('./emailService');

// Função para verificar tarefas vencendo
const verificarTarefasVencendo = async () => {
  try {
    console.log('🔍 Verificando tarefas vencendo...');
    
    // Buscar tarefas que vencem nas próximas 24 horas
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(23, 59, 59, 999);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const tarefasVencendo = await Tarefa.findAll({
      where: {
        status: { [Op.ne]: 'concluida' },
        dataVencimento: { [Op.between]: [hoje, amanha] },
        lembreteEnviado: { [Op.or]: [false, null] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }
      ]
    });

    console.log(`📝 Encontradas ${tarefasVencendo.length} tarefas vencendo`);

    for (const tarefa of tarefasVencendo) {
      if (tarefa.user && tarefa.user.email) {
        const resultado = await enviarLembreteTarefa(
          tarefa.user.name,
          tarefa.user.email,
          tarefa
        );

        if (resultado.success) {
          // Marcar lembrete como enviado
          await tarefa.update({ lembreteEnviado: true });
          console.log(`✅ Lembrete enviado para ${tarefa.user.email} - Tarefa: ${tarefa.titulo}`);
        } else {
          console.error(`❌ Erro ao enviar lembrete para ${tarefa.user.email}:`, resultado.error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar tarefas vencendo:', error);
  }
};

// Função para verificar contas vencidas
const verificarContasVencidas = async () => {
  try {
    console.log('💰 Verificando contas vencidas...');
    
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const contasVencidas = await Financeiro.findAll({
      where: {
        status: 'pendente',
        dataVencimento: { [Op.lt]: hoje },
        alertaEnviado: { [Op.or]: [false, null] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }
      ]
    });

    console.log(`💳 Encontradas ${contasVencidas.length} contas vencidas`);

    for (const conta of contasVencidas) {
      if (conta.user && conta.user.email) {
        const tipoMensagem = conta.tipo === 'receita' ? 'Receita' : 'Despesa';
        const dataVencimento = new Date(conta.dataVencimento).toLocaleDateString('pt-BR');
        
        const template = {
          subject: `🚨 ${tipoMensagem} Vencida: ${conta.descricao} - Ali Software Jurídico`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🚨 ${tipoMensagem} Vencida</h1>
                <p style="color: white; margin: 10px 0 0 0;">Ali Software Jurídico</p>
              </div>
              
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333;">Olá, ${conta.user.name}!</h2>
                
                <p style="color: #666;">
                  ${conta.tipo === 'receita' ? 'Uma receita venceu e ainda não foi recebida' : 'Uma despesa venceu e ainda não foi paga'}:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">💰 ${conta.descricao}</h3>
                  <p style="color: #666; margin: 5px 0;"><strong>Valor:</strong> R$ ${parseFloat(conta.valor).toFixed(2)}</p>
                  <p style="color: #666; margin: 5px 0;"><strong>Vencimento:</strong> ${dataVencimento}</p>
                  <p style="color: #666; margin: 5px 0;"><strong>Categoria:</strong> ${conta.categoria}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/financeiro" 
                     style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    💳 Ver Financeiro
                  </a>
                </div>
              </div>
              
              <div style="background: #333; padding: 20px; text-align: center;">
                <p style="color: #999; margin: 0; font-size: 12px;">
                  © 2025 Ali Software Jurídico - Todos os direitos reservados
                </p>
              </div>
            </div>
          `,
          text: `${tipoMensagem} vencida: ${conta.descricao} - R$ ${conta.valor} (Vencimento: ${dataVencimento})`
        };

        const resultado = await enviarEmail({
          to: conta.user.email,
          ...template
        });

        if (resultado.success) {
          await conta.update({ alertaEnviado: true });
          console.log(`✅ Alerta de conta vencida enviado para ${conta.user.email}`);
        } else {
          console.error(`❌ Erro ao enviar alerta de conta vencida:`, resultado.error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar contas vencidas:', error);
  }
};

// Função para resetar flags de lembrete (executada diariamente)
const resetarLembretes = async () => {
  try {
    console.log('🔄 Resetando flags de lembrete...');
    
    await Tarefa.update(
      { lembreteEnviado: false },
      { where: { lembreteEnviado: true } }
    );

    await Financeiro.update(
      { alertaEnviado: false },
      { where: { alertaEnviado: true } }
    );

    console.log('✅ Flags de lembrete resetadas');
  } catch (error) {
    console.error('❌ Erro ao resetar lembretes:', error);
  }
};

// Configurar cron jobs
const iniciarAgendamentos = () => {
  console.log('📅 Iniciando agendamentos de notificações...');
  
  // Verificar tarefas vencendo - todos os dias às 9h
  cron.schedule('0 9 * * *', verificarTarefasVencendo, {
    timezone: 'America/Sao_Paulo'
  });
  
  // Verificar contas vencidas - todos os dias às 8h
  cron.schedule('0 8 * * *', verificarContasVencidas, {
    timezone: 'America/Sao_Paulo'
  });
  
  // Resetar flags de lembrete - todos os dias à meia-noite
  cron.schedule('0 0 * * *', resetarLembretes, {
    timezone: 'America/Sao_Paulo'
  });

  console.log('✅ Agendamentos configurados:');
  console.log('  - Tarefas vencendo: 9h diariamente');
  console.log('  - Contas vencidas: 8h diariamente');
  console.log('  - Reset lembretes: 0h diariamente');
};

// Função para parar agendamentos
const pararAgendamentos = () => {
  const tasks = cron.getTasks();
  tasks.forEach(task => {
    if (task && typeof task.stop === 'function') {
      task.stop();
    }
  });
  console.log('🛑 Agendamentos parados');
};

module.exports = {
  verificarTarefasVencendo,
  verificarContasVencidas,
  resetarLembretes,
  iniciarAgendamentos,
  pararAgendamentos
};