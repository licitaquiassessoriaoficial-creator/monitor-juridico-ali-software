const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Tarefa, Processo, Cliente, LogAtividade } = require('../models');
const { CustomError } = require('../middleware/errorHandler');

const router = express.Router();

// Validações para tarefa
const tarefaValidation = [
  body('titulo')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Título deve ter entre 3 e 200 caracteres'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
  body('dataVencimento')
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida'),
  body('prioridade')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser uma das opções válidas'),
  body('processoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Processo ID deve ser um número válido'),
  body('clienteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cliente ID deve ser um número válido')
];

// GET /api/tarefas - Listar tarefas
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      prioridade, 
      processoId, 
      clienteId, 
      search,
      vencimentoInicio,
      vencimentoFim
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (prioridade) {
      whereClause.prioridade = prioridade;
    }
    
    if (processoId) {
      whereClause.processoId = processoId;
    }
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { titulo: { [Op.like]: `%${search}%` } },
        { descricao: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filtro por período de vencimento
    if (vencimentoInicio || vencimentoFim) {
      whereClause.dataVencimento = {};
      if (vencimentoInicio) {
        whereClause.dataVencimento[Op.gte] = vencimentoInicio;
      }
      if (vencimentoFim) {
        whereClause.dataVencimento[Op.lte] = vencimentoFim;
      }
    }

    const { count, rows: tarefas } = await Tarefa.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['prioridade', 'DESC'], // Urgente primeiro
        ['dataVencimento', 'ASC']
      ],
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
          attributes: ['id', 'nome', 'tipo'],
          required: false
        }
      ]
    });

    res.json({
      tarefas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tarefas/:id - Obter tarefa específica
router.get('/:id', async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto', 'status'],
          include: [
            {
              model: Cliente,
              as: 'cliente',
              attributes: ['id', 'nome', 'tipo', 'cpfCnpj']
            }
          ]
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj'],
          required: false
        }
      ]
    });

    if (!tarefa) {
      return res.status(404).json({
        error: 'Tarefa não encontrada',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json(tarefa);
  } catch (error) {
    next(error);
  }
});

// POST /api/tarefas - Criar nova tarefa
router.post('/', tarefaValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const {
      titulo, descricao, dataVencimento, prioridade = 'media',
      processoId, clienteId, lembreteAntes
    } = req.body;

    // Validar se processo existe e pertence ao usuário
    if (processoId) {
      const processo = await Processo.findOne({
        where: { 
          id: processoId,
          userId: req.user.id 
        }
      });

      if (!processo) {
        return res.status(404).json({
          error: 'Processo não encontrado',
          code: 'PROCESS_NOT_FOUND'
        });
      }
    }

    // Validar se cliente existe e pertence ao usuário
    if (clienteId) {
      const cliente = await Cliente.findOne({
        where: { 
          id: clienteId,
          userId: req.user.id 
        }
      });

      if (!cliente) {
        return res.status(404).json({
          error: 'Cliente não encontrado',
          code: 'CLIENT_NOT_FOUND'
        });
      }
    }

    const tarefa = await Tarefa.create({
      titulo,
      descricao,
      dataVencimento,
      prioridade,
      processoId,
      clienteId,
      lembreteAntes,
      status: 'pendente',
      userId: req.user.id
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Tarefa "${titulo}" criada`,
      tipo: 'tarefa_criada',
      userId: req.user.id,
      tarefaId: tarefa.id,
      processoId: processoId || null
    });

    // Retornar tarefa com relacionamentos
    const tarefaCompleta = await Tarefa.findByPk(tarefa.id, {
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
          attributes: ['id', 'nome', 'tipo'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: 'Tarefa criada com sucesso',
      tarefa: tarefaCompleta
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tarefas/:id - Atualizar tarefa
router.put('/:id', tarefaValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const tarefa = await Tarefa.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!tarefa) {
      return res.status(404).json({
        error: 'Tarefa não encontrada',
        code: 'TASK_NOT_FOUND'
      });
    }

    const {
      titulo, descricao, dataVencimento, prioridade,
      processoId, clienteId, lembreteAntes, status
    } = req.body;

    // Validar se processo existe e pertence ao usuário (se foi alterado)
    if (processoId && processoId !== tarefa.processoId) {
      const processo = await Processo.findOne({
        where: { 
          id: processoId,
          userId: req.user.id 
        }
      });

      if (!processo) {
        return res.status(404).json({
          error: 'Processo não encontrado',
          code: 'PROCESS_NOT_FOUND'
        });
      }
    }

    // Validar se cliente existe e pertence ao usuário (se foi alterado)
    if (clienteId && clienteId !== tarefa.clienteId) {
      const cliente = await Cliente.findOne({
        where: { 
          id: clienteId,
          userId: req.user.id 
        }
      });

      if (!cliente) {
        return res.status(404).json({
          error: 'Cliente não encontrado',
          code: 'CLIENT_NOT_FOUND'
        });
      }
    }

    // Verificar se está marcando como concluída
    const statusAnterior = tarefa.status;
    const dataConclusaoAntiga = tarefa.dataConclusao;

    await tarefa.update({
      titulo,
      descricao,
      dataVencimento,
      prioridade,
      processoId,
      clienteId,
      lembreteAntes,
      status,
      dataConclusao: status === 'concluida' ? new Date() : null
    });

    // Registrar atividade se mudou status
    if (statusAnterior !== status) {
      let tipoLog = 'tarefa_atualizada';
      let descricaoLog = `Tarefa "${titulo}" atualizada`;

      if (status === 'concluida') {
        tipoLog = 'tarefa_concluida';
        descricaoLog = `Tarefa "${titulo}" concluída`;
      } else if (statusAnterior === 'concluida' && status !== 'concluida') {
        tipoLog = 'tarefa_reaberta';
        descricaoLog = `Tarefa "${titulo}" reaberta`;
      }

      await LogAtividade.create({
        descricao: descricaoLog,
        tipo: tipoLog,
        userId: req.user.id,
        tarefaId: tarefa.id,
        processoId: processoId || null
      });
    }

    // Retornar tarefa com relacionamentos
    const tarefaCompleta = await Tarefa.findByPk(tarefa.id, {
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
          attributes: ['id', 'nome', 'tipo'],
          required: false
        }
      ]
    });

    res.json({
      message: 'Tarefa atualizada com sucesso',
      tarefa: tarefaCompleta
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tarefas/:id - Excluir tarefa
router.delete('/:id', async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!tarefa) {
      return res.status(404).json({
        error: 'Tarefa não encontrada',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Registrar atividade antes de excluir
    await LogAtividade.create({
      descricao: `Tarefa "${tarefa.titulo}" excluída`,
      tipo: 'tarefa_excluida',
      userId: req.user.id,
      tarefaId: tarefa.id,
      processoId: tarefa.processoId || null
    });

    await tarefa.destroy();

    res.json({
      message: 'Tarefa excluída com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tarefas/stats - Estatísticas de tarefas
router.get('/stats/summary', async (req, res, next) => {
  try {
    const [
      totalTarefas,
      tarefasPendentes,
      tarefasAndamento,
      tarefasConcluidas,
      tarefasVencidas
    ] = await Promise.all([
      Tarefa.count({ where: { userId: req.user.id } }),
      Tarefa.count({ where: { userId: req.user.id, status: 'pendente' } }),
      Tarefa.count({ where: { userId: req.user.id, status: 'andamento' } }),
      Tarefa.count({ where: { userId: req.user.id, status: 'concluida' } }),
      Tarefa.count({ 
        where: { 
          userId: req.user.id,
          status: { [Op.ne]: 'concluida' },
          dataVencimento: { [Op.lt]: new Date() }
        } 
      })
    ]);

    // Tarefas por prioridade
    const tarefasPorPrioridade = await Tarefa.findAll({
      where: { 
        userId: req.user.id,
        status: { [Op.ne]: 'concluida' }
      },
      attributes: [
        'prioridade',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count']
      ],
      group: ['prioridade'],
      raw: true
    });

    // Tarefas vencendo nos próximos 7 dias
    const proximaSemana = new Date();
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    const tarefasProximaSemana = await Tarefa.count({
      where: {
        userId: req.user.id,
        status: { [Op.ne]: 'concluida' },
        dataVencimento: {
          [Op.between]: [new Date(), proximaSemana]
        }
      }
    });

    res.json({
      total: totalTarefas,
      pendentes: tarefasPendentes,
      emAndamento: tarefasAndamento,
      concluidas: tarefasConcluidas,
      vencidas: tarefasVencidas,
      proximaSemana: tarefasProximaSemana,
      porPrioridade: tarefasPorPrioridade,
      percentualConcluidas: totalTarefas > 0 ? ((tarefasConcluidas / totalTarefas) * 100).toFixed(1) : 0
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tarefas/agenda - Agenda de tarefas
router.get('/agenda/hoje', async (req, res, next) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const tarefasHoje = await Tarefa.findAll({
      where: {
        userId: req.user.id,
        status: { [Op.ne]: 'concluida' },
        dataVencimento: {
          [Op.between]: [hoje, amanha]
        }
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

    res.json({ tarefas: tarefasHoje });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tarefas/:id/concluir - Marcar tarefa como concluída
router.patch('/:id/concluir', async (req, res, next) => {
  try {
    const tarefa = await Tarefa.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!tarefa) {
      return res.status(404).json({
        error: 'Tarefa não encontrada',
        code: 'TASK_NOT_FOUND'
      });
    }

    if (tarefa.status === 'concluida') {
      return res.status(400).json({
        error: 'Tarefa já está concluída',
        code: 'TASK_ALREADY_COMPLETED'
      });
    }

    await tarefa.update({
      status: 'concluida',
      dataConclusao: new Date()
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Tarefa "${tarefa.titulo}" concluída`,
      tipo: 'tarefa_concluida',
      userId: req.user.id,
      tarefaId: tarefa.id,
      processoId: tarefa.processoId || null
    });

    res.json({
      message: 'Tarefa marcada como concluída',
      tarefa
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;