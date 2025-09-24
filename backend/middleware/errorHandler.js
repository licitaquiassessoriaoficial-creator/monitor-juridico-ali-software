const errorHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'campo';
    return res.status(409).json({
      error: `${field} já está em uso`,
      code: 'UNIQUE_CONSTRAINT_ERROR',
      field
    });
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referência inválida',
      code: 'FOREIGN_KEY_ERROR'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      code: 'EXPIRED_TOKEN'
    });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Arquivo muito grande',
      code: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Tipo de arquivo não permitido',
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Custom API errors
  if (err.isCustomError) {
    return res.status(err.statusCode || 400).json({
      error: err.message,
      code: err.code || 'CUSTOM_ERROR'
    });
  }

  // Default error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Custom error class
class CustomError extends Error {
  constructor(message, statusCode = 400, code = 'CUSTOM_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isCustomError = true;
    this.name = 'CustomError';
  }
}

module.exports = errorHandler;
module.exports.CustomError = CustomError;