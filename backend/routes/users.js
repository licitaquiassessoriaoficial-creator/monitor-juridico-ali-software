const express = require('express');
const { User } = require('../models');

const router = express.Router();

// GET /api/users/profile - Obter perfil do usuário
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpiry'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile - Atualizar perfil do usuário
router.put('/profile', async (req, res, next) => {
  try {
    const { name, phone, oab, uf } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      oab: oab || user.oab,
      uf: uf || user.uf
    });

    const updatedUser = user.toJSON();
    delete updatedUser.password;
    delete updatedUser.resetPasswordToken;
    delete updatedUser.resetPasswordExpiry;

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;