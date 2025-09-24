const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { 
  Cliente, 
  Processo, 
  Tarefa, 
  Financeiro, 
  LogAtividade,
  Andamento 
} = require('../models');

const router = express.Router();

// GET /api/dashboard - Dashboard principal
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    const proximaSemana = new Date(hoje);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    // Estatísticas gerais
    const [
      totalClientes,
      clientesAtivos,
      totalProcessos,
      processosAtivos,
      totalTarefas,
      tarefasPendentes,
      tarefasVencidas,
      tarefasHoje,
      receitasVencendo,
      despesasVencidas
    ] = await Promise.all([
      Cliente.count({ where: { userId } }),
      Cliente.count({ where: { userId, status: 'ativo' } }),
      Processo.count({ where: { userId } }),
      Processo.count({ where: { userId, status: 'ativo' } }),
      Tarefa.count({ where: { userId } }),
      Tarefa.count({ where: { userId, status: { [Op.ne]: 'concluida' } } }),
      Tarefa.count({ 
        where: { 
          userId,
          status: { [Op.ne]: 'concluida' },
          dataVencimento: { [Op.lt]: hoje }
        } 
      }),
      Tarefa.count({ 
        where: { 
          userId,
          status: { [Op.ne]: 'concluida' },
          dataVencimento: { [Op.between]: [hoje, amanha] }
        } 
      }),
      Financeiro.count({ 
        where: { 
          userId,
          tipo: 'receita',
          status: 'pendente',
          dataVencimento: { [Op.between]: [hoje, proximaSemana] }
        } 
      }),
      Financeiro.count({ 
        where: { 
          userId,
          tipo: 'despesa',
          status: 'pendente',
          dataVencimento: { [Op.lt]: hoje }
        } 
      })
    ]);

    // Tarefas para hoje
    const tarefasParaHoje = await Tarefa.findAll({
      where: {
        userId,
        status: { [Op.ne]: 'concluida' },
        dataVencimento: { [Op.between]: [hoje, amanha] }
      },
      order: [['prioridade', 'DESC'], ['dataVencimento', 'ASC']],
      limit: 5,
      include: [
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          required: false
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome'],
          required: false
        }
      ]
    });

    // Processos com movimentação recente (últimos 7 dias)
    const ultimaSemana = new Date(hoje);
    ultimaSemana.setDate(ultimaSemana.getDate() - 7);

    const processosRecentes = await Processo.findAll({
      where: { userId },
      include: [
        {
          model: Andamento,
          as: 'andamentos',
          where: {
            dataAndamento: { [Op.gte]: ultimaSemana }
          },
          required: true,
          order: [['dataAndamento', 'DESC']],
          limit: 1
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome']
        }
      ],
      order: [['andamentos', 'dataAndamento', 'DESC']],
      limit: 5
    });

    // Resumo financeiro do mês atual
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [receitasMes, despesasMes, receitasPagas, despesasPagas] = await Promise.all([
      Financeiro.sum('valor', { 
        where: { 
          userId, 
          tipo: 'receita',
          dataVencimento: { [Op.between]: [inicioMes, fimMes] }
        } 
      }),
      Financeiro.sum('valor', { 
        where: { 
          userId, 
          tipo: 'despesa',
          dataVencimento: { [Op.between]: [inicioMes, fimMes] }
        } 
      }),
      Financeiro.sum('valor', { 
        where: { 
          userId, 
          tipo: 'receita',
          status: 'pago',
          dataVencimento: { [Op.between]: [inicioMes, fimMes] }
        } 
      }),
      Financeiro.sum('valor', { 
        where: { 
          userId, 
          tipo: 'despesa',
          status: 'pago',
          dataVencimento: { [Op.between]: [inicioMes, fimMes] }
        } 
      })
    ]);

    // Atividades recentes
    const atividadesRecentes = await LogAtividade.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero'],
          required: false
        },
        {
          model: Tarefa,
          as: 'tarefa',
          attributes: ['id', 'titulo'],
          required: false
        }
      ]
    });

    res.json({
      resumo: {
        clientes: {
          total: totalClientes,
          ativos: clientesAtivos
        },
        processos: {
          total: totalProcessos,
          ativos: processosAtivos
        },
        tarefas: {
          total: totalTarefas,
          pendentes: tarefasPendentes,
          vencidas: tarefasVencidas,
          hoje: tarefasHoje
        },
        financeiro: {
          receitasVencendo,
          despesasVencidas,
          receitasMes: receitasMes || 0,
          despesasMes: despesasMes || 0,
          receitasPagas: receitasPagas || 0,
          despesasPagas: despesasPagas || 0,
          saldoMes: (receitasMes || 0) - (despesasMes || 0),
          saldoPago: (receitasPagas || 0) - (despesasPagas || 0)
        }
      },
      tarefasHoje: tarefasParaHoje,
      processosRecentes,
      atividadesRecentes
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/metricas - Métricas detalhadas
router.get('/metricas', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { periodo = '30' } = req.query; // dias
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

    // Evolução de clientes
    const evolucaoClientes = await Cliente.findAll({
      where: { 
        userId,
        createdAt: { [Op.gte]: dataInicio }
      },
      attributes: [
        [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'data'],
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
      ],
      group: [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt'))],
      order: [[sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Evolução de processos
    const evolucaoProcessos = await Processo.findAll({
      where: { 
        userId,
        createdAt: { [Op.gte]: dataInicio }
      },
      attributes: [
        [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'data'],
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
      ],
      group: [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt'))],
      order: [[sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Tarefas concluídas vs criadas
    const [tarefasCriadas, tarefasConcluidas] = await Promise.all([
      Tarefa.findAll({
        where: { 
          userId,
          createdAt: { [Op.gte]: dataInicio }
        },
        attributes: [
          [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'data'],
          [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
        ],
        group: [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt'))],
        order: [[sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('createdAt')), 'ASC']],
        raw: true
      }),
      Tarefa.findAll({
        where: { 
          userId,
          status: 'concluida',
          dataConclusao: { [Op.gte]: dataInicio }
        },
        attributes: [
          [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('dataConclusao')), 'data'],
          [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
        ],
        group: [sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('dataConclusao'))],
        order: [[sequelize.Sequelize.fn('DATE', sequelize.Sequelize.col('dataConclusao')), 'ASC']],
        raw: true
      })
    ]);

    // Distribuição de tarefas por prioridade
    const tarefasPorPrioridade = await Tarefa.findAll({
      where: { 
        userId,
        status: { [Op.ne]: 'concluida' }
      },
      attributes: [
        'prioridade',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
      ],
      group: ['prioridade'],
      raw: true
    });

    // Processos por instância
    const processosPorInstancia = await Processo.findAll({
      where: { userId },
      attributes: [
        'instancia',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'total']
      ],
      group: ['instancia'],
      raw: true
    });

    res.json({
      periodo: `${periodo} dias`,
      evolucao: {
        clientes: evolucaoClientes,
        processos: evolucaoProcessos
      },
      tarefas: {
        criadas: tarefasCriadas,
        concluidas: tarefasConcluidas,
        porPrioridade: tarefasPorPrioridade
      },
      processos: {
        porInstancia: processosPorInstancia
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/agenda - Agenda consolidada
router.get('/agenda', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data } = req.query;
    
    let dataConsulta = new Date();
    if (data) {
      dataConsulta = new Date(data);
    }
    
    dataConsulta.setHours(0, 0, 0, 0);
    const proximoDia = new Date(dataConsulta);
    proximoDia.setDate(proximoDia.getDate() + 1);

    // Tarefas do dia
    const tarefas = await Tarefa.findAll({
      where: {
        userId,
        status: { [Op.ne]: 'concluida' },
        dataVencimento: { [Op.between]: [dataConsulta, proximoDia] }
      },
      order: [['prioridade', 'DESC'], ['dataVencimento', 'ASC']],
      include: [
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          required: false
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome'],
          required: false
        }
      ]
    });

    // Compromissos financeiros do dia
    const financeiro = await Financeiro.findAll({
      where: {
        userId,
        status: 'pendente',
        dataVencimento: { [Op.between]: [dataConsulta, proximoDia] }
      },
      order: [['valor', 'DESC']],
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome'],
          required: false
        },
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero'],
          required: false
        }
      ]
    });

    // Andamentos recentes dos processos
    const andamentosRecentes = await Andamento.findAll({
      where: {
        userId,
        dataAndamento: { [Op.between]: [dataConsulta, proximoDia] }
      },
      order: [['dataAndamento', 'DESC']],
      limit: 10,
      include: [
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          include: [
            {
              model: Cliente,
              as: 'cliente',
              attributes: ['id', 'nome']
            }
          ]
        }
      ]
    });

    res.json({
      data: dataConsulta.toISOString().split('T')[0],
      tarefas,
      financeiro,
      andamentos: andamentosRecentes,
      resumo: {
        totalTarefas: tarefas.length,
        tarefasUrgentes: tarefas.filter(t => t.prioridade === 'urgente').length,
        valorReceitas: financeiro.filter(f => f.tipo === 'receita').reduce((sum, f) => sum + parseFloat(f.valor), 0),
        valorDespesas: financeiro.filter(f => f.tipo === 'despesa').reduce((sum, f) => sum + parseFloat(f.valor), 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/alertas - Alertas e notificações
router.get('/alertas', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const proximaSemana = new Date(hoje);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    const alertas = [];

    // Tarefas vencidas
    const tarefasVencidas = await Tarefa.count({
      where: {
        userId,
        status: { [Op.ne]: 'concluida' },
        dataVencimento: { [Op.lt]: hoje }
      }
    });

    if (tarefasVencidas > 0) {
      alertas.push({
        tipo: 'tarefa_vencida',
        nivel: 'alto',
        titulo: 'Tarefas Vencidas',
        descricao: `Você tem ${tarefasVencidas} tarefa(s) vencida(s)`,
        count: tarefasVencidas,
        link: '/tarefas?status=vencidas'
      });
    }

    // Contas vencidas
    const contasVencidas = await Financeiro.count({
      where: {
        userId,
        status: 'pendente',
        dataVencimento: { [Op.lt]: hoje }
      }
    });

    if (contasVencidas > 0) {
      alertas.push({
        tipo: 'conta_vencida',
        nivel: 'alto',
        titulo: 'Contas Vencidas',
        descricao: `Você tem ${contasVencidas} conta(s) vencida(s)`,
        count: contasVencidas,
        link: '/financeiro?status=vencidas'
      });
    }

    // Receitas vencendo na próxima semana
    const receitasVencendo = await Financeiro.count({
      where: {
        userId,
        tipo: 'receita',
        status: 'pendente',
        dataVencimento: { [Op.between]: [hoje, proximaSemana] }
      }
    });

    if (receitasVencendo > 0) {
      alertas.push({
        tipo: 'receita_vencendo',
        nivel: 'medio',
        titulo: 'Receitas Vencendo',
        descricao: `${receitasVencendo} receita(s) vencem nos próximos 7 dias`,
        count: receitasVencendo,
        link: '/financeiro?tipo=receita&status=pendente'
      });
    }

    // Processos sem movimentação há muito tempo (30 dias)
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const processosSemMovimentacao = await Processo.findAll({
      where: { userId, status: 'ativo' },
      include: [
        {
          model: Andamento,
          as: 'andamentos',
          where: {
            dataAndamento: { [Op.gte]: trintaDiasAtras }
          },
          required: false
        }
      ],
      having: sequelize.Sequelize.literal('COUNT(andamentos.id) = 0'),
      group: ['Processo.id']
    });

    if (processosSemMovimentacao.length > 0) {
      alertas.push({
        tipo: 'processo_parado',
        nivel: 'baixo',
        titulo: 'Processos sem Movimentação',
        descricao: `${processosSemMovimentacao.length} processo(s) sem movimentação há mais de 30 dias`,
        count: processosSemMovimentacao.length,
        link: '/processos?filtro=sem_movimentacao'
      });
    }

    res.json({ alertas });
  } catch (error) {
    next(error);
  }
});

module.exports = router;