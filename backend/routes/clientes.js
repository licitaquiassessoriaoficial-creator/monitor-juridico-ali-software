const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Cliente, Processo, Tarefa, Financeiro } = require('../models');
const { CustomError } = require('../middleware/errorHandler');

const router = express.Router();

// Validações para cliente
const clienteValidation = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('tipo')
    .isIn(['pessoa_fisica', 'pessoa_juridica'])
    .withMessage('Tipo deve ser pessoa_fisica ou pessoa_juridica'),
  body('cpfCnpj')
    .custom((value) => {
      const cleanDoc = value.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        throw new Error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
      }
      return true;
    }),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido'),
  body('telefone')
    .optional()
    .matches(/^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone deve ter formato válido'),
  body('cep')
    .optional()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido'),
  body('uf')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('UF deve ter 2 caracteres')
];

// GET /api/clientes - Listar clientes
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { nome: { [Op.like]: `%${search}%` } },
        { cpfCnpj: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: clientes } = await Cliente.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nome', 'ASC']],
      include: [
        {
          model: Processo,
          as: 'processos',
          attributes: ['id', 'numero', 'status'],
          required: false
        }
      ]
    });

    // Adicionar contagem de processos para cada cliente
    const clientesComContagem = await Promise.all(
      clientes.map(async (cliente) => {
        const clienteJson = cliente.toJSON();
        clienteJson.processosCount = await cliente.getProcessosCount();
        return clienteJson;
      })
    );

    res.json({
      clientes: clientesComContagem,
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

// GET /api/clientes/:id - Obter cliente específico
router.get('/:id', async (req, res, next) => {
  try {
    const cliente = await Cliente.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Processo,
          as: 'processos',
          attributes: ['id', 'numero', 'assunto', 'status', 'dataDistribuicao']
        },
        {
          model: Tarefa,
          as: 'tarefas',
          attributes: ['id', 'titulo', 'status', 'dataVencimento'],
          limit: 5,
          order: [['dataVencimento', 'ASC']]
        },
        {
          model: Financeiro,
          as: 'financeiro',
          attributes: ['id', 'tipo', 'valor', 'status', 'dataVencimento'],
          limit: 5,
          order: [['dataVencimento', 'DESC']]
        }
      ]
    });

    if (!cliente) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

// POST /api/clientes - Criar novo cliente
router.post('/', clienteValidation, async (req, res, next) => {
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
      nome, tipo, cpfCnpj, email, telefone, whatsapp,
      endereco, cep, cidade, uf, observacoes,
      dataInicioContrato, valorMensalidade
    } = req.body;

    // Limpar CPF/CNPJ
    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');

    // Verificar se CPF/CNPJ já existe
    const existingClient = await Cliente.findByDocument(cpfCnpjLimpo);
    if (existingClient && existingClient.userId === req.user.id) {
      return res.status(409).json({
        error: 'CPF/CNPJ já cadastrado',
        code: 'DOCUMENT_EXISTS'
      });
    }

    const cliente = await Cliente.create({
      nome,
      tipo,
      cpfCnpj: cpfCnpjLimpo,
      email,
      telefone,
      whatsapp,
      endereco,
      cep,
      cidade,
      uf,
      observacoes,
      dataInicioContrato,
      valorMensalidade,
      status: 'ativo',
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', clienteValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const cliente = await Cliente.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!cliente) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const {
      nome, tipo, cpfCnpj, email, telefone, whatsapp,
      endereco, cep, cidade, uf, observacoes,
      dataInicioContrato, valorMensalidade, status
    } = req.body;

    // Limpar CPF/CNPJ se foi alterado
    let cpfCnpjLimpo = cliente.cpfCnpj;
    if (cpfCnpj && cpfCnpj !== cliente.cpfCnpj) {
      cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
      
      // Verificar se novo CPF/CNPJ já existe
      const existingClient = await Cliente.findByDocument(cpfCnpjLimpo);
      if (existingClient && existingClient.id !== cliente.id) {
        return res.status(409).json({
          error: 'CPF/CNPJ já cadastrado',
          code: 'DOCUMENT_EXISTS'
        });
      }
    }

    await cliente.update({
      nome,
      tipo,
      cpfCnpj: cpfCnpjLimpo,
      email,
      telefone,
      whatsapp,
      endereco,
      cep,
      cidade,
      uf,
      observacoes,
      dataInicioContrato,
      valorMensalidade,
      status
    });

    res.json({
      message: 'Cliente atualizado com sucesso',
      cliente
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clientes/:id - Excluir cliente
router.delete('/:id', async (req, res, next) => {
  try {
    const cliente = await Cliente.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!cliente) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    // Verificar se há processos vinculados
    const processosCount = await cliente.getProcessosCount();
    if (processosCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir cliente com processos vinculados',
        code: 'CLIENT_HAS_PROCESSES',
        processosCount
      });
    }

    await cliente.destroy();

    res.json({
      message: 'Cliente excluído com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clientes/stats - Estatísticas de clientes
router.get('/stats/summary', async (req, res, next) => {
  try {
    const [
      totalClientes,
      clientesAtivos,
      clientesInativos,
      prospectos
    ] = await Promise.all([
      Cliente.count({ where: { userId: req.user.id } }),
      Cliente.count({ where: { userId: req.user.id, status: 'ativo' } }),
      Cliente.count({ where: { userId: req.user.id, status: 'inativo' } }),
      Cliente.count({ where: { userId: req.user.id, status: 'prospecto' } })
    ]);

    res.json({
      total: totalClientes,
      ativos: clientesAtivos,
      inativos: clientesInativos,
      prospectos,
      percentualAtivos: totalClientes > 0 ? ((clientesAtivos / totalClientes) * 100).toFixed(1) : 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;