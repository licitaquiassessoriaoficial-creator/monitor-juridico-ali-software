const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { LogAtividade } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// POST /api/captura/oab - Busca processos/publicações por OAB
router.post('/oab', authenticateToken, async (req, res, next) => {
  try {
    const { oab, uf } = req.body;
    if (!oab || !uf) {
      return res.status(400).json({ error: 'OAB e UF são obrigatórios.' });
    }
    // Exemplo: busca no site do CNJ (simulação)
    // Em produção, usar API oficial ou crawler real
    const url = `https://www.cnj.jus.br/busca-advogado?oab=${encodeURIComponent(oab)}&uf=${encodeURIComponent(uf)}`;
    // Simulação de resposta
    const resultados = [
      { processo: '1234567-89.2025.8.26.0001', vara: '2ª Vara Cível', data: '2025-09-20', assunto: 'Execução de Título', partes: 'Cliente X Réu Y' },
      { processo: '9876543-21.2025.8.26.0002', vara: '1ª Vara Família', data: '2025-09-18', assunto: 'Divórcio', partes: 'Cliente Z Réu W' }
    ];
    await LogAtividade.create({
      userId: req.user.id,
      entidade: 'captura',
      entidadeId: oab,
      acao: 'busca_oab',
      detalhes: JSON.stringify({ uf, resultados })
    });
    res.json({ resultados });
  } catch (err) {
    next(err);
  }
});

// POST /api/captura/cnj - Busca processos por número CNJ
router.post('/cnj', authenticateToken, async (req, res, next) => {
  try {
    const { numero } = req.body;
    if (!numero) {
      return res.status(400).json({ error: 'Número CNJ é obrigatório.' });
    }
    // Simulação de busca
    const resultado = {
      processo: numero,
      vara: '3ª Vara Criminal',
      data: '2025-09-22',
      assunto: 'Crime Tributário',
      partes: 'Cliente A Réu B'
    };
    await LogAtividade.create({
      userId: req.user.id,
      entidade: 'captura',
      entidadeId: numero,
      acao: 'busca_cnj',
      detalhes: JSON.stringify(resultado)
    });
    res.json({ resultado });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
