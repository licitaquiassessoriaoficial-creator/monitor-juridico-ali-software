const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { CustomError } = require('../middleware/errorHandler');

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
    .optional()
    .isLength({ max: 20 })
    .withMessage('OAB deve ter no máximo 20 caracteres'),
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

// POST /api/auth/register - Cadastro de usuário
router.post('/register', registerValidation, async (req, res, next) => {
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

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: userResponse,
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Email ou senha incorretos',
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
        error: 'Email ou senha incorretos',
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
      user: userResponse,
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

module.exports = router;