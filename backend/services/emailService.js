const nodemailer = require('nodemailer');

// Configuração do Gmail SMTP
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.GMAIL_USER || 'alisoftwarejuridico@gmail.com',
    pass: process.env.GMAIL_PASS || 'opqm nemr fobi nvjr'
  }
};

// Criar transportador
const transporter = nodemailer.createTransport(emailConfig);

// Verificar conexão
const verificarConexao = async () => {
  try {
    await transporter.verify();
    console.log('✅ Servidor de email conectado e pronto para envio');
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração do email:', error.message);
    return false;
  }
};

// Função para enviar email
const enviarEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Ali Software Jurídico" <${emailConfig.auth.user}>`,
      to,
      subject,
      text,
      html
    });

    console.log('📧 Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
};

// Templates de email
const templates = {
  boasVindas: (nome, email) => ({
    subject: '🎉 Bem-vindo ao Ali Software Jurídico!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ali Software Jurídico</h1>
          <p style="color: white; margin: 10px 0 0 0;">Gestão Jurídica Inteligente</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Olá, ${nome}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Seja bem-vindo(a) ao <strong>Ali Software Jurídico</strong>! 
            Sua conta foi criada com sucesso e você já pode começar a gerenciar 
            seus processos, clientes e tarefas de forma mais eficiente.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">📊 O que você pode fazer:</h3>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li>Gerenciar clientes e processos</li>
              <li>Organizar tarefas e prazos</li>
              <li>Controlar financeiro e honorários</li>
              <li>Acompanhar andamentos processuais</li>
              <li>Gerar relatórios e métricas</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🚀 Começar Agora
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Se você não criou esta conta, ignore este email.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2025 Ali Software Jurídico - Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
    text: `Bem-vindo ao Ali Software Jurídico, ${nome}! Sua conta foi criada com sucesso. Acesse: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`
  }),

  recuperarSenha: (nome, token) => ({
    subject: '🔐 Recuperação de Senha - Ali Software Jurídico',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 Recuperar Senha</h1>
          <p style="color: white; margin: 10px 0 0 0;">Ali Software Jurídico</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Olá, ${nome}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta. 
            Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}" 
               style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🔑 Redefinir Senha
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por segurança.
            </p>
          </div>
          
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            Se você não solicitou esta alteração, ignore este email. 
            Sua senha permanecerá inalterada.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2025 Ali Software Jurídico - Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
    text: `Recuperação de senha para ${nome}. Acesse: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`
  }),

  lembreteTarefa: (nome, tarefa, dataVencimento) => ({
    subject: `⏰ Lembrete: ${tarefa.titulo} - Ali Software Jurídico`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">⏰ Lembrete de Tarefa</h1>
          <p style="color: white; margin: 10px 0 0 0;">Ali Software Jurídico</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Olá, ${nome}!</h2>
          
          <p style="color: #666;">
            Você tem uma tarefa importante que vence em breve:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 10px 0; color: #333;">📝 ${tarefa.titulo}</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Vencimento:</strong> ${dataVencimento}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Prioridade:</strong> ${tarefa.prioridade?.toUpperCase()}</p>
            ${tarefa.descricao ? `<p style="color: #666; margin: 10px 0 0 0;">${tarefa.descricao}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/tarefas" 
               style="background: #ffc107; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📋 Ver Tarefas
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2025 Ali Software Jurídico - Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
    text: `Lembrete: ${tarefa.titulo} vence em ${dataVencimento}. Prioridade: ${tarefa.prioridade}`
  }),

  notificacaoAndamento: (nome, processo, andamento) => ({
    subject: `📋 Novo Andamento: ${processo.numero} - Ali Software Jurídico`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📋 Novo Andamento</h1>
          <p style="color: white; margin: 10px 0 0 0;">Ali Software Jurídico</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Olá, ${nome}!</h2>
          
          <p style="color: #666;">
            Foi registrado um novo andamento no processo:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 10px 0; color: #333;">⚖️ ${processo.numero}</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Assunto:</strong> ${processo.assunto}</p>
            <p style="color: #666; margin: 15px 0 5px 0;"><strong>Andamento:</strong></p>
            <p style="color: #444; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 5px 0;">
              ${andamento.descricao}
            </p>
            <p style="color: #666; margin: 5px 0; font-size: 12px;">
              Data: ${new Date(andamento.dataAndamento).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/processos/${processo.id}" 
               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📁 Ver Processo
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2025 Ali Software Jurídico - Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
    text: `Novo andamento no processo ${processo.numero}: ${andamento.descricao}`
  })
};

// Funções específicas para cada tipo de email
const enviarBoasVindas = async (nome, email) => {
  const template = templates.boasVindas(nome, email);
  return await enviarEmail({ to: email, ...template });
};

const enviarRecuperacaoSenha = async (nome, email, token) => {
  const template = templates.recuperarSenha(nome, token);
  return await enviarEmail({ to: email, ...template });
};

const enviarLembreteTarefa = async (nome, email, tarefa) => {
  const dataVencimento = new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR');
  const template = templates.lembreteTarefa(nome, tarefa, dataVencimento);
  return await enviarEmail({ to: email, ...template });
};

const enviarNotificacaoAndamento = async (nome, email, processo, andamento) => {
  const template = templates.notificacaoAndamento(nome, processo, andamento);
  return await enviarEmail({ to: email, ...template });
};

module.exports = {
  transporter,
  verificarConexao,
  enviarEmail,
  enviarBoasVindas,
  enviarRecuperacaoSenha,
  enviarLembreteTarefa,
  enviarNotificacaoAndamento,
  templates
};