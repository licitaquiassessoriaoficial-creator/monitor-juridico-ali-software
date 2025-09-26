const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { CustomError } = require('../middleware/errorHandler');
const { enviarBoasVindas, enviarRecuperacaoSenha } = require('../services/emailService');

const router = express.Router();

// Validações
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ter formato válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('phone')
    .optional()
    .matches(/^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone deve ter formato válido'),
  body('oab')
    .notEmpty()
    .withMessage('OAB é obrigatória')
    .matches(/^\d{6}[A-Z]{2}$/)
    .withMessage('OAB deve ter 6 dígitos seguidos da UF (ex: 123456SP)'),
  body('uf')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('UF deve ter 2 caracteres')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ter formato válido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
];

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Função para configurar cookie de autenticação
const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
  });
};

const { validateOAB } = require('../middlewares/validateOAB');
// POST /api/auth/register - Cadastro de usuário
router.post('/register', registerValidation, validateOAB, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

  const { name, email, password, phone, oab, uf, acceptTerms } = req.body;

    // Verificar se aceitou os termos
    if (!acceptTerms) {
      return res.status(400).json({
        error: 'É necessário aceitar os termos de uso',
        code: 'TERMS_NOT_ACCEPTED'
      });
    }

    // Verificar se o email já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      oab,
      uf,
      role: 'advogado',
      planType: 'trial'
    });

    // Gerar token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Remover senha da resposta
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Enviar email de boas-vindas (não bloquear a resposta)
    enviarBoasVindas(user.name, user.email)
      .then(() => console.log(`📧 Email de boas-vindas enviado para ${user.email}`))
      .catch(err => console.error(`❌ Erro ao enviar email de boas-vindas: ${err.message}`));

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { ...userResponse, oab: user.oab },
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', loginValidation, validateOAB, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

  const { email, password, oab } = req.body;


    // Buscar usuário
    const user = await User.findByEmail(email);
    if (!user || user.oab !== oab) {
      return res.status(401).json({
        error: 'Email, senha ou OAB incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Usuário inativo',
        code: 'USER_INACTIVE'
      });
    }

    // Verificar senha
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email, senha ou OAB incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Atualizar último login
    await user.updateLastLogin();

    // Gerar token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Remover senha da resposta
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Login realizado com sucesso',
      user: { ...userResponse, oab: user.oab },
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Logout de usuário
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({
    message: 'Logout realizado com sucesso'
  });
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', async (req, res, next) => {
  try {
    let token = req.cookies.authToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Usuário não encontrado ou inativo',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user,
      trialDaysLeft: user.isTrialExpired() ? 0 : Math.max(0, Math.ceil((user.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)))
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }
    next(error);
  }
});

// POST /api/auth/trial - Cadastro para teste grátis (formulário da landing page)
router.post('/trial', async (req, res, next) => {
  try {
    const { name, email, phone, escritorio, uf, acceptTerms } = req.body;

    // Validações básicas
    if (!name || !email || !acceptTerms) {
      return res.status(400).json({
        error: 'Nome, email e aceite dos termos são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar se o email já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email já está cadastrado',
        code: 'EMAIL_EXISTS'
      });
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8);

    // Criar usuário de trial
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      phone,
      uf,
      role: 'advogado',
      planType: 'trial'
    });

    // TODO: Enviar email com dados de acesso

    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Verifique seu email para acessar o sistema.',
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password - Alterar senha
router.post('/change-password', async (req, res, next) => {
  try {
    let token = req.cookies.authToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'NO_TOKEN'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Nova senha deve ter pelo menos 6 caracteres',
        code: 'WEAK_PASSWORD'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar senha atual
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Senha atual incorreta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Atualizar senha
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }
    next(error);
  }
});

// POST /api/auth/forgot-password - Recuperação de senha
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ter formato válido')
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

    const { email } = req.body;

    // Buscar usuário
    const user = await User.findByEmail(email);
    if (!user) {
      // Por segurança, sempre retorna sucesso mesmo se o email não existir
      return res.json({
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação'
      });
    }

    // Gerar token de recuperação
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Salvar token no usuário
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Enviar email de recuperação
    enviarRecuperacaoSenha(user.name, user.email, resetToken)
      .then(() => console.log(`📧 Email de recuperação enviado para ${user.email}`))
      .catch(err => console.error(`❌ Erro ao enviar email de recuperação: ${err.message}`));

    res.json({
      message: 'Se o email existir em nossa base, você receberá instruções para recuperação'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password - Redefinir senha
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número')
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

    const { token, password } = req.body;

    // Hash do token para comparar
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuário com token válido
    const user = await User.findOne({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpiry: { [User.sequelize.Sequelize.Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Atualizar senha e limpar token
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res.json({
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;