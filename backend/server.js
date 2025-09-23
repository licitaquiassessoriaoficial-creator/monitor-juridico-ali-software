const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const processRoutes = require('./routes/processos');
const taskRoutes = require('./routes/tarefas');
const clientRoutes = require('./routes/clientes');
const financeRoutes = require('./routes/financeiro');
const dashboardRoutes = require('./routes/dashboard');
const monitorRoutes = require('./routes/monitor');
const emailRoutes = require('./routes/email');
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { verificarConexao } = require('./services/emailService');
const { iniciarAgendamentos, pararAgendamentos } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limite de 100 requests por windowMs
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.'
  }
});

app.use(limiter);

// CORS configurado para permitir frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5500', // Live Server
    'https://localhost:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Middlewares básicos
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../monitor-juridico/public')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/processos', authenticateToken, processRoutes);
app.use('/api/tarefas', authenticateToken, taskRoutes);
app.use('/api/clientes', authenticateToken, clientRoutes);
app.use('/api/financeiro', authenticateToken, financeRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/monitor', authenticateToken, monitorRoutes);
app.use('/api/email', authenticateToken, emailRoutes);

// Rota catch-all para SPA (deve vir por último)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../monitor-juridico/public/index.html'));
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicialização do servidor
async function startServer() {
  try {
    // Sincronizar banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com SQLite estabelecida com sucesso.');
    
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados com o banco de dados.');
    
    // Verificar conexão de email
    await verificarConexao();
    
    // Iniciar agendamentos de notificações
    iniciarAgendamentos();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Recebido SIGTERM, encerrando servidor...');
  pararAgendamentos();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Recebido SIGINT, encerrando servidor...');
  pararAgendamentos();
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;