const express = require('express');
const { 
  enviarEmail, 
  enviarBoasVindas, 
  enviarLembreteTarefa,
  verificarConexao 
} = require('../services/emailService');
const { 
  verificarTarefasVencendo, 
  verificarContasVencidas 
} = require('../services/notificationService');

const router = express.Router();

// GET /api/email/test-connection - Testar conexão
router.get('/test-connection', async (req, res, next) => {
  try {
    const isConnected = await verificarConexao();
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Conexão com email funcionando' : 'Falha na conexão com email'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/email/send-test - Enviar email de teste
router.post('/send-test', async (req, res, next) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({
        error: 'Campos obrigatórios: to, subject, message'
      });
    }

    const resultado = await enviarEmail({
      to,
      subject: `[TESTE] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #667eea; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🧪 Email de Teste</h1>
            <p style="color: white; margin: 5px 0 0 0;">Ali Software Jurídico</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">${subject}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            
            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0066cc; font-size: 14px;">
                ℹ️ Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      `,
      text: `[TESTE] ${subject}\n\n${message}\n\nEnviado em: ${new Date().toLocaleString('pt-BR')}`
    });

    res.json({
      success: resultado.success,
      message: resultado.success ? 'Email de teste enviado com sucesso' : 'Falha ao enviar email',
      messageId: resultado.messageId,
      error: resultado.error
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/email/send-welcome - Enviar email de boas-vindas
router.post('/send-welcome', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        error: 'Campos obrigatórios: name, email'
      });
    }

    const resultado = await enviarBoasVindas(name, email);

    res.json({
      success: resultado.success,
      message: resultado.success ? 'Email de boas-vindas enviado' : 'Falha ao enviar email',
      messageId: resultado.messageId,
      error: resultado.error
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/email/check-pending-tasks - Verificar tarefas pendentes manualmente
router.post('/check-pending-tasks', async (req, res, next) => {
  try {
    await verificarTarefasVencendo();
    
    res.json({
      success: true,
      message: 'Verificação de tarefas vencendo executada'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/email/check-overdue-bills - Verificar contas vencidas manualmente
router.post('/check-overdue-bills', async (req, res, next) => {
  try {
    await verificarContasVencidas();
    
    res.json({
      success: true,
      message: 'Verificação de contas vencidas executada'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/email/templates - Listar templates disponíveis
router.get('/templates', (req, res) => {
  res.json({
    templates: [
      {
        name: 'boasVindas',
        description: 'Email de boas-vindas para novos usuários',
        params: ['nome', 'email']
      },
      {
        name: 'recuperarSenha',
        description: 'Email de recuperação de senha',
        params: ['nome', 'token']
      },
      {
        name: 'lembreteTarefa',
        description: 'Lembrete de tarefa vencendo',
        params: ['nome', 'tarefa', 'dataVencimento']
      },
      {
        name: 'notificacaoAndamento',
        description: 'Notificação de novo andamento processual',
        params: ['nome', 'processo', 'andamento']
      }
    ]
  });
});

module.exports = router;