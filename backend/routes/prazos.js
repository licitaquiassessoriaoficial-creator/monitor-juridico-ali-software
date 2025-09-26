const express = require('express');
const { body } = require('express-validator');
const { Prazo, LogAtividade } = require('../models');
const router = express.Router();

// POST /api/prazos/:id/compartilhar - Registrar compartilhamento WhatsApp
router.post('/:id/compartilhar', async (req, res, next) => {
  try {
    const prazoId = req.params.id;
    const prazo = await Prazo.findByPk(prazoId);
    if (!prazo) {
      return res.status(404).json({ error: 'Prazo não encontrado' });
    }
    await LogAtividade.create({
      userId: req.user.id,
      entidade: 'prazo',
      entidadeId: prazoId,
      acao: 'compartilhar_whatsapp',
      detalhes: JSON.stringify({
        titulo: prazo.titulo,
        data: prazo.data,
        hora: prazo.hora,
        processo: prazo.processo,
        parte: prazo.parte
      })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
