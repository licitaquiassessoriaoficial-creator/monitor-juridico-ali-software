const express = require('express');
const { LogAtividade } = require('../models');

const router = express.Router();

// GET /api/monitor/activities - Obter log de atividades
router.get('/activities', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tipo } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (tipo) {
      whereClause.tipo = tipo;
    }

    const { count, rows: atividades } = await LogAtividade.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../models').Processo,
          as: 'processo',
          attributes: ['id', 'numero'],
          required: false
        },
        {
          model: require('../models').Tarefa,
          as: 'tarefa',
          attributes: ['id', 'titulo'],
          required: false
        }
      ]
    });

    res.json({
      atividades,
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

// GET /api/monitor/system-status - Status do sistema
router.get('/system-status', (req, res) => {
  const status = {
    server: 'online',
    database: 'connected',
    email: 'configured',
    notifications: 'active',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };

  res.json(status);
});

module.exports = router;