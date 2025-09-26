const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Processo, Cliente, Tarefa, Andamento, LogAtividade } = require('../models');
const checkPlan = require('../middleware/checkPlan');
const { CustomError } = require('../middleware/errorHandler');

const router = express.Router();

// Validações para processo
const processoValidation = [
  body('numero')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Número do processo deve ter entre 5 e 50 caracteres'),
  body('assunto')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Assunto deve ter entre 3 e 500 caracteres'),
  body('clienteId')
    .isInt({ min: 1 })
    .withMessage('Cliente ID deve ser um número válido'),
  body('instancia')
    .optional()
    .isIn(['primeira', 'segunda', 'terceira', 'stf', 'stj'])
    .withMessage('Instância deve ser uma das opções válidas'),
  body('valor')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo'),
  body('dataDistribuicao')
    .optional()
    .isISO8601()
    .withMessage('Data de distribuição deve ser uma data válida')
];

// GET /api/processos - Listar processos
router.get('/', checkPlan, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, clienteId, search, instancia } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (instancia) {
      whereClause.instancia = instancia;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { numero: { [Op.like]: `%${search}%` } },
        { assunto: { [Op.like]: `%${search}%` } },
        { observacoes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: processos } = await Processo.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dataDistribuicao', 'DESC']],
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj']
        },
        {
          model: Tarefa,
          as: 'tarefas',
          attributes: ['id', 'titulo', 'status', 'dataVencimento'],
          where: { status: { [Op.ne]: 'concluida' } },
          required: false,
          limit: 3,
          order: [['dataVencimento', 'ASC']]
        }
      ]
    });

    // Adicionar contagem de andamentos para cada processo
    const processosComContagem = await Promise.all(
      processos.map(async (processo) => {
        const processoJson = processo.toJSON();
        processoJson.andamentosCount = await processo.getAndamentosCount();
        return processoJson;
      })
    );

    res.json({
      processos: processosComContagem,
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

// GET /api/processos/:id - Obter processo específico
router.get('/:id', checkPlan, async (req, res, next) => {
  try {
    const processo = await Processo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj', 'email', 'telefone']
        },
        {
          model: Tarefa,
          as: 'tarefas',
          order: [['dataVencimento', 'ASC']]
        },
        {
          model: Andamento,
          as: 'andamentos',
          order: [['dataAndamento', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!processo) {
      return res.status(404).json({
        error: 'Processo não encontrado',
        code: 'PROCESS_NOT_FOUND'
      });
    }

    res.json(processo);
  } catch (error) {
    next(error);
  }
});

// POST /api/processos - Criar novo processo
router.post('/', checkPlan, processoValidation, async (req, res, next) => {
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
      numero, assunto, clienteId, instancia, comarca, vara,
      valor, honorarios, dataDistribuicao, dataContracao,
      observacoes
    } = req.body;

    // Verificar se o cliente existe e pertence ao usuário
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

    // Verificar se número do processo já existe
    const existingProcess = await Processo.findByNumber(numero);
    if (existingProcess && existingProcess.userId === req.user.id) {
      return res.status(409).json({
        error: 'Número do processo já cadastrado',
        code: 'PROCESS_NUMBER_EXISTS'
      });
    }

    const processo = await Processo.create({
      numero,
      assunto,
      clienteId,
      instancia,
      comarca,
      vara,
      valor,
      honorarios,
      dataDistribuicao,
      dataContracao,
      observacoes,
      status: 'ativo',
      userId: req.user.id
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Processo ${numero} criado`,
      tipo: 'processo_criado',
      userId: req.user.id,
      processoId: processo.id
    });

    // Retornar processo com cliente
    const processoCompleto = await Processo.findByPk(processo.id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj']
        }
      ]
    });

    res.status(201).json({
      message: 'Processo criado com sucesso',
      processo: processoCompleto
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/processos/:id - Atualizar processo
router.put('/:id', checkPlan, processoValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const processo = await Processo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!processo) {
      return res.status(404).json({
        error: 'Processo não encontrado',
        code: 'PROCESS_NOT_FOUND'
      });
    }

    const {
      numero, assunto, clienteId, instancia, comarca, vara,
      valor, honorarios, dataDistribuicao, dataContracao,
      observacoes, status
    } = req.body;

    // Verificar se o cliente existe e pertence ao usuário
    if (clienteId !== processo.clienteId) {
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

    // Verificar se número do processo já existe (se foi alterado)
    if (numero !== processo.numero) {
      const existingProcess = await Processo.findByNumber(numero);
      if (existingProcess && existingProcess.id !== processo.id) {
        return res.status(409).json({
          error: 'Número do processo já cadastrado',
          code: 'PROCESS_NUMBER_EXISTS'
        });
      }
    }

    await processo.update({
      numero,
      assunto,
      clienteId,
      instancia,
      comarca,
      vara,
      valor,
      honorarios,
      dataDistribuicao,
      dataContracao,
      observacoes,
      status
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Processo ${numero} atualizado`,
      tipo: 'processo_atualizado',
      userId: req.user.id,
      processoId: processo.id
    });

    // Retornar processo com cliente
    const processoCompleto = await Processo.findByPk(processo.id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj']
        }
      ]
    });

    res.json({
      message: 'Processo atualizado com sucesso',
      processo: processoCompleto
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/processos/:id - Excluir processo
router.delete('/:id', checkPlan, async (req, res, next) => {
  try {
    const processo = await Processo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!processo) {
      return res.status(404).json({
        error: 'Processo não encontrado',
        code: 'PROCESS_NOT_FOUND'
      });
    }

    // Verificar se há tarefas vinculadas
    const tarefasCount = await processo.getTarefasCount();
    if (tarefasCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir processo com tarefas vinculadas',
        code: 'PROCESS_HAS_TASKS',
        tarefasCount
      });
    }

    // Registrar atividade antes de excluir
    await LogAtividade.create({
      descricao: `Processo ${processo.numero} excluído`,
      tipo: 'processo_excluido',
      userId: req.user.id,
      processoId: processo.id
    });

    await processo.destroy();

    res.json({
      message: 'Processo excluído com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/processos/stats - Estatísticas de processos
router.get('/stats/summary', checkPlan, async (req, res, next) => {
  try {
    const [
      totalProcessos,
      processosAtivos,
      processosArquivados,
      processosEncerrados,
      totalValor
    ] = await Promise.all([
      Processo.count({ where: { userId: req.user.id } }),
      Processo.count({ where: { userId: req.user.id, status: 'ativo' } }),
      Processo.count({ where: { userId: req.user.id, status: 'arquivado' } }),
      Processo.count({ where: { userId: req.user.id, status: 'encerrado' } }),
      Processo.sum('valor', { where: { userId: req.user.id } })
    ]);

    // Processos por instância
    const processosPorInstancia = await Processo.findAll({
      where: { userId: req.user.id },
      attributes: [
        'instancia',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count']
      ],
      group: ['instancia'],
      raw: true
    });

    res.json({
      total: totalProcessos,
      ativos: processosAtivos,
      arquivados: processosArquivados,
      encerrados: processosEncerrados,
      valorTotal: totalValor || 0,
      porInstancia: processosPorInstancia,
      percentualAtivos: totalProcessos > 0 ? ((processosAtivos / totalProcessos) * 100).toFixed(1) : 0
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/processos/:id/andamentos - Adicionar andamento
router.post('/:id/andamentos', checkPlan, [
  body('descricao')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('dataAndamento')
    .optional()
    .isISO8601()
    .withMessage('Data do andamento deve ser uma data válida')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const processo = await Processo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!processo) {
      return res.status(404).json({
        error: 'Processo não encontrado',
        code: 'PROCESS_NOT_FOUND'
      });
    }

    const { descricao, dataAndamento } = req.body;

    const andamento = await Andamento.create({
      descricao,
      dataAndamento: dataAndamento || new Date(),
      processoId: processo.id,
      userId: req.user.id
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Andamento adicionado ao processo ${processo.numero}`,
      tipo: 'andamento_adicionado',
      userId: req.user.id,
      processoId: processo.id
    });

    res.status(201).json({
      message: 'Andamento adicionado com sucesso',
      andamento
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;