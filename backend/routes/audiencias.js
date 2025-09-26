const express = require('express');
const { body } = require('express-validator');
const { Audiencia, LogAtividade } = require('../models');
const router = express.Router();

// POST /api/audiencias/:id/compartilhar - Registrar compartilhamento WhatsApp
router.post('/:id/compartilhar', async (req, res, next) => {
  try {
    const audienciaId = req.params.id;
    const audiencia = await Audiencia.findByPk(audienciaId);
    if (!audiencia) {
      return res.status(404).json({ error: 'Audiência não encontrada' });
    }
    await LogAtividade.create({
      userId: req.user.id,
      entidade: 'audiencia',
      entidadeId: audienciaId,
      acao: 'compartilhar_whatsapp',
      detalhes: JSON.stringify({
        titulo: audiencia.titulo,
        data: audiencia.data,
        hora: audiencia.hora,
        local: audiencia.local,
        processo: audiencia.processo
      })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
