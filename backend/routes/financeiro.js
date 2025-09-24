const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Financeiro, Cliente, Processo, LogAtividade } = require('../models');
const { CustomError } = require('../middleware/errorHandler');

const router = express.Router();

// Validações para financeiro
const financeiroValidation = [
  body('tipo')
    .isIn(['receita', 'despesa'])
    .withMessage('Tipo deve ser receita ou despesa'),
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Categoria deve ter entre 2 e 100 caracteres'),
  body('descricao')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Descrição deve ter entre 3 e 500 caracteres'),
  body('valor')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que zero'),
  body('dataVencimento')
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida'),
  body('clienteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cliente ID deve ser um número válido'),
  body('processoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Processo ID deve ser um número válido')
];

// GET /api/financeiro - Listar lançamentos financeiros
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      tipo, 
      status, 
      categoria,
      clienteId, 
      processoId, 
      search,
      dataInicio,
      dataFim
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (tipo) {
      whereClause.tipo = tipo;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (categoria) {
      whereClause.categoria = categoria;
    }
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (processoId) {
      whereClause.processoId = processoId;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { descricao: { [Op.like]: `%${search}%` } },
        { observacoes: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filtro por período
    if (dataInicio || dataFim) {
      whereClause.dataVencimento = {};
      if (dataInicio) {
        whereClause.dataVencimento[Op.gte] = dataInicio;
      }
      if (dataFim) {
        whereClause.dataVencimento[Op.lte] = dataFim;
      }
    }

    const { count, rows: lancamentos } = await Financeiro.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dataVencimento', 'DESC']],
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo'],
          required: false
        },
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          required: false
        }
      ]
    });

    res.json({
      lancamentos,
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

// GET /api/financeiro/:id - Obter lançamento específico
router.get('/:id', async (req, res, next) => {
  try {
    const lancamento = await Financeiro.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo', 'cpfCnpj', 'email']
        },
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto', 'status']
        }
      ]
    });

    if (!lancamento) {
      return res.status(404).json({
        error: 'Lançamento não encontrado',
        code: 'FINANCIAL_NOT_FOUND'
      });
    }

    res.json(lancamento);
  } catch (error) {
    next(error);
  }
});

// POST /api/financeiro - Criar novo lançamento
router.post('/', financeiroValidation, async (req, res, next) => {
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
      tipo, categoria, descricao, valor, dataVencimento,
      clienteId, processoId, observacoes, recorrente,
      intervalorRecorrencia, formaPagamento
    } = req.body;

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

    const lancamento = await Financeiro.create({
      tipo,
      categoria,
      descricao,
      valor,
      dataVencimento,
      clienteId,
      processoId,
      observacoes,
      recorrente,
      intervalorRecorrencia,
      formaPagamento,
      status: 'pendente',
      userId: req.user.id
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Lançamento ${tipo} "${descricao}" criado - R$ ${valor}`,
      tipo: 'lancamento_criado',
      userId: req.user.id,
      financeiroId: lancamento.id,
      processoId: processoId || null
    });

    // Retornar lançamento com relacionamentos
    const lancamentoCompleto = await Financeiro.findByPk(lancamento.id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo'],
          required: false
        },
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: 'Lançamento criado com sucesso',
      lancamento: lancamentoCompleto
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/financeiro/:id - Atualizar lançamento
router.put('/:id', financeiroValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const lancamento = await Financeiro.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!lancamento) {
      return res.status(404).json({
        error: 'Lançamento não encontrado',
        code: 'FINANCIAL_NOT_FOUND'
      });
    }

    const {
      tipo, categoria, descricao, valor, dataVencimento,
      clienteId, processoId, observacoes, recorrente,
      intervalorRecorrencia, formaPagamento, status
    } = req.body;

    // Validar se cliente existe e pertence ao usuário (se foi alterado)
    if (clienteId && clienteId !== lancamento.clienteId) {
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

    // Validar se processo existe e pertence ao usuário (se foi alterado)
    if (processoId && processoId !== lancamento.processoId) {
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

    // Verificar se está marcando como pago
    const statusAnterior = lancamento.status;

    await lancamento.update({
      tipo,
      categoria,
      descricao,
      valor,
      dataVencimento,
      clienteId,
      processoId,
      observacoes,
      recorrente,
      intervalorRecorrencia,
      formaPagamento,
      status,
      dataPagamento: status === 'pago' ? new Date() : null
    });

    // Registrar atividade se mudou status
    if (statusAnterior !== status) {
      let tipoLog = 'lancamento_atualizado';
      let descricaoLog = `Lançamento "${descricao}" atualizado`;

      if (status === 'pago') {
        tipoLog = 'pagamento_efetuado';
        descricaoLog = `Pagamento efetuado - "${descricao}" - R$ ${valor}`;
      } else if (statusAnterior === 'pago' && status !== 'pago') {
        tipoLog = 'pagamento_cancelado';
        descricaoLog = `Pagamento cancelado - "${descricao}" - R$ ${valor}`;
      }

      await LogAtividade.create({
        descricao: descricaoLog,
        tipo: tipoLog,
        userId: req.user.id,
        financeiroId: lancamento.id,
        processoId: processoId || null
      });
    }

    // Retornar lançamento com relacionamentos
    const lancamentoCompleto = await Financeiro.findByPk(lancamento.id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'tipo'],
          required: false
        },
        {
          model: Processo,
          as: 'processo',
          attributes: ['id', 'numero', 'assunto'],
          required: false
        }
      ]
    });

    res.json({
      message: 'Lançamento atualizado com sucesso',
      lancamento: lancamentoCompleto
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/financeiro/:id - Excluir lançamento
router.delete('/:id', async (req, res, next) => {
  try {
    const lancamento = await Financeiro.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!lancamento) {
      return res.status(404).json({
        error: 'Lançamento não encontrado',
        code: 'FINANCIAL_NOT_FOUND'
      });
    }

    // Registrar atividade antes de excluir
    await LogAtividade.create({
      descricao: `Lançamento "${lancamento.descricao}" excluído - R$ ${lancamento.valor}`,
      tipo: 'lancamento_excluido',
      userId: req.user.id,
      financeiroId: lancamento.id,
      processoId: lancamento.processoId || null
    });

    await lancamento.destroy();

    res.json({
      message: 'Lançamento excluído com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/financeiro/stats - Estatísticas financeiras
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { mes, ano } = req.query;
    
    let whereClause = { userId: req.user.id };
    
    // Filtro por mês/ano se fornecido
    if (mes && ano) {
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0);
      whereClause.dataVencimento = {
        [sequelize.Sequelize.Op.between]: [dataInicio, dataFim]
      };
    }

    const [
      totalReceitas,
      totalDespesas,
      receitasPagas,
      despesasPagas,
      receitasPendentes,
      despesasPendentes,
      contasVencidas
    ] = await Promise.all([
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'receita' } 
      }),
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'despesa' } 
      }),
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'receita', status: 'pago' } 
      }),
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'despesa', status: 'pago' } 
      }),
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'receita', status: 'pendente' } 
      }),
      Financeiro.sum('valor', { 
        where: { ...whereClause, tipo: 'despesa', status: 'pendente' } 
      }),
      Financeiro.count({
        where: {
          ...whereClause,
          status: 'pendente',
          dataVencimento: { [Op.lt]: new Date() }
        }
      })
    ]);

    // Receitas por categoria
    const receitasPorCategoria = await Financeiro.findAll({
      where: { ...whereClause, tipo: 'receita' },
      attributes: [
        'categoria',
        [sequelize.Sequelize.fn('SUM', sequelize.Sequelize.col('valor')), 'total']
      ],
      group: ['categoria'],
      raw: true
    });

    // Despesas por categoria
    const despesasPorCategoria = await Financeiro.findAll({
      where: { ...whereClause, tipo: 'despesa' },
      attributes: [
        'categoria',
        [sequelize.Sequelize.fn('SUM', sequelize.Sequelize.col('valor')), 'total']
      ],
      group: ['categoria'],
      raw: true
    });

    const saldoTotal = (totalReceitas || 0) - (totalDespesas || 0);
    const saldoPago = (receitasPagas || 0) - (despesasPagas || 0);
    const saldoPendente = (receitasPendentes || 0) - (despesasPendentes || 0);

    res.json({
      periodo: mes && ano ? `${mes}/${ano}` : 'Total',
      resumo: {
        totalReceitas: totalReceitas || 0,
        totalDespesas: totalDespesas || 0,
        saldoTotal,
        receitasPagas: receitasPagas || 0,
        despesasPagas: despesasPagas || 0,
        saldoPago,
        receitasPendentes: receitasPendentes || 0,
        despesasPendentes: despesasPendentes || 0,
        saldoPendente,
        contasVencidas
      },
      categorias: {
        receitas: receitasPorCategoria,
        despesas: despesasPorCategoria
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/financeiro/fluxo-caixa - Fluxo de caixa
router.get('/fluxo-caixa/mensal', async (req, res, next) => {
  try {
    const { ano = new Date().getFullYear() } = req.query;
    
    const fluxoMensal = [];
    
    for (let mes = 1; mes <= 12; mes++) {
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0);
      
      const whereClause = {
        userId: req.user.id,
        dataVencimento: {
          [sequelize.Sequelize.Op.between]: [dataInicio, dataFim]
        }
      };

      const [receitas, despesas] = await Promise.all([
        Financeiro.sum('valor', { 
          where: { ...whereClause, tipo: 'receita', status: 'pago' } 
        }),
        Financeiro.sum('valor', { 
          where: { ...whereClause, tipo: 'despesa', status: 'pago' } 
        })
      ]);

      fluxoMensal.push({
        mes,
        receitas: receitas || 0,
        despesas: despesas || 0,
        saldo: (receitas || 0) - (despesas || 0)
      });
    }

    res.json({
      ano: parseInt(ano),
      fluxoMensal
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/financeiro/:id/pagar - Marcar como pago
router.patch('/:id/pagar', async (req, res, next) => {
  try {
    const lancamento = await Financeiro.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!lancamento) {
      return res.status(404).json({
        error: 'Lançamento não encontrado',
        code: 'FINANCIAL_NOT_FOUND'
      });
    }

    if (lancamento.status === 'pago') {
      return res.status(400).json({
        error: 'Lançamento já está pago',
        code: 'ALREADY_PAID'
      });
    }

    await lancamento.update({
      status: 'pago',
      dataPagamento: new Date()
    });

    // Registrar atividade
    await LogAtividade.create({
      descricao: `Pagamento efetuado - "${lancamento.descricao}" - R$ ${lancamento.valor}`,
      tipo: 'pagamento_efetuado',
      userId: req.user.id,
      financeiroId: lancamento.id,
      processoId: lancamento.processoId || null
    });

    res.json({
      message: 'Pagamento registrado com sucesso',
      lancamento
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;