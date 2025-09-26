const express = require('express');
const { body } = require('express-validator');
const { Evento, LogAtividade } = require('../models');
const router = express.Router();

// POST /api/eventos/:id/compartilhar - Registrar compartilhamento WhatsApp
router.post('/:id/compartilhar', async (req, res, next) => {
  try {
    const eventoId = req.params.id;
    const evento = await Evento.findByPk(eventoId);
    if (!evento) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    await LogAtividade.create({
      userId: req.user.id,
      entidade: 'evento',
      entidadeId: eventoId,
      acao: 'compartilhar_whatsapp',
      detalhes: JSON.stringify({
        titulo: evento.titulo,
        data: evento.data,
        hora: evento.hora,
        local: evento.local,
        descricao: evento.descricao
      })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
