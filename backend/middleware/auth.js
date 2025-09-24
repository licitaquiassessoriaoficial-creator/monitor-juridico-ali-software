const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    // Verificar token no cookie ou header Authorization
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

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Usuário inativo',
        code: 'USER_INACTIVE' 
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'EXPIRED_TOKEN' 
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'SERVER_ERROR' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies.authToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (err) {
        // Token inválido, mas não é obrigatório
        console.log('Token opcional inválido:', err.message);
      }
    }

    next();
  } catch (error) {
    console.error('Erro na autenticação opcional:', error);
    next();
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Autenticação requerida',
        code: 'AUTH_REQUIRED' 
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasPermission = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Permissão insuficiente',
        code: 'INSUFFICIENT_PERMISSION',
        required: requiredRoles,
        current: userRoles
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};