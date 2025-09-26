// middleware/checkPlan.js
const { User } = require('../models');

module.exports = async function checkPlan(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Bloqueia se trial expirou
    if (user.planType === 'trial' && user.isTrialExpired()) {
      return res.status(402).json({ error: 'Seu período de teste expirou. Assine um plano para continuar.' });
    }
    // Bloqueia se plano não está ativo
    if (user.planType !== 'trial' && !user.isActive) {
      return res.status(402).json({ error: 'Plano inativo. Regularize sua assinatura.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
